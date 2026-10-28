"""
Bannedbyabrejeet - Servicio 1: REST API, Auth & Configuration Engine
Autores: Santiago Mulet & Manuel Abrego
Framework: FastAPI (Python 3.11) + Redis
Ejecutado por: ABREGO (IP: 192.168.220.123)
Conexión Redis: MULET (IP: 192.168.220.127:6379)
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

REDIS_HOST = os.getenv("REDIS_HOST", "192.168.220.127")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASS = os.getenv("REDIS_PASSWORD", None)
JWT_SECRET = os.getenv("JWT_SECRET_KEY", "bannedbyabrejeet_enterprise_secret_2026")
JWT_ALGORITHM = "HS256"

print(f"[FASTAPI INIT] Conectando a Redis en {REDIS_HOST}:{REDIS_PORT}...")
r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASS, decode_responses=True)

app = FastAPI(
    title="Bannedbyabrejeet Enterprise API (Servicio 1 - Abrego)",
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
    auto_unban_enabled: bool = Field(True, description="Desbanear automáticamente al expirar el TTL")
    ufw_enabled: bool = Field(True, description="Motor de bloqueo UFW activo")
    log_source: str = Field("/var/log/auth.log", description="Origen de los eventos SSH")
    ssh_port: int = Field(22, ge=1, le=65535, description="Puerto SSH vigilado")

class WhitelistItem(BaseModel):
    ip: str = Field(..., description="Dirección IP o subred CIDR (Ej: 192.168.220.123 o 10.0.0.0/24)")

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
    try:
        if not r.exists("config:settings"):
            r.hset("config:settings", mapping={
                "max_retries": 5,
                "ban_time_min": 60,
                "findtime_min": 10
            })
        # Asegurar que localhost y la IP de Abrego estén protegidas en la Whitelist
        r.sadd("config:whitelist", "127.0.0.1")
        r.sadd("config:whitelist", "::1")
        r.sadd("config:whitelist", "192.168.220.123")
        print("[FASTAPI STARTUP] Conexión a Redis exitosa y configuración inicial verificada.")
    except Exception as e:
        print(f"[FASTAPI WARNING] No se pudo inicializar Redis de inmediato: {e}")

@app.get("/api/v1/health", tags=["System Health"])
def health_check():
    try:
        redis_ping = r.ping()
    except Exception as e:
        redis_ping = False
    return {
        "status": "healthy" if redis_ping else "degraded",
        "service": "FastAPI Management Service (Framework A - Abrego)",
        "redis_connected": redis_ping,
        "redis_target": f"{REDIS_HOST}:{REDIS_PORT}",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/v1/auth/status", tags=["Authentication"])
def check_auth_status():
    has_admin = r.exists("auth:admin") == 1
    identity = {}
    if has_admin:
        data = r.hgetall("auth:admin")
        identity = {
            "username": data.get("username"),
            "email": data.get("email"),
        }
    return {"is_initialized": has_admin, **identity}

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
    
    user_match = (req.username.lower() == admin_data.get("username", "").lower()) or \
                 (req.username.lower() == admin_data.get("email", "").lower())
    
    if not user_match:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    stored_hash = admin_data.get("password_hash", "").encode('utf-8')
    if not bcrypt.checkpw(req.password.encode('utf-8'), stored_hash):
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
    
    token = f"rst_{os.urandom(6).hex()}_{int(datetime.utcnow().timestamp())}"
    r.setex(f"auth:reset_token:{token}", 900, req.email)
    
    return {
        "status": "success",
        "message": "Correo de recuperación emitido. Token volátil persistido en Redis con EXPIRE 900.",
        "reset_token": token,
        "expires_in_seconds": 900,
        "redis_key": f"auth:reset_token:{token}"
    }

@app.post("/api/v1/auth/reset-password", tags=["Authentication"])
def reset_password(req: ResetPasswordRequest):
    email = r.get(f"auth:reset_token:{req.token}")
    if not email:
        raise HTTPException(status_code=400, detail="El enlace de recuperación ha caducado o no es válido")
    
    salt = bcrypt.gensalt()
    new_hash = bcrypt.hashpw(req.new_password.encode('utf-8'), salt).decode('utf-8')
    
    r.hset("auth:admin", "password_hash", new_hash)
    r.delete(f"auth:reset_token:{req.token}")
    
    return {"message": "Contraseña actualizada correctamente"}

@app.get("/api/v1/config/settings", response_model=SystemSettings, tags=["Configuration"])
def get_settings():
    data = r.hgetall("config:settings")
    return {
        "max_retries": int(data.get("max_retries", 5)),
        "ban_time_min": int(data.get("ban_time_min", 60)),
        "findtime_min": int(data.get("findtime_min", 10)),
        "auto_unban_enabled": data.get("auto_unban_enabled", "true").lower() in ("1", "true", "yes"),
        "ufw_enabled": data.get("ufw_enabled", "true").lower() in ("1", "true", "yes"),
        "log_source": data.get("log_source", "/var/log/auth.log"),
        "ssh_port": int(data.get("ssh_port", 22)),
    }

@app.put("/api/v1/config/settings", tags=["Configuration"])
def update_settings(settings: SystemSettings):
    r.hset("config:settings", mapping={
        "max_retries": settings.max_retries,
        "ban_time_min": settings.ban_time_min,
        "findtime_min": settings.findtime_min,
        "auto_unban_enabled": "true" if settings.auto_unban_enabled else "false",
        "ufw_enabled": "true" if settings.ufw_enabled else "false",
        "log_source": settings.log_source,
        "ssh_port": settings.ssh_port,
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
    Publica evento en Redis Pub/Sub hacia el Servicio 2 (Node.js en máquina de Mulet)
    para la remoción inmediata de la regla en UFW Linux Firewall.
    """
    now = int(datetime.utcnow().timestamp() * 1000)
    event_payload = {
        "action": "UNBAN",
        "ip": req.ip,
        "reason": req.reason,
        "operator": "Abrego (FastAPI)",
        "timestamp": now
    }
    subscribers = r.publish("channel:unban_events", json.dumps(event_payload))
    r.hdel("ip:banned", req.ip)
    # Se registra en el historial para que el Dashboard muestre la orden de unbaneo
    r.lpush("security:pubsub", json.dumps({
        "id": f"pubsub-{now}",
        "channel": "channel:unban_events",
        "sender": "FastAPI_Service_1",
        "payload": {
            "action": "UNBAN",
            "ip": req.ip,
            "timestamp": now,
            "reason": req.reason
        }
    }))
    r.ltrim("security:pubsub", 0, 199)
    print(f"[UNBAN TRIGGERED] IP {req.ip} publicada en 'channel:unban_events'. Suscriptores notificados: {subscribers}")
    return {
        "message": f"Unban order published to channel:unban_events for IP {req.ip}",
        "subscribers_notified": subscribers
    }


