# MudahSewa — Sistem Manajemen Rental Multi-Kategori (Next.js) Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Membangun aplikasi web manajemen rental (Next.js) untuk tracking ketersediaan unit, order, CRM pelanggan, jaminan/dokumen, laporan keuangan — dimulai dari 4 digicam, siap scale ke multi-kategori (camping, walkie talkie, kamera, kost) dengan delegasi operasional ke anak SMA.

**Architecture:** Next.js App Router full-stack (frontend + API dalam satu project). Server Components untuk halaman data, Server Actions untuk mutasi. Prisma ORM dengan SQLite untuk MVP (mudah migrate ke PostgreSQL saat scale). Autentikasi sederhana fase 1 (satu password shared), upgrade ke NextAuth multi-role di fase 2.

**Tech Stack:** Next.js 15 (App Router), TypeScript, TailwindCSS v4, shadcn/ui, Prisma + SQLite, Zod (validasi), date-fns (tanggal), exceljs (ekspor laporan), Vitest (testing)

**Environment:** Windows, Node v22.23.2, npm 12.0.2 (via Hermes node). Project dir: `E:\Projects\mudahsewa` (kosong).

---

## AMENDEMEN 2026-08-23 — Data Asli & Model Harga (override detail di bawah)

**Dijawab oleh pemilik (open questions 1 & 2):**

### 4 digicam asli (mengganti contoh di Task 4 seed)
| SKU | Nama | 6 jam | 12 jam | 24 jam | 48 jam |
|---|---|---|---|---|---|
| CAM-001 | Kodak Pixpro FZ55 | 30.000 | 50.000 | 75.000 | 115.000 |
| CAM-002 | Canon Ixus | 25.000 | 40.000 | 55.000 | 100.000 |
| CAM-003 | Sony Cybershot DSC W810 | 30.000 | 45.000 | 65.000 | 110.000 |
| CAM-004 | Canon PowerShot A4000 IS | 30.000 | 50.000 | 75.000 | 115.000 |

(angka pricelist dari pemilik = ribuan rupiah)

### Model harga: tier per jam (bukan basePrice × durasi)
- Harga **flat per tier durasi** (6/12/24/48 jam), bukan harga per hari × jumlah hari.
- Schema: `Product` tambah kolom `price6h`, `price12h`, `price24h`, `price48h` (Float, rupiah). `basePrice` tetap ada sebagai fallback (diisi = price24h).
- `OrderItem` tambah `durationHours Int @default(24)`; `unitPrice` = harga tier yang dikunci saat order dibuat.
- `src/lib/pricing.ts`: `getTierPrice(product, durationHours)` → pilih tier terkecil yang ≥ durasi; durasi > 48 jam dihitung `ceil(hours/24) × price24h`. Form order menyediakan pilihan 6 jam / 12 jam / 1 hari / 2 hari / N hari (custom), dan unitPrice bisa dioverride manual.
- Test pricing di Task 3 disesuaikan model tier.


## Konteks & Asumsi

### Kondisi bisnis
- 4 unit digicam, manajemen manual via WA/Excel → kerepotan order & laporan
- Target: manage tanggal ketersediaan unit, jaminan (KTP/deposit), laporan keuangan
- Delegasi operasional ke anak SMA (input order, ongkir, follow-up WA), pemilik fokus marketing
- Scale roadmap: digicam → camping, walkie talkie, kamera, kost, dll

### Asumsi teknis
- Next.js dipilih karena familiar, komunitas besar, tutor Indonesia banyak, gampang cari dev saat scale
- SQLite cukup untuk single-org + beberapa staf; Prisma memudahkan migrate PostgreSQL nanti
- WA: fase 1 pakai link `wa.me` + template auto-fill (copy-paste); fase 2 WA Business API
- Payment: fase 1 tracking manual (cash/transfer); fase 2 gateway (Midtrans/Xendit)
- Deployment fase 1: local/LAN (anak SMA akses via browser/WiFi); fase 2 VPS (Vercel/Railway/VPS cPanel)

### Fitur benchmark (dari research SewaScale, MyRental.id, Rentalkan)
- Dashboard: order aktif, terlambat, pendapatan, belum lunas + kalender booking
- Order lifecycle: `booking → active → late → completed / cancelled`
- Stok otomatis: berkurang saat order aktif, kembali saat selesai
- CRM: auto-save pelanggan, riwayat, blacklist, upload KTP
- Tarif fleksibel: per hari/jam/minggu/bulan + diskon Rp/persen
- Laporan 7/30/90 hari + ekspor Excel
- Bukti foto kondisi barang saat return
- Booking page publik + integrasi WA (fase 2)
- Multi-user role: admin (pemilik) vs staff (anak SMA) (fase 2)

