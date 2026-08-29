# MudahSewa — Alur Kerja Deployment & Operasional

**Target:** VPS Ubuntu 22.04 (Proxmox) + aaPanel · Node 22 · PM2 · Nginx · SQLite
**Detail runbook produksi:** `deploy/RUNBOOK.md` · **Rollback:** `deploy/ROLLBACK.md`

## Arsitektur Produksi

```
Internet → Cloudflare (proxy, edge SSL)
               │
               ▼
         VPS (157.66.208.151 publik / 192.168.100.130 LAN)
               │
         Nginx :80/:443 (origin Let's Encrypt)
          ├── dagdigdugdigicam.store        → 127.0.0.1:3000 (Next.js)
          ├── dagdigdugdigicam.store/gopay/ → 127.0.0.1:3100 (GoPay)
          └── wa.dagdigdugdigicam.store     → 127.0.0.1:2785 (OpenWA)
               │
         PM2 (systemd: pm2-www.service, user www)
          ├── mudahsewa_app  → npm start        :3000
          ├── gopay_gateway  → server.js        :3100
          └── openwa_server  → node dist/main   :2785
               │
         SQLite WAL: /www/wwwroot/dagdigdugdigicam.store/data/mudahsewa.db
```

## Alur Deploy Pertama Kali (First-Time)

```
1. Siapkan server
   ├── Install aaPanel (curl install.sh)
   ├── Install Node 22 (aaPanel NodeJS manager → /www/server/nodejs/v22.x)
   ├── apt: git build-essential sqlite3 patch
   ├── Chromium libs (untuk whatsapp-web.js):
   │   libnss3 libatk-bridge2.0-0 libgbm1 libasound2 libgtk-3-0 libxss1 ...
   └── PM2: npm i -g pm2 → symlink → pm2 startup systemd -u www

2. Struktur direktori
   /www/wwwroot/<domain>/          # main app (chown www:www)
     ├── logs/  data/  scripts/
   /www/wwwroot/gopay-gateway/
   /www/wwwroot/openwa-server/

3. Transfer code
   tar -cf - --exclude='./node_modules' --exclude='./.next' \
       --exclude='./.git' -C <local> . | ssh server "sudo tar -xf - -C <target>"
   ⚠️ exclude harus pakai prefix ./ (tar Windows/GNU menyimpan ./node_modules)

4. Konfigurasi env
   ├── Main app: .env.production (NODE_ENV, DATABASE_URL, NEXTAUTH_URL,
   │   AUTH_TRUST_HOST=true, GOPAY_*, OPENWA_*, WEBHOOK_SECRET_KEY)
   ├── gopay-gateway/.env (PORT=3100, API_KEY, QRIS_STATIC)
   └── openwa-server/.env (PORT=2785, API_MASTER_KEY, CORS_ORIGINS)
   chmod 600 semua .env

5. Build
   sudo -u www npm install → npx prisma generate → npx prisma db push → npx next build
   ⚠️ DB existing: pakai db push (migrate deploy gagal P3005)

6. Transfer sesi WhatsApp SEBELUM start pertama
   data/sessions/ + openwa.sqlite + main.sqlite → sesi auto-reconnect (ready),
   tanpa perlu scan QR ulang

7. PM2 ecosystem (deploy/ecosystem.config.js)
   ├── Nama app = nama project aaPanel (underscore!) → UI status akurat
   ├── pm2 start → pm2 save → systemctl enable pm2-www
   └── Kill orphan next-server bila EADDRINUSE

8. Nginx
   ├── Daftarkan project di aaPanel (Node.js manager, bind domain)
   │   → auto-generate node_<name>.conf + well-known Lua include
   ├── Custom location → vhost/rewrite/node_<name>.conf
   └── SSL: apply via aaPanel API (HTTP-01) → pasang di blok #SSL-START

9. Hardening
   ├── UFW: 22/80/443 open; panel 8787 LAN-only; port app LAN-only
   ├── logrotate (copytruncate untuk PM2 logs)
   ├── unattended-upgrades
   └── Backup cron 03:00 (sqlite3 .backup WAL-safe + gzip, retensi 30 hari)
```

