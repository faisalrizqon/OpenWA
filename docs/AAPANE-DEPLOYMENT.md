# MudahSewa Deployment Guide for Aapane

## Prerequisites
- SSH access to Aapane server (user: www)
- Node.js 22+ installed on Aapane
- PM2 process manager installed globally

## Step 1: Create Deployment Package on Local Machine

### Windows PowerShell:
```powershell
# Navigate to project root
cd E:\Projects\mudahsewa

# Create tarball excluding unnecessary files
tar -cf deploy-full.tar `
  --exclude='./node_modules' `
  --exclude='./.next' `
  --exclude='./.git' `
  --exclude='./data' `
  --exclude='./storage' `
  --exclude='./logs' `
  --exclude='./tmp' `
  --exclude='openwa-server' `
  --exclude='gopay-gateway' `
  src app prisma next.config.ts tsconfig.json package.json README.md .env.example
```

### Alternative: Use existing tarball
If you already have `dist-full.tar` or `deploy-full.tar`, use that directly.

## Step 2: Upload to Aapane Server

```bash
# From your local machine (Git Bash/WSL):
scp deploy-full.tar www@your-aapane-server-ip:/tmp/

# Replace with actual Aapane IP or domain
# scp deploy-full.tar www@dagdigdugdigicam.store:/tmp/
```

## Step 3: Deploy on Aapane Server

### SSH into Aapane:
```bash
ssh www@your-aapane-server-ip
```

### Extract and Deploy:
```bash
# Navigate to web root
cd /www/wwwroot/dagdigdugdigicam.store

# Extract the tarball
tar -xf /tmp/deploy-full.tar

# Set correct permissions
chown -R www:www .

# Install dependencies
npm install --no-audit --no-fund

# Generate Prisma client
npx prisma generate

# Sync database schema (ACCEPT DATA LOSS if needed)
npx prisma db push --accept-data-loss

# Build Next.js app
npx next build

# Restart PM2 process
sudo -u www env HOME=/home/www PATH=/www/server/nodejs/v22.22.3/bin:$PATH pm2 restart mudahsewa_app
sudo -u www env HOME=/home/www PATH=/www/server/nodejs/v22.22.3/bin:$PATH pm2 save

# Check status
sudo -u www env HOME=/home/www PATH=/www/server/nodejs/v22.22.3/bin:$PATH pm2 list
```

## Step 4: Configure OpenWA Dashboard (Optional but Recommended)

### If you want WhatsApp integration:

```bash
# Navigate to OpenWA directory
cd /www/wwwroot/openwa-server/dashboard

# Build dashboard (if source was synced)
npm install --no-audit --no-fund
node node_modules/vite/bin/vite.js build

# Restart OpenWA service
sudo -u www env HOME=/home/www PATH=/www/server/nodejs/v22.22.3/bin:$PATH pm2 restart openwa_server
sudo -u www env HOME=/home/www PATH=/www/server/nodejs/v22.22.3/bin:$PATH pm2 save
```

## Step 5: Verify Deployment

### Health Check:
```bash
curl -s https://dagdigdugdigicam.store/health
```

### Check PM2 Processes:
```bash
sudo -u www env HOME=/home/www PATH=/www/server/nodejs/v22.22.3/bin:$PATH pm2 list
```

### View Logs:
```bash
sudo -u www env HOME=/home/www PATH=/www/server/nodejs/v22.22.3/bin:$PATH pm2 logs mudahsewa_app
```

## Post-Deployment Tasks

### 1. Update Environment Variables:
Edit `/www/wwwroot/dagdigdugdigicam.store/.env.production` with production values:
- Database connection string
- WhatsApp credentials
- GoPay credentials (if using QRIS)
- Store settings

### 2. Reload Nginx (if config changed):
```bash
sudo systemctl reload nginx
```

### 3. Test Features:
- ✓ Main app loads at https://dagdigdugdigicam.store/
- ✓ Admin panel at https://dagdigdugdigicam.store/admin
- ✓ WhatsApp integration (if configured)
- ✓ Payment gateway (GoPay QRIS, if enabled)

## Troubleshooting

### Common Issues:

**Database Connection Failed:**
```bash
# Check .env.production
cat /www/wwwroot/dagdigdugdigicam.store/.env.production | grep DATABASE

# Test connection
sudo -u www npx prisma db pull
```

**PM2 Process Not Running:**
```bash
# Restart manually
sudo -u www env HOME=/home/www PATH=/www/server/nodejs/v22.22.3/bin:$PATH pm2 start ecosystem.config.js
sudo -u www env HOME=/home/www PATH=/www/server/nodejs/v22.22.3/bin:$PATH pm2 save
```

**Next.js Build Errors:**
```bash
# Clear cache
rm -rf .next
npx next build
```

**Port Already in Use:**
```bash
# Check what's using port 3000
sudo netstat -tlnp | grep :3000

# Kill process or change PORT in .env.production
```

## Rollback Procedure

If deployment fails and you need to rollback:

```bash
# Restore from backup
cd /www/wwwroot/dagdigdugdigicam.store
tar -xf /www/backup/mudahsewa/db/main.db.gz  # restore database

# Revert code version
git checkout <previous-tag>

# Redeploy
npm install --no-audit --no-fund
npx prisma db push
npx next build
pm2 restart mudahsewa_app
```

## Security Checklist

- ✓ Change all default passwords
- ✓ Enable SSL/TLS (Let's Encrypt recommended)
- ✓ Configure firewall (only ports 80, 443, 22 open)
- ✓ Set proper file permissions (600 for .env)
- ✓ Regular database backups
- ✓ Monitor logs for suspicious activity

## Maintenance

### Weekly:
- Check disk space usage
- Review error logs
- Verify database backups running

### Monthly:
- Update Node.js dependencies
- Security updates
- Performance monitoring

---

**Last Updated:** September 13, 2026
**Author:** Qoder AI Assistant