---

## Struktur Project

```
E:\Projects\mudahsewa\
├── prisma/
│   ├── schema.prisma            # DB schema
│   └── seed.ts                  # Seed: 4 digicam + kategori + customer demo
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout + sidebar nav
│   │   ├── page.tsx             # Dashboard
│   │   ├── globals.css          # Tailwind v4
│   │   ├── orders/
│   │   │   ├── page.tsx         # Daftar order + filter status
│   │   │   ├── new/page.tsx     # Form buat order
│   │   │   └── [id]/page.tsx    # Detail order + status action + payment + return
│   │   ├── products/
│   │   │   ├── page.tsx         # Daftar produk + stok live
│   │   │   └── new/page.tsx     # Form produk + unit
│   │   ├── customers/
│   │   │   ├── page.tsx         # Daftar pelanggan + blacklist toggle
│   │   │   └── [id]/page.tsx    # Detail: riwayat order + dokumen KTP
│   │   ├── calendar/page.tsx    # Kalender ketersediaan per unit
│   │   ├── reports/page.tsx     # Laporan 7/30/90 hari + ekspor Excel
│   │   └── api/
│   │       ├── orders/route.ts
│   │       ├── orders/[id]/status/route.ts
│   │       ├── orders/[id]/payments/route.ts
│   │       ├── products/route.ts
│   │       ├── customers/route.ts
│   │       └── reports/export/route.ts   # Download Excel
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── Sidebar.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── OrderForm.tsx        # Client component: pilih produk, tanggal, hitung harga
│   │   ├── CalendarView.tsx     # Grid tanggal × unit
│   │   └── WAButton.tsx         # Link wa.me dengan template terisi
│   ├── lib/
│   │   ├── db.ts                # Prisma client singleton
│   │   ├── pricing.ts           # Kalkulasi harga + diskon (pure function, unit-testable)
│   │   ├── orderNumber.ts       # Generate ORD-YYYYMMDD-XXX
│   │   ├── wa.ts                # Template pesan WA
│   │   └── validation.ts        # Zod schemas
│   └── actions/
│       ├── orders.ts            # Server actions: create, updateStatus, return
│       ├── products.ts
│       └── customers.ts
├── data/                        # SQLite file (gitignored)
├── public/uploads/              # KTP, foto return (gitignored)
├── tests/
│   ├── pricing.test.ts          # Kalkulasi harga & diskon
│   ├── orderNumber.test.ts
│   └── availability.test.ts     # Logika stok & bentrok tanggal
├── .env
├── .gitignore
├── next.config.ts
├── package.json
└── README.md
```

---

## FASE 1 — MVP (Core untuk 4 Digicam)

### Task 1: Inisialisasi Project Next.js

**Objective:** Scaffold Next.js + TypeScript + Tailwind, install dependencies, git init.

**Step 1: Buat project**

```bash
cd "E:\Projects\mudahsewa"
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias --use-npm
```

Jawab prompt: TypeScript Yes, ESLint Yes, Tailwind Yes, src dir Yes, App Router Yes, import alias No.

**Step 2: Install dependencies**

```bash
npm install prisma @prisma/client zod date-fns exceljs
npm install -D vitest @vitejs/plugin-react tsx
```

**Step 3: Setup Vitest — buat `vitest.config.ts`**

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

**Step 4: Tambah script test di `package.json`**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

**Step 5: `.gitignore` — tambahkan**

```gitignore
data/
public/uploads/
.env
```

**Step 6: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold Next.js project with Tailwind, Prisma, Vitest"
```

**Step 7: Verifikasi**

Run: `npm run dev` → buka http://localhost:3000 → halaman default Next.js muncul. Stop dengan Ctrl+C.

---

### Task 2: Prisma Schema + Database

**Objective:** Definisikan schema Prisma untuk semua entity, generate client, push ke SQLite.

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`

