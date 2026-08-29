# MudahSewa Rollback Procedure (Emergency)

## Scenario: Deployment broke the app, need to restore previous version

### Quick Rollback (5 min)

```bash
# 1. SSH ke server
ssh faisal@mudahsewa

# 2. Stop current services
sudo -u www env HOME=/home/www PATH=/www/server/nodejs/v22.22.3/bin:$PATH pm2 stop all

# 3. Restore DB backup (pilih yang hari sebelum deploy atau teraman)
sudo ls /www/backup/mudahsewa/db/*.db.gz | grep -v $(date +%Y%m%d) | tail -1

# Misal backup 2026-08-29_030000.db.gz
sudo mkdir -p /tmp/rollback
sudo tar xzf /www/backup/mudahsewa/db/mudahsewa_20260829_030000.db.gz -C /tmp/rollback
sudo cp /tmp/rollback/mudahsewa.db /www/wwwroot/dagdigdugdigicam.store/data/
sudo chown www:www /www/wwwroot/dagdigdugdigicam.store/data/mudahsewa.db

# 4. Revert code dari git tag (lokal)
git checkout v1.2.3  # versi stabil sebelumnya
cd ..  # balik ke E:/Projects/mudahsewa
tar -cf - --exclude=node_modules --exclude=.next --exclude=.git --exclude=tmp . | \
    ssh mudahsewa "sudo tar -xf - -C /www/wwwroot/dagdigdugdigicam.store"

# 5. Install deps & rebuild (opsional: skip jika tidak ada code change)
sudo -u www npm install --no-audit --no-fund
sudo -u www npx next build

# 6. Restart PM2
sudo -u www env HOME=/home/www PATH=/www/server/nodejs/v22.22.3/bin:$PATH pm2 restart all
sudo -u www env HOME=/home/www PATH=/www/server/nodejs/v22.22.3/bin:$PATH pm2 save

# 7. Verify health
curl -s http://localhost/health
```

### Emergency Manual Recovery (DB only)

Jika aplikasi tidak bisa di-rebuild sama sekali:

```bash
# Di server saja:
# 1. Hentikan PM2
sudo -u www pm2 kill

# 2. Restore DB manual copy
scp root@backup-server:/path/to/best-backup.db . 
cp best-backup.db /www/wwwroot/dagdigdugdigicam.store/data/mudahsewa.db
chown www:www data/mudahsewa.db

# 3. Jalankan PM2 tanpa build baru (jika hanya DB rusak)
sudo -u www pm2 start ecosystem.config.js
```

### Rollback GoPay Session

Jika gateway hang karena sesi corrupt:

```bash
# Di server:
# 1. Backup sesi sekarang dulu
cp /www/wwwroot/gopay-gateway/.GOPAY_SESI_JANGAN_DIHAPUS.json /tmp/gopay-broken.json

# 2. Hapus sesi corrupted
rm /www/wwwroot/gopay-gateway/.GOPAY_SESI_JANGAN_DIHAPUS.json

# 3. Restart PM2 (akan re-fetch token via sessionManager.js)
sudo -u www pm2 restart gopay-gateway

# Jika tidak berhasil, jalankan login OTP:
cd /www/wwwroot/gopay-gateway
node login.js  # input nomor GoBiz + OTP 4 digit
```

### Rollback WhatsApp Session

Jika WhatsApp stuck di QR atau perlu logout paksa:

```bash
# Di server:
# 1. Hapus semua session except 'dagdigdug-digicam' (yang mau dipertahankan)
sudo rm -rf /www/wwwroot/openwa-server/data/sessions/wa-biznet

# 2. Restart PM2
sudo -u www pm2 restart openwa-server

# Session akan auto-sync ulang dalam 1-2 menit
```

## Prevention: Automated Backups

Backup otomatis setiap 03:00 via cron:
- Lokasi: `/www/backup/mudahsewa/db/`
- Retensi: 30 hari
- Termasuk: `mudahsewa.db`, `openwa.sqlite`, `.GOPAY_SESI_JANGAN_DIHAPUS.json`

Manual trigger:
```bash
sudo bash /www/wwwroot/dagdigdugdigicam.store/scripts/backup-db.sh
ls -t /www/backup/mudahsewa/db/*.gz | head -1  # newest backup file
```

## Contact & Escalation

- If deployment fails completely → **Check logs first**:
  ```bash
  sudo -u www pm2 logs mudahsewa-app --lines 100 --nostream > /tmp/app.log
  sudo -u www pm2 logs gopay-gateway --lines 100 --nostream > /tmp/gopay.log
  sudo -u www pm2 logs openwa-server --lines 100 --nostream > /tmp/openwa.log
  # Send to dev team for review
  ```

- Production incident → **Restore from backup before investigating** (save time first)
