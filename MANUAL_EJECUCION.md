# 📘 Manual de Ejecución — Bannedbyabrejeet

Único manual del proyecto. Contiene los **tres modos de ejecución**:

| Modo | Qué prueba | Dónde corre | Necesita |
|---|---|---|---|
| **A. Todo local (simulado)** | La app y el dashboard sin tocar el firewall | 1 máquina | Docker |
| **B. Todo local + ataque real** | El ciclo real: SSH → detección → ban → desbaneo | 1 máquina + 1 dispositivo atacante | Docker + `sudo` |
| **C. Distribuido Abrego–Mulet** | La arquitectura de microservicios en 2 máquinas | 2 máquinas | `sudo` en ambas |

> Repositorio en **`~/beta`** (en ambas máquinas).

---

## 1. Arquitectura

```
┌──────────────────────────── ABREGO (192.168.220.123) ────────────────────────────┐
│  Frontend React (Vite) :3000          Backend A · FastAPI :8000                   │
│  · Dashboard (polling 2 s)            · auth (bcrypt) · config · whitelist         │
│  · Simulador · Redis Inspector        · /api/v1/security/state  (lectura Redis)     │
└───────────────────────────────────────────┬───────────────────────────────────────┘
                                            │ Redis (estado compartido)
┌──────────────────────────── MULET (192.168.220.127) ─────────────────────────────┐
│  Redis :6379      Backend B · Express :3001        Nginx :80 (entrada única)       │
│                   · lee /var/log/auth.log                                          │
│                   · cuenta fallos · ejecuta UFW · Pub/Sub de desbaneo              │
└────────────────────────────────────────────────────────────────────────────────────┘
```

**Regla de oro:** el ataque SSH debe apuntar a la máquina donde corre el **Backend B**,
porque es ese proceso el que lee el `auth.log`.

| Modo | Backend B corre en | El ataque apunta a |
|---|---|---|
| A / B | esta máquina (Abrego) | esta máquina (`192.168.220.123`) |
| C | Mulet | Mulet (`192.168.220.127`) |

**Punto de entrada** (modo C): `http://192.168.220.127` → Nginx reparte a los 3 servicios.

---

## 2. Requisitos previos

### 2.1 Esta máquina (Abrego)

```bash
# Node + Python + Docker
node -v          # ≥ 18
python3 -V       # ≥ 3.10
docker info      # el usuario debe estar en el grupo docker

# Dependencias del frontend
cd ~/beta && npm install

# Dependencias del Backend B
cd ~/beta/servicios-mulet/backend-b-engine && npm install

# Backend A: venv (sin sudo, con virtualenv)
pip3 install --user --break-system-packages virtualenv
cd ~/beta/servicios-abrego/backend-a-fastapi
[ -d venv ] || ~/.local/bin/virtualenv venv
./venv/bin/pip install -r requirements.txt
```

> Alternativa con sudo: `sudo apt install python3-venv` y luego `python3 -m venv venv`.

### 2.2 Mulet (solo modo C)

```bash
sudo apt update
sudo apt install -y redis-server nginx nodejs npm ufw sshpass
cd ~/beta/servicios-mulet/backend-b-engine && npm install
```

Configurar Redis para que lo vea Abrego:

```bash
sudo nano /etc/redis/redis.conf
#   bind 127.0.0.1 ::1   ->   bind 0.0.0.0
#   protected-mode yes  ->   protected-mode no
sudo systemctl restart redis-server
redis-cli ping          # PONG
```

Firewall de Mulet:

```bash
sudo ufw allow from 192.168.220.123
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 6379/tcp
sudo ufw enable
```

---

## 3. Modo A — Todo local, simulado

Ideal para mostrar la app sin tocar el firewall.

```bash
cd ~/beta
./local-dev/run-local.sh start
```

Salida esperada:

