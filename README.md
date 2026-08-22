# MudahSewa — Sistem Manajemen Rental

Aplikasi internal untuk mengelola rental digicam (siap multi-kategori): stok per unit fisik, order dengan harga tier durasi, siklus booking → aktif → selesai, pembayaran, kalender ketersediaan, dan laporan keuangan dengan ekspor Excel.

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

## FAQ

**Bagaimana mengubah harga produk?**
Buat ulang produk lewat halaman Produk (fase 1 belum ada edit). Order lama tidak berubah — harga terkunci saat order dibuat.

**Bagaimana mencatat denda keterlambatan?**
Di detail order → panel Pembayaran → jenis **Denda**. Nomor WA pelanggan ada tombol **Ingatkan Pelunasan**.

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