**Step 1: Init Prisma + buat `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:../data/mudahsewa.db"
}

model Category {
  id          Int       @id @default(autoincrement())
  name        String    @unique
  description String?
  products    Product[]
}

model Product {
  id             Int         @id @default(autoincrement())
  name           String
  sku            String      @unique
  categoryId     Int
  category       Category    @relation(fields: [categoryId], references: [id])
  description    String?
  basePrice      Float
  priceUnit      String      @default("day") // day | hour | week | month
  stockThreshold Int         @default(1)
  active         Boolean     @default(true)
  createdAt      DateTime    @default(now())
  units          Unit[]
  orderItems     OrderItem[]
}

model Unit {
  id           Int         @id @default(autoincrement())
  productId    Int
  product      Product     @relation(fields: [productId], references: [id])
  serialNumber String?
  condition    String      @default("Bagus") // Bagus | Cukup | Rusak
  status       String      @default("available") // available | rented | maintenance
  notes        String?
  orderItems   OrderItem[]
}

model Customer {
  id               Int         @id @default(autoincrement())
  name             String
  phone            String      @unique
  email            String?
  address          String?
  notes            String?
  isBlacklisted    Boolean     @default(false)
  blacklistReason  String?
  createdAt        DateTime    @default(now())
  orders           Order[]
  documents        Document[]
}

model Document {
  id         Int      @id @default(autoincrement())
  customerId Int
  customer   Customer @relation(fields: [customerId], references: [id])
  docType    String // ktp | selfie_ktp | kartu_pelajar | other
  filePath   String
  uploadedAt DateTime @default(now())
}

model Order {
  id           String       @id @default(cuid())
  orderNumber  String       @unique
  customerId   Int
  customer     Customer     @relation(fields: [customerId], references: [id])
  status       String       @default("booking") // booking | active | late | completed | cancelled
  startDate    DateTime
  endDate      DateTime
  notes        String?
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  items        OrderItem[]
  payments     Payment[]
  returnPhotos ReturnPhoto[]
}

model OrderItem {
  id            Int      @id @default(autoincrement())
  orderId       String
  order         Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId     Int
  product       Product  @relation(fields: [productId], references: [id])
  unitId        Int?
  unit          Unit?    @relation(fields: [unitId], references: [id])
  quantity      Int      @default(1)
  unitPrice     Float
  priceUnit     String   @default("day")
  duration      Int      @default(1)
  discountType  String? // amount | percent | null
  discountValue Float    @default(0)
  subtotal      Float    @default(0)
}

model Payment {
  id          Int      @id @default(autoincrement())
  orderId     String
  order       Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  amount      Float
  paymentType String // dp | pelunasan | denda | deposit_refund
  method      String? // cash | transfer_bca | transfer_mandiri | ...
  note        String?
  paidAt      DateTime @default(now())
}

model ReturnPhoto {
  id         Int      @id @default(autoincrement())
  orderId    String
  order      Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  filePath   String
  note       String?
  uploadedAt DateTime @default(now())
}
```

**Step 2: Buat folder data + Prisma client singleton `src/lib/db.ts`**

```bash
mkdir -p data public/uploads
```

```typescript
// src/lib/db.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**Step 3: Push schema**

```bash
npm run db:push
```

Expected: `Your database is now in sync with your schema.`

**Step 4: Commit**

```bash
git add prisma/ src/lib/db.ts data/
git commit -m "feat: add Prisma schema with 9 models (Category, Product, Unit, Customer, Document, Order, OrderItem, Payment, ReturnPhoto)"
```

**Step 5: Verifikasi**

Run: `npx prisma studio` → buka http://localhost:5555 → semua tabel muncul. Stop dengan Ctrl+C.

---

### Task 3: Pure Logic — Pricing + Order Number (TDD)

**Objective:** Kalkulasi harga & diskon, generate nomor order, cek bentrok tanggal — pure functions, test dulu.

**Files:**
- Create: `src/lib/pricing.ts`
- Create: `src/lib/orderNumber.ts`
- Create: `src/lib/availability.ts`
- Test: `tests/pricing.test.ts`, `tests/orderNumber.test.ts`, `tests/availability.test.ts`

**Step 1: Tulis failing test — `tests/pricing.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { calcSubtotal, calcOrderTotal } from "@/lib/pricing";

describe("calcSubtotal", () => {
  it("tanpa diskon: harga × durasi × qty", () => {
    expect(calcSubtotal({ unitPrice: 100000, duration: 3, quantity: 1 })).toBe(300000);
  });

  it("diskon amount: base - nominal", () => {
    expect(
      calcSubtotal({ unitPrice: 100000, duration: 3, quantity: 1, discountType: "amount", discountValue: 50000 })
    ).toBe(250000);
  });

  it("diskon percent: base × (1 - p/100)", () => {
    expect(
      calcSubtotal({ unitPrice: 100000, duration: 2, quantity: 2, discountType: "percent", discountValue: 10 })
    ).toBe(360000);
  });

  it("hasil diskon tidak boleh negatif", () => {
    expect(
      calcSubtotal({ unitPrice: 50000, duration: 1, quantity: 1, discountType: "amount", discountValue: 100000 })
    ).toBe(0);
  });
});

describe("calcOrderTotal", () => {
  it("menjumlahkan semua subtotal item", () => {
    expect(calcOrderTotal([100000, 250000])).toBe(350000);
  });
});
```

**Step 2: Run test, pastikan FAIL**

```bash
npm test
```

Expected: FAIL — `Cannot find module '@/lib/pricing'`

**Step 3: Implementasi `src/lib/pricing.ts`**

```typescript
export interface PricingInput {
  unitPrice: number;
  duration: number;
  quantity: number;
  discountType?: "amount" | "percent" | null;
  discountValue?: number;
}

