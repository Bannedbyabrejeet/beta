#!/usr/bin/env bash
# =============================================================================
# Script de inicio para Backend A (FastAPI) - Máquina de ABREGO (192.168.220.123)
# =============================================================================
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

echo "=========================================================="
echo "🚀 Iniciando Backend A (FastAPI Python) - Abrego"
echo "📡 Destino Redis (Mulet): 192.168.220.127:6379"
echo "=========================================================="

# 1. Crear entorno virtual si no existe
if [ ! -d "venv" ]; then
    echo "📦 Creando entorno virtual Python (venv)..."
    python3 -m venv venv
fi

# 2. Activar venv
source venv/bin/activate

# 3. Instalar dependencias si faltan
echo "🔍 Verificando dependencias Python..."
pip install --quiet -r requirements.txt

# 4. Exportar variables de entorno apuntando a la máquina de Mulet
export REDIS_HOST="192.168.220.127"
export REDIS_PORT="6379"
export JWT_SECRET_KEY="bannedbyabrejeet_enterprise_secret_2026"

echo "✅ Entorno listo. Iniciando Uvicorn en http://0.0.0.0:8000 ..."
echo "📖 Swagger UI disponible en: http://192.168.220.123:8000/docs"
exec uvicorn main:app --host 0.0.0.0 --port 8000 --reload
