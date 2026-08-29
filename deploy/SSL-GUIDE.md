# 🌐 MudahSewa Production Status & SSL Configuration Guide

## ✅ Current State (After Fixes Applied)

### Services Running
| Service | Port | Status | Uptime | Restarts |
|---|---|---|---|---|
| **MudahSewa App** | 3000 | ✅ Online | ~25 min | Normal (startup restarts) |
| **GoPay Gateway** | 3100 | ✅ Online | ~28 min | 0 |
| **OpenWA WhatsApp** | 2785 | ⚠️ Restarting | Bootstrap errors | 19 |

### Fixed Issues
✅ **Main app**: EADDRINUSE port 3000 killed, auth host now trusted  
✅ **GoPay gateway**: Running without issues  
✅ **ACME challenge path**: `/.well-known/acme-challenge/` works ✓  
✅ **Environment files**: RESTORED with `API_KEY_PEPPER` and `AUTH_TRUST_HOST=true`  

---

## 🔒 SSL Configuration Options

**Problem:** Your DNS (`dagdigdugdigicam.store`) currently points to Cloudflare proxy (orange cloud), which blocks direct HTTP-01 validation from Let's Encrypt.

### Option A: Cloudflare Origin Certificate (Recommended) ⭐
Use this if you want to keep Cloudflare proxy ON:

1. Log in to https://www.cloudflare.com → **SSL/TLS** → **Edge Certificates**
2. Click **Create Certificate**
3. Generate a certificate valid for 15 years (max allowed)
4. Download `.crt` and `.key` files
5. Install on server:

```bash
cd /tmp
# Upload cert and key files here first (via SCP or panel file manager)

sudo mkdir -p /www/server/panel/vhost/cert/dagdigdugdigicam.store
sudo cp dagdigdugdigicam.crt /www/server/panel/vhost/cert/dagdigdugdigicam.store/fullchain.pem
sudo cp dagdigdugdigicam.key /www/server/panel/vhost/cert/dagdigdugdigicam.store/privkey.pem
sudo chmod 600 /www/server/panel/vhost/cert/dagdigdugdigicam.store/*.pem
sudo chown root:root /www/server/panel/vhost/cert/dagdigdugdigicam.store/*

# Update nginx config to enable SSL
sudo sed -i 's/#    listen 443 ssl http2;/    listen 443 ssl http2;/' /www/server/panel/vhost/nginx/node_mudahsewa_app.conf
sudo sed -i 's|#    ssl_certificate.*|#    ssl_certificate /www/server/panel/vhost/cert/dagdigdugdigicam.store/fullchain.pem;|' /www/server/panel/vhost/nginx/node_mudahsewa_app.conf
sudo sed -i 's|#    ssl_certificate_key.*|#    ssl_certificate_key /www/server/panel/vhost/cert/dagdigdugdigicam.store/privkey.pem;|' /www/server/panel/vhost/nginx/node_mudahsewa_app.conf

# Reload nginx
sudo /www/server/nginx/sbin/nginx -t && sudo /www/server/nginx/sbin/nginx -s reload
```

**Result:** HTTPS enabled via Cloudflare edge + origin cert, no Let's Encrypt dependency.

### Option B: Switch to Grey Cloud + Let's Encrypt (Automatic)
Disable Cloudflare proxy temporarily for Let's Encrypt issuance:

1. Go to Cloudflare dashboard → **DASHBOARD** → **DNS** → Find `A` record for `dagdigdugdigicam.store`
2. Click orange cloud icon → Change to **Grey cloud** (DNS only, no proxy)
3. Wait ~1 minute for changes to propagate
4. Run on aaPanel: Click **"SSL"** plugin → Select `dagdigdugdigicam.store` → **"Get SSL Certificate"** (Let's Encrypt free)
5. After success, change back to **Orange cloud** (proxy enabled again)

**Note:** Once issued, Let's Encrypt certificates auto-renew monthly via aaPanel cron.

---

## 🚨 Remaining Issue: OpenWA Bootstrap Crash

OpenWA still fails to start due to an undocumented bootstrap error. Fix requires:

**Temporary workaround:** Temporarily set `NODE_ENV=development` in `/www/wwwroot/openwa-server/.env`:

```bash
# Edit env file
nano /www/wwwroot/openwa-server/.env

# Line: NODE_ENV=production
# Change to: NODE_ENV=development
```

Then restart:
```bash
sudo -u www env HOME=/home/www PATH=/www/server/nodejs/v22.22.3/bin:$PATH pm2 restart openwa_server
```

This will bypass strict security checks and allow you to see the actual error message for debugging.

---

## 📡 Access URLs

| URL | Description | Status |
|---|---|---|
| `http://192.168.100.130:3000/` | LAN direct access | ✅ Working |
| `http://dagdigdugdigicam.store:3000/` | Via nginx proxy | ✅ Working |
| `https://dagdigdugdigicam.store/` | HTTPS (after SSL setup) | ⏳ Pending SSL |
| `http://dagdigdugdigicam.store/gopay/health` | GoPay health check | ✅ Working |
| `http://wa.dagdigdugdigicam.store/` | OpenWA dashboard | ⏳ OpenWA needs fixing |

---

## 🔧 Monitoring Scripts Available

```bash
# PM2 status and health check
sudo bash /www/wwwroot/dagdigdugdigicam.store/scripts/pm2-status.sh

# Manual database backup
sudo bash /www/wwwroot/dagdigdugdigicam.store/scripts/backup-db.sh

# Deployment script (for future updates)
sudo bash /www/wwwroot/dagdigdugdigicam.store/scripts/deploy.sh
```

---

## 📋 Next Steps Checklist

1. [ ] **Fix OpenWA**: Apply dev mode workaround OR investigate bootstrap crash
2. [ ] **Setup SSL**: Choose Option A (Origin Cert) or Option B (Let's Encrypt)
3. [ ] **Update DNS**: Ensure wa.dagdigdugdigicam.store subdomain also resolves (optional)
4. [ ] **Test WhatsApp**: Verify QR connection for session "dagdigdug-digicam"
5. [ ] **GoPay OTP Login**: Run `node login.js` once to authenticate terminal
6. [ ] **Monitor**: Set up periodic health checks

Need help with any step? Let me know!
