#!/usr/bin/env bash
# =============================================================================
# MODO LOCAL - Levanta TODOS los servicios del proyecto en UNA sola máquina.
#
#   Redis      -> contenedor Docker           (localhost:6379)
#   Backend A  -> uvicorn / FastAPI           (localhost:8000)
#   Backend B  -> Node.js security engine     (localhost:3001)
#   Frontend   -> Vite / React                (localhost:3000)
#   Nginx      -> contenedor Docker (host)    (localhost:80)
#
# Uso:
#   ./local-dev/run-local.sh start     # levanta todo
#   ./local-dev/run-local.sh stop      # detiene todo
#   ./local-dev/run-local.sh status    # muestra el estado
#   ./local-dev/run-local.sh logs      # sigue los logs
# =============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL="$ROOT/local-dev"
RUN="$LOCAL/run"
LOGS="$LOCAL/logs"
mkdir -p "$RUN" "$LOGS"

BACKEND_A="$ROOT/servicios-abrego/backend-a-fastapi"
BACKEND_B="$ROOT/servicios-mulet/backend-b-engine"

c_ok()   { echo -e "\033[32m$1\033[0m"; }
c_warn() { echo -e "\033[33m$1\033[0m"; }
c_err()  { echo -e "\033[31m$1\033[0m"; }
c_info() { echo -e "\033[36m$1\033[0m"; }

port_busy() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null && exec 3<&- && return 0 || return 1; }

stop_pidfile() {
    local name="$1"
    local pf="$RUN/$name.pid"
    if [ -f "$pf" ]; then
        local pid; pid="$(cat "$pf")"
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null
            sleep 1
            kill -9 "$pid" 2>/dev/null
        fi
        # si el proceso es root (start-real), el kill sin sudo no funciona
        if kill -0 "$pid" 2>/dev/null; then
            c_warn "  ⚠️ El proceso $name (PID $pid) sigue vivo (probablemente corre como root)."
            c_warn "     Ejecutá en tu terminal:  sudo kill -9 $pid"
        fi
        rm -f "$pf"
    fi
}

# mata un grupo de procesos entero (necesario con uvicorn --reload)
kill_group() {
    local pid="$1"
    [ -z "$pid" ] && return 0
    kill -TERM -- "-$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null
    sleep 1
    kill -KILL -- "-$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null
    sleep 1
    # Un proceso de 'start-real' corre como root: sin sudo no se puede matar.
    if kill -0 "$pid" 2>/dev/null; then
        c_warn "  ⚠️ El proceso $pid sigue vivo (corre como root por 'start-real')."
        c_warn "     Ejecutá en tu terminal:  sudo kill -9 $pid"
    fi
}

wait_for() {  # wait_for <descripcion> <url> <segundos>
    local desc="$1" url="$2" secs="${3:-20}" i=0
    while [ "$i" -lt "$secs" ]; do
        if curl -sf -o /dev/null -m 2 "$url"; then
            c_ok "  ✓ $desc responde en $url"
            return 0
        fi
        sleep 1; i=$((i + 1))
    done
    c_err "  ✗ $desc NO responde en $url (revisá $LOGS)"
    return 1
}

# -----------------------------------------------------------------------------
start_redis() {
    c_info "[1/5] Redis (Docker)"
    if [ ! -d "$BACKEND_B/node_modules" ]; then :; fi
    if docker ps -a --format '{{.Names}}' | grep -qx "beta-redis"; then
        docker start beta-redis >/dev/null
    else
        docker run -d --name beta-redis -p 6379:6379 redis:7-alpine >/dev/null
    fi
    sleep 2
    if [ "$(docker exec beta-redis redis-cli ping 2>/dev/null)" = "PONG" ]; then
        c_ok "  ✓ Redis UP -> localhost:6379 (PONG)"
    else
        c_err "  ✗ Redis no arrancó"
    fi
}

