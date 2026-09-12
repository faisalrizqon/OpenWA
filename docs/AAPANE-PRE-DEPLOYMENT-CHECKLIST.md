# MudahSewa Pre-Deployment Checklist for Aapane

## ✏️ Fill Before Deploying

### Server Information
- [ ] Aapane IP/Domain: `dagdigdugdigicam.store`
- [ ] SSH Username: `www`
- [ ] SSH Key configured: ☐ Yes ☐ No
- [ ] SSH port: 22

### Application Configuration
- [ ] Database connection string ready
- [ ] WhatsApp credentials obtained
- [ ] GoPay API credentials (if using QRIS)
- [ ] Store settings configured
- [ ] Email SMTP configured (for notifications)

### Security
- [ ] Strong passwords generated
- [ ] HTTPS/SSL certificate available
- [ ] Firewall rules planned (ports 80, 443, 22 only)
- [ ] `.env.production` values prepared (NEVER commit to repo)

### Backups
- [ ] Recent database backup saved
- [ ] Backup strategy documented
- [ ] Rollback procedure tested

### Code Readiness
- [ ] All changes committed to git
- [ ] Branch name: `main` or specific version tag
- [ ] Build passes locally (`npm run build`)
- [ ] Dependencies are up-to-date

### Testing (Local/Staging)
- [ ] Local build successful
- [ ] Database migrations tested
- [ ] WhatsApp integration tested
- [ ] Payment gateway tested
- [ ] Admin panel accessible

---

## ⚠️ Critical Items That MUST Be Done First

1. **Generate strong database password:**
   ```bash
   # Linux/Mac
   openssl rand -base64 32
   
   # Windows PowerShell
   -join ((65..90) + (97..122) + (48..57) | ForEach-Object {[char]$_} | Get-Random -Count 32)
   ```

2. **Create `.env.production` with production values:**
   ```env
   DATABASE_URL="postgresql://user:YOUR_SECURE_PASSWORD@localhost:5432/mudahsewa?schema=public"
   SECRET_KEY="generate-random-secure-key-here"
   WHATSAPP_TOKEN="your-whatsapp-api-token"
   GOPAY_API_KEY="your-gopay-merchant-id-if-used"
   NODE_ENV="production"
   PORT="3000"
   ```

3. **Test local deployment:**
   ```bash
   npm install --no-audit --no-fund
   npx prisma generate
   npx next build
   ```

---

## 📊 Deployment Steps Summary

### Quick Deploy (Recommended):
```bash
# Step 1: Create package locally
tar -cf deploy-full.tar src app prisma next.config.ts tsconfig.json package.json README.md docs

# Step 2: Upload to server
scp deploy-full.tar www@dagdigdugdigicam.store:/tmp/

# Step 3: SSH into server and deploy
ssh www@dagdigdugdigicam.store
cd /www/wwwroot/dagdigdugdigicam.store
tar -xf /tmp/deploy-full.tar
chown -R www:www .
npm install --no-audit --no-fund
npx prisma generate
npx prisma db push --accept-data-loss
npx next build
pm2 restart mudahsewa_app
pm2 save
```

### Alternative: Use Existing Scripts
If `easydeploy.sh` is available on server, use it directly (requires SSH setup).

---

## 🔍 Post-Deployment Verification Checklist

### Health Check
- [ ] Main site loads: `curl -s https://dagdigdugdigicam.store/health`
- [ ] Response status: 200 OK
- [ ] PM2 processes running: `pm2 list`

### Functionality Test
- [ ] Admin panel accessible: `/admin`
- [ ] Login works with admin credentials
- [ ] Dashboard displays correctly
- [ ] Orders page works
- [ ] Customer management works
- [ ] Product catalog loads
- [ ] Payment pages functional
- [ ] Reports generate correctly

### Integration Test
- [ ] WhatsApp integration (if enabled)
- [ ] GoPay QRIS payment (if enabled)
- [ ] File uploads work (guarantee docs, etc.)
- [ ] Email notifications (if configured)

### Security Check
- [ ] HTTPS working properly
- [ ] Browser shows lock icon
- [ ] No sensitive data in browser console
- [ ] CORS headers configured
- [ ] `.env` file not accessible via web

### Performance Check
- [ ] Page load time < 3 seconds
- [ ] Lighthouse score > 80
- [ ] No memory leaks after test usage
- [ ] Database queries optimized

---

## 🚨 Rollback Triggers

IF ANY OF THESE FAIL, ROLLBACK IMMEDIATELY:

- ❌ Build fails on server
- ❌ Database migration errors
- ❌ Major functionality broken
- ❌ Memory/CPU usage critical (>90%)
- ❌ Service cannot restart
- ❌ SSL certificate issues

### Rollback Commands:
```bash
# Restore previous code from backup
cd /www/wwwroot/dagdigdugdigicam.store
git checkout <previous-commit-hash>
npm install --no-audit --no-fund
npx next build
pm2 restart mudahsewa_app

# Or restore from tarball backup
tar -xf backup/app-backup-YYYY-MM-DD.tar
```

---

## 📝 Documentation Updates Required After Deploy

Update these files after successful deployment:

1. **[docs/AAPANE-DEPLOYMENT.md](./docs/AAPANE-DEPLOYMENT.md)** - Add new steps if needed
2. **Git changelog** - Tag the release: `git tag vX.Y.Z`
3. **Internal wiki** - Document any configuration changes
4. **Team notification** - Announce deployment to stakeholders

---

**Prepared:** September 13, 2026  
**Last Updated:** September 13, 2026  
**Next Review:** Before next production deploy