```
[1/5] Redis (Docker)          ✓ Redis UP -> localhost:6379 (PONG)
[2/5] Backend A - FastAPI     ✓ Backend A responde en :8000
[3/5] Backend B - Motor SSH   ✓ Backend B responde en :3001
[4/5] Frontend A - React      ✓ Frontend responde en :3000
[5/5] Nginx reverse proxy     ✓ Nginx UP -> http://localhost
```

| URL | Qué es |
|---|---|
| **http://localhost** | entrada única (equivalente a producción) |
| http://localhost:3000 | frontend directo · login `admin` / `admin123` |
| http://localhost:8000/docs | Swagger del Backend A |
| http://localhost:3001/api/security/health | Backend B |

En este modo el Backend B usa un **log de prueba** (`local-dev/auth.log`) y un **shim de UFW**
(`local-dev/bin/ufw`) que simula las reglas en `local-dev/ufw-rules.log`.
**Un ataque SSH real NO se detecta** en este modo.

Para probar el motor sin atacar:

```bash
for i in 1 2 3 4 5; do
  curl -s -X POST http://localhost/api/security/simulate-log \
    -H 'Content-Type: application/json' \
    -d "{\"log_line\":\"Oct 30 10:00:0$i etec sshd[1234]: Failed password for manu_abrego from 203.0.113.77 port 5555$i ssh2\"}"
done
```

---

## 4. Modo B — Todo local + ataque real desde otro dispositivo

Es el modo de la presentación: **una máquina externa ataca a esta**.

### 4.1 Preparar el firewall (una sola vez)

```bash
sudo ufw allow 22/tcp
sudo ufw status numbered
#   [ 1] 22/tcp  ALLOW IN  Anywhere     <- imprescindible
```

> Si vas a habilitar UFW: **primero** el `allow 22/tcp`, **después** `sudo ufw enable`.
> Sin esa regla, SSH queda bloqueado por la política por defecto.

### 4.2 Decidir qué hace fail2ban

`fail2ban` banea por su cuenta en nftables y puede "tapar" la demo:

```bash
# Opción recomendada para la demo: que solo actúe nuestro sistema
sudo systemctl stop fail2ban

# Opción B: dejarlo. El dashboard ahora libera la IP también en fail2ban.
```

### 4.3 Arrancar el motor real

```bash
cd ~/beta
./local-dev/run-local.sh start-real
```

- Pide la contraseña de `sudo` (necesario para leer `/var/log/auth.log`, ejecutar `ufw` y hablar con fail2ban).
- El Backend B queda **en primer plano**: dejá esa terminal a la vista.
- Debe mostrar:

```
ℹ️  [FAIL2BAN] Detectado y activo...        (si fail2ban está corriendo)
👁️ [MONITOR ACTIVO] Siguiendo registros en tiempo real de: /var/log/auth.log
📡 [REDIS PUBSUB] Suscrito y escuchando eventos en 'channel:unban_events'
```

### 4.4 Abrir el dashboard

**http://localhost:3000** → si es la primera vez, crear la cuenta de administrador → login.

### 4.5 Atacar desde el otro dispositivo

```bash
# En el celular / otro PC de la red
ssh manu_abrego@192.168.220.123
```

- Escribí una **contraseña incorrecta**.
- **Repetí la conexión 2–3 veces**: cada conexión genera 2–3 líneas `Failed password`,
  así que el umbral (5) se alcanza con ~2 conexiones.
- ⚠️ **No uses `root`**: `PermitRootLogin` está en `prohibit-password` y no genera `Failed password`.
- La IP del atacante **no** está en la whitelist (`127.0.0.1`, `::1`, `192.168.220.123`) → se sanciona.

### 4.6 Qué tiene que pasar

**En la terminal del Backend B:**

```
⚠️ [FALLO COMPUTADO] IP: 192.168.220.x | Faltas: 1/5 | User: manu_abrego
...
🔥 [AMENAZA CONFIRMADA] IP 192.168.220.x superó 5 intentos en 10m. ¡APLICANDO BAN!
🛡️ [UFW EXEC BAN] ufw insert 1 deny from 192.168.220.x to any port 22 comment '...'
✅ [UFW ÉXITO] IP 192.168.220.x BLOQUEADA en el puerto 22.
```