start_backend_a() {
    c_info "[2/5] Backend A - FastAPI (puerto 8000)"
    if [ -f "$RUN/backend-a.pid" ]; then kill_group "$(cat "$RUN/backend-a.pid")"; rm -f "$RUN/backend-a.pid"; fi
    cd "$BACKEND_A" || return 1
    if [ ! -d "$BACKEND_A/venv" ] && ! python3 -c "import fastapi, uvicorn, redis, bcrypt, jwt" 2>/dev/null; then
        c_err "  ✗ Faltan dependencias Python. Ejecutá:"
        echo "      pip3 install --user --break-system-packages -r $BACKEND_A/requirements.txt"
        return 1
    fi
    # start.sh oficial, pero apuntando al Redis local
    REDIS_HOST=127.0.0.1 REDIS_PORT=6379 \
    setsid nohup ./start.sh > "$LOGS/backend-a.log" 2>&1 &
    echo $! > "$RUN/backend-a.pid"
    wait_for "Backend A" "http://127.0.0.1:8000/api/v1/health" 40
}

start_backend_b() {
    c_info "[3/5] Backend B - Motor de Seguridad (puerto 3001)"
    if [ -f "$RUN/backend-b.pid" ]; then kill_group "$(cat "$RUN/backend-b.pid")"; rm -f "$RUN/backend-b.pid"; fi
    cd "$BACKEND_B" || return 1
    if [ ! -d "$BACKEND_B/node_modules" ]; then
        c_info "  instalando dependencias npm..."
        npm install --silent
    fi
    # /var/log/auth.log no es legible sin root -> se usa un log local escribible
    touch "$LOCAL/auth.log"
    # SKIP_SUDO=1 + shim de ufw en el PATH -> simula UFW sin root
    REDIS_URL="redis://127.0.0.1:6379" PORT=3001 SSH_LOG_PATH="$LOCAL/auth.log" \
    SKIP_SUDO=1 PATH="$LOCAL/bin:$PATH" \
    setsid nohup ./start.sh > "$LOGS/backend-b.log" 2>&1 &
    echo $! > "$RUN/backend-b.pid"
    wait_for "Backend B" "http://127.0.0.1:3001/api/security/health" 30
}

start_frontend() {
    c_info "[4/5] Frontend A - React + Vite (puerto 3000)"
    if [ -f "$RUN/frontend.pid" ]; then kill_group "$(cat "$RUN/frontend.pid")"; rm -f "$RUN/frontend.pid"; fi
    cd "$ROOT" || return 1
    if [ ! -d "$ROOT/node_modules" ]; then
        c_info "  instalando dependencias npm..."
        npm install --silent
    fi
    setsid nohup env VITE_API_TARGET="http://localhost" npm run dev > "$LOGS/frontend.log" 2>&1 &
    echo $! > "$RUN/frontend.pid"
    wait_for "Frontend" "http://127.0.0.1:3000/" 40
}

start_nginx() {
    c_info "[5/5] Nginx reverse proxy (puerto 80)"
    if docker ps -a --format '{{.Names}}' | grep -qx "beta-nginx"; then
        docker rm -f beta-nginx >/dev/null 2>&1
    fi
    docker run -d --name beta-nginx --network host \
        -v "$LOCAL/nginx-local.conf:/etc/nginx/nginx.conf:ro" \
        nginx:alpine >/dev/null
    sleep 2
    if ! docker ps --format '{{.Names}}' | grep -qx "beta-nginx"; then
        c_err "  ✗ Nginx no arrancó (puerto 80 ocupado?)"
        docker logs beta-nginx 2>&1 | tail -5
        return 1
    fi
    c_ok "  ✓ Nginx UP -> http://localhost (entrada unificada)"
}

start_real_backend_b() {
    c_info "[3/5] Backend B - Motor REAL (lee /var/log/auth.log, usa UFW real)"
    if [ -f "$RUN/backend-b.pid" ]; then kill_group "$(cat "$RUN/backend-b.pid")"; rm -f "$RUN/backend-b.pid"; fi
    cd "$BACKEND_B" || return 1
    if [ ! -d "$BACKEND_B/node_modules" ]; then
        c_info "  instalando dependencias npm..."
        npm install --silent
    fi
    echo ""
    echo "  ┌──────────────────────────────────────────────────────────────┐"
    echo "  │  Se necesita tu password de sudo: el motor debe leer        │"
    echo "  │  /var/log/auth.log y ejecutar 'ufw insert/delete'.            │"
    echo "  │  Quedá mirando esta terminal: es donde se ve el ATAQUE.      │"
    echo "  └──────────────────────────────────────────────────────────────┘"
    echo ""
    # PATH preservado para encontrar el node de nvm; sin el shim de UFW
    exec sudo env "PATH=$PATH" \
        REDIS_URL="redis://127.0.0.1:6379" \
        PORT=3001 \
        SSH_LOG_PATH="/var/log/auth.log" \
        ./start.sh
}

