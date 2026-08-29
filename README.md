# MudahSewa — Sistem Manajemen Rental

Aplikasi internal untuk mengelola rental digicam (siap multi-kategori): stok per unit fisik, order dengan harga tier durasi, siklus booking → aktif → selesai, pembayaran, kalender ketersediaan, dan laporan keuangan dengan ekspor Excel. Dilengkapi **katalog publik** (`/katalog`) tempat pelanggan bisa booking sendiri dengan pilihan pembayaran **Cash, QRIS, atau Midtrans (online)**.

Dibangun dengan Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui + Prisma 6 (SQLite). Fase 1 tanpa login — dipakai di jaringan LAN yang dipercaya.

## Prasyarat

- **Node.js 22** atau lebih baru
- npm (sudah bundel dengan Node)

## Setup Pertama

```bash
npm install          # instal dependensi
npm run db:push      # buat database SQLite di data/mudahsewa.db
npm run db:seed      # isi data awal: kategori Digicam + 4 kamera + customer demo
npm run dev          # jalankan di http://localhost:3000
```

Seeding aman diulang (`db:seed` idempoten) — tidak membuat duplikat.

## Akses dari HP/Laptop Lain (LAN)

```bash
npx next dev --hostname 0.0.0.0
```

Lalu buka `http://<IP-komputer-ini>:3000` dari perangkat lain di jaringan yang sama (IP ditampilkan di terminal saat start).

## Alur Operasional Harian

1. **Terima order dari pelanggan** → buka **Orders → + Buat Order**. Pilih pelanggan (atau input baru), pilih produk + durasi (6/12/24/48/72/96 jam). Harga otomatis mengikuti tier; stok dicek live — form memblokir bila unit tidak cukup untuk tanggal tersebut. Status awal: **Booking**.
2. **Barang diambil pelanggan** → di detail order klik **Aktifkan**. Sistem otomatis meng-assign unit fisik dan menandainya *rented* (stok di halaman Produk langsung turun). Kirim **Konfirmasi Booking (WA)** dan catat **DP** di panel Pembayaran.
3. **Barang kembali** → di detail order isi panel Return: foto kondisi barang, set kondisi per unit (Bagus/Cukup/Rusak), klik **Selesaikan Order**. Unit otomatis kembali *available*.
4. **Pelanggan telat** → klik **Tandai Terlambat**; catat denda sebagai pembayaran jenis **Denda**. Banner kuning otomatis muncul bila melewati tanggal kembali.
5. **Cek jadwal** → halaman **Kalender**: hijau = tersedia, kuning = booking, merah = sedang dirental. Klik cell untuk membuka ordernya.
6. **Rekap** → halaman **Laporan** (7/30/90 hari) + tombol **Ekspor Excel**.

## Struktur Data Singkat

| Model | Isi |
|---|---|
| Category / Product | Kategori & produk dengan harga tier 6/12/24/48 jam |
| Unit | Unit fisik (stok riil): status available/rented/maintenance/lost + kondisi |
| Customer | Pelanggan + blacklist (dengan alasan) + dokumen (KTP/selfie/kartu pelajar) |
| Order / OrderItem | Order dengan item terkunci harga saat dibuat; subtotal & diskon per item |
| Payment | DP, pelunasan, denda, refund deposit |
| ReturnPhoto | Foto kondisi barang saat kembali |

Harga tier diambil dari tier terkecil yang ≥ durasi; di atas 48 jam dihitung kelipatan harian (ceil(jam/24) × harga 24 jam).

---

## Notifikasi WhatsApp (OpenWA)

MudahSewa terintegrasi dengan **OpenWA** untuk mengirim notifikasi otomatis via WhatsApp ke pelanggan:

### Fitur WhatsApp

+ ✅ Konfirmasi booking otomatis
+ Pengingat pembayaran & denda
+ Notifikasi pengembalian barang
+ Dokumen rental agreement (PDF)
+ Update status order real-time

### Setup WhatsApp

1. Jalankan OpenWA server:
   ```bash
   docker-compose -f docker-compose.openwa.yml up -d
   ```

2. Scan QR code di http://localhost:8080 dengan WhatsApp Business Anda

3. Simpan auth token di `.env`:
   ```bash
   OPENWA_AUTH_TOKEN=your_token_here
   ```

4. Aktifkan di dashboard admin di bagian **Pengaturan → WhatsApp**

Untuk detail lengkap, lihat [Panduan WhatsApp](./docs/WHATSAPP-INTEGRATION.md).

---

## FAQ

**Bagaimana pelanggan melakukan pemesanan dari HP sendiri?**
Buka `/katalog` di browser (langsung atau share link LAN). Pilih produk, klik **Booking Sekarang**, isi tanggal/durasi/jumlah → lanjut ke **Checkout**. Isi data diri + pilih metode pembayaran (**Cash/Bayar di Tempat**, **QRIS—scan lalu upload bukti**, atau **Midtrans**—jika API key sudah dikonfigurasi). Pesanan masuk dashboard admin dengan status Booking untuk dikonfirmasi. Admin verifikasi → kirim detail via WA; pelunasan/DP dicatat manual.

**Apa perbedaan metode pembayaran?**
- **Cash**: bayar saat pengambilan/pengantaran unit. Admin set status lunas setelah terima uang di panel Pembayaran.
- **QRIS**: customer scan QRIS statis toko (file `public/qris.png`) → transfer → upload screenshot sebagai bukti di halaman pembayaran. Status *Menunggu verifikasi*; admin konfirmasi via detail order.
- **Midtrans**: pembayaran online penuh (QRIS dinamis, e-wallet, VA, kartu kredit) lewat Snap. Konfigurasi di env vars (`MIDTRANS_SERVER_KEY`, `CLIENT_KEY`). Order langsung redirect ke popup Midtrans; webhook otomatis sinkronkan status.

**Bagaimana cara mengaktifkan pembayaran Midtrans?**
Isi `.env`:
```
MIDTRANS_SERVER_KEY="SB-Mid-serverkey..."
MIDTRANS_CLIENT_KEY="SB-Mid-clientkey..."
MIDTRANS_IS_PRODUCTION="false"
```

Sandbox dulu — ganti `false` jadi `true` saat production. URL webhook: `<base-url>/api/payments/notify` (verifikasi signature otomatis).

**Backup data?**
Cukup salin folder `data/` (berisi `mudahsewa.db`) dan folder `public/uploads/` (foto KTP & return).

**File upload gagal?**
Hanya JPG/PNG/WebP maksimal 5MB. Folder `public/uploads/` dibuat ulang otomatis bila hilang.

## Skrip npm

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Build & jalankan production |
| `npm test` | Unit test (pricing/order number/availability) |
| `npm run db:push` / `db:seed` | Sinkron schema / seed data |
