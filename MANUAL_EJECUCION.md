# 📘 Manual de Ejecución — Bannedbyabrejeet

Guía única con los tres escenarios:
- **[A] Solo en mi máquina** (todo en Abrego, sin sudo, con Docker)
- **[B] Máquina Abrego** (`192.168.220.123`) — parte distribuida
- **[C] Máquina Mulet** (`192.168.220.127`) — parte distribuida

> 📁 El repositorio está en **`~/beta`** en ambas máquinas (la guía vieja decía `~/betaa`).

| Componente | Servicio | Puerto | Corre en |
|---|---|---|---|
| Frontend React + Vite | SPA | 3000 | Abrego |
| Backend A (FastAPI) | API, Auth, Config | 8000 | Abrego |
| Redis | Sesiones, config, Pub/Sub | 6379 | Mulet |
| Backend B (Node) | Motor SSH + driver UFW | 3001 | Mulet |
| Nginx | Reverse proxy (entrada única) | 80 | Mulet |

**Punto de entrada general:** `http://192.168.220.127` (Mulet) → Nginx reparte a los 3 servicios.

---

## 0. Dependencias

### 0.1 Ya instaladas en la máquina de Abrego (`192.168.220.123`)

| Dependencia | Versión | Para qué |
|---|---|---|
| Node.js | v24.16.0 | Frontend Vite + Backend B |
| Python | 3.14.4 | Backend A (FastAPI) |
| Docker | 29.9.1 | Redis y Nginx del modo local |
| `virtualenv` (pip --user) | 21.14.12 | Crear el `venv` **sin sudo** |
| `venv` en `backend-a-fastapi` | — | Dependencias Python del Backend A ya instaladas |
| `node_modules/` (raíz) | — | Dependencias del frontend |
| `node_modules/` (`backend-b-engine`) | — | `express` + `redis` |

Para **reinstalar desde cero** en una máquina nueva:

```bash
# --- Node (raíz del repo): frontend
cd ~/beta && npm install

# --- Backend B
cd ~/beta/servicios-mulet/backend-b-engine && npm install

# --- Backend A: venv (sin sudo, usando virtualenv)
pip3 install --user --break-system-packages virtualenv
cd ~/beta/servicios-abrego/backend-a-fastapi
~/.local/bin/virtualenv venv
./venv/bin/pip install -r requirements.txt
```

> 💡 Alternativa con sudo: `sudo apt install python3-venv` → entonces `python3 -m venv venv` funciona
> y `start.sh` crea el entorno solo. **Ojo**: si el `venv` ya existe, `start.sh` no lo recrea;
> por eso acá se usó `virtualenv` (crea un venv completo con `pip` incluido).

### 0.2 Faltantes en la máquina de Mulet (`192.168.220.127`)

Hay que instalarlas **con sudo en esa máquina**:

```bash
sudo apt update
sudo apt install -y redis-server nginx nodejs npm ufw
```

Después, dependencias del proyecto:

```bash
cd ~/beta/servicios-mulet/backend-b-engine && npm install
```

---

## [A] Modo Local — todo en MI máquina

Sin `sudo`, sin máquina de Mulet. Redis y Nginx corren en Docker.

### A.1 Arrancar

```bash
cd ~/beta
./local-dev/run-local.sh start
```

Salida esperada:

```
[1/5] Redis (Docker)          ✓ Redis UP -> localhost:6379 (PONG)
[2/5] Backend A - FastAPI     ✓ Backend A responde en http://127.0.0.1:8000/api/v1/health
[3/5] Backend B - Motor SSH   ✓ Backend B responde en http://127.0.0.1:3001/api/security/health
[4/5] Frontend A - React      ✓ Frontend responde en http://127.0.0.1:3000/
[5/5] Nginx reverse proxy     ✓ Nginx UP -> http://localhost
```

### A.2 Abrir

- **http://localhost** ← entrada única (equivalente a producción)
- http://localhost:3000 → frontend directo · login `admin` / `admin123`
- http://localhost:8000/docs → Swagger del Backend A
- http://localhost:3001/api/security/health → Backend B

### A.3 Comandos de control

```bash
./local-dev/run-local.sh start      # modo local: motor con log de prueba (sin root)
./local-dev/run-local.sh start-real # modo REAL: lee /var/log/auth.log con sudo (para ataques reales)
./local-dev/run-local.sh status     # tabla de estado de los 5 servicios
./local-dev/run-local.sh logs       # sigue todos los logs (Ctrl+C para salir)
./local-dev/run-local.sh stop       # detiene todo
./local-dev/run-local.sh restart    # reinicia
./local-dev/run-local.sh purge      # borra contenedores + datos de Redis
```