**En el dashboard** (se refresca solo cada 2 s):

| Indicador | Antes | Después |
|---|---|---|
| Visor de Logs SSH | 0 | 5+ |
| IPs Sancionadas en UFW | 0 | 1 |
| Reglas UFW Activas | — | `[1] 22 DENY IN <IP>` |

**En el firewall:**

```bash
sudo ufw status numbered
#   [ 1] 22        DENY IN   192.168.220.x
#   [ 2] 22/tcp    ALLOW IN  Anywhere
```

Y el atacante ya **no puede entrar** (`Connection refused`, porque ufw `deny` = REJECT).

### 4.7 Desbanear

En el dashboard → **"Desbanear (Pub/Sub)"**. El sistema:

1. Publica en `channel:unban_events` (FastAPI).
2. El Backend B recibe el mensaje y ejecuta `ufw delete` **verificando** el resultado.
3. Si `fail2ban` tenía la IP, también la libera.
4. El Dashboard re-lee las reglas reales y te dice si quedó libre o si **sigue bloqueada**.

**Esperado en el Backend B:**

```
📬 [REDIS PUBSUB] Mensaje recibido en 'channel:unban_events': { action: 'UNBAN', ip: '...' }
⚡ Ejecutando orden de desbaneo para: 192.168.220.x
🔓 [UFW EXEC UNBAN] 1 regla(s) encontrada(s) para 192.168.220.x
   ↳ regla eliminada por especificación
   ↳ fail2ban: IP 192.168.220.x liberada del jail 'sshd' ✅
✅ [UFW ÉXITO] Regla de bloqueo para IP 192.168.220.x eliminada de UFW (1 borrada(s)).
```

> La línea `❌ Could not find rule '1'` puede aparecer: es normal, la regla ya se borró en el
> paso anterior y el sistema reintenta por posición. Lo que importa es el `✅ [UFW ÉXITO]`
> y que `sudo ufw status numbered` muestre **solo el ALLOW**.

---

## 5. Modo C — Distribuido Abrego–Mulet

### 5.1 Mulet (3 terminales)

**T1 — Redis** (servicio del sistema)
```bash
redis-cli ping          # PONG
```

**T2 — Nginx**
```bash
cd ~/beta/servicios-mulet/proxy-nginx
chmod +x setup-nginx.sh && ./setup-nginx.sh
```

**T3 — Backend B** (dejar visible: ahí se ve el ataque)
```bash
cd ~/beta/servicios-mulet/backend-b-engine
chmod +x start.sh && ./start.sh
#   👁️ [MONITOR ACTIVO] ... /var/log/auth.log
```

### 5.2 Abrego (2 terminales)

**T1 — Backend A**
```bash
cd ~/beta/servicios-abrego/backend-a-fastapi
chmod +x start.sh && ./start.sh
```

**T2 — Frontend** (el proxy apunta a Mulet)
```bash
cd ~/beta/servicios-abrego/frontend-a-react
chmod +x start.sh && ./start.sh
#   🔗 API (proxy Vite): http://192.168.220.127
```

### 5.3 Verificar

```bash
curl -s http://192.168.220.123:8000/api/v1/health
# {"status":"healthy",...,"redis_connected":true,"redis_target":"192.168.220.127:6379"}

curl -s http://192.168.220.127/api/security/health
curl -s http://192.168.220.127/api/v1/health
```

### 5.4 Atacar (apuntando a Mulet)

Desde un celular/otro PC, o automatizado desde Mulet:

```bash
# Opción manual (celular): 2-3 intentos con contraseña incorrecta
ssh manu_abrego@192.168.220.127

# Opción automatizada (en Mulet)
for i in 1 2 3 4 5; do
  sshpass -p "ClaveIncorrecta" ssh -o StrictHostKeyChecking=no \
    -o PreferredAuthentications=password -o PubkeyAuthentication=no \
    manu_abrego@192.168.220.127
done
```

Los evaluadores entran por **http://192.168.220.127**.

---

