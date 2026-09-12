# 🚀 MudahSewa Production Deployment Guide

## Quick Deploy Command (Local → Server)

```bash
# 1. Sync main app ke server aaPanel
cd E:/Projects/mudahsewa
tar -cf - --exclude='./node_modules' --exclude='./.next' --exclude='./.git' \
  --exclude='./data' --exclude='./storage' --exclude='./logs' --exclude='./tmp' \
  --exclude='./openwa-server' --exclude='./gopay-gateway' --exclude='./.hermes' \
  --exclude='.env*' --exclude='*.log' . | ssh mudahsewa "sudo mkdir -p /tmp/mudahsewa-sync && sudo tar -xf - -C /tmp/mudahsewa-sync && sudo rm -rf /www/wwwroot/dagdigdugdigicam.store && sudo mv /tmp/mudahsewa-sync/* /www/wwwroot/dagdigdugdigicam.store && sudo chown -R www:www /www/wwwroot/dagdigdugdigicam.store && echo 'MAIN-APP-SYNCED'"

# 2. Push dashboard changes ke remote repository OpenWA
cd openwa-server
git add dashboard/src/
git commit -m "feat(dashboard): [DESCRIBE CHANGES HERE]"
git push origin-fork mudahsewa/patches

# 3. SSH ke server dan deploy dashboard
ssh mudahsewa << EOF
    cd /www/wwwroot/openwa-server/dashboard
    git fetch origin-fork
    git merge origin-fork/mudahsewa/patches --no-edit
    node node_modules/vite/bin/vite.js build
    pm2 restart openwa_server
    pm2 save
EOF
```

## Manual Deploy Steps

### Main Application (Next.js - Port 3000)

#### Local (Windows)
```powershell
# Build Next.js locally untuk verify
cd E:/Projects/mudahsewa
npm run build
npx next lint

# Sync ke server
tar -cf - --exclude='./node_modules' --exclude='./.next' --exclude='./.git' \
  --exclude='./data' --exclude='./storage' --exclude='./logs' --exclude='./tmp' \
  --exclude='./openwa-server' --exclude='./gopay-gateway' --exclude='./.hermes' \
  --exclude='.env*' --exclude='*.log' . | ssh mudahsewa "sudo mkdir -p /tmp/mudahsewa-sync && sudo tar -xf - -C /tmp/mudahsewa-sync && sudo rm -rf /www/wwwroot/dagdigdugdigicam.store && sudo mv /tmp/mudahsewa-sync/* /www/wwwroot/dagdigdugdigicam.store && sudo chown -R www:www /www/wwwroot/dagdigdugdigicam.store"
```

#### Server (aaPanel Ubuntu)
```bash
# Navigate to deployed directory
cd /www/wwwroot/dagdigdugdigicam.store

# Install deps & rebuild
sudo -u www npm install --no-audit --no-fund
sudo -u www npx prisma generate
sudo -u www npx prisma db push --accept-data-loss
sudo -u www npx next build

# Restart service
PM2="sudo -u www env HOME=/home/www PATH=/www/server/nodejs/v22.22.3/bin:\$PATH pm2"
$PM2 restart mudahsewa_app
$PM2 save

# Health check
curl -s http://localhost:3000/health
```

### OpenWA Dashboard (Port 2785)

#### Local (Git Workflow)
```powershell
# Commit dashboard changes
cd E:/Projects/mudahsewa/openwa-server/dashboard/src
git add .
git commit -m "fix(dashboard): [describe what you fixed]"
git push origin-fork mudahsewa/patches
```

#### Server (Apply Changes)
```bash
# SSH to server
ssh mudahsewa

# Navigate and pull dashboard updates
cd /www/wwwroot/openwa-server
git fetch origin-fork
git merge origin-fork/mudahsewa/patches --no-edit

# Rebuild dashboard
cd dashboard
sudo -u www node node_modules/vite/bin/vite.js build

# Restart OpenWA service
cd ..
PM2="sudo -u www env HOME=/home/www PATH=/www/server/nodejs/v22.22.3/bin:\$PATH pm2"
$PM2 restart openwa_server
$PM2 save

# Verify
curl -s http://localhost:2785/api/health
```

## Monitoring After Deploy

### PM2 Status
```bash
PM2="sudo -u www env HOME=/home/www PATH=/www/server/nodejs/v22.22.3/bin:\$PATH pm2"
$PM2 list                    # All services status
$PM2 logs mudahsewa_app      # Main app logs
$PM2 logs openwa_server     # OpenWA logs
$PM2 logs gopay_gateway     # GoPay gateway logs
```

### Database Checks
```bash
# Check DB migrations applied
ls -lth /www/backup/mudahsewa/db/      # Recent backups
file /www/wwwroot/dagdigdugdigicam.store/data/mudahsewa.db   # DB file info
sqlite3 /www/wwwroot/dagdigdugdigicam.store/data/mudahsewa.db "SELECT COUNT(*) FROM users;"  # Data check
```

### Nginx Configuration
```bash
# Reload nginx after any config change
sudo systemctl reload nginx

# Test nginx config
sudo nginx -t

# View access logs
tail -f /var/log/nginx/dagdigdugdigicam.store-access.log
```

## Rollback Procedure

```bash
# Stop services
PM2="sudo -u www env HOME=/home/www PATH=/www/server/nodejs/v22.22.3/bin:\$PATH pm2"
$PM2 stop mudahsewa_app
$PM2 stop openwa_server

# Restore main app code
cd /www/wwwroot/dagdigdugdigicam.store
git reset --hard <previous-commit-hash>

# Restore database from backup (if needed)
sudo cp /www/backup/mudahsewa/db/mudahsewa_YYYYMMDD_HHMMSS.db /www/wwwroot/dagdigdugdigicam.store/data/mudahsewa.db
sudo chown www:www /www/wwwroot/dagdigdugdigicam.store/data/mudahsewa.db

# Rebuild & restart
sudo -u www npx next build
$PM2 restart mudahsewa_app
$PM2 restart openwa_server
$PM2 save
```

## Troubleshooting

| Symptom | Possible Cause | Fix |
|---------|----------------|-----|
| Service OFFLINE in PM2 UI | Name mismatch with underscore | Use exact name `mudahsewa_app` (not easydash-app) |
| 502 Bad Gateway | Next.js not running | `$PM2 start mudahsewa_app` |
| WebSocket timeout on dashboard | OpenWA not listening | `$PM2 restart openwa_server --update-env` |
| Prisma client issues | Missing generated client | `sudo -u www npx prisma generate` |
| Database lock errors | WAL mode disabled | Add `.wal_mode=true` to connection string |

## Pre-Deployment Checklist

✅ **Local Testing**
- [ ] `npm run build` succeeds
- [ ] `npx next lint` shows no critical errors  
- [ ] Dashboard build: `vite build` completes without errors

✅ **Code Review**
- [ ] No hardcoded secrets in commits
- [ ] `.env` files not committed (check `.gitignore`)
- [ ] Breaking changes documented

✅ **Backup**
- [ ] Latest database backup exists in `/www/backup/mudahsewa/db/`
- [ ] Recent full backup available

✅ **Server Readiness**
- [ ] Disk space adequate (`df -h`)
- [ ] No failed containers/services (`pm2 list`)
- [ ] SSL certificate valid (`openssl x509 -in ... -checkend 0`)

---

**Last Updated:** 2026-09-12 | **Author:** Faisal Rizqon | **Version:** v1.2