### A.4 Qué cambia respecto a producción

| | Producción | Modo local |
|---|---|---|
| Redis | `192.168.220.127:6379` (Mulet) | `127.0.0.1:6379` (contenedor Docker) |
| Nginx | upstreams → `192.168.220.123` | upstreams → `127.0.0.1` |
| UFW | real (necesita root) | **simulado** por `local-dev/bin/ufw` → `local-dev/ufw-rules.log` |
| `auth.log` | `/var/log/auth.log` (root) | `local-dev/auth.log` (escribible) |

> El shim de UFW se inyecta en el `PATH` del Backend B, por eso los logs dicen
> `✅ [UFW ÉXITO]` igual que en producción, pero **no se toca el firewall real**.

### A.5 Levantar a mano (5 terminales)

```bash
# T1 - Redis
docker rm -f beta-redis 2>/dev/null
docker run -d --name beta-redis -p 6379:6379 redis:7-alpine

# T2 - Backend A
cd ~/beta/servicios-abrego/backend-a-fastapi
REDIS_HOST=127.0.0.1 REDIS_PORT=6379 ./start.sh

# T3 - Backend B
cd ~/beta/servicios-mulet/backend-b-engine
touch ~/beta/local-dev/auth.log
REDIS_URL=redis://127.0.0.1:6379 PORT=3001 \
SSH_LOG_PATH=$HOME/beta/local-dev/auth.log \
SKIP_SUDO=1 PATH=$HOME/beta/local-dev/bin:$PATH \
./start.sh

# T4 - Frontend
cd ~/beta && npm run dev

# T5 - Nginx
cd ~/beta
docker rm -f beta-nginx 2>/dev/null
docker run -d --name beta-nginx --network host \
  -v "$PWD/local-dev/nginx-local.conf:/etc/nginx/nginx.conf:ro" nginx:alpine
```

### A.6 Prueba del ciclo completo (ban + unban)

```bash
# 1) 5 intentos SSH fallidos -> el motor cuenta, banea en Redis y crea la regla
for i in 1 2 3 4 5; do
  curl -s -X POST http://localhost/api/security/simulate-log \
    -H 'Content-Type: application/json' \
    -d "{\"log_line\":\"Oct 21 15:00:0$i etec sshd[1234]: Failed password for invalid user root from 203.0.113.77 port 5555$i ssh2\"}"
done

# 2) ver el ban
docker exec -it beta-redis redis-cli HGETALL ip:banned
PATH=$HOME/beta/local-dev/bin:$PATH ufw status numbered

# 3) desbanear: FastAPI publica en Redis Pub/Sub -> Backend B borra la regla
curl -s -X POST http://localhost/api/v1/security/unban \
  -H 'Content-Type: application/json' -d '{"ip":"203.0.113.77"}'

# 4) confirmar
docker exec -it beta-redis redis-cli HGETALL ip:banned    # vacío
PATH=$HOME/beta/local-dev/bin:$PATH ufw status numbered    # sin reglas
```

En el log del Backend B (`local-dev/logs/backend-b.log`) se ve:

```
⚠️ [FALLO COMPUTADO] IP: 203.0.113.77 | Faltas: 5/5 | User: root
🔥 [AMENAZA CONFIRMADA] IP 203.0.113.77 superó 5 intentos en 10m. ¡APLICANDO BAN!
🛡️ [UFW EXEC BAN] ufw insert 1 deny from 203.0.113.77 to any port 22 comment '...'
✅ [UFW ÉXITO] IP 203.0.113.77 BLOQUEADA en el puerto 22.
📬 [REDIS PUBSUB] Mensaje recibido en 'channel:unban_events'
🔓 [UFW EXEC UNBAN] ufw delete deny from 203.0.113.77 to any port 22
✅ [UFW ÉXITO] Regla de bloqueo para IP 203.0.113.77 eliminada de UFW.
```

### A.7 La app ya NO es una maqueta

> 🔄 **Actualizado**: antes el frontend generaba todos los datos en el navegador (mock).
> Ahora `src/services/securityEngine.ts` consume la API real y refresca el estado cada 2 s.

| Capa | Dónde vive | Cómo se conecta |
|---|---|---|
| Frontend (Abrego) | `src/services/securityEngine.ts` + `src/services/api.ts` | `fetch` a `/api/v1/*` y `/api/security/*` |
| Proxy | Vite dev server | `/api/v1` y `/api/security` → `VITE_API_TARGET` |
| Backend A | `servicios-abrego/backend-a-fastapi` | Redis |
| Backend B | `servicios-mulet/backend-b-engine` | Redis + `/var/log/auth.log` + UFW |

