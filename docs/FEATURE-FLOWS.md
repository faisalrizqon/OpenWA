# MudahSewa — Alur Fitur (Feature Flows)

Dokumentasi alur kerja setiap fitur utama, dari sudut pandang pengguna sampai level sistem.

---

## 1. Alur Checkout Customer (Self-Service)

**Entry point:** `/` → Katalog → pilih produk → `/checkout?productId=X&quantity=Y&durationHours=Z`

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CUSTOMER BUKA KATALOG (/katalog)                             │
│    - List Product active dengan harga tier (6/12/24/48 jam)     │
│    - Galeri foto (ProductImage), stok unit available            │
├─────────────────────────────────────────────────────────────────┤
│ 2. CEK KETERSEDIAAN (/api/availability)                         │
│    Input: productId, start, end, quantity                       │
│    Logika (src/lib/availability.ts):                            │
│    - Cari order booking/active/late yang overlap window         │
│      [start, end + chargingRestHours]                           │
│    - Hitung unit tersisa = total units - unit terpakai          │
│    Output: { available: N }                                     │
├─────────────────────────────────────────────────────────────────┤
│ 3. CHECKOUT PAGE                                                │
│    - Form identitas (nama, HP, alamat)                          │
│    - Pilih delivery: pickup / courier (+ ongkir)                │
│    - Pilih metode bayar (tergantung StoreContent config)        │
│    - Upload jaminan: KTP/kartu pelajar + selfie (wajib cash)    │
│    - Input kode promo (validasi: periode, min order, limit)     │
├─────────────────────────────────────────────────────────────────┤
│ 4. SUBMIT → Server Action completeOrder                         │
│    (src/app/(shop)/actions/checkout.ts)                         │
│    a. Validasi metode + ketersediaan ulang                      │
│    b. Hitung total = Σ(items) + courierFee + tip - promo        │
│    c. Buat Order (status booking, source=online)                │
│       + OrderItems (unitPrice terkunci per tier)                │
│       + orderNumber = MS-YYMMDD-NNN (max-based, anti duplikat)  │
│    d. ensureCodReminders(orderId) → 4 slot CodReminder          │
│    e. Simpan Document jaminan (bila diupload)                   │
│    f. Redirect → /order-status/[orderNumber]                    │
├─────────────────────────────────────────────────────────────────┤
│ 5. PEMBAYARAN (per metode — lihat Flow #2)                      │
│    Customer tekan "Selesai & Kirim" → paymentCompleted=true     │
│    → order masuk antrian verifikasi admin                       │
└─────────────────────────────────────────────────────────────────┘
```

**Error handling:** `redirect(?error=invalid-method|missing-guarantee|unavailable)` — pesan tampil di UI checkout.

---

## 2. Alur Pembayaran

### 2a. Cash
1. Customer pilih metode `cash` → wajib upload jaminan lengkap (KTP/kartu pelajar **DAN** selfie).
2. Bayar tunai saat pickup → admin catat `Payment(paymentType=pelunasan, method=cash)` manual dari admin.

### 2b. QRIS Statis
1. Customer pilih `qris` → tampil gambar QRIS (`StoreContent.qrisImagePath`).
2. Customer scan & transfer → upload bukti (`submitPaymentProof`) → `Payment(status=pending, proofPath=...)`.
3. Admin verifikasi bukti di `/admin/payments` → `status=confirmed` → `Order.paymentStatus=paid`.

### 2c. Transfer Bank
1. Tampil rekening (`transferBankName/Number/Holder`) → customer transfer manual.
2. Upload bukti → verifikasi admin (sama seperti QRIS statis).

### 2d. GoPay QRIS Dinamis (via gopay-gateway :3100)
```
Customer checkout → pilih GoPay (gopayEnabled=true di StoreContent
                              DAN sesi GoBiz aktif)
      │
      ▼
Server Action buat GopayPayment:
  - baseAmount = total order
  - uniqueAmount = baseAmount + uniqueOffset (unik → anti double-claim)
      │
      ▼
gopay-client.ts → POST gateway /create-qris?amount=uniqueAmount
  (API_KEY auth, timeout 10s)
      │
      ▼
Gateway generate QRIS dinamis via sesi GoBiz OAuth
      │
      ▼
Tampil QR code di UnifiedPaymentPanel + polling status
  (GET /token-status & check uniqueAmount di feed transaksi)
      │
      ▼
Bila paid → GopayPayment.status=paid, settledAt, transactionJson
         → Order.paymentStatus=paid
         → WhatsApp notifikasi ke customer (MessageLog)
```

**Sesi GoBiz:** login sekali via `node login.js` (OTP) → `.GOPAY_SESI_JANGAN_DIHAPUS.json` → auto-refresh token 6 jam. Sesi mirror di DB `GopaySession`.

### 2e. Midtrans (opsional, belum dikonfigurasi di produksi)
Snap redirect → webhook `/api/payments/notify` verifikasi signature SHA-512 (`MIDTRANS_SERVER_KEY`).

---

## 3. Alur Manajemen Order (Admin)

**Entry point:** `/admin` (role admin/mitra via NextAuth)

```
Status lifecycle:
booking ──[konfirmasi DP/bayar]──► active ──[lewat endDate+grace]──► late
   │                                 │                                  │
   └──► cancelled                    └──► cancelled                     ▼
                                                                  completed
                                                          (return photos +
                                                           condition check)
```

| Aksi | Server Action | Efek |
|---|---|---|
| Konfirmasi booking | `orders.ts` | status→active, assign Unit spesifik, Unit.status=rented, UnitEvent(rented) |
| Catat pembayaran | `payments.ts` | Payment confirmed → recalc Order.paymentStatus |
| Tolak bukti bayar | `payments.ts` | Payment failed + WA notifikasi ke customer (bila OpenWA aktif) |
| Proses pengembalian | `orders.ts` | Upload ReturnPhoto, cek kondisi unit, status→completed, Unit.status=available, UnitEvent(returned) |
| Hitung denda | `src/lib/late.ts` | Bila returnedAt > endDate+graceHours → Payment(paymentType=denda) per LateFee.feePerDay |
| Reschedule | `orders.ts` | Geser startDate/endDate, simpan rescheduledFrom |
| Blacklist customer | `customers.ts` | Customer.isBlacklisted=true + alasan |

Semua mutasi tercatat di **AuditLog** (entityType, action, summary, userId).

---

## 4. Alur Reminder COD Otomatis (WhatsApp)

```
Order dibuat (admin/online)
      │
      ▼
ensureCodReminders(orderId) → 4 baris CodReminder:
  slot 3h (180 mnt), 1h (60 mnt), 30m, 5m — semua status=pending
      │
      ▼
Scheduler loop (setInterval di proses server)
  + endpoint GET /api/cron/reminders (trigger manual / start loop)
      │
      ▼
processCodReminders() tiap siklus:
  1. Ambil slot pending yang waktu targetnya sudah lewat
     (tapi belum lebih dari GRACE_MINUTES=10 → anti spam)
  2. Skip bila order cancelled/completed → status=skipped
  3. Kirim pesan via OpenWA:
     sendMessage(sessionId, { chatId: phoneToChatId(phone), text: template })
  4. Sukses → status=sent, sentAt=now, MessageLog tercatat
     Gagal  → error disimpan, tetap pending (retry siklus berikutnya)
```

**Template** (src/lib/reminders/templates.ts): berisi nama customer, orderNumber, produk, waktu ambil, pengingat jaminan KTP.

---

## 5. Alur Portal Customer

**Entry point:** `/portal/login` (No. HP + password → NextAuth provider `customer`)

| Halaman | Fungsi |
|---|---|
| `/portal` | Dashboard: daftar order customer + status ringkas |
| `/portal/orders/[orderNumber]` | Detail order, timeline, total tagihan |
| `/portal/documents` | Upload jaminan (KTP/selfie/kartu pelajar) |
| `/portal/reviews` | Beri rating 1-5 + ulasan untuk order completed (1 review/order) |
| `/order-status/[orderNumber]` | **Publik** — tracking tanpa login via nomor order |

Upload bukti pembayaran dari portal → `Payment(status=pending)` → menunggu verifikasi admin.

---

## 6. Alur WhatsApp (OpenWA) — Sisi Admin

**Entry point:** `/admin/whatsapp`

```
Tab Gateway:   start/stop OpenWA gateway (spawn process via openwa-gateway.ts)
Tab Sessions:  daftar sesi OpenWA, QR pairing untuk sesi baru,
               status koneksi (ready/qr_ready/failed)
Tab Dashboard: iframe OpenWA dashboard (port 2886) auto-login via API key
Tab Broadcast: kirim pesan massal ke customer (rate-limited:
               20 pesan/menit, max 5 concurrent, cap 500/hari)
```

**Koneksi app → OpenWA:**
- `OPENWA_URL=http://localhost:2785` + `X-API-Key` header
- `resolveSessionId()`: env `OPENWA_SESSION_ID` boleh nama (mis. `dagdigdug-digicam`) → di-resolve ke UUID via `/api/sessions`
- Semua pesan keluar tercatat di `MessageLog` untuk audit & tracking delivery

---

## 7. Alur Kode Promo

```
Admin buat PromoCode:
  code unik, discountType (amount|percent), discountValue,
  minOrderAmount?, maxDiscount? (plafon percent),
  periode startDate-endDate, usageLimit (0=unlimited)
      │
      ▼
Customer input kode di checkout
      │
      ▼
Validasi (src/lib/promo.ts):
  - kode active & dalam periode?
  - subtotal >= minOrderAmount?
  - usedCount < usageLimit?
      │
      ▼
Hitung diskon → Order.promoDiscount + promoCodeId
  usedCount += 1 (saat order final)
```

---

## 8. Alur Stok & Unit Fisik

```
Product (tipe, mis. "Canon IXUS")
   └── Units: IXUS-001 (Bagus), IXUS-002 (Cukup)

Katalog tayang bila: count(Unit.status=available) >= stockThreshold

Order aktif mengunci quantity unit (availability check),
unit spesifik di-assign saat admin aktivasi order.

Unit events (UnitEvent) jadi riwayat hidup unit:
  rented → returned → condition → maintenance → available

Foto unit: admin upload per unit → /uploads/units/
  (UnitPhotoControl di admin)
```

---

## 9. Alur Laporan & Export

- `/admin` dashboard: statistik order aktif/terlambat/pendapatan (src/lib/dashboard.ts)
- `/api/reports/export`: export Excel (exceljs) — laporan order per periode
- Kalender booking: tampilan agenda sewa per hari

---

## 10. Matriks Hak Akses

| Area | Publik | Customer | Mitra | Admin |
|---|---|---|---|---|
| Katalog & checkout | ✅ | ✅ | ✅ | ✅ |
| Order status (nomor order) | ✅ | ✅ | ✅ | ✅ |
| Portal (login HP) | — | ✅ | — | — |
| `/admin` dashboard | — | — | ✅ | ✅ |
| Kelola produk/harga/CMS | — | — | ❌ | ✅ |
| Kelola user & audit | — | — | ❌ | ✅ |
| Konfigurasi pembayaran | — | — | ❌ | ✅ |
| GoPay login/logout | — | — | ❌ | ✅ |

Guard: `requireUser()` / `requireAdmin()` / `requireMitraOrAdmin()` di `src/lib/permissions.ts`.
