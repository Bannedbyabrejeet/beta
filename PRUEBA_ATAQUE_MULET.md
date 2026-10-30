# 🎯 Prueba de Ataque SSH Real — Runbook

Guía paso a paso para ejecutar un ataque SSH de verdad y verlo reflejado en el Dashboard.

> ✅ **La aplicación ya no es una maqueta**: el frontend consume la API real
> (Backend A + Backend B + Redis) y refresca el estado cada 2 segundos.
> Un ataque detectado en Mulet aparece solo en el dashboard de Abrego.

---

## 0.1 ⚠️ Hallazgo crítico ya corregido (leelo antes de probar)

En **Ubuntu 24.04+** el proceso que escribe el log de sesión se llama **`sshd-session[PID]`**,
no `sshd[PID]`:

```
2026-10-21T12:30:24.289683-03:00 etec-ab350mds3hv2 sshd-session[40144]: Failed password for manu_abrego from 192.168.220.123 port 56271 ssh2
```

El Backend B buscaba `/sshd\[\d+\]:/` → **no matcheaba nada** y todos los ataques reales
eran ignorados silenciosamente. Ya está corregido en `server.js`:

```js
const SSH_FAILED_REGEX = /sshd(?:-session)?\[\d+\]: Failed password for .../;
```

> Si en tu distro el log dice `sshd[PID]:` (versiones viejas), el regex nuevo también lo matchea.
> Verificá el formato real antes de probar:
> `sudo grep 'Failed password' /var/log/auth.log | tail -3`

---

## 0.2 ⚠️ El motor debe leer el `auth.log` REAL

El modo local por defecto (`./local-dev/run-local.sh start`) hace que el Backend B vigile un
archivo de prueba (`local-dev/auth.log`). **Con esa configuración un ataque SSH real NO se ve.**

Para la prueba hay que usar el modo **real**:

```bash
./local-dev/run-local.sh start-real
```

Ese modo:
- arranca Redis, Backend A, Frontend y Nginx igual que el local,
- pero lanza el Backend B **con `sudo`** y `SSH_LOG_PATH=/var/log/auth.log` (lectura real),
- **sin** el shim de UFW → usa el `ufw` real,
- y lo deja **en primer plano** para que veas el ataque en vivo y puedas tipear el password de sudo.

---

## 0.3 Arquitectura de la prueba (importante)

```
   ATACANTE                    MULET (192.168.220.127)              ABREGO (192.168.220.123)
   (celular / 3er PC)                │                                      │
        │                            │                                      │
        │  ssh root@192.168.220.127  │                                      │
        └───────────────────────────>│ sshd ──> /var/log/auth.log            │
                                     │                    │                  │
                                     │            Backend B (lee el log)    │
                                     │                    │                  │
                                     │                    v                  │
                                     │            Redis (ip:failures:*)     │
                                     │                    │                  │
                                     │            UFW insert 1 deny ...     │
                                     │                    │                  │
                                     │            Nginx :80  <──────────────┘
                                     │                    │                  │
                                     └────────────────────┴──> FastAPI :8000 │
                                                          │                  │
                                                     Dashboard (polling 2s)│
```

**Regla de oro:** el ataque SSH debe ir **contra la máquina que corre el Backend B**,
porque es ese proceso el que lee el `auth.log`.

| Modo | Backend B corre en | El ataque apunta a | Comando de arranque |
|---|---|---|---|
| Local + motor real | `192.168.220.123` (Abrego) | **`192.168.220.123`** | `./local-dev/run-local.sh start-real` |
| Distribuido | `192.168.220.127` (Mulet) | **`192.168.220.127`** | `./start.sh` en cada máquina |

---

## 0.4 Variante rápida: atacar a MI MÁQUINA desde una externa (todo local)

Es lo que se hace hoy: todo corre en Abrego y una máquina externa (celular u otro PC)
intenta entrar por SSH a **Abrego**.

```bash
# en tu máquina (Abrego)
cd ~/beta
./local-dev/run-local.sh start-real
# → te pide el password de sudo; el Backend B queda en primer plano
```

En la otra máquina:

```bash
ssh manu_abrego@192.168.220.123
```

Escribí una contraseña incorrecta y repetí el comando **5 veces**.

Detalles que importan:

