# 🧪 Plan de Prueba SSH Real — Bannedbyabrejeet

> ⚠️ **DOCUMENTO SUPERADO.** La app ya no es una maqueta: el frontend consume la API real
> y el Dashboard muestra los datos reales de Redis. El runbook vigente, con los comandos
> exactos para la prueba con Mulet, está en **[`PRUEBA_ATAQUE_MULET.md`](PRUEBA_ATAQUE_MULET.md)**.
>
> Corrección importante respecto a este documento: **el ataque SSH debe apuntar a la máquina
> que corre el Backend B**, porque es ese proceso el que lee el `auth.log`.
> En modo distribuido, el Backend B corre en **Mulet** → el ataque va contra
> `192.168.220.127`, no contra Abrego.

Documento de planificación. **No ejecutar nada todavía** — acá está el guion completo
con los comandos exactos, qué observar en cada paso y cómo volver atrás.

---

## 0. Resumen: qué se prueba y qué no

| Capa | ¿Se puede probar de verdad? | Cómo |
|---|---|---|
| sshd genera el evento (`Failed password`) | ✅ **Sí** | SSH real desde otra IP |
| rsyslog lo escribe en `/var/log/auth.log` | ✅ **Sí** | `ssh.socket` activo + rsyslog activo |
| Backend B lo detecta y cuenta | ✅ **Sí** | watcher sobre `auth.log` (necesita root) |
| Redis (contador, `ip:banned`, config) | ✅ **Sí** | Redis real |
| Pub/Sub del unbaneo | ✅ **Sí** | canal `channel:unban_events` |
| Driver UFW (crear/borrar regla) | ✅ **Sí** | `ufw insert` / `ufw delete` reales |
| **El bloqueo efectivo de paquetes** | ⚠️ **Requiere UFW habilitado** | hoy `ENABLED=no` |
| **El frontend (dashboard, inspector)** | ❌ **No** | es 100% mock, sin `fetch` |

---

## 1. Hallazgos del diagnóstico (ya verificados en tu máquina)

| # | Hallazgo | Evidencia | Impacto en la prueba |
|---|---|---|---|
| 1 | `ssh.socket` **activo**, puerto 22 escuchando | `systemctl list-units 'ssh*'` | No hay que instalar nada: sshd arranca por conexión |
| 2 | rsyslog **activo** → escribe `/var/log/auth.log` | `/etc/rsyslog.d/50-default.conf` | Los eventos reales se registran solos |
| 3 | `/var/log/auth.log` es `640 syslog:adm` | `ls -l /var/log/auth.log` | **Solo root lo lee** → el Backend B debe correr con sudo |
| 4 | **UFW deshabilitado** (`ENABLED=no`) | `/etc/ufw/ufw.conf` | Las reglas se guardan pero **no filtran tráfico** |
| 5 | `sshpass` **no instalado** | `which sshpass` | Hay que instalarlo o escribir la contraseña a mano |
| 6 | `PermitRootLogin` default = `prohibit-password` | `sshd_config` sin override | **`ssh root@...` con contraseña NO genera "Failed password"** → usar un usuario real |
| 7 | `PasswordAuthentication` default = `yes` | `sshd_config` sin override | El login por contraseña funciona ✅ |
| 8 | Whitelist en Redis = `127.0.0.1`, `::1`, `192.168.220.123` | `SMEMBERS config:whitelist` | **Los intentos desde tu propia máquina se ignoran** → el atacante debe ser otra IP |
| 9 | `node` de nvm en `~/.nvm/...`, y otra copia en `/usr/bin/node` (v22.22.1) | `which node` | Bajo `sudo` el PATH se resetea → hay que preservar el PATH explícitamente |
| 10 | El botón "Desbanear" del dashboard es **mock** | `src/components/Dashboard.tsx:140` → `securityEngine.unbanIp()` | **El unbaneo real hay que hacerlo por API**, no desde la UI |

### 1.1 Detalle de conteo (importante para interpretar los números)

- **Usuario existente** + contraseña incorrecta → sshd escribe **1 línea**
  `Failed password for manu_abrego from <IP> port <N> ssh2` → **1 strike** por intento.
- **Usuario inexistente** (`admin`, `root`) → sshd escribe **2 líneas**
  (`Invalid user admin from <IP> port <N>` + `Failed password for invalid user admin from <IP> port <N>`)
  → el motor matchea las dos (tiene regex para cada una) → **2 strikes por intento**.
  Con `max_retries=5` eso banea al **3er** intento, no al 5to.

---

## 2. Recomendación sobre UFW (la decisión que preguntaste)

### 👉 NO habilites UFW todavía. Empezá por la Fase 1 con UFW apagado.

