#!/bin/bash
# ============================================================
# EasyDeploy - One-Command Deployment untuk MudahSewa
# Deploy: Main App (port 3000) + OpenWA Dashboard (port 2785)
# Topologi server (lihat deploy/RUNBOOK.md):
#   - Main app  : /www/wwwroot/dagdigdugdigicam.store  (PM2: mudahsewa_app)
#   - OpenWA    : /www/wwwroot/openwa-server           (PM2: openwa_server)
#     OpenWA repo TERPISAH — source dashboard synced via rsync ke sana.
# Usage: ./easydeploy.sh [server]
# ============================================================
set -euo pipefail

SERVER="${1:-mudahsewa}"
APP_DIR="/www/wwwroot/dagdigdugdigicam.store"
OPENWA_DIR="/www/wwwroot/openwa-server"
PM2="sudo -u www env HOME=/home/www PATH=/www/server/nodejs/v22.22.3/bin:\$PATH pm2"

echo "=========================================="
echo "  MudahSewa EasyDeploy"
echo "=========================================="
echo "Server : $SERVER"
echo "App    : $APP_DIR"
echo "OpenWA : $OPENWA_DIR"
echo ""

echo "[1/4] Syncing main application..."
tar -cf - \
    --exclude='./node_modules' \
    --exclude='./.next' \
    --exclude='./.git' \
    --exclude='./data' \
    --exclude='./storage' \
    --exclude='./logs' \
    --exclude='./tmp' \
    --exclude='openwa-server' \
    --exclude='./openwa-server/**' \
    --exclude='./gopay-gateway' \
    --exclude='./openwa-data' \
    . | ssh "$SERVER" "mkdir -p /tmp/ms-sync && rm -rf /tmp/ms-sync/* && tar -xf - -C /tmp/ms-sync && rsync -a --delete --exclude='data/' --exclude='storage/' --exclude='.env*' --exclude='node_modules/' --exclude='.next/' --exclude='openwa-server' /tmp/ms-sync/ '$APP_DIR'/ && chown -R www:www '$APP_DIR' && echo 'OK:main'"

echo "[2/4] Syncing OpenWA dashboard source..."
tar -cf - -C openwa-server/dashboard \
    --exclude='./node_modules' \
    --exclude='./dist' \
    --exclude='*.log' \
    --exclude='*.md' \
    . | ssh "$SERVER" "mkdir -p /tmp/ow-dash && rm -rf /tmp/ow-dash/* && tar -xf - -C /tmp/ow-dash && rsync -a --delete --exclude='node_modules/' --exclude='dist/' /tmp/ow-dash/ '$OPENWA_DIR/dashboard/' && chown -R www:www '$OPENWA_DIR/dashboard' && echo 'OK:dash'"

echo "[3/4] Building OpenWA dashboard & restarting..."
ssh "$SERVER" bash -s <<EOF
set -e
cd '$OPENWA_DIR'
[ ! -f package.json ] && { echo "ERROR: openwa-server/package.json missing"; exit 1; }
npm ci --only=production --no-audit 2>/dev/null || npm install --only=production --no-audit
cd dashboard
npm ci --no-audit --no-fund 2>/dev/null || npm install --no-audit --no-fund
node node_modules/vite/bin/vite.js build
$PM2 restart openwa_server
$PM2 save
echo "  OK: dashboard rebuilt, openwa_server restarted"
EOF

echo "[4/4] Building main app & restarting..."
ssh "$SERVER" bash -s <<EOF
set -e
cd '$APP_DIR'
[ ! -f package.json ] && { echo "ERROR: main package.json missing"; exit 1; }
npm ci --only=production --no-audit 2>/dev/null || npm install --only=production --no-audit
npx prisma generate
npx prisma db push --accept-data-loss
npx next build
$PM2 restart mudahsewa_app
$PM2 save
echo "  OK: main app rebuilt, mudahsewa_app restarted"
EOF

echo ""
echo "=========================================="
echo "  ✅ Deployment Complete!"
echo "=========================================="
echo "Main app: https://dagdigdugdigicam.store/"
echo "OpenWA  : http://<server-ip>:2785/"
echo ""
echo "Verifikasi:"
echo "  ssh $SERVER '$PM2 list'"
echo "  curl -s https://dagdigdugdigicam.store/health"
echo ""
