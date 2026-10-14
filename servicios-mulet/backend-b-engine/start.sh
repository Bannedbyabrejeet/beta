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
export REDIS_URL="redis://127.0.0.1:6379"
export PORT="3001"
export SSH_LOG_PATH="/var/log/auth.log"

echo "⚡ Ejecutando servidor con permisos de administrador..."
sudo env "PATH=$PATH" REDIS_URL="$REDIS_URL" PORT="$PORT" SSH_LOG_PATH="$SSH_LOG_PATH" node server.js
