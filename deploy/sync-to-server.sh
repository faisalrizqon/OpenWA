#!/bin/bash
# Sync MudahSewa to aaPanel server (exclude symlinks)
# Usage: ./sync-to-server.sh <server-hostname> [deploy-dir]

SERVER="${1:-mudahsewa}"
DEPLOY_DIR="${2:-/www/wwwroot/dagdigdugdigicam.store}"

echo "Syncing from $(pwd) to $SERVER:$DEPLOY_DIR"

cd E:/Projects/mudahsewa || exit 1

# Create tarball without symlinks and excluded directories
"C:\Users\Faisal\AppData\Local\hermes\git\usr\bin\tar.exe" -cf - \
    --exclude='./node_modules' \
    --exclude='./.next' \
    --exclude='./.git' \
    --exclude='./data' \
    --exclude='./storage' \
    --exclude='./logs' \
    --exclude='./tmp' \
    --exclude='./openwa-server' \
    --exclude='./gopay-gateway' \
    --exclude='./openwa-data' \
    --exclude='./deploy-tmp' \
    --exclude='./.test-upload' \
    --exclude='./dev' \
    --exclude='./.hermes' \
    --exclude='./notion' \
    --exclude='.env*' \
    --exclude='*.log' \
    --exclude='**/*.sh' \
    --exclude='**/*.bat' \
    . | ssh "$SERVER" "sudo mkdir -p /tmp/mudahsewa-sync && sudo tar -xf - -C /tmp/mudahsewa-sync && sudo rm -rf '$DEPLOY_DIR' && sudo mv /tmp/mudahsewa-sync/* '$DEPLOY_DIR' && sudo chown -R www:www '$DEPLOY_DIR' && echo SYNC-OK"