## 6. Operación diaria

```bash
./local-dev/run-local.sh start       # modo A
./local-dev/run-local.sh start-real  # modo B (sudo)
./local-dev/run-local.sh status
./local-dev/run-local.sh logs        # sigue todos los logs
./local-dev/run-local.sh stop
./local-dev/run-local.sh restart
./local-dev/run-local.sh purge       # borra contenedores + datos de Redis
```

Redis: `docker exec -it beta-redis redis-cli` · Reglas simuladas: `cat local-dev/ufw-rules.log`

> `start-real` corre el Backend B como **root**: si quedó vivo, `stop` no puede matarlo y te avisa.
> En ese caso: `sudo kill -9 <PID>`.

---

## 7. Verificación (checklist)

| # | Verificación | Comando / lugar | Esperado |
|---|---|---|---|
| 1 | Redis | `docker exec beta-redis redis-cli ping` | `PONG` |
| 2 | Backend A + Redis | `curl -s localhost/api/v1/health` | `redis_connected: true` |
| 3 | Backend B | `curl -s localhost/api/security/health` | JSON `healthy` |
| 4 | Monitor real | terminal del Backend B | `👁️ [MONITOR ACTIVO]` |
| 5 | SSH accesible | desde el otro equipo: `ssh manu_abrego@192.168.220.123` | pide contraseña |
| 6 | Ban | terminal del Backend B | `🔥 [AMENAZA CONFIRMADA]` |
| 7 | Regla real | `sudo ufw status numbered` | `DENY IN <IP>` + `ALLOW 22/tcp` |
| 8 | Dashboard | pantalla | logs + IP sancionada |
| 9 | Desbaneo | botón "Desbanear" | `📬 [REDIS PUBSUB]` + regla borrada |
| 10 | Acceso restaurado | `ssh manu_abrego@192.168.220.123` | vuelve a pedir contraseña |
| 11 | ALLOW intacto | `sudo ufw status numbered` | sigue el `ALLOW 22/tcp` |
| 12 | fail2ban | `sudo fail2ban-client status sshd` | sin la IP |

---

## 8. Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| El ataque no aparece en el dashboard | estás en modo A (`start`) | usar `start-real` |
| El Backend B no dice `MONITOR ACTIVO` | corre sin root | `./local-dev/run-local.sh start-real` |
| `Connection refused` **antes** de atacar | falta `allow 22/tcp` (UFW activo) | `sudo ufw allow 22/tcp` |
| `Connection refused` **después** de desbanear | fail2ban tiene la IP | `sudo fail2ban-client set sshd unbanip <IP>` |
| `ufw status` limpio pero sigue bloqueado | fail2ban (nftables) | idem anterior; el dashboard ya lo libera |
| El ataque no genera eventos | usaste `root` | usar `manu_abrego` |
| El ataque no genera eventos | la IP está en la whitelist | atacar desde otra IP |
| Banea en 2 intentos | cada conexión deja 2-3 líneas de fallo | esperado; no es un error |
| El dashboard dice "sin conexión con el backend" | el proxy no llega a Mulet | `curl http://192.168.220.127/api/v1/health` |
| `ensurepip is not available` | falta `python3-venv` | usar `virtualenv` (sección 2.1) |
| `Port 3000 is in use` | quedó un vite colgado | `ss -ltnp \| grep 3000` y matar el PID |
| El proceso `start-real` no muere | corre como root | `sudo kill -9 <PID>` |
| Nginx devuelve 404 en `/api/security/*` | `proxy_pass` con barra final | ya corregido (`proxy_pass http://backend_b_engine;`) |

---

## 9. Limpieza

```bash
# Local
./local-dev/run-local.sh stop
./local-dev/run-local.sh purge          # opcional: borra datos de Redis

# Firewall (si quedó alguna regla)
sudo ufw status numbered
sudo ufw delete deny from <IP> to any port 22

# fail2ban
sudo fail2ban-client set sshd unbanip <IP>

# Redis (modo distribuido)
redis-cli FLUSHALL
```
