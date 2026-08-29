# MudahSewa — Production Deployment Runbook (aaPanel VPS)

**Deployed:** 2026-08-30 | **Server:** Ubuntu 22.04 Proxmox VM (192.168.100.130, public 157.66.208.151)
**Domain:** dagdigdugdigicam.store (Cloudflare proxy, Full SSL) | **Panel:** aaPanel port 8787 (LAN-only)
**SSL:** Let's Encrypt (issued via aaPanel API, valid s/d 2026-11-27) ✅

## Architecture

| Service | PM2 name | Port | Path |
|---|---|---|---|
| Next.js app | `mudahsewa_app` | 3000 | `/www/wwwroot/dagdigdugdigicam.store` |
| GoPay gateway | `gopay_gateway` | 3100 | `/www/wwwroot/gopay-gateway` |
| OpenWA (WhatsApp) | `openwa_server` | 2785 | `/www/wwwroot/openwa-server` |

Nginx vhost: `/www/server/panel/vhost/nginx/node_mudahsewa_app.conf` (aaPanel-managed)
- Custom routes (health, /gopay/, payment webhook) di `/www/server/panel/vhost/rewrite/node_mudahsewa_app.conf`
- `wa.dagdigdugdigicam.store` → :2785 di `/www/server/panel/vhost/nginx/dagdigdugdigicam.store.conf`

## URLs

| URL | Status |
|---|---|
| `https://dagdigdugdigicam.store/` | ✅ Live (Let's Encrypt) |
| `http://192.168.100.130:3000/` | ✅ LAN direct |
| `https://dagdigdugdigicam.store/gopay/health` | ✅ |
| `https://wa.dagdigdugdigicam.store/api/health` | ✅ |
| OpenWA dashboard | `http://192.168.100.130:2785` (port belum dibuka untuk LAN — tambahkan UFW rule bila perlu) |

## PM2 Commands (run sebagai user www)

```bash
PM2="sudo -u www env HOME=/home/www PATH=/www/server/nodejs/v22.22.3/bin:$PATH pm2"
$PM2 list                  # status semua service
$PM2 logs mudahsewa_app    # log main app
$PM2 restart mudahsewa_app
$PM2 restart all && $PM2 save
```

⚠️ **Nama PM2 pakai underscore** (`mudahsewa_app`, `gopay_gateway`, `openwa_server`) — harus sama persis dengan nama project di aaPanel UI, kalau tidak status UI tampil OFFLINE.

Systemd: `pm2-www.service` auto-resurrects all apps on reboot.

## Health Check

```bash
sudo bash /www/wwwroot/dagdigdugdigicam.store/scripts/pm2-status.sh
sudo bash /www/wwwroot/dagdigdugdigicam.store/scripts/pm2-status.sh --restart-failed
```

## Update Deployment (code baru)

```bash
# 1. Sync code dari local (Windows):
tar -cf - --exclude='./node_modules' --exclude='./.next' --exclude='./.git' -C E:/Projects/mudahsewa . | ssh mudahsewa "sudo tar -xf - -C /www/wwwroot/dagdigdugdigicam.store"
# 2. Di server:
sudo bash /www/wwwroot/dagdigdugdigicam.store/scripts/deploy.sh
```

## Rollback Procedure

```bash
PM2="sudo -u www env HOME=/home/www PATH=/www/server/nodejs/v22.22.3/bin:$PATH pm2"
$PM2 stop mudahsewa_app
# Restore DB dari backup:
sudo ls /www/backup/mudahsewa/db/          # pilih backup
sudo cp /www/backup/mudahsewa/db/mudahsewa_YYYYMMDD_HHMMSS.db /www/wwwroot/dagdigdugdigicam.store/data/mudahsewa.db
sudo chown www:www /www/wwwroot/dagdigdugdigicam.store/data/mudahsewa.db
# Restore code versi sebelumnya (git tag di local, re-sync, rebuild), lalu:
$PM2 restart mudahsewa_app && $PM2 save
```
Detail lengkap: `deploy/ROLLBACK.md`

## SSL Certificate

- Cert: `/www/server/panel/vhost/cert/dagdigdugdigicam.store/fullchain.pem` + `privkey.pem`
- Issued via aaPanel Python API (HTTP-01, works behind Cloudflare proxy)
- **Renewal**: via aaPanel UI → Website → SSL → Apply (90-day cert), atau cron panel
- Sistem `certbot` rusak (konflik pyOpenSSL) — JANGAN pakai certbot langsung, selalu via panel API

## One-Time Manual Tasks

### GoPay Gateway Login (OTP) — BELUM DILAKUKAN
```bash
ssh mudahsewa
sudo -u www bash
cd /www/wwwroot/gopay-gateway
export PATH=/www/server/nodejs/v22.22.3/bin:$PATH
node login.js   # masukkan nomor GoBiz + kode OTP
# Sesi tersimpan di .GOPAY_SESI_JANGAN_DIHAPUS.json, auto-refresh 6 jam
sudo -u www env HOME=/home/www PATH=/www/server/nodejs/v22.22.3/bin:$PATH pm2 restart gopay_gateway
```

### Midtrans (opsional)
Isi `MIDTRANS_SERVER_KEY`/`MIDTRANS_CLIENT_KEY` di `.env.production` bila ingin mengaktifkan.

## Backups

- Cron harian 03:00 → `/www/backup/mudahsewa/db/` (SQLite `.backup` WAL-safe + gzip, retensi 30 hari)
- Termasuk: `mudahsewa.db`, `openwa.sqlite`, `.GOPAY_SESI_JANGAN_DIHAPUS.json`
- Manual: `sudo bash /www/wwwroot/dagdigdugdigicam.store/scripts/backup-db.sh`

## Security Notes

- UFW: 22/80/443 open; 8787 (panel) LAN-only; 3000/2785/3100 LAN-only
- `.env*` files mode 600, owned www
- Unattended-upgrades aktif; logrotate 14 hari (`/etc/logrotate.d/mudahsewa`)
- **JANGAN set `API_KEY_PEPPER`** di OpenWA .env — key yang tersimpan di-hash tanpa pepper; menyet pepper membuat semua key jadi 401
- GoPay endpoint `/gopay/*` + API key 48-char

## Session Info

- WhatsApp session `dagdigdug-digicam` (6285959869699): **ready/auto-connect** ✓
- WhatsApp session `wa-biznet`: failed (scan ulang via dashboard bila perlu)

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| App EADDRINUSE :3000 loop | orphan `next-server` | `sudo ss -tlnp \| grep :3000`, kill PID orphan, `$PM2 restart mudahsewa_app` |
| OpenWA 401 Invalid API key | pepper mismatch | pastikan TIDAK ada API_KEY_PEPPER di .env |
| OpenWA "media storage root not writable" | ownership | `sudo chown -R www:www /www/wwwroot/openwa-server/data` |
| aaPanel UI project OFFLINE | nama PM2 ≠ nama project | samakan underscore naming |
| Let's Encrypt 404/500 | well-known include hilang | pastikan `include well-known/mudahsewa_app.conf` ada di vhost |