| Aspecto | Valor en tu máquina | Consecuencia |
|---|---|---|
| Puerto SSH | `0.0.0.0:22` (`ssh.socket` activo) | ✅ alcanzable desde la LAN |
| `PasswordAuthentication` | `yes` (default) | ✅ el intento se registra |
| `PermitRootLogin` | `prohibit-password` (default) | ⚠️ **usá `manu_abrego`, no `root`** |
| Cuenta `manu_abrego` | password usable (`passwd -S` → `P`) | ✅ genera `Failed password for manu_abrego` |
| Whitelist | `127.0.0.1`, `::1`, `192.168.220.123` | el atacante externo **no** está → se sanciona |
| UFW | `ENABLED=no` | la regla se crea pero **no bloquea** hasta `sudo ufw enable` |

> Si el atacante fuera la propia IP `192.168.220.123`, el motor lo ignoraría por whitelist.

---

## 1. Prerrequisitos en MULET

Ejecutar **en la máquina de Mulet** (con tu password de sudo):

```bash
# 1.1 Servicios del sistema
sudo apt update
sudo apt install -y redis-server nginx nodejs npm ufw sshpass

# 1.2 Redis escuchando en toda la LAN (por defecto solo escucha en 127.0.0.1)
sudo nano /etc/redis/redis.conf
#   bind 127.0.0.1 ::1   ->   bind 0.0.0.0
#   protected-mode yes  ->   protected-mode no
sudo systemctl restart redis-server
redis-cli ping                                  # debe responder PONG

# 1.3 Permitir el tráfico de Abrego y abrir los puertos
sudo ufw allow from 192.168.220.123
sudo ufw allow 80/tcp
sudo ufw allow 6379/tcp
sudo ufw allow 22/tcp                           # <- imprescindible para poder ATACARLO
sudo ufw enable
sudo ufw status verbose                         # Status: active

# 1.4 Dependencias del Backend B
cd ~/beta/servicios-mulet/backend-b-engine && npm install
```

> ⚠️ `sudo ufw allow 22/tcp` es **imprescindible**: sin él, activás UFW y te quedás
> sin acceso SSH a Mulet (y sin poder hacer el ataque).

---

## 2. Prerrequisitos en ABREGO

```bash
cd ~/beta
# Dependencias Python del Backend A (venv ya incluido en el repo de trabajo)
cd ~/beta/servicios-abrego/backend-a-fastapi
[ -d venv ] || { pip3 install --user --break-system-packages virtualenv; ~/.local/bin/virtualenv venv; }
./venv/bin/pip install -r requirements.txt

# Frontend
cd ~/beta && npm install
```

---

## 3. Arranque en MULET (3 terminales)

**Terminal 1 — Redis** (ya corre como servicio, solo verificá)
```bash
redis-cli ping          # PONG
```

**Terminal 2 — Nginx**
```bash
cd ~/beta/servicios-mulet/proxy-nginx
chmod +x setup-nginx.sh
./setup-nginx.sh
```

**Terminal 3 — Backend B** ⚠️ **dejá esta terminal a la vista**: es donde se ve el ataque
```bash
cd ~/beta/servicios-mulet/backend-b-engine
chmod +x start.sh
./start.sh
# debe decir:  👁️ [MONITOR ACTIVO] Siguiendo registros en tiempo real de: /var/log/auth.log
#              📡 [REDIS PUBSUB] Suscrito y escuchando eventos en 'channel:unban_events'
```

> `start.sh` corre el motor con `sudo` para poder leer `/var/log/auth.log` y ejecutar `ufw`.
> Si arranca sin permisos, el watcher no va a funcionar: verificá que diga `MONITOR ACTIVO`.

**Verificación rápida desde Mulet:**
```bash
curl -s http://127.0.0.1:3001/api/security/health
curl -s http://127.0.0.1/api/v1/health
```

---

## 4. Arranque en ABREGO (2 terminales)

**Terminal 1 — Backend A (FastAPI)**
```bash
cd ~/beta/servicios-abrego/backend-a-fastapi
chmod +x start.sh
./start.sh
# → Uvicorn running on http://0.0.0.0:8000
```

**Terminal 2 — Frontend (Vite)** — el proxy apunta a Mulet
```bash
cd ~/beta/servicios-abrego/frontend-a-react
chmod +x start.sh
./start.sh
# → 🔗 API (proxy Vite): http://192.168.220.127  ->  /api/v1/* y /api/security/*
```

**Verificación desde Abrego (debe dar healthy y con Redis de Mulet):**
```bash
curl -s http://192.168.220.123:8000/api/v1/health
# {"status":"healthy",...,"redis_connected":true,"redis_target":"192.168.220.127:6379"}
```

