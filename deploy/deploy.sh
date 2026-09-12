#!/bin/bash
# ============================================================
# MudahSewa Deployment Script
# Pulls latest code, installs deps, migrates DB, rebuilds, restarts
# Usage: ./deploy.sh
# ============================================================
set -euo pipefail

APP_DIR="/www/wwwroot/dagdigdugdigicam.store"
PM2="sudo -u www env HOME=/home/www PATH=/www/server/nodejs/v22.22.3/bin:$PATH pm2"
DASHBOARD_DIR="$APP_DIR/openwa-server/dashboard"

echo "=== MudahSewa Deployment $(date) ==="

cd "${APP_DIR}"

echo "[1/6] Installing dependencies..."
sudo -u www npm install --no-audit --no-fund

echo "[2/6] Generating Prisma client..."
sudo -u www npx prisma generate

echo "[3/6] Syncing database schema..."
sudo -u www npx prisma db push --accept-data-loss

echo "[4/6] Building OpenWA Dashboard..."
cd "${DASHBOARD_DIR}"
sudo -u www node node_modules/vite/bin/vite.js build

echo "[5/6] Building Next.js main app..."
cd "${APP_DIR}"
sudo -u www npx next build

echo "[6/6] Restarting services..."
$PM2 restart mudahsewa_app
$PM2 save

echo ""
echo "=== Deployment complete ==="
$PM2 list
