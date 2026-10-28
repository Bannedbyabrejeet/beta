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

# Destino del proxy de la API (por defecto: la entrada unificada de Mulet).
#   Modo local  : VITE_API_TARGET=http://localhost ./start.sh
#   Modo distribuido (default): http://192.168.220.127 (Nginx en Mulet)
export VITE_API_TARGET="${VITE_API_TARGET:-http://192.168.220.127}"

echo "🔗 API (proxy Vite): ${VITE_API_TARGET}  ->  /api/v1/* y /api/security/*"
echo "✅ Iniciando servidor Vite accesible en toda la red local..."
exec npm run dev -- --host 0.0.0.0 --port 3000