**Por qué es seguro igual:** las reglas de UFW se administran aunque el firewall esté inactivo.
`ufw insert` y `ufw delete` funcionan y `sudo ufw status numbered` las muestra
(encabezado `Status: inactive` + las reglas). Con eso se valida **el 95% de la cadena**:

```
sshd → rsyslog → auth.log → Backend B → contador Redis → regla UFW → Pub/Sub → borrado de regla
```

Lo único que queda sin probar es el **filtrado de paquetes** (que el atacante además no entre).
Y ese lo podés probar después, en la Fase 2, con un procedimiento seguro.

**Riesgo de habilitarlo hoy:** la política por defecto de UFW es *deny incoming*. Esta máquina
es un escritorio en la red del ETEC al que se accede por SSH desde Mulet y desde la red de
profes. Si activás UFW sin una regla `allow` para el puerto 22 antes, **te quedás sin acceso
remoto** y tendrías que ir en persona a la máquina.

### Si igual querés probar el bloqueo real (Fase 2), en este orden exacto

```bash
# 1) Ver qué hay hoy
sudo ufw status numbered

# 2) Permitir SSH de la LAN ANTES de activar (evita el corte de conexión)
sudo ufw allow from 192.168.220.0/24 to any port 22 proto tcp

# 3) Activar (avisa: "Command may disrupt existing ssh connections")
sudo ufw enable
sudo ufw status verbose     # debe decir Status: active

# 4) ... hacer la prueba ...

# 5) Volver atrás
sudo ufw disable
```

> En la **máquina de Mulet** (producción) el guide ya manda a hacer `sudo ufw enable`,
> así que la demo del bloqueo real se puede hacer **allí** sin tocar esta máquina.

---

## 3. Pre-requisitos

| Necesario | Estado | Cómo obtenerlo |
|---|---|---|
| Password de `sudo` de esta máquina | ❓ te lo pido al ejecutar | — |
| Redis corriendo (local) | ✅ | `./local-dev/run-local.sh start` |
| `sshpass` en la máquina atacante | ❌ falta | `sudo apt install sshpass` (en Mulet) |
| Una segunda IP en la LAN | ⬜ | tu celular en el Wi-Fi, o Mulet (`192.168.220.127`) |

---

## 4. FASE 0 — Preparar el stack con el motor REAL (root + auth.log real)

El stack local actual corre el Backend B **sin privilegios** y leyendo `local-dev/auth.log`.
Para esta prueba hay que **cambiar solo el Backend B**:

```bash
cd ~/beta
./local-dev/run-local.sh start          # levanta los 5 servicios
```

Reemplazo del Backend B por la variante con privilegios:

```bash
# bajar solo el backend B
kill $(cat ~/beta/local-dev/run/backend-b.pid)

# levantarlo como root, leyendo el auth.log real
cd ~/beta/servicios-mulet/backend-b-engine
sudo env "PATH=$PATH" ./start.sh
```

