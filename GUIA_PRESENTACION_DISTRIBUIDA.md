# 🚀 Guía de Despliegue y Presentación Distribuida (Ubuntu)
**Proyecto:** Bannedbyabrejeet - Sistema de Seguridad Perimetral SSH & Firewall UFW  
**Autores:** Manuel Abrego & Santiago Mulet  
**Institución:** ETEC UM  
**Ubicación del repositorio en ambas máquinas:** `~/beta`

> 📌 **Documento complementario:** para el detalle completo de dependencias, modo local
> (todo en una sola máquina) y troubleshooting, ver **[`MANUAL_EJECUCION.md`](MANUAL_EJECUCION.md)**.
>
> ⚠️ **Correcciones ya aplicadas al repositorio:**
> 1. `nginx.conf`: `proxy_pass http://backend_b_engine;` **sin barra final** — con la barra
>    final Nginx quitaba el prefijo `/api/security/` y `/api/security/health` devolvía 404.
> 2. `backend-a-fastapi/start.sh`: `REDIS_HOST`, `REDIS_PORT` y `JWT_SECRET_KEY` ahora se
>    pueden sobrescribir por entorno (útil para el modo local).
> 3. `backend-b-engine/start.sh`: soporte `SKIP_SUDO=1` y variables por entorno.
> 4. Los `start.sh` y `setup-nginx.sh` ahora tienen permiso de ejecución (`chmod +x`).
> 5. Si `python3 -m venv` falla con `ensurepip is not available`, usar `virtualenv`
>    (ver `MANUAL_EJECUCION.md`, sección 0.1).

---

## 🌐 1. Topología de Red y Asignación de Roles

| Alumno | Dirección IP | Servicios Asignados | Carpeta en `~/beta` | Puerto |
| :--- | :--- | :--- | :--- | :--- |
| **Abrego** | `192.168.220.123` | **Backend A** (FastAPI) + **Frontend A** (React Vite) | `~/beta/servicios-abrego/` | `8000` / `3000` |
| **Mulet** | `192.168.220.127` | **Proxy Ingress** (Nginx) + **Backend B** (Node/UFW) + **Redis** | `~/beta/servicios-mulet/` | `80` / `3001` / `6379` |

> 📌 **Punto de Entrada General:** Todos los evaluadores y profesores abren en el navegador:  
> 👉 **`http://192.168.220.127`** (La IP de Mulet, que mediante Nginx unifica todos los servicios transparentemente).

---

## 📦 2. Requisitos Previos e Instalación en Ubuntu

### 💻 En la Máquina de ABREGO (`192.168.220.123`)
Abre una terminal (`Ctrl + Alt + T`):
```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv nodejs npm ufw
```

Permite el tráfico de red de la máquina de Mulet:
```bash
sudo ufw allow from 192.168.220.127
```

---

### 🖥️ En la Máquina de MULET (`192.168.220.127`)
Abre una terminal:
```bash
sudo apt update
sudo apt install -y redis-server nginx nodejs npm ufw
```

Permite el tráfico de red de Abrego y habilita los puertos de Nginx y Redis:
```bash
sudo ufw allow from 192.168.220.123
sudo ufw allow 80/tcp
sudo ufw allow 6379/tcp
sudo ufw enable
```

#### Configurar Redis en la máquina de Mulet para escuchar a Abrego:
Por defecto en Ubuntu, Redis solo escucha en `127.0.0.1`. Abrego necesita conectarse a tu Redis:
1. Edita el archivo:
   ```bash
   sudo nano /etc/redis/redis.conf
   ```
2. Busca la línea:
   ```text
   bind 127.0.0.1 ::1
   ```
   Cámbiala por:
   ```text
   bind 0.0.0.0
   ```
3. Busca `protected-mode yes` y cámbiala a:
   ```text
   protected-mode no
   ```
4. Guarda con `Ctrl + O`, presiona `Enter` y sal con `Ctrl + X`.
5. Reinicia Redis:
   ```bash
   sudo systemctl restart redis-server
   sudo systemctl status redis-server
   ```

---

## 🏃 3. Orden de Arranque (Día de la Presentación)

### 🔴 PASO I: En la máquina de MULET (`192.168.220.127`)

#### Terminal 1 - Verificar Redis:
```bash
redis-cli ping
# Debe responder: PONG
```

#### Terminal 2 - Instalar/Recargar el Proxy NGINX:
```bash
cd ~/beta/servicios-mulet/proxy-nginx
chmod +x setup-nginx.sh
./setup-nginx.sh
```

#### Terminal 3 - Iniciar Backend B (Motor de Seguridad & Driver UFW):
```bash
cd ~/beta/servicios-mulet/backend-b-engine
chmod +x start.sh
./start.sh
```
*(Verás: `⚡ Bannedbyabrejeet Security Engine (Mulet) en puerto 3001` y `🛡️ Control UFW: Activado`).*

---

### 🔵 PASO II: En la máquina de ABREGO (`192.168.220.123`)

#### Terminal 1 - Iniciar Backend A (FastAPI Python):
```bash
cd ~/beta/servicios-abrego/backend-a-fastapi
chmod +x start.sh
./start.sh
```
*(Se creará el entorno virtual si es la primera vez y verás: `Uvicorn running on http://0.0.0.0:8000`).*

#### Terminal 2 - Iniciar Frontend A (React Vite):
```bash
cd ~/beta/servicios-abrego/frontend-a-react
chmod +x start.sh
./start.sh
```
*(Verás: `VITE ready... Network: http://192.168.220.123:3000`).*

---

## 🎬 4. Guion de Demostración para los Profesores

1. **Ingreso Unificado:**
   * Entren desde cualquier máquina a: **`http://192.168.220.127`**.
   * Expliquen que aunque están entrando a la IP de Mulet, Nginx les está sirviendo el frontend de Abrego.

2. **Arquitectura y Microservicios:**
   * Abran en una pestaña **Swagger Docs** (`http://192.168.220.127/docs`).
   * Muestren que cada endpoint se ejecuta en la máquina de **Abrego** (`:8000`), pero almacena las sesiones y configuraciones en el Redis de **Mulet** (`:6379`).

3. **Prueba de Fuego en Vivo - Detección y Bloqueo UFW:**
   * Desde una tercera computadora (o celular conectado al Wi-Fi), simulan varios intentos de login fallidos por SSH hacia la IP de Mulet:
     ```bash
     ssh root@192.168.220.127
     ```
   * En la terminal de **Mulet**, el Backend B detecta el fallo en `/var/log/auth.log`, cuenta las faltas en Redis y cuando llega al límite configurado ejecuta el ban.
   * Ejecuten en la máquina de Mulet:
     ```bash
     sudo ufw status numbered
     ```
     ¡Se verá la regla `[ 1] 22 DENY IN <IP>` recién creada por el motor!

4. **Desbaneo Desacoplado con Redis Pub/Sub:**
   * En la pantalla web en la máquina de Abrego, tocan **"Desbanear"** a esa IP.
   * La orden viaja de Abrego a FastAPI, FastAPI publica en `channel:unban_events`, y en la pantalla de Mulet verán de inmediato:
     ```text
     📬 [REDIS PUBSUB] Mensaje recibido: UNBAN <IP>
     ✅ [UFW ÉXITO] Regla de bloqueo para IP eliminada de UFW.
     ```
