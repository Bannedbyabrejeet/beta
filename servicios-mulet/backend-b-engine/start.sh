#!/usr/bin/env bash
# =============================================================================
# Script de inicio para Backend B (Engine + UFW) - Máquina de MULET (192.168.220.127)
# =============================================================================
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

echo "=========================================================="
echo "🚀 Iniciando Backend B (Security Engine & UFW) - Mulet"
echo "🛡️ Requiere permisos para manipular reglas UFW y auth.log"
echo "=========================================================="

# 1. Instalar dependencias npm si faltan
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias de Node.js (express, redis)..."
    npm install
fi

# 2. Iniciar con sudo para control de firewall UFW y acceso a /var/log/auth.log
#    SKIP_SUDO=1 arranca sin privilegios (modo local / demo sin root)
export REDIS_URL="${REDIS_URL:-redis://127.0.0.1:6379}"
export PORT="${PORT:-3001}"
export SSH_LOG_PATH="${SSH_LOG_PATH:-/var/log/auth.log}"

echo "⚡ Ejecutando servidor..."
if [ "$(id -u)" = "0" ]; then
    # ya somos root
    exec env "PATH=$PATH" REDIS_URL="$REDIS_URL" PORT="$PORT" SSH_LOG_PATH="$SSH_LOG_PATH" node server.js
elif [ "${SKIP_SUDO:-0}" = "1" ]; then
    echo "⚠️  SKIP_SUDO=1 -> sin privilegios: UFW real no disponible (se usará el shim si está en el PATH)."
    exec env "PATH=$PATH" REDIS_URL="$REDIS_URL" PORT="$PORT" SSH_LOG_PATH="$SSH_LOG_PATH" node server.js
else
    exec sudo env "PATH=$PATH" REDIS_URL="$REDIS_URL" PORT="$PORT" SSH_LOG_PATH="$SSH_LOG_PATH" node server.js
fi