export function calcSubtotal(input: PricingInput): number {
  const base = input.unitPrice * input.duration * input.quantity;
  let subtotal = base;
  if (input.discountType === "amount") {
    subtotal = base - (input.discountValue ?? 0);
  } else if (input.discountType === "percent") {
    subtotal = base * (1 - (input.discountValue ?? 0) / 100);
  }
  return Math.max(Math.round(subtotal), 0);
}

export function calcOrderTotal(subtotals: number[]): number {
  return subtotals.reduce((a, b) => a + b, 0);
}

export function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}
```

**Step 4: Run test, pastikan PASS**

```bash
npm test
```

Expected: `4 passed`

**Step 5: Sama untuk `tests/orderNumber.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { nextOrderNumber } from "@/lib/orderNumber";

describe("nextOrderNumber", () => {
  it("format ORD-YYYYMMDD-XXX", () => {
    expect(nextOrderNumber(0, new Date("2026-08-22"))).toBe("ORD-20260822-001");
  });
  it("increment counter", () => {
    expect(nextOrderNumber(2, new Date("2026-08-22"))).toBe("ORD-20260822-003");
  });
});
```

```typescript
// src/lib/orderNumber.ts
export function nextOrderNumber(existingCount: number, date: Date = new Date()): string {
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, "");
  return `ORD-${ymd}-${String(existingCount + 1).padStart(3, "0")}`;
}
```

**Step 6: Sama untuk `tests/availability.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { rangesOverlap, countOverlapUnits } from "@/lib/availability";

describe("rangesOverlap", () => {
  it("bentrok: rentang bersinggungan", () => {
    expect(rangesOverlap(new Date("2026-08-20"), new Date("2026-08-23"), new Date("2026-08-22"), new Date("2026-08-25"))).toBe(true);
  });
  it("tidak bentrok: berurutan", () => {
    expect(rangesOverlap(new Date("2026-08-20"), new Date("2026-08-22"), new Date("2026-08-23"), new Date("2026-08-25"))).toBe(false);
  });
});
```

```typescript
// src/lib/availability.ts
export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Hitung berapa unit dari sebuah product yang sibuk pada rentang tanggal tertentu.
 *  orders = daftar order aktif/booking yang punya item product tsb. */
export function countOverlapUnits(
  productId: number,
  rangeStart: Date,
  rangeEnd: Date,
  orders: { status: string; startDate: Date; endDate: Date; productId: number; quantity: number }[]
): number {
  return orders
    .filter(
      (o) =>
        o.productId === productId &&
        (o.status === "booking" || o.status === "active" || o.status === "late") &&
        rangesOverlap(rangeStart, rangeEnd, o.startDate, o.endDate)
    )
    .reduce((sum, o) => sum + o.quantity, 0);
}
```

**Step 7: Run semua test**

```bash
npm test
```

Expected: semua PASS

**Step 8: Commit**

```bash
git add src/lib/ tests/
git commit -m "feat: pricing, order number, and availability logic with unit tests"
```

---

### Task 4: Seed Data — 4 Digicam

**Objective:** Isi database dengan kategori, 4 digicam + unit fisik, customer demo.

**Files:**
- Create: `prisma/seed.ts`

**Step 1: Buat `prisma/seed.ts`**

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Kategori
  const kamera = await prisma.category.upsert({
    where: { name: "Digicam" },
    update: {},
    create: { name: "Digicam", description: "Kamera digital compact retro" },
  });

  // Produk + 4 unit
  const products = [
    { sku: "CAM-001", name: "Sony WX1", basePrice: 75000 },
    { sku: "CAM-002", name: "Canon G7X Mark II", basePrice: 100000 },
    { sku: "CAM-003", name: "Fujifilm X100F", basePrice: 150000 },
    { sku: "CAM-004", name: "Sony A6400 + Kit Lens", basePrice: 125000 },
  ];

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: { ...p, categoryId: kamera.id, priceUnit: "day", stockThreshold: 1 },
    });
    // 1 unit fisik per produk
    await prisma.unit.upsert({
      where: { id: product.id }, // fallback; lihat catatan di bawah
      update: {},
      create: { productId: product.id, condition: "Bagus", status: "available" },
    } as never);
  }

  // Customer demo
  await prisma.customer.upsert({
    where: { phone: "081234567890" },
    update: {},
    create: { name: "Budi Demo", phone: "081234567890", address: "Jl. Contoh No. 1" },
  });

  console.log("Seed selesai: 1 kategori, 4 produk, 4 unit, 1 customer");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
```

