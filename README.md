# MudahSewa — Rental Camera & Digicam System

**Self-hosted Next.js 16 + Prisma/SQLite + GoPay QRIS + WhatsApp Integration**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/next.js-16-black)](https://nextjs.org/)

## 🚀 Fitur Utama

| Kategori | Fitur | Status |
|---|---|---|
| **Customer Self-Checkout** | Katalog real-time, cek ketersediaan otomatis, checkout langsung via browser | ✅ Production |
| **Payment Gateway** | GoPay QRIS dinamis (dynamic per order), QRIS statis, transfer bank manual | ✅ Production |
| **WhatsApp Automation** | Reminder COD otomatis (3h/1h/30m/5m sebelum pickup), status notification | ✅ Production |
| **Admin Portal** | Manajemen order, pelanggan, unit fisik, dashboard statistik, audit trail | ✅ Production |
| **Customer Portal** | Tracking order, upload bukti bayar/dokumen jaminan (KTP/selfie) | ✅ Production |
| **CRM Features** | Blacklisting pelanggan bermasalah, review & rating system | ✅ Production |
| **Security** | Audit log semua CRUD, password bcrypt, JWT session, API key protection | ✅ Production |

## 📖 Dokumentasi

### Arsitektur & Schema
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** — wiring sistem, data flow diagram, API structure
- **[DATABASE.md](docs/DATABASE.md)** — schema lengkap Prisma dengan relasi dan business rules
- **[FEATURE-FLOWS.md](docs/FEATURE-FLOWS.md)** — alur kerja setiap fitur (checkout, payment, reminder, dll)

### Deployment & Ops
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** — alur deploy production (aaPanel VPS), PM2, Nginx, SSL
- **[ROLLBACK.md](deploy/ROLLBACK.md)** — prosedur rollback darurat
- **[RUNBOOK.md](deploy/RUNBOOK.md)** — panduan operasional harian (di server)
- **[SSL-GUIDE.md](deploy/SSL-GUIDE.md)** — konfigurasi Let's Encrypt di Cloudflare proxy

### Integrations
- **[Gopay Integration](docs/gopay-integration.md)** — setup GoPay QRIS merchantid session
- **[GoPay Migration Guide](docs/gopay-migration-guide.md)** — migrasi dari Midtrans/manual
- **[WhatsApp Integration](docs/whatsapp-integration.md)** — OpenWA setup & reminder scheduler

## 🛠️ Tech Stack

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Next.js 16    │◄───│   Prisma ORM │────►│    SQLite (WAL) │
│   TypeScript    │     │              │     │   28 models     │
│   Server Actions│     │   Client     │     ├─────────────────┤
└────────┬────────┘     └─────┬────────┘     │ Backup          │
         │                    │              │ Cron job        │
         ▼                    ▼              │ Logrotate       │
┌─────────────────┐  ┌─────────────────┐    └─────────────────┘
│   GoPay Gateway │  │   OpenWA WA     │
│   Node.js (PM2) │  │   HTTP/WebSocket│
│   Port 3100     │  │   Port 2785     │
└─────────────────┘  └─────────────────┘
```

## 🏗️ Project Structure

```
mudahsewa/
├── src/
│   ├── actions/           # Server Actions (mutate data)
│   │   ├── orders.ts      # create/update/cancel order
│   │   ├── payments.ts    # pay/save receipt, verify payment
│   │   ├── gopay-gateway.ts # spawn GoPay gateway as detached child
│   │   └── openwa-gateway.ts # control OpenWA worker process
│   ├── app/               # Next.js App Router
│   │   ├── admin/         # Protected staff portal
│   │   ├── api/           # REST endpoints (/availability, /payments, etc.)
│   │   ├── (shop)/        # Public storefront
│   │   ├── portal/        # Customer tracking portal
│   │   └── layout.tsx     # Global layout with provider
│   └── lib/               # Pure functions & utilities
│       ├── auth.ts        # NextAuth setup (credentials)
│       ├── availability.ts # stock calculation logic
│       ├── db.ts          # singleton Prisma client
│       ├── reminders/     # scheduler for COD WhatsApp
│       ├── gopay-client.ts # HTTP client to :3100
│       └── openwa-api-client.ts # WhatsApp client :2785
├── prisma/                # DB schema
│   └── schema.prisma      # 28 model definitions
├── deploy/                # Production deployment files
│   ├── ecosystem.config.js # PM2 config (3 services)
│   ├── RUNBOOK.md         # Live ops guide
│   ├── ROLLBACK.md        # Emergency restore
│   ├── backup-db.sh       # WAL-safe backup script
│   └── deploy.sh          # update deployment runner
├── docs/                  # This documentation
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── FEATURE-FLOWS.md
│   ├── DEPLOYMENT.md
│   ├── gopay-integration.md
│   ├── go-pay-migration-guide.md
│   └── whatsapp-integration.md
├── gopay-gateway/         # Sidecar service
│   ├── server.js          # Express server :3100
│   ├── pm2.config.js      # PM2 config
│   └── README.md          # Service-specific docs
└── package.json
```

## 🔐 Environment Setup

Copy `.env.example` → `.env.local` (dev) or `.env.production` (server):

```bash
NODE_ENV=production
DATABASE_URL=file:./data/mudahsewa.db

# Payment: GoPay
GOPAY_ENABLED=true
GOPAY_GATEWAY_URL=http://localhost:3100
GOPAY_API_KEY=your-secret-api-key-min-32-chars

# WhatsApp: OpenWA
OPENWA_URL=http://localhost:2785
OPENWA_API_KEY=owa_k1_your-secret-hash-48-char
OPENWA_SESSION_ID=dagdigdug-digicam

# Auth (critical for behind proxy)
NEXTAUTH_URL=https://dagdigdugdigicam.store
NEXTAUTH_SECRET=generate-new-random-secret-here
AUTH_TRUST_HOST=true

# Webhook signature (for WhatsApp notifications)
WEBHOOK_SECRET_KEY=generate-new-secure-secret-here
```

## 🚀 Quick Start (Development)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Setup database:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   npx prisma db push
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

4. Access: `http://localhost:3000`

## 🎯 Deployment Checklist

- [ ] aapanel faishell online installed on VPS
- [ ] Nginx reverse proxy configured for main domain and subdomains
- [ ] SSL certificate issued via aaPanel panel API (Let's Encrypt)
- [ ] PM2 systemd unit enabled for reboot persistence
- [ ] GoPay terminal logged in once via OTP (`node login.js`)
- [ ] Backup cron scheduled at 03:00 daily
- [ ] UFW firewall hardened (panel port restricted to LAN only)
- [ ] Disk cleanup performed (recycle bin cleaned, journald vacuumed)
- [ ] Monitoring scripts deployed (`pm2-status.sh`)

## 🧪 Testing & Quality Assurance

- Unit tests: `npm test` (vitest)
- Smoke tests: `scripts/smoke-checkout.ts`
- E2E testing: `openwa-server/test/` directory
- Load testing: wrk benchmark available

## 📝 License

MIT — feel free to use for personal or commercial projects!

## 🙏 Acknowledgments

- [OpenWA](https://github.com/rmyndharis/openwa) — WhatsApp Business automation
- [Gopay Partner API](https://www.gopay.id/) — GoPay Merchant integration
- [Next.js](https://nextjs.org/) — React framework
- [Prisma](https://prisma.io/) — Database toolkit
- [aaPanel](https://www.aapanel.com/) — VPS control panel