---

## 5. Preparar el Dashboard (una sola vez)

Abrí **http://192.168.220.123:3000** (o `http://192.168.220.127` si Nginx ya responde).

1. Si aparece *"Configuración de Administrador"* → creá la cuenta (queda en Redis `auth:admin`).
2. Iniciá sesión → `admin` / la contraseña que elegiste.
3. Quedate en el **Dashboard** y dejá la pantalla a la vista.

> El Dashboard refresca solo cada 2 segundos: no hay que recargar.

---

## 6. ¡EL ATAQUE!

### Opción A — Desde un celular en el mismo Wi-Fi (la más realista)

En una app de terminal (Termux / SSH Client):

```bash
ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no <TU_USUARIO>@192.168.220.127
```

Escribí una contraseña incorrecta → repetí el comando **5 veces**.

### Opción B — Automatizado desde Mulet (la más cómoda)

```bash
# en Mulet: 5 intentos con contraseña incorrecta
for i in 1 2 3 4 5; do
  sshpass -p "ClaveIncorrecta123" ssh -o StrictHostKeyChecking=no \
    -o PreferredAuthentications=password -o PubkeyAuthentication=no \
    <TU_USUARIO>@192.168.220.127
done
```

> La IP del atacante (`192.168.220.127` o la del celular) **no está en la whitelist**
> (`127.0.0.1`, `::1`, `192.168.220.123`) → el motor la va a sancionar.

### Opción C — Probar el motor sin tocar SSH real

```bash
# inyecta una línea con el formato exacto de sshd en el auth.log real de Mulet
logger --tag "sshd[12345]" -p auth.info \
  "Failed password for hacker from 203.0.113.77 port 40001 ssh2"
# repetí 5 veces
```

---

## 7. Qué tiene que pasar

### En la terminal del Backend B (Mulet)

```
⚠️ [FALLO COMPUTADO] IP: 192.168.220.127 | Faltas: 1/5 | User: tu_usuario
⚠️ [FALLO COMPUTADO] IP: 192.168.220.127 | Faltas: 2/5 | User: tu_usuario
...
⚠️ [FALLO COMPUTADO] IP: 192.168.220.127 | Faltas: 5/5 | User: tu_usuario

🔥 [AMENAZA CONFIRMADA] IP 192.168.220.127 superó 5 intentos en 10m. ¡APLICANDO BAN!

🛡️ [UFW EXEC BAN] ufw insert 1 deny from 192.168.220.127 to any port 22 comment 'bannedbyabrejeet:ssh_bruteforce'
✅ [UFW ÉXITO] IP 192.168.220.127 BLOQUEADA en el puerto 22.
```

### En el Dashboard (Abrego) — sin tocar nada

| Indicador | Antes | Después |
|---|---|---|
| Visor de Logs SSH | 0 | **5** (los eventos reales, con IP y usuario) |
| IPs Sancionadas en UFW | 0 | **1** |
| Panel de IPs baneadas | vacío | la IP con su regla `ufw insert 1 deny ...` |
| Redis Inspector | sin `ip:banned` | `ip:banned` con el registro del ban |

### En Mulet (comprobación del firewall real)

```bash
sudo ufw status numbered
#   [ 1] 22   DENY IN   192.168.220.127
```

Y el atacante ya **no puede entrar**:
```bash
ssh <TU_USUARIO>@192.168.220.127      # ahora da timeout / connection refused
```

---

## 8. El desbaneo desde la UI (el momento clave de la demo)

1. En el Dashboard de Abrego, tocá **"Desbanear"** en la IP sancionada.
2. El navegador hace `POST http://192.168.220.127/api/v1/security/unban`
   (a través del proxy de Vite → Nginx de Mulet → FastAPI de Abrego).
3. FastAPI publica en `channel:unban_events`.
4. El Backend B de Mulet recibe el mensaje y ejecuta `ufw delete deny from <IP> to any port 22`.

### En la terminal del Backend B

```
📬 [REDIS PUBSUB] Mensaje recibido en 'channel:unban_events': { action: 'UNBAN', ip: '192.168.220.127', ... }
⚡ Ejecutando orden de desbaneo para: 192.168.220.127 (Solicitado por: Abrego (FastAPI))
🔓 [UFW EXEC UNBAN] ufw delete deny from 192.168.220.127 to any port 22
✅ [UFW ÉXITO] Regla de bloqueo para IP 192.168.220.127 eliminada de UFW.
```