Catatan: `unit.upsert` dengan `where: { id: product.id }` hanya aman untuk seed pertama kali. Alternatif lebih bersih: cek `findFirst({ where: { productId: product.id } })` sebelum create. Implementer boleh pakai pola cek-dulu-buat.

**Step 2: Jalankan seed**

```bash
npm run db:seed
```

Expected: `Seed selesai: 1 kategori, 4 produk, 4 unit, 1 customer`

**Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: seed data with 4 digicam products and demo customer"
```

---

### Task 5: Layout + Sidebar + Dashboard

**Objective:** Layout aplikasi dengan sidebar navigasi, dashboard menampilkan statistik + order terbaru.

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/components/Sidebar.tsx`
- Create: `src/components/StatusBadge.tsx`
- Modify: `src/app/page.tsx`
- Create: `src/components/ui/*` (shadcn: card, badge, button)

**Step 1: Install shadcn/ui**

```bash
npx shadcn@latest init -d
npx shadcn@latest add button card badge table input label select textarea dialog
```

**Step 2: `src/components/Sidebar.tsx`** — nav items: Dashboard `/`, Orders `/orders`, Produk `/products`, Pelanggan `/customers`, Kalender `/calendar`, Laporan `/reports`. Gunakan `usePathname()` untuk highlight active.

**Step 3: `src/components/StatusBadge.tsx`**

```tsx
const MAP: Record<string, { label: string; className: string }> = {
  booking: { label: "Booking", className: "bg-yellow-100 text-yellow-800" },
  active: { label: "Aktif", className: "bg-blue-100 text-blue-800" },
  late: { label: "Terlambat", className: "bg-red-100 text-red-800" },
  completed: { label: "Selesai", className: "bg-green-100 text-green-800" },
  cancelled: { label: "Dibatalkan", className: "bg-gray-100 text-gray-800" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = MAP[status] ?? { label: status, className: "bg-gray-100" };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${s.className}`}>{s.label}</span>;
}
```

**Step 4: `src/app/page.tsx`** — Server Component query langsung ke Prisma:

```tsx
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function DashboardPage() {
  const [activeCount, lateCount, bookingCount] = await Promise.all([
    prisma.order.count({ where: { status: "active" } }),
    prisma.order.count({ where: { status: "late" } }),
    prisma.order.count({ where: { status: "booking" } }),
  ]);

  const revenue = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: { paymentType: { in: ["dp", "pelunasan"] } },
  });

  const orders = await prisma.order.count();
  const paid = revenue._sum.amount ?? 0;

  const recentOrders = await prisma.order.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
    include: { customer: true, items: { include: { product: true } } },
  });

  const stats = [
    { title: "Order Aktif", value: activeCount },
    { title: "Terlambat", value: lateCount },
    { title: "Booking", value: bookingCount },
    { title: "Total Diterima", value: `Rp ${(paid ?? 0).toLocaleString("id-ID")}` },
  ];

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <Card key={s.title}>
            <CardHeader><CardTitle className="text-sm text-gray-500">{s.title}</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{s.value}</p></CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Order Terbaru</CardTitle></CardHeader>
        <CardContent>
          {recentOrders.length === 0 && <p className="text-gray-500">Belum ada order. <Link className="underline" href="/orders/new">Buat order pertama</Link></p>}
          {/* Table order terbaru: nomor, customer, produk, tanggal, status */}
        </CardContent>
      </Card>
    </main>
  );
}
```

Catatan: "Total belum lunas" = total order selesai/aktif − total payment. Implementasi: hitung `sum(subtotal per order via items)` untuk order status != cancelled, dikurangi paid. Tampilkan sebagai kartu ke-5.

**Step 5: Verifikasi**

```bash
npm run dev
```

Buka http://localhost:3000 → dashboard dengan 4 kartu stat (nilai 0/potong seed) + sidebar navigasi.

**Step 6: Commit**

```bash
git add src/
git commit -m "feat: app layout, sidebar, and dashboard with live stats"
```

---

### Task 6: CRUD Produk + Stok Live

**Objective:** Halaman daftar produk (stok available/total live + warning threshold), form tambah produk + unit.

**Files:**
- Create: `src/app/products/page.tsx`
- Create: `src/app/products/new/page.tsx`
- Create: `src/actions/products.ts`

**Spec penting:**
- `products/page.tsx`: Server Component. Per produk hitung: `totalUnits = product.units.length`, `availableUnits = units.filter(u => u.status === "available").length`. Kalau `availableUnits < stockThreshold` → badge merah "Stok menipis".
- Form new: name, sku, kategori (select), basePrice, priceUnit (day/hour/week/month), stockThreshold, jumlah unit awal. Submit → server action `createProduct` → redirect ke `/products`.
- Server action `createProduct` validasi dengan Zod (`src/lib/validation.ts`), buat Product + N Unit sekaligus dalam satu `prisma.$transaction`.

**Verifikasi:** Tambah produk baru dari UI → muncul di list dengan stok benar. `npm run db:seed` ulang tidak duplikat (upsert by sku).

**Commit:** `feat: product pages with live stock and threshold warning`

---

### Task 7: CRUD Customer + Blacklist + Upload KTP

**Objective:** Daftar pelanggan, form tambah, toggle blacklist, upload foto KTP.

**Files:**
- Create: `src/app/customers/page.tsx`
- Create: `src/app/customers/new/page.tsx`
- Create: `src/app/customers/[id]/page.tsx`
- Create: `src/actions/customers.ts`
- Create: `src/components/KtpUpload.tsx` (client component, FormData upload)

**Spec penting:**
- List: nama, WA, jumlah order, badge Blacklist merah kalau aktif. Tombol WA link `https://wa.me/62{phone tanpa awalan 0}`.
- Detail: riwayat order + grid dokumen (foto KTP ditampilkan).
- Upload: simpan file ke `public/uploads/ktp/{customerId}-{timestamp}.{ext}` → simpan path di model Document. Validasi: hanya image (jpg/png/webp), max 5MB. Gunakan `writeFile` dari `fs/promises` di server action.
- Blacklist toggle: server action `setBlacklist(id, bool, reason)` — minta alasan (textarea) saat mengaktifkan. Di halaman buat order: kalau customer blacklisted → tampilkan warning merah dan blok submit (konfirmasi admin).