# Arranque en modo "REAL": todo local, pero el motor lee el auth.log real
# de esta máquina y ejecuta el ufw real. Los ataques SSH externos se ven.
do_start_real() {
    echo ""
    echo "══════════════════════════════════════════════════════════"
    echo "  Bannedbyabrejeet - MODO LOCAL + MOTOR REAL"
    echo "  (lee /var/log/auth.log de esta máquina)"
    echo "══════════════════════════════════════════════════════════"
    echo ""
    start_redis
    start_backend_a
    start_frontend
    start_nginx
    echo ""
    start_real_backend_b
}

do_start() {
    echo ""
    echo "══════════════════════════════════════════════════════════"
    echo "  Bannedbyabrejeet - MODO LOCAL (todo en esta máquina)"
    echo "══════════════════════════════════════════════════════════"
    echo ""
    start_redis
    start_backend_a
    start_backend_b
    start_frontend
    start_nginx
    echo ""
    echo "──────────────────────────────────────────────────────────"
    c_ok "  Frontend .............. http://localhost:3000  (admin / admin123)"
    c_ok "  Swagger Backend A .... http://localhost:8000/docs"
    c_ok "  Backend B ............ http://localhost:3001/api/security/health"
    c_ok "  Nginx (entrada) ...... http://localhost"
    echo ""
    c_info "  Logs: $LOGS   |   Redis CLI: docker exec -it beta-redis redis-cli"
    echo ""
}

do_stop() {
    c_info "Deteniendo servicios locales..."
    for s in frontend backend-a backend-b; do
        if [ -f "$RUN/$s.pid" ]; then kill_group "$(cat "$RUN/$s.pid")"; rm -f "$RUN/$s.pid"; fi
    done
    docker rm -f beta-nginx >/dev/null 2>&1 && c_ok "  ✓ Nginx detenido"
    # NO se borra el contenedor de Redis: se detiene para conservar los datos
    # (cuenta admin, whitelist, baneos). Para wipe: ./local-dev/run-local.sh purge
    docker stop beta-redis >/dev/null 2>&1 && c_ok "  ✓ Redis detenido (contenedor conservado)"
    c_ok "  ✓ Frontend / Backend A / Backend B detenidos"
}

do_purge() {
    c_warn "Eliminando contenedores y datos locales de Redis..."
    do_stop
    docker rm -f beta-redis >/dev/null 2>&1 && c_ok "  ✓ Contenedor Redis eliminado (datos borrados)"
    rm -rf "$RUN" "$LOCAL/ufw-rules.log"
}

do_status() {
    echo ""
    echo "──────────────────────────────────────────────────────────"
    printf "%-22s %-12s %s\n" "SERVICIO" "PUERTO" "ESTADO"
    echo "──────────────────────────────────────────────────────────"
    port_busy 6379 && s="UP" || s="DOWN"; printf "%-22s %-12s %s\n" "Redis" "6379" "$s"
    port_busy 8000 && s="UP" || s="DOWN"; printf "%-22s %-12s %s\n" "Backend A (FastAPI)" "8000" "$s"
    port_busy 3001 && s="UP" || s="DOWN"; printf "%-22s %-12s %s\n" "Backend B (Engine)" "3001" "$s"
    port_busy 3000 && s="UP" || s="DOWN"; printf "%-22s %-12s %s\n" "Frontend (React)" "3000" "$s"
    port_busy 80 && s="UP" || s="DOWN"; printf "%-22s %-12s %s\n" "Nginx (entrada)" "80" "$s"
    echo ""
    if port_busy 8000; then
        echo -n "Backend A health: "; curl -s -m 3 http://127.0.0.1:8000/api/v1/health; echo
    fi
    echo ""
}

case "${1:-start}" in
    start)      do_start ;;
    start-real) do_start_real ;;
    stop)       do_stop ;;
    purge)      do_purge ;;
    restart)    do_stop; sleep 2; do_start ;;
    status)     do_status ;;
    logs)       tail -f "$LOGS"/*.log ;;
    *) echo "Uso: $0 {start|start-real|stop|restart|purge|status|logs}"; exit 1 ;;
esac
