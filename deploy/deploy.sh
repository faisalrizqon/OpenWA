#!/bin/bash
# ============================================================
# MudahSewa Deployment Script
# Pulls latest code, installs deps, migrates DB, rebuilds, restarts
# Usage: ./deploy.sh
# ============================================================
set -euo pipefail

APP_DIR="/www/wwwroot/dagdigdugdigicam.store"
PM2="sudo -u www env HOME=/home/www PATH=/www/server/nodejs/v22.22.3/bin:\$PATH pm2"

echo "=== MudahSewa Deployment $(date) ==="

cd "${APP_DIR}"

echo "[1/5] Installing dependencies..."
sudo -u www npm install --no-audit --no-fund

echo "[2/5] Generating Prisma client..."
sudo -u www npx prisma generate

echo "[3/5] Syncing database schema..."
sudo -u www npx prisma db push --accept-data-loss

echo "[4/5] Building Next.js..."
sudo -u www npx next build

echo "[5/5] Restarting services..."
$PM2 restart mudahsewa-app
$PM2 save

echo ""
echo "=== Deployment complete ==="
$PM2 list