**Verifikasi:** Upload KTP jpg → file muncul di `public/uploads/ktp/` → tampil di detail customer.

**Commit:** `feat: customer CRUD with blacklist and KTP document upload`

---

### Task 8: Order — Buat Order (Form + Validasi Stok)

**Objective:** Form buat order multi-item dengan auto-complete customer, cek ketersediaan, hitung harga live, simpan.

**Files:**
- Create: `src/app/orders/new/page.tsx`
- Create: `src/components/OrderForm.tsx` (client component)
- Create: `src/actions/orders.ts`
- Create: `src/lib/wa.ts`
- Create: `src/app/api/availability/route.ts`

**Spec penting:**
- `OrderForm` state: customer (pilih existing via search phone/nama ATAU input baru), items[] (produk, qty, duration, diskon), startDate, endDate, notes.
- Hitung harga live di client pakai `calcSubtotal` dari `@/lib/pricing` (pure function, dipakai ulang — DRY).
- Cek ketersediaan: fetch `/api/availability?productId=X&start=...&end=...` → server pakai `countOverlapUnits` → respons `{ available: number }`. Kalau qty > available → disable tombol simpan + pesan "stok tidak cukup".
- Submit → server action `createOrder`: (1) validasi Zod, (2) cek ketersediaan LAGI di server (race condition), (3) generate orderNumber, (4) simpan Order + items (status `booking`), (5) kalau customer baru → create customer dulu (auto-save ke CRM), (6) redirect ke `/orders/{id}`.
- `src/lib/wa.ts`: template konfirmasi booking — `formatBookingWA(order)` return string dengan nomor order, nama, item, tanggal, total, sisa bayar. Dipakai di halaman detail (fase 1: tombol buka wa.me dengan text terisi).

**Verifikasi:** Buat order 1 digicam 3 hari → muncul di list status "Booking". Coba buat order tanggal sama untuk produk sama → blocked karena stok 1 sudah terpakai (untuk rentang overlap).

**Commit:** `feat: order creation with availability check and live pricing`

---

### Task 9: Order — List, Detail, Status Transition + Stok

**Objective:** List order + filter status, detail order dengan aksi status, stok otomatis berkurang/kembali, catat payment, proses return + foto.

**Files:**
- Create: `src/app/orders/page.tsx`
- Create: `src/app/orders/[id]/page.tsx`
- Create: `src/components/ReturnForm.tsx`
- Modify: `src/actions/orders.ts`

**Spec status transition (server action `updateOrderStatus`):**

| Dari | Ke | Efek stok |
|---|---|---|
| booking → active | assign unit: setiap item cari unit `available` milik product → set `unit.status = "rented"`, simpan `unitId`. Kalau tidak cukup unit → error, jangan lanjut |
| active → late | tidak ada (job/cron fase 2; sementara manual + banner "lewat tanggal, belum kembali") |
| active/late → completed | semua `unit.status` kembali `"available"`, unit condition bisa di-update saat return |
| any → cancelled | jika sudah pernah assign unit → balikan ke available |