## Alur Update (Deploy Berikutnya)

```
Local (Windows):
  1. git commit + push ke GitHub
  2. Sync ke server:
     tar -cf - --exclude='./node_modules' --exclude='./.next' \
         --exclude='./.git' -C E:/Projects/mudahsewa . | \
         ssh mudahsewa "sudo tar -xf - -C /www/wwwroot/dagdigdugdigicam.store"

Server:
  3. sudo bash /www/wwwroot/dagdigdugdigicam.store/scripts/deploy.sh
     → npm install → prisma generate → prisma db push → next build → pm2 restart

Verifikasi:
  4. sudo bash scripts/pm2-status.sh        # HTTP health semua service
  5. curl https://<domain>/health           # dari luar
```

## Alur Rollback (Darurat)

```
1. pm2 stop mudahsewa_app
2. Restore DB: pilih backup di /www/backup/mudahsewa/db/
   gunzip → cp ke data/mudahsewa.db → chown www:www
3. Restore code: git checkout <tag-versi-stabil> → sync ulang → rebuild
4. pm2 restart all → pm2 save → verifikasi health
Detail lengkap: deploy/ROLLBACK.md
```

## Operasional Rutin

| Tugas | Cara | Frekuensi |
|---|---|---|
| Cek health service | `sudo bash scripts/pm2-status.sh` | Harian |
| Lihat log | `sudo -u www env HOME=/home/www PATH=/www/server/nodejs/v22.22.3/bin:$PATH pm2 logs <nama>` | Sesuai kebutuhan |
| Backup manual | `sudo bash scripts/backup-db.sh` | Sebelum update besar |
| Cek disk | otomatis di pm2-status.sh (alert >85%) | Harian |
| Renew SSL | aaPanel UI → Website → SSL → renew (90 hari) | Otomatis/manual |
| GoPay re-login | `node login.js` di gateway (bila sesi hangus) | Sesuai kebutuhan |

## Perintah PM2 (wajib dengan PATH eksplisit)

```bash
PM2="sudo -u www env HOME=/home/www PATH=/www/server/nodejs/v22.22.3/bin:$PATH pm2"
$PM2 list          # status
$PM2 logs          # semua log
$PM2 restart all   # restart semua
$PM2 save          # simpan untuk resurrect saat reboot
```

## Troubleshooting Cepat

| Gejala | Penyebab Umum | Solusi |
|---|---|---|
| `EADDRINUSE :3000` | orphan next-server | `sudo ss -tlnp \| grep :3000` → kill PID → restart app |
| OpenWA 401 | API_KEY_PEPPER diset retroaktif | hapus dari .env (hash lama plain SHA-256) |
| OpenWA "storage not writable" | ownership | `sudo chown -R www:www openwa-server/data` |
| aaPanel UI: project OFFLINE | nama PM2 ≠ nama project | samakan (underscore) |
| Let's Encrypt 404 | well-known include hilang | pastikan vhost include file well-known aaPanel |
| Build gagal type-check | file dev/test legacy | masukkan ke `exclude` tsconfig |

## Gotcha yang Sudah Diantisipasi

1. **`npm start` di PM2** meninggalkan orphan `next` saat restart → cek port bila crash loop.
2. **JANGAN `cp` SQLite WAL aktif** — selalu `sqlite3 .backup`.
3. **JANGAN set API_KEY_PEPPER** pada instalasi dengan key lama.
4. **`AUTH_TRUST_HOST=true`** wajib di belakang proxy (NextAuth v5).
5. **Nama app PM2 harus match** dengan record project aaPanel (deteksi status via env `name`).
6. **certbot sistem rusak** (konflik pyOpenSSL) — selalu issue SSL via API panel.