@app.get("/api/v1/security/state", tags=["Security Engine Bridge"])
def security_state():
    """
    Estado consolidado de seguridad para el Frontend: IPs baneadas, contadores
    de fallos, eventos SSH y mensajes Pub/Sub. Todo leído desde Redis, que es
    la fuente de verdad compartida entre el Servicio 1 y el Servicio 2.
    """
    try:
        banned_raw = r.hgetall("ip:banned")
        banned = []
        for ip, value in banned_raw.items():
            try:
                record = json.loads(value)
            except Exception:
                record = {"reason": value}
            banned.append({"ip": ip, **record})

        failure_keys = r.keys("ip:failures:*")
        failures = []
        for key in failure_keys:
            ip = key.split("ip:failures:")[-1]
            timestamps = [int(t) for t in r.lrange(key, 0, -1)]
            failures.append({
                "ip": ip,
                "timestamps": timestamps,
                "firstSeen": min(timestamps) if timestamps else 0,
                "lastSeen": max(timestamps) if timestamps else 0,
                "totalAttempts": len(timestamps),
                "ttlSeconds": r.ttl(key),
                "targetedUsers": []
            })

        logs = []
        for raw in r.lrange("security:logs", 0, 199):
            try:
                logs.append(json.loads(raw))
            except Exception:
                pass

        messages = []
        for raw in r.lrange("security:pubsub", 0, 199):
            try:
                messages.append(json.loads(raw))
            except Exception:
                pass

        ufw_ops = []
        for raw in r.lrange("security:ufw_ops", 0, 49):
            try:
                ufw_ops.append(json.loads(raw))
            except Exception:
                pass

        return {
            "banned": banned,
            "failures": failures,
            "logs": logs,
            "pubsub": messages,
            "ufw_ops": ufw_ops,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"No se pudo leer el estado de Redis: {e}")
