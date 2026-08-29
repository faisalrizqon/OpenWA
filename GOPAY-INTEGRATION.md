# 🎉 GoPay Merchant Integration - MudahSewa (via Gateway)

## Status: ✅ MIGRASI SELESAI — paket `merchantid` (GoBiz) dihapus

Integrasi GoPay Merchant kini memakai **gateway sidecar** (fork
`ahmadzakiyox/gopay-api-gateaway` di folder `gopay-gateway/`).

**Alasan migrasi:** akun kita adalah **GoPay Merchant**, sedangkan paket
`merchantid` memakai endpoint login **GoBiz** — itulah kenapa OTP tidak
pernah masuk. Gateway ini memakai alur login OTP GoPay Merchant yang benar
(terminal + SMS/WA) dan men-generate QRIS dinamis dari QRIS statis.

---

## 📦 Arsitektur

```
MudahSewa (Next.js)                gopay-gateway (Node/Express)
├── src/lib/gopay-client.ts ──HTTP─▶ server.js
├── src/lib/gopay-server.ts         ├── login.js        (login OTP sekali, terminal)
├── src/actions/gopay-auth.ts       ├── sessionManager.js (auto-refresh 6 jam)
└── src/app/api/payments/gopay/qr   └── .GOPAY_SESI_JANGAN_DIHAPUS.json (sesi)
                                              │
                                              ▼
                                    API GoPay Merchant (api.gojekapi.com)
```

### Komponen
- **`gopay-gateway/`** — gateway ter-vendor. Login sekali via `node login.js`,
  token auto-refresh tiap 6 jam, endpoint: `/token-status`, `/create-qris`,
  `/check-payment`, `/api/logs`.
- **`src/lib/gopay-client.ts`** — HTTP client (auth `X-API-Key`, timeout 10 detik).
- **`src/lib/gopay-server.ts`** — orkestrasi: buat QRIS per order, rekonsiliasi
  (`settleGopayPayments`), sinkronisasi status (`syncGopaySessionFromGateway`).
- **`src/actions/gopay-auth.ts`** — `syncGopaySession`, `logoutGopay`, `runGopaySettle`.
- **DB tidak berubah** — tabel `GopaySession` & `GopayPayment` tetap dipakai
  (tanpa migrasi Prisma). `GopaySession.sessionJson` kini hanya penanda gateway.

### Environment (`.env`)
```bash
GOPAY_ENABLED="true"
GOPAY_GATEWAY_URL="http://localhost:3000"   # URL gateway
GOPAY_API_KEY="…"                             # harus sama dengan API_KEY gateway
```

File `.env` gateway ada di `gopay-gateway/.env.example`:
`PORT`, `API_KEY`, `QRIS_STATIC`, `GOPAY_MERCHANT_ID`.

---

## 🚀 Cara Aktivasi

### 1. Setup gateway (sekali)
```bash
cd gopay-gateway
npm install
cp .env.example .env     # isi API_KEY + QRIS_STATIC dari aplikasi GoPay
node login.js            # masukkan nomor HP GoPay Merchant + kode OTP (SMS/WA)
```
> ⚠️ Login HANYA via terminal. Tidak ada form OTP di dashboard — ini disengaja
> (sesi/token tidak pernah masuk ke aplikasi web).

### 2. Jalankan gateway
```bash
npm start                # atau: pm2 start pm2.config.js
```

### 3. Aktifkan di MudahSewa
Isi `GOPAY_GATEWAY_URL` + `GOPAY_API_KEY` di `.env`, lalu di admin
**Pembayaran → Konfigurasi**, tekan **"Sinkronkan Status Gateway"**.
Bila gateway valid, metode GoPay otomatis aktif di checkout.

---

## 💳 Alur Pembayaran

1. Customer pilih "GoPay" di checkout → order dibuat (status pending).
2. `POST /api/payments/gopay/qr?orderNumber=…` → gateway membuat QRIS dinamis
   (tag EMV 54 diisi nominal order) → disimpan ke `GopayPayment`.
3. Panel customer polling tiap 12 detik; tiap poll menjalankan satu siklus
   rekonsiliasi: `POST /check-payment` per payment pending dengan scope klaim
   `trx_id` = reference order (anti double-claim dipegang gateway).
4. Cocok → `GopayPayment.status = paid`, buat `Payment` (confirmed),
   `Order.paymentStatus = paid`.

---

## ⚠️ Catatan Penting

1. **Unofficial** — endpoint privat GoPay Merchant dapat berubah sewaktu-waktu.
2. **Sesi di sisi gateway** — jangan hapus `gopay-gateway/.GOPAY_SESI_JANGAN_DIHAPUS.json`.
3. **Auto-refresh** — gateway me-refresh token tiap 6 jam; login cukup sekali.
4. **Deploy** — gateway butuh proses permanen (VPS/PM2/Docker), bukan serverless
   yang tidur (sesi file hilang → harus login OTP ulang).
5. **QRIS statis wajib** — diisi di `.env` gateway (dari aplikasi GoPay Merchant).

---

## 🧪 Testing Checklist

- [ ] `node login.js` berhasil, OTP masuk via SMS/WA
- [ ] `GET /health` gateway → `{ status: "OK" }`
- [ ] Tombol "Sinkronkan Status Gateway" → metode GoPay aktif
- [ ] Checkout pilih GoPay → QRIS muncul dengan nominal benar
- [ ] Bayar via scan → order otomatis lunas (poll 12 detik)
- [ ] Dua order nominal sama → tidak saling klaim (scope trx_id)
- [ ] QRIS expired 5 menit → QR baru dibuat saat poll berikutnya

---

## 📚 References

- Gateway asli: https://github.com/ahmadzakiyox/gopay-api-gateaway
- Panduan deploy lengkap: `gopay-gateway/README.md`
- Catatan owner gateway: `gopay-gateway/zaki.md`
