#!/usr/bin/env bash
# =============================================================================
# Script de inicio para Frontend A (React Vite) - Máquina de ABREGO (192.168.220.123)
# =============================================================================
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." >/dev/null 2>&1 && pwd)"
cd "$DIR"

echo "=========================================================="
echo "🚀 Iniciando Frontend A (React Vite) - Abrego"
echo "🌐 Escuchando en: http://0.0.0.0:3000"
echo "=========================================================="

if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias de Node.js..."
    npm install
fi

echo "✅ Iniciando servidor Vite accesible en toda la red local..."
exec npm run dev -- --host 0.0.0.0 --port 3000