**El destino del proxy se define con `VITE_API_TARGET`:**

```bash
# Modo local (Nginx en esta misma máquina)
VITE_API_TARGET=http://localhost npm run dev

# Modo distribuido (Nginx en Mulet)
VITE_API_TARGET=http://192.168.220.127 npm run dev
```

`servicios-abrego/frontend-a-react/start.sh` ya usa `http://192.168.220.127` por defecto
(que es el modo distribuido) y acepta `VITE_API_TARGET` por entorno.

**Lo que ahora es real en el Dashboard:**

- ✅ Contadores de logs SSH → eventos reales guardados por el Backend B en `security:logs`
- ✅ IPs baneadas → hash `ip:banned` de Redis
- ✅ Reglas UFW → `ufw status numbered` ejecutado por el Backend B (`/api/security/ufw-rules`)
- ✅ Whitelist y configuración → `config:whitelist` / `config:settings`
- ✅ Login / setup admin / reset de contraseña → `auth:admin` con bcrypt en Redis
- ✅ Botón **Desbanear** → `POST /api/v1/security/unban` → Pub/Sub → borrado real de la regla
- ✅ Simulador de ataques → `POST /api/security/simulate-log` → motor real → UFW real

**Único resto de mock:** los datos geográfica (país/ciudad) de las IPs, porque no hay
servicio de geolocalización. Se resuelve con `SAMPLE_GEO_MAP` en `src/data/presetData.ts`.

---

## [B] Máquina ABREGO (`192.168.220.123`)

### B.1 Preparar (una sola vez)

```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv nodejs npm ufw
sudo ufw allow from 192.168.220.127        # deja entrar a Mulet

# dependencias del proyecto
cd ~/beta && npm install                                   # frontend
cd ~/beta/servicios-mulet/backend-b-engine && npm install   # (no se usa acá, pero por si acaso)
pip3 install --user --break-system-packages virtualenv
cd ~/beta/servicios-abrego/backend-a-fastapi
~/.local/bin/virtualenv venv && ./venv/bin/pip install -r requirements.txt
```

### B.2 Arrancar (2 terminales)

**Terminal 1 — Backend A (FastAPI)**

```bash
cd ~/beta/servicios-abrego/backend-a-fastapi
chmod +x start.sh
./start.sh
# → Uvicorn running on http://0.0.0.0:8000
# → Swagger: http://192.168.220.123:8000/docs
```

> `start.sh` usa `REDIS_HOST=192.168.220.127` (Mulet) por defecto.
> Para apuntar a otro Redis: `REDIS_HOST=127.0.0.1 ./start.sh`

**Terminal 2 — Frontend (Vite)**

```bash
cd ~/beta/servicios-abrego/frontend-a-react
chmod +x start.sh
./start.sh
# → VITE ready ... Network: http://192.168.220.123:3000
```

### B.3 Verificar

```bash
curl -s http://192.168.220.123:8000/api/v1/health
# {"status":"healthy",...,"redis_connected":true,"redis_target":"192.168.220.127:6379"}
```

---

## [C] Máquina MULET (`192.168.220.127`)

### C.1 Preparar (una sola vez)

```bash
sudo apt update
sudo apt install -y redis-server nginx nodejs npm ufw

# permitir a Abrego y abrir los puertos
sudo ufw allow from 192.168.220.123
sudo ufw allow 80/tcp
sudo ufw allow 6379/tcp
sudo ufw enable

cd ~/beta/servicios-mulet/backend-b-engine && npm install
```

### C.2 Configurar Redis para que lo vea Abrego

```bash
sudo nano /etc/redis/redis.conf
```
- `bind 127.0.0.1 ::1` → `bind 0.0.0.0`
- `protected-mode yes` → `protected-mode no`

```bash
sudo systemctl restart redis-server
redis-cli ping      # PONG
```

### C.3 Arrancar (3 terminales)

**Terminal 1 — Redis** (ya corre como servicio, solo verificá)
```bash
redis-cli ping      # PONG
```

**Terminal 2 — Nginx**
```bash
cd ~/beta/servicios-mulet/proxy-nginx
chmod +x setup-nginx.sh
./setup-nginx.sh
# → Nginx configurado y activo en el puerto 80
```

**Terminal 3 — Backend B** (necesita sudo para UFW y `auth.log`)
```bash
cd ~/beta/servicios-mulet/backend-b-engine
chmod +x start.sh
./start.sh
# → ⚡ Bannedbyabrejeet Security Engine (Mulet) en puerto 3001
# → 🛡️ Control UFW: Activado
```

