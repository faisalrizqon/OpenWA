#!/bin/bash
# ============================================================
# Install Cloudflare Origin Certificate for dagdigdugdigicam.store
# Usage: sudo ./install-cf-ssl.sh <fullchain.crt> <privkey.key>
# ============================================================

DOMAIN="dagdigdugdigicam.store"
CERT_DIR="/www/server/panel/vhost/cert/${DOMAIN}"
NGINX_CONF="/www/server/panel/vhost/nginx/${DOMAIN}.conf"

echo "=== Cloudflare SSL Installation ==="
echo "Domain: $DOMAIN"

# Create directory
sudo mkdir -p "${CERT_DIR}"
sudo cp "$1" "${CERT_DIR}/fullchain.pem"
sudo cp "$2" "${CERT_DIR}/privkey.pem"
sudo chown -R root:root "${CERT_DIR}"
sudo chmod 700 "${CERT_DIR}"
sudo chmod 644 "${CERT_DIR}/fullchain.pem"
sudo chmod 600 "${CERT_DIR}/privkey.pem"

echo ""
echo "Certificate installed at ${CERT_DIR}/fullchain.pem"
echo "Key installed at ${CERT_DIR}/privkey.pem"
echo ""

# Enable SSL in nginx config
sed -i 's/^    #    listen 443 ssl http2;/    listen 443 ssl http2;/' "${NGINX_CONF}"
sed -i 's/^    #    ssl_certificate /    ssl_certificate /' "${NGINX_CONF}"
sed -i 's/^    #    ssl_certificate_key /    ssl_certificate_key /' "${NGINX_CONF}"
sed -i 's/^    #    ssl_protocols /    ssl_protocols /' "${NGINX_CONF}"
sed -i 's/^    #    ssl_ciphers /    ssl_ciphers /' "${NGINX_CONF}"
sed -i 's/^    #    ssl_prefer_server_ciphers /    ssl_prefer_server_ciphers /' "${NGINX_CONF}"
sed -i 's/^    #    ssl_session_cache /    ssl_session_cache /' "${NGINX_CONF}"
sed -i 's/^    #    ssl_session_timeout /    ssl_session_timeout /' "${NGINX_CONF}"

echo "SSL enabled in Nginx configuration."
echo ""

# Test and reload nginx
echo "Testing Nginx configuration..."
if sudo /www/server/nginx/sbin/nginx -t 2>&1 | grep -q "syntax is ok"; then
    echo "✓ Nginx config valid"
    echo "Reloading Nginx..."
    sudo /www/server/nginx/sbin/nginx -s reload
    echo "✓ Nginx reloaded successfully"
else
    echo "✗ Nginx config error detected:"
    sudo /www/server/nginx/sbin/nginx -t 2>&1
fi

echo ""
echo "=== Done ==="
