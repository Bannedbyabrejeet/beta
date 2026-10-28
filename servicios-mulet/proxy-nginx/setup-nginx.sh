#!/usr/bin/env bash
# =============================================================================
# Script para instalar y activar la configuración de Nginx en Ubuntu (Mulet)
# =============================================================================
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
CONF_FILE="$DIR/nginx.conf"

echo "=========================================================="
echo "🔧 Configurando Nginx Reverse Proxy - Máquina de Mulet"
echo "=========================================================="

if [ ! -f "$CONF_FILE" ]; then
    echo "❌ No se encontró $CONF_FILE"
    exit 1
fi

echo "📋 Copiando configuración a /etc/nginx/nginx.conf..."
sudo cp "$CONF_FILE" /etc/nginx/nginx.conf

echo "🔍 Verificando sintaxis de Nginx..."
sudo nginx -t

echo "🔄 Recargando servicio Nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ ¡Nginx configurado y activo en el puerto 80!"
echo "🌐 Acceso local: http://localhost"
echo "🌐 Acceso red:  http://192.168.220.127"