> `start.sh` pide la contraseña de `sudo` (para `ufw` y leer `/var/log/auth.log`).
> Con `SKIP_SUDO=1` arranca sin privilegios, pero entonces **no puede banear de verdad**.

### C.4 Verificar

```bash
curl -s http://192.168.220.127/api/security/health
redis-cli ping
sudo ufw status numbered
```

---

## 🚀 Orden de arranque el día de la presentación

1. **Mulet → Redis** (`redis-cli ping` = PONG)
2. **Mulet → Nginx** (`./setup-nginx.sh`)
3. **Mulet → Backend B** (`./start.sh`) — *dejar esta terminal visible: ahí se ve el ban*
4. **Abrego → Backend A** (`./start.sh`)
5. **Abrego → Frontend** (`./start.sh`)
6. Los evaluadores entran a **`http://192.168.220.127`**

### Guion de demo rápido

1. Entrar por `http://192.168.220.127` → Nginx muestra el frontend de Abrego.
2. `http://192.168.220.127/docs` → Swagger (corre en Abrego, guarda en Redis de Mulet).
3. Desde otra máquina: `ssh root@192.168.220.127` 5 veces → en la terminal de Mulet
   aparece `🔥 [AMENAZA CONFIRMADA]` y `sudo ufw status numbered` muestra la regla `DENY IN <IP>`.
4. En el dashboard (pantalla de Abrego) tocá **Desbanear** → FastAPI publica en
   `channel:unban_events` → en la terminal de Mulet aparece `📬 [REDIS PUBSUB]` y
   `✅ [UFW ÉXITO] Regla de bloqueo eliminada`.

---

## 🩺 Troubleshooting

| Síntoma | Causa | Solución |
|---|---|---|
| `ensurepip is not available` | falta `python3-venv` | `sudo apt install python3-venv` o usar `virtualenv` (ver 0.1) |
| `redis_connected: false` | Redis caído o firewall | `redis-cli ping` en Mulet + `sudo ufw allow 6379/tcp` |
| `/api/security/health` → 404 | Nginx quitando el prefijo | `proxy_pass http://backend_b_engine;` **sin** barra final (ya corregido) |
| `Port 3000 is in use` | quedó un vite zombie | `ss -ltnp \| grep 3000` y matar el PID; o `./local-dev/run-local.sh stop` |
| `Cannot GET /health` vía Nginx | mismo bug del prefijo | ver arriba |
| Frontend no carga datos reales | es mock por diseño | usar la API (Swagger / `curl`) |
| `Permission denied (publickey)` por SSH | clave no copiada | `ssh-copy-id <usuario>@192.168.220.127` |

---

## 📂 Archivos modificados/creados

| Archivo | Cambio |
|---|---|
| `local-dev/` | **nuevo**: modo local completo (script, nginx conf, shim de UFW, README) |
| `src/services/api.ts` | **nuevo**: cliente HTTP contra Backend A y Backend B |
| `src/services/securityEngine.ts` | **reescrito**: estado real por polling (2 s) en lugar de mock en memoria |
| `src/App.tsx` | arranca/detiene el polling del backend |
| `src/components/*.tsx` | handlers `async` (login, setup, unban, whitelist, config, simulador) |
| `servicios-mulet/backend-b-engine/server.js` | parsea y **persiste los eventos en Redis**, endpoints `/logs`, `/banned`, `/failures`, `/pubsub`, `/ufw-rules`, `/stats`, CORS |
| `servicios-abrego/backend-a-fastapi/main.py` | `GET /api/v1/security/state`, `auth/status` con identidad, `SystemSettings` completo, registro de unban en `security:pubsub` |
| `vite.config.ts` | proxy de desarrollo `/api/v1` y `/api/security` → `VITE_API_TARGET` |
| `servicios-abrego/frontend-a-react/start.sh` | `VITE_API_TARGET` configurable (default: Nginx de Mulet) |
| `servicios-mulet/proxy-nginx/nginx.conf` | **fix**: `proxy_pass` sin barra final (bug del prefijo `/api/security/`) |
| `servicios-abrego/backend-a-fastapi/start.sh` | `REDIS_HOST`/`REDIS_PORT`/`JWT_SECRET_KEY` sobrescribibles por entorno |
| `servicios-mulet/backend-b-engine/start.sh` | soporte `SKIP_SUDO=1` y `REDIS_URL`/`PORT`/`SSH_LOG_PATH` por entorno |
| `.gitignore` | ignora `local-dev/run/`, `__pycache__/`, logs locales |
| `MANUAL_EJECUCION.md`, `PRUEBA_ATAQUE_MULET.md`, `PLAN_PRUEBA_SSH.md` | **nuevos**: manual de ejecución y runbook de la prueba de ataque |