> `sudo env "PATH=$PATH" ...` es **necesario**: sin esto, sudo resetea el PATH y no encuentra
> el `node` de nvm (hallazgo #9).

**Qué esperás ver:**

```
👁️ [MONITOR ACTIVO] Siguiendo registros en tiempo real de: /var/log/auth.log
📡 [REDIS PUBSUB] Suscrito y escuchando eventos en 'channel:unban_events'
⚡ Bannedbyabrejeet Security Engine (Mulet) en puerto 3001
```

Si dice `[AVISO LOG] Archivo /var/log/auth.log no encontrado` → no lo estás corriendo con sudo.

---

## 5. FASE 1 — Prueba controlada (motor real, sin segunda máquina)

Consiste en que el log real reciba líneas con el **formato exacto que escribe sshd**.
Se hace con `logger`, que escribe **por el mismo rsyslog** → el archivo y los permisos quedan
correctos y el watcher lo ve igual que un evento real.

### 5.1 Confirmar el formato real que usa esta máquina

```bash
sudo grep 'Failed password' /var/log/auth.log | tail -1
```

Si no hay ninguno todavía, generá uno real desde Mulet o desde el celular y volvé a mirar.

### 5.2 Inyectar 5 fallos de SSH desde una IP "atacante"

```bash
for i in 1 2 3 4 5; do
  logger --tag "sshd[1234$i]" -p auth.info \
    "Failed password for manu_abrego from 203.0.113.77 port 4000$i ssh2"
  sleep 1
done
```

> `logger --tag "sshd[1234]"` replica el formato real: `<timestamp> <host> sshd[1234]: Failed password for ...`
> (`--tag` es clave: sin él la línea queda `logger: sshd[1234]: ...` y el regex igual matchea,
> pero se ve menos fiel).

### 5.3 Qué observar

**En la terminal del Backend B:**

```
⚠️ [FALLO COMPUTADO] IP: 203.0.113.77 | Faltas: 1/5 | User: manu_abrego
⚠️ [FALLO COMPUTADO] IP: 203.0.113.77 | Faltas: 2/5 | User: manu_abrego
...
🔥 [AMENAZA CONFIRMADA] IP 203.0.113.77 superó 5 intentos en 10m. ¡APLICANDO BAN!
🛡️ [UFW EXEC BAN] ufw insert 1 deny from 203.0.113.77 to any port 22 comment 'bannedbyabrejeet:ssh_bruteforce'
✅ [UFW ÉXITO] IP 203.0.113.77 BLOQUEADA en el puerto 22.
```

**En otra terminal:**

```bash
# el registro del ban en Redis
docker exec -it beta-redis redis-cli HGETALL ip:banned

# la regla REAL de UFW (aunque ufw esté inactive, la regla queda registrada)
sudo ufw status numbered
#   Status: inactive
#   [ 1] 22   DENY IN   203.0.113.77

# el contador de fallos se limpió al banear
docker exec -it beta-redis redis-cli KEYS 'ip:failures:*'
```

### 5.4 Desbaneo por API (lo que el dashboard hace en mock)

```bash
curl -s -X POST http://localhost/api/v1/security/unban \
  -H 'Content-Type: application/json' \
  -d '{"ip":"203.0.113.77","reason":"Prueba de plan"}'
```

**Esperado en la terminal del Backend B:**

```
📬 [REDIS PUBSUB] Mensaje recibido en 'channel:unban_events': { action: 'UNBAN', ip: '203.0.113.77', ... }
⚡ Ejecutando orden de desbaneo para: 203.0.113.77 (Solicitado por: Abrego (FastAPI))
🔓 [UFW EXEC UNBAN] ufw delete deny from 203.0.113.77 to any port 22
✅ [UFW ÉXITO] Regla de bloqueo para IP 203.0.113.77 eliminada de UFW.
```

```bash
sudo ufw status numbered            # la regla [1] desapareció
docker exec -it beta-redis redis-cli HGETALL ip:banned   # vacío
```

> ⚠️ **Ojo**: `ufw delete deny from <IP> to any port 22` borra la **primera** regla que coincida.
> Si la IP tuviera dos reglas, borrá solo una. Verificá con `sudo ufw status numbered` después.

---

## 6. FASE 2 — Prueba de fuego E2E con SSH de verdad

### 6.1 Desde el celular (en el Wi-Fi del ETEC)

En una app de terminal (Termux / SSH Client):

```bash
ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no manu_abrego@192.168.220.123
```

Escribí una contraseña incorrecta. Volvé a ejecutar el comando **5 veces**.

> - La IP origen del celular es `192.168.220.x` → **no está en la whitelist** ✅
> - Usá `manu_abrego` (usuario real) → 1 strike por intento (ver 1.1)
> - `-o PreferredAuthentications=password -o PubkeyAuthentication=no` evita que el celular
>   intente con clave pública primero y genere otra línea de log

### 6.2 Desde Mulet (192.168.220.127) — automatizado

```bash
# en Mulet
sudo apt install -y sshpass

for i in 1 2 3 4 5; do
  sshpass -p "ClaveIncorrecta123" ssh -o StrictHostKeyChecking=no \
    -o PreferredAuthentications=password -o PubkeyAuthentication=no \
    manu_abrego@192.168.220.123
done
```

La IP de Mulet (`192.168.220.127`) tampoco está en la whitelist ✅

### 6.3 Qué observar

1. **En la terminal del Backend B** (en Abrego): los 5 `⚠️ [FALLO COMPUTADO]` y el
   `🔥 [AMENAZA CONFIRMADA]` + `✅ [UFW ÉXITO]`.
2. **En Mulet**, si querés ver el bloqueo real: `sudo ufw status numbered` → `[ 1] 22 DENY IN 192.168.220.127`.
   Y volvés a intentar el `ssh` → ahora **no entra** (timeout / "Connection refused" según el estado de UFW).
3. **Unbaneo** → `curl -X POST http://localhost/api/v1/security/unban ...` → en la terminal del
   Backend B aparece `📬 [REDIS PUBSUB]` → la regla se borra → el `ssh` vuelve a funcionar.

---

## 7. Checklist de resultados esperados

| # | Verificación | Cómo | Resultado esperado |
|---|---|---|---|
| 1 | sshd genera el evento | `sudo grep 'Failed password' /var/log/auth.log \| tail -3` | 5 líneas con `Failed password for manu_abrego from <IP>` |
| 2 | Backend B lo detecta | terminal del Backend B | `⚠️ [FALLO COMPUTADO] ... Faltas: 1/5` … `5/5` |
| 3 | Contador en Redis | `docker exec -it beta-redis redis-cli LRANGE ip:failures:<IP> 0 -1` | 5 timestamps |
| 4 | Registro del ban | `docker exec -it beta-redis redis-cli HGETALL ip:banned` | JSON con `attempts: 5`, `reason: Superó el límite...` |
| 5 | Regla UFW creada | `sudo ufw status numbered` | `[ 1] 22 DENY IN <IP>` |
| 6 | Historial limpiado | `docker exec -it beta-redis redis-cli KEYS 'ip:failures:*'` | vacío |
| 7 | Unban publicado | respuesta del `curl` a `/api/v1/security/unban` | `"subscribers_notified": 1` |
| 8 | Pub/Sub recibido | terminal del Backend B | `📬 [REDIS PUBSUB] Mensaje recibido en 'channel:unban_events'` |
| 9 | Regla UFW borrada | `sudo ufw status numbered` | sin la regla |
| 10 | Ban borrado de Redis | `docker exec -it beta-redis redis-cli HGETALL ip:banned` | vacío |

---

## 8. Limpieza / rollback

```bash
# 1) volver el Backend B al modo local (sin root)
cd ~/beta
./local-dev/run-local.sh stop && ./local-dev/run-local.sh start

# 2) borrar cualquier regla de UFW que haya quedado
sudo ufw status numbered
sudo ufw delete deny from <IP> to any port 22     # una por IP

# 3) limpiar Redis
docker exec -it beta-redis redis-cli FLUSHALL
#    (borra también el admin y la whitelist: se re-crean al reiniciar Backend A)

# 4) si activaste UFW en la Fase 2
sudo ufw disable
```

---

## 9. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Quedarte sin SSH a esta máquina | UFW apagado en Fase 1; en Fase 2, `allow` **antes** de `enable` |
| Auto-bloqueo por IP propia | `192.168.220.123`, `127.0.0.1` y `::1` están en la whitelist → nunca se banean |
| El atacante queda baneado y no lo sabés | `sudo ufw status numbered` + `sudo ufw delete deny from <IP> to any port 22` |
| La regla de UFW **no expira** (el `expires_at` de Redis no aplica nada) | Desbaneo manual desde la API; para la demo, verlo explícitamente |
| `logrotate` rota `auth.log` a diario y el watcher de Node queda con offset viejo | Reiniciar el Backend B tras la rotación, o deshabilitar `logrotate` para `auth.log` en la demo |
| La IP de Mulet queda baneada de SSH a esta máquina | Es el comportamiento esperado de la demo; se revierte con el unban |
| Doble conteo con usuarios inexistentes | Usar siempre un usuario real (`manu_abrego`) en la demo |

---

## 10. Lo que NO se puede probar (y qué hacer para la presentación)

El frontend (`src/`) es una **demo autocontenida**: `securityEngine.ts` + `presetData.ts` generan
todos los datos en el navegador y **no hay un solo `fetch`** hacia los backends. Concretamente:

| Elemento de la UI | ¿Toca el backend real? |
|---|---|
| Dashboard (métricas, IPs baneadas, logs) | ❌ datos mock |
| Redis Inspector | ❌ datos mock |
| Simulador de ataques (`AttackSimulatorModal`) | ❌ escribe en el estado del navegador |
| Botón **"Desbanear"** | ❌ `securityEngine.unbanIp()` solo muta el estado local |
| Configuración / Whitelist | ❌ estado local |

**Impacto en la demo**: si un profe hace clic en "Desbanear" durante la presentación, **no se
desbanea nada de verdad** (el backend sigue con la regla puesta). Para que la demo sea honesta
hay dos caminos:

1. **CABLEAR el frontend a la API** (trabajo real, ~1-2 h): que `unbanIp()` haga
   `POST /api/v1/security/unban` y que el Dashboard lea de `GET /api/v1/...`. Es lo que
   probablemente falta para cerrar el proyecto.
2. **Hacer el unbaneo por `curl`/Swagger durante la demo** y aclarar que la UI es una maqueta.
   Es rápido, pero si un profe toca el botón se ve el desajuste.

> Decisión pendiente: ¿querés que cableemos el frontend a la API real? Eso convertiría la
> maqueta en un producto realmente end-to-end y haría que toda esta prueba sea visible en pantalla.

---

## 11. Orden de ejecución sugerido

1. **Fase 0** → arrancar el stack con el Backend B como root (5 min)
2. **Fase 1** → inyectar logs y validar la cadena completa (10 min)
3. **Fase 2** → SSH real desde el celular o Mulet (15 min, requiere sshpass o escribir a mano)
4. **Limpieza** → sección 8
5. **Decisión de producto** → sección 10