### En el Dashboard

- La IP desaparece de "IPs Sancionadas en UFW"
- En el historial Pub/Sub quedan **2** eventos: el `BAN` (del motor) y el `UNBAN` (de Abrego)
- El atacante **vuelve a poder entrar** por SSH

---

## 9. Checklist de la prueba

| # | Verificación | Comando / lugar | Esperado |
|---|---|---|---|
| 1 | Redis responde desde Mulet | `redis-cli ping` | `PONG` |
| 2 | Redis responde desde Abrego | `curl http://192.168.220.123:8000/api/v1/health` | `redis_connected: true` |
| 3 | Backend B vigila el log | terminal del Backend B | `👁️ [MONITOR ACTIVO]` |
| 4 | Nginx enruta | `curl http://192.168.220.127/api/security/health` | JSON del Backend B |
| 5 | Evento SSH real | `sudo grep 'Failed password' /var/log/auth.log \| tail -3` | 5 líneas |
| 6 | Motor cuenta | terminal del Backend B | `Faltas: 1/5` … `5/5` |
| 7 | Ban aplicado | terminal del Backend B | `🔥 [AMENAZA CONFIRMADA]` + `✅ [UFW ÉXITO]` |
| 8 | Regla real | `sudo ufw status numbered` | `[ 1] 22 DENY IN <IP>` |
| 9 | Dashboard muestra el ataque | pantalla de Abrego | 5 logs, 1 IP sancionada |
| 10 | Ataque bloqueado | `ssh <usuario>@192.168.220.127` | no entra |
| 11 | Unban desde la UI | botón "Desbanear" | `📬 [REDIS PUBSUB]` en Mulet |
| 12 | Regla eliminada | `sudo ufw status numbered` | sin la regla |
| 13 | Ataque restaurado | `ssh <usuario>@192.168.220.127` | vuelve a entrar |

---

## 10. Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| El Backend B no dice `MONITOR ACTIVO` | corre sin root → no puede leer `/var/log/auth.log` | arrancalo con `sudo ./start.sh` |
| `redis_connected: false` | Redis de Mulet escucha solo en 127.0.0.1 | `bind 0.0.0.0` + `protected-mode no` + restart |
| El dashboard dice "no hay conexión con el backend" | el proxy de Vite no llega a Mulet | `curl http://192.168.220.127/api/v1/health`; si falla, revisá Nginx |
| El ataque no genera eventos | `PermitRootLogin prohibit-password` | usá un usuario real, no `root` |
| El ataque no genera eventos | el atacante está en la whitelist | usá otra IP (celular) o `redis-cli SREM config:whitelist <IP>` |
| La IP se banea con 3 intentos | usuario inexistente → 2 líneas por intento | usá un usuario real (1 línea por intento) |
| `Connection refused` en vez de timeout | UFW inactivo o sin regla | `sudo ufw status` |
| El log no se actualiza | `logrotate` rotó el archivo | reiniciá el Backend B tras la rotación |
| El atacante es la propia IP del servidor | el baneo se ignora | `127.0.0.1`, `::1` y `192.168.220.123` están en la whitelist **a propósito** |

## 10.1 ⚠️ El unbaneo "no anduvo" (Connection refused después de desbanear)

Si después de tocar "Desbanear" la máquina atacante **sigue** recibiendo `Connection refused`,
el problema NO es el botón: es que **la regla de UFW sigue activa**. Diagnóstico en 4 pasos:

```bash
# 1) ¿El Backend B recibió la orden de unbaneo?
#    Mirá la terminal del Backend B. Tenés que ver:
#      📬 [REDIS PUBSUB] Mensaje recibido en 'channel:unban_events'
#      🔓 [UFW EXEC UNBAN] ufw delete deny from <IP> to any port 22
#      ✅ [UFW ÉXITO] Regla de bloqueo para IP <IP> eliminada de UFW.
#    Si NO aparece "📬": el canal de Redis no llegó -> usá el unbaneo DIRECTO:
curl -s -X POST http://127.0.0.1:3001/api/security/unban \\
  -H 'Content-Type: application/json' \\
  -d '{"ip":"<IP_BANEADA>"}'

# 2) ¿La regla sigue en el firewall?
sudo ufw status numbered
#   Si aparece "[ 1] 22  DENY IN  <IP>", el delete no funcionó.

# 3) Borrar la regla a mano (siempre funciona):
sudo ufw delete deny from <IP> to any port 22
#   o por posición (número que muestra 'status numbered'):
sudo ufw --force delete 1

# 4) Limpiar el registro en Redis (para que el dashboard no muestre la IP)
redis-cli HDEL ip:banned <IP>
```