- Detail order menampilkan: info customer (+blacklist warning), items, total, sisa bayar (`sum items − sum payments`), timeline status, form payment (amount, type dp/pelunasan/denda, method), tombol WA (template konfirmasi/pelunasan), `ReturnForm`.
- `ReturnForm`: upload 1-n foto kondisi barang (multi-file) → simpan `public/uploads/return/{orderId}-{n}.jpg` + record ReturnPhoto, catat kondisi unit (select Bagus/Cukup/Rusak) + notes kerusakan, lalu tombol "Selesaikan Order" memanggil `updateOrderStatus(completed)`.
- Fungsi bantu: `getUnitAssignment` — query unit tersedia dengan `SELECT ... FOR UPDATE`-style via transaction Prisma (`$transaction` + `updateMany` guard).

**Verifikasi end-to-end manual:**
1. Order baru (booking) → stok produk masih 1/1 di halaman produk
2. Klik "Aktifkan" → stok jadi 0/1, unit status rented
3. Tambah payment DP 50% → sisa bayar turun
4. Return + foto → Selesaikan → stok balik 1/1, status completed

**Commit:** `feat: order lifecycle with automatic stock transitions, payments, and return photos`

---

### Task 10: Kalender Ketersediaan

**Objective:** Grid kalender: baris = unit produk, kolom = tanggal 30 hari ke depan, cell berwarna kalau terpakai.

**Files:**
- Create: `src/app/calendar/page.tsx`
- Create: `src/components/CalendarView.tsx`

**Spec:**
- Server Component ambil semua product + units + order aktif/booking/late.
- Cell untuk tanggal T dan unit U: cari order item dengan unitId=U yang `rangesOverlap(T, T+1day, order.start, order.end)` → merah (booking: kuning, active/late: merah tua). Kosong → hijau muda.
- Klik cell → link ke order terkait.
- Header: tanggal 1-30 dari hari ini, scroll horizontal di mobile.

**Verifikasi:** Order aktif 3 hari → 3 cell di baris unit tersebut berwarna, sisanya hijau.

**Commit:** `feat: unit availability calendar view`

---

### Task 11: Laporan + Ekspor Excel

**Objective:** Halaman laporan dengan pilihan periode (7/30/90 hari custom), ringkasan, tabel transaksi, tombol ekspor Excel.

**Files:**
- Create: `src/app/reports/page.tsx`
- Create: `src/app/api/reports/export/route.ts`

**Spec:**
- Query params: `?days=7|30|90`.
- Ringkasan: total pendapatan (payments diterima), total nilai order dibuat, order selesai, order terlambat, pelanggan baru, top produk (sum quantity per product, order by desc).
- Tabel: orders dalam periode (nomor, tanggal, customer, item, total, status, dibayar).
- Export route: pakai `exceljs` → workbook dengan 2 sheet ("Ringkasan", "Orders") → `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `Content-Disposition: attachment; filename="laporan-{days}hari.xlsx"`. Nilai rupiah format `#,##0`.
- Data laporan juga jadi dasar hitung fee anak SMA fase 2 (kolom "ditangani oleh" — kosong dulu).

**Verifikasi:** Buat beberapa order + payment di seed/manual → halaman laporan menunjukkan angka benar → download Excel terbuka dengan 2 sheet.

**Commit:** `feat: financial reports with period filter and Excel export`

---

### Task 12: Polish + README + Smoke Test Manual

**Objective:** Rapikan UX dan dokumentasikan.

- Empty state di semua list dengan CTA ("Belum ada produk → Tambah produk")
- Format tanggal `dd MMM yyyy` (date-fns, locale id-ID), format rupiah konsisten pakai `formatRupiah`
- Mobile responsive: sidebar jadi bottom-nav / hamburger
- `README.md`: cara install (`npm install`, `npm run db:push`, `npm run db:seed`, `npm run dev`), alur operasional harian untuk anak SMA (terima order → aktifkan → return → selesaikan), FAQ singkat
- Full `npm test` + `npm run build` → semua pass, build sukses

**Commit:** `docs: add README with setup guide and daily operations flow`

---

## FASE 2 — Delegasi & Scale

Setelah MVP dipakai rutin untuk 4 digicam:

1. **Auth multi-user + role**: NextAuth.js (credentials provider) — role `admin` (pemilik: semua akses, lihat laporan, kelola harga/blacklist) vs `staff` (anak SMA: buat order, update status, return; TIDAK bisa hapus data / ubah harga / lihat laporan laba). Kolom `createdBy` di Order untuk audit.
2. **Job "late" otomatis**: cron job (Vercel Cron / node-cron) tiap pagi → order `active` dengan `endDate < now` → set `late` + hitung denda per hari (configurable per produk).
3. **Booking page publik**: route `/book` (tanpa auth) — form publik pilih produk/tanggal → cek ketersediaan real-time → submit jadi order `booking` + notifikasi WA ke admin. Custom domain/subdomain saat deploy.
4. **Delivery/ongkir + fee staff**: field di Order (`courier`, `shippingCost`, `handledBy`) + laporan per staff (basis hitung fee: persen dari total order yang mereka tangani).
5. **Notifikasi Telegram bot** ke pemilik: order baru, order late, pembayaran masuk.
6. **Migrate PostgreSQL**: ganti `datasource provider` + `DATABASE_URL`, jalankan `prisma migrate deploy`. Siap saat deploy VPS/Vercel.
7. **Backup otomatis**: script dump SQLite harian / managed Postgres backup.

## FASE 3 — Marketplace & Growth

- Etalase publik multi-kategori + filter kota/harga (seperti marketplace SewaScale)
- Payment gateway Midtrans/Xendit (DP otomatis terkonfirmasi)
- PWA (installable di HP anak SMA)
- Multi-vendor/franchise (kalau model bisnis terbukti)

---

## Tests / Validation

### Test targets
- `tests/pricing.test.ts` — kalkulasi harga, diskon amount/percent, guard negatif
- `tests/orderNumber.test.ts` — format & increment nomor order
- `tests/availability.test.ts` — overlap tanggal, hitung unit sibuk

### Verification commands
```bash
npm test              # semua unit test pass
npm run build         # production build sukses
npm run dev           # manual smoke test di http://localhost:3000
```

### Manual smoke test checklist (fase 1 selesai)
1. Tambah produk baru + 2 unit → stok 2/2
2. Buat order customer baru (auto-save CRM) 1 unit × 3 hari + diskon 10% → total benar
3. Aktifkan order → stok 1/2
4. Coba order kedua unit tanggal overlap → sukses (stok cukup); order ketiga → blocked
5. Catat payment DP → sisa bayar berkurang
6. Return + upload foto → selesaikan → stok 2/2
7. Kalender menunjukkan blok merah/kuning sesuai status
8. Laporan 7 hari menunjukkan order & pendapatan benar → Excel terdownload

---

## Risks, Tradeoffs & Open Questions

### Risks
1. **Input salah oleh anak SMA** → validasi Zod di semua server action, konfirmasi visual sebelum status berubah, tidak ada hard-delete (cuma cancel)
2. **Double-booking race condition** → cek ketersediaan ulang di server action dalam `$transaction`
3. **Upload file besar** → limit 5MB + validasi tipe file di server action
4. **SQLite corrupt / kehilangan data** → folder `data/` di backup rutin + ekspor Excel berkala; fase 2 backup otomatis
5. **Scope creep fase 1** → disiplin: auth multi-user & booking page TIDAK masuk fase 1 (fase 2)

### Tradeoffs
- **Server Actions vs REST API penuh**: Server Actions lebih sedikit kode & aman untuk internal tool; API route tetap dibuat untuk kebutuhan client-side (availability check, export)
- **SQLite (MVP) vs PostgreSQL (awal)**: SQLite = zero-config, cukup untuk 1-3 staf; Prisma membuat migrasi nanti nyaris tanpa ubah kode
- **Build sendiri vs SewaScale Rp179k lifetime**: build sendiri = kontrol penuh data + fitur, sesuai roadmap multi-kategori & delegasi fee staff (tidak ada di SewaScale); biaya = waktu dev ~ fase 1. SewaScale bisa dipakai sementara selama dev berjalan (opsi hybrid)

### Open Questions (perlu jawaban Anda sebelum/di awal eksekusi)
1. Detail asli 4 digicam: merk/model/SN/harga sewa per hari → untuk seed data final
2. Tarif: apakah per hari saja di fase 1, atau langsung per jam/minggu juga?
3. Nama app: "MudahSewa" final? (pengaruh branding di fase 2 booking page)
4. Fase 1 single-user tanpa login (localhost/LAN dipercaya) — OK, atau langsung butuh login sederhana?
5. Deposit/jaminan fase 1: hanya KTP + catatan nominal manual, atau perlu tracking deposit uang di sistem? (model Payment sudah support `deposit_refund`, tinggal aktifkan UI-nya)
6. Denda keterlambatan: per hari flat per produk atau persentase? (dipakai fase 2 job otomatis, tapi struktur field bisa disiapkan sekarang)

---

## Execution Handoff

**Plan complete and saved. Ready to execute using subagent-driven-development — I'll dispatch a fresh subagent per task with two-stage review (spec compliance then code quality). Shall I proceed?**
