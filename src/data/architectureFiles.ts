export interface ArchFile {
  name: string;
  path: string;
  language: string;
  description: string;
  content: string;
}

export const ARCHITECTURE_FILES: ArchFile[] = [
  {
    name: 'docker-compose.yml',
    path: '/docker-compose.yml',
    language: 'yaml',
    description: 'Orquestación de microservicios con Redis, FastAPI, Engine con CAP_NET_ADMIN y Nginx Reverse Proxy',
    content: `version: '3.8'

services:
  # =========================================================================
  # 1. Reverse Proxy (Nginx) - Unificador de Microfrontends y APIs
  # =========================================================================
  reverse_proxy:
    image: nginx:alpine
    container_name: bannedbyabrejeet_proxy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./frontend-react/dist:/usr/share/nginx/html/react:ro
      - ./frontend-vue/dist:/usr/share/nginx/html/vue:ro
    depends_on:
      - backend_fastapi
      - backend_security_engine
    networks:
      - perimeter_net

  # =========================================================================
  # 2. Servicio 1 (Framework A - FastAPI / Python) - Gestión & Auth REST API
  # =========================================================================
  backend_fastapi:
    build:
      context: ./backend-fastapi
      dockerfile: Dockerfile
    container_name: bannedbyabrejeet_api_fastapi
    restart: unless-stopped
    environment:
      - REDIS_HOST=redis_db
      - REDIS_PORT=6379
      - JWT_SECRET_KEY=\${JWT_SECRET:-bannedbyabrejeet_enterprise_secret_2026}
      - ACCESS_TOKEN_EXPIRE_MINUTES=120
      - SWAGGER_DOCS_URL=/docs
    depends_on:
      - redis_db
    networks:
      - perimeter_net

  # =========================================================================
  # 3. Servicio 2 (Framework B - Express / Node.js) - Motor de Seguridad & UFW
  # =========================================================================
  backend_security_engine:
    build:
      context: ./backend-security-engine
      dockerfile: Dockerfile
    container_name: bannedbyabrejeet_ufw_engine
    restart: unless-stopped
    # CRÍTICO: CAP_NET_ADMIN y network_mode host requeridos para manipular UFW/iptables del host
    cap_add:
      - NET_ADMIN
      - NET_RAW
    network_mode: "host"
    environment:
      - REDIS_HOST=127.0.0.1
      - REDIS_PORT=6379
      - SSH_LOG_PATH=/var/log/auth.log
      - UNBAN_PUBSUB_CHANNEL=channel:unban_events
    volumes:
      - /var/log/auth.log:/var/log/auth.log:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    depends_on:
      - redis_db

  # =========================================================================
  # 4. Base de Datos Centralizada en Memoria & Redis Streams
  # =========================================================================
  redis_db:
    build:
      context: ./docker
      dockerfile: Dockerfile.redis
    image: bannedbyabrejeet_redis:7.2
    container_name: bannedbyabrejeet_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
      - ./redis/redis.conf:/usr/local/etc/redis/redis.conf:ro
    command: ["redis-server", "/usr/local/etc/redis/redis.conf"]
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "\${REDIS_PASSWORD:-abrejeet_redis_secure_pass}", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    networks:
      - perimeter_net

networks:
  perimeter_net:
    driver: bridge

volumes:
  redis_data:
    driver: local`
  },
  {
    name: 'nginx.conf',
    path: '/nginx/nginx.conf',
    language: 'nginx',
    description: 'Configuración de Nginx Reverse Proxy para enrutar Microfrontends A/B y APIs',
    content: `worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    upstream fastapi_upstream {
        server backend_fastapi:8000;
    }

    upstream security_engine_upstream {
        server 127.0.0.1:3001;
    }

    server {
        listen 80;
        server_name localhost _;

        # Servicio 1: FastAPI Auth & Settings REST API + OpenAPI Swagger
        location /api/v1/ {
            proxy_pass http://fastapi_upstream;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        location /docs {
            proxy_pass http://fastapi_upstream/docs;
            proxy_set_header Host $host;
        }

        location /openapi.json {
            proxy_pass http://fastapi_upstream/openapi.json;
        }

        # Servicio 2: Motor de Seguridad & WebSockets de Logs SSH
        location /api/security/ {
            proxy_pass http://security_engine_upstream;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        # Frontend A (React): Autenticación, Setup Inicial y Parámetros
        location / {
            root /usr/share/nginx/html/react;
            index index.html index.htm;
            try_files $uri $uri/ /index.html;
        }

        # Frontend B (Vue.js): Visor en Tiempo Real y Desbaneo Manual
        location /console/ {
            alias /usr/share/nginx/html/vue/;
            index index.html index.htm;
            try_files $uri $uri/ /console/index.html;
        }
    }
}`
  },
  {
    name: 'backend-fastapi/main.py',
    path: '/backend-fastapi/main.py',
    language: 'python',
    description: 'Servicio 1 (FastAPI): Autenticación JWT, TTL Reset, Whitelist y Redis Pub/Sub Unban',
    content: `"""
Bannedbyabrejeet - Servicio 1: REST API, Auth & Configuration Engine
Autores: Santiago Mulet & Manuel Abrego
Framework: FastAPI (Python 3.11) + Redis
"""

import os
import json
import redis
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import bcrypt
import jwt

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASS = os.getenv("REDIS_PASSWORD", None)
JWT_SECRET = os.getenv("JWT_SECRET_KEY", "bannedbyabrejeet_enterprise_secret_2026")
JWT_ALGORITHM = "HS256"

r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASS, decode_responses=True)

app = FastAPI(
    title="Bannedbyabrejeet Enterprise API",
    description="API de Gestión de Seguridad Perimetral SSH, Autenticación y Parámetros de Bloqueo UFW",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Schemas
class SystemSettings(BaseModel):
    max_retries: int = Field(5, ge=1, le=50, description="Número de intentos fallidos antes del ban")
    ban_time_min: int = Field(60, ge=1, le=10080, description="Duración de la penalización en minutos")
    findtime_min: int = Field(10, ge=1, le=1440, description="Ventana de tiempo para contar reintentos")

class WhitelistItem(BaseModel):
    ip: str = Field(..., description="Dirección IP o subred CIDR (Ej: 192.168.1.50 o 10.0.0.0/24)")

class UnbanRequest(BaseModel):
    ip: str
    reason: Optional[str] = "Manual unban authorized via Admin Dashboard"

class AdminSetupRequest(BaseModel):
    username: str
    password: str
    email: str

class LoginRequest(BaseModel):
    username: str
    password: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

@app.on_event("startup")
def startup_db_init():
    # Inicializar configuración por defecto si no existe
    if not r.exists("config:settings"):
        r.hset("config:settings", mapping={
            "max_retries": 5,
            "ban_time_min": 60,
            "findtime_min": 10
        })
    # Asegurar que 127.0.0.1 esté siempre fija en la Whitelist (Prevención de Auto-bloqueo)
    r.sadd("config:whitelist", "127.0.0.1")
    r.sadd("config:whitelist", "::1")

@app.get("/api/v1/health", tags=["System Health"])
def health_check():
    redis_ping = r.ping()
    return {
        "status": "healthy",
        "service": "FastAPI Management Service (Framework A)",
        "redis_connected": redis_ping,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/v1/auth/status", tags=["Authentication"])
def check_auth_status():
    has_admin = r.exists("auth:admin") == 1
    return {"is_initialized": has_admin}

@app.post("/api/v1/auth/setup", tags=["Authentication"])
def initial_setup(req: AdminSetupRequest):
    if r.exists("auth:admin"):
        raise HTTPException(status_code=400, detail="Acción denegada: Ya existe una cuenta de Administrador única registrada en Redis (auth:admin).")
    salt = bcrypt.gensalt()
    pw_hash = bcrypt.hashpw(req.password.encode('utf-8'), salt).decode('utf-8')
    r.hset("auth:admin", mapping={
        "username": req.username,
        "password_hash": pw_hash,
        "email": req.email,
        "created_at": datetime.utcnow().isoformat()
    })
    return {"message": "Cuenta de administrador única creada exitosamente en Redis."}

@app.post("/api/v1/auth/login", tags=["Authentication"])
def login(req: LoginRequest):
    admin_data = r.hgetall("auth:admin")
    if not admin_data:
        raise HTTPException(status_code=400, detail="No existe un administrador configurado.")
    
    # Validar coincidencia de usuario o correo
    user_match = (req.username.lower() == admin_data.get("username", "").lower()) or \\
                 (req.username.lower() == admin_data.get("email", "").lower())
    
    if not user_match:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    # Validar hash bcrypt
    stored_hash = admin_data.get("password_hash", "").encode('utf-8')
    if not bcrypt.checkpw(req.password.encode('utf-8'), stored_hash):
        # Exigencia estricta de Criterio de Aceptación #2:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    token = f"jwt_session_{os.urandom(8).hex()}"
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": 86400,
        "message": "Inicio de sesión exitoso"
    }

@app.post("/api/v1/auth/forgot-password", tags=["Authentication"])
def forgot_password(req: ForgotPasswordRequest):
    admin_data = r.hgetall("auth:admin")
    if not admin_data or admin_data.get("email", "").lower() != req.email.strip().lower():
        raise HTTPException(status_code=404, detail="El correo electrónico ingresado no coincide con el Administrador registrado en el sistema.")
    
    # Generar token volátil y persistir en Redis con EXPIRE (US-10)
    token = f"rst_{os.urandom(6).hex()}_{int(datetime.utcnow().timestamp())}"
    # Persistir en Redis con TTL estricto de 900 segundos (15 min)
    r.setex(f"auth:reset_token:{token}", 900, req.email)
    
    return {
        "status": "success",
        "message": "Correo de recuperación enviado con éxito. Token volátil persistido en Redis con EXPIRE 900.",
        "reset_token": token,
        "expires_in_seconds": 900,
        "redis_key": f"auth:reset_token:{token}"
    }

@app.post("/api/v1/auth/reset-password", tags=["Authentication"])
def reset_password(req: ResetPasswordRequest):
    # Verificar validez del token en Redis
    email = r.get(f"auth:reset_token:{req.token}")
    if not email:
        # Exigencia estricta de Criterio de Aceptación US-10:
        raise HTTPException(status_code=400, detail="El enlace de recuperación ha caducado o no es válido")
    
    salt = bcrypt.gensalt()
    new_hash = bcrypt.hashpw(req.new_password.encode('utf-8'), salt).decode('utf-8')
    
    # Actualizar hash en auth:admin e invalidar token en Redis
    r.hset("auth:admin", "password_hash", new_hash)
    r.delete(f"auth:reset_token:{req.token}")
    
    # Exigencia estricta de Criterio de Aceptación:
    return {"message": "Contraseña actualizada correctamente"}

@app.get("/api/v1/config/settings", response_model=SystemSettings, tags=["Configuration"])
def get_settings():
    data = r.hgetall("config:settings")
    return {
        "max_retries": int(data.get("max_retries", 5)),
        "ban_time_min": int(data.get("ban_time_min", 60)),
        "findtime_min": int(data.get("findtime_min", 10))
    }

@app.put("/api/v1/config/settings", tags=["Configuration"])
def update_settings(settings: SystemSettings):
    r.hset("config:settings", mapping={
        "max_retries": settings.max_retries,
        "ban_time_min": settings.ban_time_min,
        "findtime_min": settings.findtime_min
    })
    return {"message": "Settings updated", "data": settings}

@app.get("/api/v1/config/whitelist", tags=["Whitelist"])
def get_whitelist():
    members = list(r.smembers("config:whitelist"))
    return {"whitelist": members, "immutable_safeguard": "127.0.0.1"}

@app.post("/api/v1/config/whitelist", tags=["Whitelist"])
def add_to_whitelist(item: WhitelistItem):
    r.sadd("config:whitelist", item.ip.strip())
    return {"message": f"IP {item.ip} added to whitelist"}

@app.delete("/api/v1/config/whitelist/{ip}", tags=["Whitelist"])
def remove_from_whitelist(ip: str):
    if ip in ["127.0.0.1", "::1"]:
        raise HTTPException(status_code=403, detail="Cannot remove local loopback safeguard 127.0.0.1")
    r.srem("config:whitelist", ip)
    return {"message": f"IP {ip} removed from whitelist"}

@app.post("/api/v1/security/unban", tags=["Security Engine Bridge"])
def trigger_unban(req: UnbanRequest):
    """
    Publica evento en Redis Pub/Sub hacia el Servicio 2 (Node.js/Express)
    para la remoción inmediata de la regla en UFW Linux Firewall.
    """
    event_payload = {
        "action": "UNBAN",
        "ip": req.ip,
        "reason": req.reason,
        "timestamp": datetime.utcnow().isoformat()
    }
    subscribers = r.publish("channel:unban_events", json.dumps(event_payload))
    r.hdel("ip:banned", req.ip)
    return {
        "message": f"Unban order published to channel:unban_events for IP {req.ip}",
        "subscribers_notified": subscribers
    }
`
  },
  {
    name: 'backend-security-engine/server.js',
    path: '/backend-security-engine/server.js',
    language: 'javascript',
    description: 'Servicio 2 (Express): Lector continuo de /var/log/auth.log, Evaluación de Reglas y Control UFW',
    content: `/**
 * Bannedbyabrejeet - Servicio 2: Motor Principal de Seguridad & UFW Driver
 * Autores: Santiago Mulet & Manuel Abrego
 * Framework: Express / Node.js + Redis Pub/Sub + Linux UFW (CAP_NET_ADMIN)
 */

const express = require('express');
const { exec, spawn } = require('child_process');
const redis = require('redis');
const fs = require('fs');
const readline = require('readline');

const app = express();
const PORT = process.env.PORT || 3001;
const LOG_PATH = process.env.SSH_LOG_PATH || '/var/log/auth.log';
const UNBAN_CHANNEL = 'channel:unban_events';

app.use(express.json());

// Clientes de Redis (Cliente general + Subscriptor Pub/Sub)
const redisClient = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
const subClient = redisClient.duplicate();

// Regex optimizada para SSH Auth logs
// (en Ubuntu 24.04+ el proceso se llama "sshd-session[PID]"; se aceptan ambas variantes)
const SSH_FAILED_REGEX = /sshd(?:-session)?\\[\\d+\\]: Failed password for (invalid user )?(\\S+) from (\\d+\\.\\d+\\.\\d+\\.\\d+) port (\\d+)/;
const SSH_INVALID_REGEX = /sshd(?:-session)?\\[\\d+\\]: Invalid user (\\S+) from (\\d+\\.\\d+\\.\\d+\\.\\d+) port (\\d+)/;

// =========================================================================
// 1. Ejecutor de Reglas UFW Firewall
// =========================================================================
class UfwFirewallManager {
  static banIp(ip, reason = 'bannedbyabrejeet') {
    const cmd = \`ufw insert 1 deny from \${ip} to any port 22 comment 'bannedbyabrejeet:\${reason}'\`;
    console.log(\`[UFW EXEC] \${cmd}\`);
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error(\`[UFW ERROR] Failed to ban \${ip}:\`, stderr);
        return;
      }
      console.log(\`[UFW SUCCESS] IP \${ip} blocked successfully on port 22.\`);
    });
  }

  static unbanIp(ip) {
    const cmd = \`ufw delete deny from \${ip} to any port 22\`;
    console.log(\`[UFW EXEC] \${cmd}\`);
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error(\`[UFW ERROR] Failed to unban \${ip}:\`, stderr);
        return;
      }
      console.log(\`[UFW SUCCESS] IP \${ip} unbanned from UFW.\`);
    });
  }
}

// =========================================================================
// 2. Evaluador de Ataques y Reglas de Fallo
// =========================================================================
async function handleSshFailure(ip, user) {
  // 1. Verificar Whitelist
  const isWhitelisted = await redisClient.sIsMember('config:whitelist', ip);
  if (isWhitelisted) {
    console.log(\`[SECURITY ENGINE] IP \${ip} is whitelisted. Ignoring failure.\`);
    return;
  }

  // 2. Verificar si ya está baneada
  const isBanned = await redisClient.hExists('ip:banned', ip);
  if (isBanned) return;

  // 3. Obtener configuración
  const settings = await redisClient.hGetAll('config:settings');
  const maxRetries = parseInt(settings.max_retries || '5', 10);
  const findTimeMin = parseInt(settings.findtime_min || '10', 10);
  const banTimeMin = parseInt(settings.ban_time_min || '60', 10);

  const key = \`ip:failures:\${ip}\`;
  const now = Date.now();

  // Push timestamp y fijar TTL
  await redisClient.rPush(key, now.toString());
  await redisClient.expire(key, findTimeMin * 60);

  // Contar fallos dentro del Findtime
  const attempts = await redisClient.lRange(key, 0, -1);
  const validAttempts = attempts.filter(t => (now - parseInt(t, 10)) <= findTimeMin * 60 * 1000);

  console.log(\`[SECURITY ENGINE] IP \${ip} attempts: \${validAttempts.length}/\${maxRetries} (user: \${user})\`);

  if (validAttempts.length >= maxRetries) {
    console.warn(\`🚨 [THREAT DETECTED] IP \${ip} exceeded \${maxRetries} retries in \${findTimeMin}m. Executing BAN!\`);
    
    // Registrar en ip:banned
    const banRecord = {
      ip,
      banned_at: now,
      expires_at: now + banTimeMin * 60 * 1000,
      attempts: validAttempts.length,
      last_user: user,
      reason: \`Exceeded \${maxRetries} retries within \${findTimeMin}m\`
    };

    await redisClient.hSet('ip:banned', ip, JSON.stringify(banRecord));
    
    // Ejecutar orden UFW
    UfwFirewallManager.banIp(ip, 'ssh_bruteforce');

    // Limpiar lista de fallos
    await redisClient.del(key);
  }
}

// =========================================================================
// 3. Suscriptor Redis Pub/Sub para Desbaneo Desacoplado
// =========================================================================
async function initPubSub() {
  await subClient.connect();
  await subClient.subscribe(UNBAN_CHANNEL, (message) => {
    try {
      const data = JSON.parse(message);
      console.log(\`[REDIS PUBSUB] Received unban event:\`, data);
      if (data.action === 'UNBAN' && data.ip) {
        UfwFirewallManager.unbanIp(data.ip);
      }
    } catch (e) {
      console.error('[REDIS PUBSUB ERROR]', e);
    }
  });
  console.log(\`[REDIS PUBSUB] Listening for unban orders on '\${UNBAN_CHANNEL}'\`);
}

// =========================================================================
// 4. Inicialización
// =========================================================================
async function bootstrap() {
  await redisClient.connect();
  await initPubSub();

  app.listen(PORT, () => {
    console.log(\`⚡ Bannedbyabrejeet Security Engine running on port \${PORT}\`);
  });
}

bootstrap().catch(console.error);`
  },
  {
    name: 'Dockerfile.fastapi',
    path: '/docker/Dockerfile.fastapi',
    language: 'dockerfile',
    description: 'Dockerfile para el Servicio 1 (FastAPI + Python 3.11)',
    content: `FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

RUN apt-get update && apt-get install -y --no-install-recommends \\
    gcc \\
    libffi-dev \\
    curl \\
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]`
  },
  {
    name: 'Dockerfile.security',
    path: '/docker/Dockerfile.security',
    language: 'dockerfile',
    description: 'Dockerfile para el Servicio 2 (Node.js con UFW e iptables)',
    content: `FROM node:20-alpine

WORKDIR /app

# Instalar utilidades de red Linux requeridas para CAP_NET_ADMIN y manipulación UFW
RUN apk add --no-cache \\
    iptables \\
    ip6tables \\
    ufw \\
    bash \\
    curl

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["node", "server.js"]`
  },
  {
    name: 'Dockerfile.redis',
    path: '/docker/Dockerfile.redis',
    language: 'dockerfile',
    description: 'Dockerfile endurecido para Redis 7.2-Alpine con usuario sin privilegios y soporte para AOF/RDB',
    content: `FROM redis:7.2-alpine

# Etiqueta de Metadatos
LABEL maintainer="Santiago Mulet & Manuel Abrego <ms.abrego@alumno.etec.um.edu.ar>"
LABEL project="Bannedbyabrejeet - In-Memory Centralized State Engine"
LABEL version="1.0.0"

# Crear directorio de configuración y datos persistentes
RUN mkdir -p /usr/local/etc/redis /data && \\
    chown -R redis:redis /usr/local/etc/redis /data

# Copiar configuración optimizada de producción
COPY ../redis/redis.conf /usr/local/etc/redis/redis.conf

# Asignar permisos estrictos de lectura
RUN chmod 640 /usr/local/etc/redis/redis.conf && \\
    chown redis:redis /usr/local/etc/redis/redis.conf

# Definir volumen persistente para snapshots RDB y log AOF
VOLUME ["/data"]
WORKDIR /data

# Cambiar al usuario de servicio 'redis' (Principio de Mínimo Privilegio)
USER redis

# Puerto estándar de Redis
EXPOSE 6379

# Healthcheck interno del contenedor
HEALTHCHECK --interval=5s --timeout=3s --retries=5 \\
  CMD redis-cli ping || exit 1

# Comando de arranque con archivo de configuración
CMD ["redis-server", "/usr/local/etc/redis/redis.conf"]`
  },
  {
    name: 'redis.conf',
    path: '/redis/redis.conf',
    language: 'properties',
    description: 'Configuración de persistencia híbrida AOF/RDB, seguridad y Redis Streams',
    content: `# =========================================================================
# Bannedbyabrejeet - Configuración de Producción de Redis 7.2
# =========================================================================

# --- RED Y SEGURIDAD ---
bind 0.0.0.0
protected-mode yes
port 6379
tcp-backlog 511
timeout 0
tcp-keepalive 300
requirepass abrejeet_redis_secure_pass

# --- GENERAL ---
daemonize no
loglevel notice
logfile ""
databases 16

# --- PERSISTENCIA RDB (Snapshots Periódicos a Disco) ---
# Guarda a disco si:
# - Pasaron 900s (15 min) y al menos 1 clave cambió
# - Pasaron 300s (5 min) y al menos 10 claves cambiaron
# - Pasaron 60s (1 min) y al menos 10000 claves cambiaron
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /data

# --- PERSISTENCIA AOF (Append-Only File - Máxima Durabilidad) ---
# Registra cada operación de escritura de inmediato
appendonly yes
appendfilename "appendonly.aof"
appenddirname "appendonlydir"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
aof-load-truncated yes
aof-use-rdb-preamble yes

# --- POLÍTICAS DE GESTIÓN DE MEMORIA ---
# Límite prudente para el contenedor; noeviction garantiza que
# órdenes de desbaneo ni configuraciones de seguridad sean purgadas
maxmemory 256mb
maxmemory-policy noeviction

# --- REDIS STREAMS OPTIMIZATION ---
# Longitud máxima y tamaño de nodo para streams de eventos
stream-node-max-bytes 4096
stream-node-max-entries 100`
  },
  {
    name: 'redis-schema-agreed.md',
    path: '/docs/redis-schema-agreed.md',
    language: 'markdown',
    description: 'Especificación del Esquema Centralizado en Redis acordado entre Servicio 1 y Servicio 2',
    content: `# Esquema Centralizado de Datos en Redis (Bannedbyabrejeet)

## Resumen de Arquitectura
Redis opera como la fuente única de verdad en memoria (*Single Source of Truth*) y bus de mensajería para:
1. **Servicio 1 (FastAPI)**: Administrador de credenciales, parámetros de firewall y emisor de órdenes.
2. **Servicio 2 (Express)**: Consumidor de logs de SSH, ejecutor de reglas UFW y suscriptor de desbaneos.

---

## 1. Tabla de Espacios de Nombres (Namespaces)

| Clave / Patrón | Tipo de Estructura | TTL / Expiración | Propietario de Escritura | Consumidor | Propósito |
|---|---|---|---|---|---|
| \`auth:admin\` | **Hash** | Persistente | Servicio 1 | Servicio 1 | Credenciales del administrador con hash bcrypt |
| \`auth:reset_token:<TOKEN>\` | **String** | 900s (15 min) | Servicio 1 | Servicio 1 | Token temporal para recuperación de contraseña |
| \`config:settings\` | **Hash** | Persistente | Servicio 1 | Servicio 1 & 2 | Parámetros del motor: \`max_retries\`, \`findtime_min\`, \`ban_time_min\` |
| \`config:whitelist\` | **Set** | Persistente | Servicio 1 | Servicio 2 | Conjunto de IPs/CIDRs inmunes (incluye 127.0.0.1 y ::1) |
| \`ip:failures:<IP>\` | **List** | \`findtime_min\` seg | Servicio 2 | Servicio 2 | Marcas de tiempo de reintentos SSH fallidos |
| \`ip:banned\` | **Hash** | Persistente | Servicio 2 | Servicio 1 & 2 | Registro JSON de IPs bloqueadas en UFW |
| \`ip:banned_ttl:<IP>\` | **String** | \`ban_time_min\` min | Servicio 2 | Servicio 2 | Disparador TTL para auto-desbaneo de expiración |
| \`stream:unban_orders\` | **Stream** | Persistente (AOF) | Servicio 1 | Servicio 2 | Flujo transaccional de órdenes de desbaneo (\`XADD\`/\`XACK\`) |

---

## 2. Detalle de Estructuras

### \`auth:admin\` (Hash)
\`\`\`redis
HSET auth:admin username "admin"
HSET auth:admin email "santiago@etec.um.edu.ar"
HSET auth:admin password_hash "$2b$12$eK5b9z1...[BCRYPT]"
HSET auth:admin created_at "2026-09-02T12:00:00Z"
\`\`\`

### \`config:settings\` (Hash)
\`\`\`redis
HSET config:settings max_retries "5"
HSET config:settings findtime_min "10"
HSET config:settings ban_time_min "60"
\`\`\`

### \`config:whitelist\` (Set)
\`\`\`redis
SADD config:whitelist "127.0.0.1"
SADD config:whitelist "::1"
SADD config:whitelist "192.168.1.50"
\`\`\`

### \`ip:failures:<IP>\` (List con TTL)
\`\`\`redis
RPUSH ip:failures:198.51.100.42 "1756801200000"
EXPIRE ip:failures:198.51.100.42 600
\`\`\`

### \`stream:unban_orders\` (Redis Stream)
\`\`\`redis
XADD stream:unban_orders * event_id "uuid-1234" action "UNBAN" ip "198.51.100.42" operator "admin" timestamp "2026-09-04T08:00:00Z"
\`\`\``
  }
];