El Dashboard ahora muestra la **verdad**:
- **"Reglas UFW Activas en el Firewall"** → si la IP sigue acá, el desbaneo falló
- **"Últimas operaciones del firewall"** → muestra `ok: true/false`, `removed` y `remaining`
- El botón "Desbanear" dice explícitamente si la regla se eliminó o si **sigue bloqueada**

### 🛑 CAUSA MÁS FRECUENTE: fail2ban banea en paralelo

Si `sudo ufw status numbered` se ve **limpio** (sin reglas DENY) pero la máquina atacante
**sigue** recibiendo `Connection refused`, el bloqueo no viene de ufw: viene de **fail2ban**,
que corre en tu Ubuntu y banea la misma IP por su cuenta en **nftables**, con un
`bantime` por defecto de **10 minutos**.

Verificación:

```bash
sudo fail2ban-client status sshd
#   Banned IP list:   192.168.220.127     <-- acá está la IP

sudo nft list ruleset | grep -A2 f2b
#   elements = { 192.168.220.127 }
```

Solución inmediata:

```bash
sudo fail2ban-client set sshd unbanip 192.168.220.127
```

El sistema ya lo integra:
- El **desbaneo del Dashboard** libera la IP en ufw **y** en fail2ban.
- El Dashboard muestra un panel **"fail2ban detectado"** con las IPs que ese servicio tiene bloqueadas.
- Endpoints: `GET /api/security/fail2ban` y `POST /api/security/fail2ban/unban`.

> Para una demo donde **solo** actúe vuestro sistema:
> `sudo systemctl stop fail2ban` (y `sudo systemctl start fail2ban` al terminar).

### 🐛 Bug corregido: el unban borraba la regla ALLOW 22/tcp

Si tenías esta lista de reglas:

```
[ 1] 22       DENY IN   192.168.220.127
[ 2] 22/tcp   ALLOW IN  Anywhere
```

el unban hacía:
1. `ufw delete deny from 192.168.220.127 ...` → borraba la regla 1, y **la ALLOW pasaba a ser la 1**
2. `ufw --force delete 1` (usando la posición **vieja**) → **borraba la ALLOW 22/tcp**

Resultado: UFW activo, sin reglas, política `deny incoming` → **SSH bloqueado para todos**
(el atacante y cualquiera). Ese era el "Connection refused" que persistía después del unban.

**Ya está corregido**: el unban vuelve a leer la lista *después* del primer delete y sólo
borra reglas `DENY`/`REJECT` que pertenezcan a la IP sancionada. Además, si UFW está activo
y no existe regla `ALLOW` para el puerto 22, el Backend B lo avisa al arrancar.

**Si te pasó, restaurá tu acceso así:**

```bash
sudo ufw allow 22/tcp
sudo ufw status numbered
# Debe aparecer: [ 1] 22/tcp  ALLOW IN  Anywhere
```

### Causas típicas del fallo

| Causa | Síntoma | Solución |
|---|---|---|
| El Backend B corría sin root (shim) | `ufw` real no se ejecutó | Usar `./local-dev/run-local.sh start-real` |
| El Backend B no estaba suscrito al canal | `subscribers_notified: 0` en la respuesta | Verificar que el Backend B arrancó después de Redis |
| Había 2 reglas para la misma IP | el delete borró 1, la otra quedó | el unban ahora borra TODAS las reglas de la IP (por posición) |
| El proceso Backend B viejo no se mató | sigue corriendo la versión vieja del código | `sudo kill -9 <PID>` y reiniciar |
| UFW inactivo | `ufw insert` falla con "Invalid position" | `sudo ufw allow 22/tcp && sudo ufw enable` |
| El proceso Backend B corre como root (start-real) | `kill` sin sudo no lo mata | `sudo kill -9 <PID>` |

---

## 11. Limpieza posterior

```bash
# en Mulet
sudo ufw status numbered
sudo ufw delete deny from <IP> to any port 22      # por cada IP baneada
redis-cli FLUSHALL                                  # limpia bans, whitelist y sesión admin
```
