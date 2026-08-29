/**
 * Impor data riwayat orderan dari export Notion (DAGDIGDUG),
 * menggantikan semua dummy data di database.
 *
 * Jalankan: npx tsx prisma/import-notion.ts
 * Backup otomatis: data/mudahsewa.backup-preimport.db (dibuat manual sebelum jalankan)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---- Mapping kamera Notion → SKU produk di DB ----
const CAMERA_BY_NAME: Record<string, string> = {
  "Kodak FZ55": "CAM-001",
  "Canon IXUS": "CAM-002",
  "Canon IXUS 185": "CAM-002",
  "Sony W810": "CAM-003",
  "Canon A4000": "CAM-004",
  BEBAS: "CAM-002", // "Kamera BEBAS" — pemilik bebas pilih; dipetakan ke Canon Ixus
};

const MONTHS: Record<string, number> = {
  January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
  July: 6, August: 7, September: 8, October: 9, November: 10, December: 11,
};

/** "May 29, 2026" | "May 29, 2026 19:00" → Date (waktu lokal) */
function parseNotionDate(s: string, time?: string): Date {
  const m = s.match(/^(\w+) (\d+), (\d+)$/);
  if (!m) throw new Error(`Tanggal tidak terbaca: ${s}`);
  const [, mon, day, year] = m;
  const month = MONTHS[mon];
  if (month === undefined) throw new Error(`Bulan tidak dikenal: ${mon}`);
  const [h, min] = time ? time.split(".").map(Number) : [0, 0];
  return new Date(Number(year), month, Number(day), h || 0, min || 0);
}


interface NotionRow {
  nama: string;
  catatan: string;
  kamera: string;
  harga: number; // total order
  metode?: string;
  pelunasan?: number; // nominal pelunasan yang tercatat di Notion
  tanggalSewa: Date;
  tanggalKembali: Date; // deadline dari Notion
  gajiTransport?: number;
}

const ROWS: NotionRow[] = [
  { nama: "HANA", catatan: "Waktu: 19.00 WIB", kamera: "Canon IXUS", harga: 75000, metode: "Transfer", pelunasan: 75000, tanggalSewa: parseNotionDate("May 29, 2026", "19.00"), tanggalKembali: parseNotionDate("May 30, 2026", "19.00"), gajiTransport: 5000 },
  { nama: "RIFMAYA", catatan: "Status: Book (LUNAS) | Waktu: 19.00 WIB | Return: 30 Mei 16.00 WIB", kamera: "Kodak FZ55", harga: 115000, metode: "Transfer", pelunasan: 115000, tanggalSewa: parseNotionDate("May 28, 2026", "19.00"), tanggalKembali: parseNotionDate("May 30, 2026", "19.00"), gajiTransport: 5000 },
  { nama: "HANIFA", catatan: "Waktu: 19.00 WIB | Kamera BEBAS", kamera: "BEBAS", harga: 175000, metode: "Transfer", pelunasan: 175000, tanggalSewa: parseNotionDate("June 15, 2026", "19.00"), tanggalKembali: parseNotionDate("June 22, 2026", "19.00"), gajiTransport: 5000 },
  { nama: "RETNO", catatan: "Waktu: 20.00 WIB", kamera: "Kodak FZ55", harga: 75000, metode: "Transfer", pelunasan: 75000, tanggalSewa: parseNotionDate("May 31, 2026", "20.00"), tanggalKembali: parseNotionDate("June 1, 2026", "20.00"), gajiTransport: 5000 },
  // TIARA: catatan "BELUM LUNAS" (kolom Sisa terisi) → tanpa payment
  { nama: "TIARA", catatan: "Waktu: 15.00 WIB | BELUM LUNAS", kamera: "Kodak FZ55", harga: 115000, tanggalSewa: parseNotionDate("June 19, 2026", "15.00"), tanggalKembali: parseNotionDate("June 21, 2026", "15.00"), gajiTransport: 5000 },
  { nama: "AMEY", catatan: "Status: Book (LUNAS) | Waktu: 19.00 WIB", kamera: "Kodak FZ55", harga: 60000, tanggalSewa: parseNotionDate("May 16, 2026", "19.00"), tanggalKembali: parseNotionDate("May 17, 2026", "19.00"), gajiTransport: 5000 },
  { nama: "DIMAS", catatan: "Status: Book | Waktu: 15.00 WIB", kamera: "Kodak FZ55", harga: 120000, tanggalSewa: parseNotionDate("August 14, 2026", "15.00"), tanggalKembali: parseNotionDate("August 17, 2026", "15.00"), gajiTransport: 5000 },
  { nama: "TOPA", catatan: "Status: Book (LUNAS) | Waktu: 19.00 WIB | Single day", kamera: "Kodak FZ55", harga: 30000, tanggalSewa: parseNotionDate("June 6, 2026", "19.00"), tanggalKembali: parseNotionDate("June 6, 2026", "19.00") },
  { nama: "JELITA", catatan: "Status: Book | Waktu: 16.00 WIB | Single day", kamera: "Kodak FZ55", harga: 30000, tanggalSewa: parseNotionDate("June 13, 2026", "16.00"), tanggalKembali: parseNotionDate("June 13, 2026", "16.00"), gajiTransport: 5000 },
  // FIRDA: Harga TBC (0) → order Rp0; 12 jam → 12h; Jaminan KTP + COD Weleri
  { nama: "FIRDA", catatan: "Status: Book | Durasi: 12 jam | Jaminan: KTP | COD: Weleri | Harga: TBC", kamera: "Kodak FZ55", harga: 0, tanggalSewa: parseNotionDate("June 28, 2026", "10.00"), tanggalKembali: parseNotionDate("June 28, 2026", "22.00") },
  { nama: "KEVIN", catatan: "Status: Book | Waktu: 09.00 WIB | Single day", kamera: "Canon IXUS 185", harga: 25000, tanggalSewa: parseNotionDate("July 1, 2026", "09.00"), tanggalKembali: parseNotionDate("July 1, 2026", "09.00"), gajiTransport: 5000 },
  { nama: "UTAMI", catatan: "Status: Book | Waktu: 10.00 WIB | Single day", kamera: "Sony W810", harga: 25000, tanggalSewa: parseNotionDate("June 30, 2026", "10.00"), tanggalKembali: parseNotionDate("June 30, 2026", "10.00"), gajiTransport: 5000 },
  { nama: "TOPA", catatan: "Status: Lunas | Waktu: 18.00 WIB | Single day | Gaji: -Rp10.000 (transport)", kamera: "Canon IXUS 185", harga: 30000, tanggalSewa: parseNotionDate("June 28, 2026", "18.00"), tanggalKembali: parseNotionDate("June 28, 2026", "18.00"), gajiTransport: 10000 },
  { nama: "TOPA", catatan: "Status: Lunas | Waktu: 18.00 WIB | Single day", kamera: "Canon A4000", harga: 30000, tanggalSewa: parseNotionDate("June 28, 2026", "18.00"), tanggalKembali: parseNotionDate("June 28, 2026", "18.00") },
  { nama: "KEVIN", catatan: "Status: Lunas | Waktu: 06.00 WIB | Single day", kamera: "Kodak FZ55", harga: 50000, tanggalSewa: parseNotionDate("July 2, 2026", "06.00"), tanggalKembali: parseNotionDate("July 2, 2026", "06.00"), gajiTransport: 5000 },
  // KEVIN reschedule: BELUM LUNAS saat book → tanpa payment
  { nama: "KEVIN", catatan: "Status: Booking (BELUM LUNAS) | Waktu: 13.00 WIB | Single day | Reschedule dari 6 Juli", kamera: "Kodak FZ55", harga: 50000, tanggalSewa: parseNotionDate("July 7, 2026", "13.00"), tanggalKembali: parseNotionDate("July 7, 2026", "13.00"), gajiTransport: 5000, rescheduled: true } as NotionRow & { rescheduled: boolean },
  { nama: "ZULIA", catatan: "Status: Lunas | Waktu: 10.00 WIB | Single day", kamera: "Canon IXUS 185", harga: 30000, tanggalSewa: parseNotionDate("July 4, 2026", "10.00"), tanggalKembali: parseNotionDate("July 4, 2026", "10.00"), gajiTransport: 5000 },
  // TRISHA: BELUM LUNAS saat book → tanpa payment
  { nama: "TRISHA", catatan: "Status: Booking (BELUM LUNAS) | Waktu: 15.00 WIB | Single day", kamera: "Kodak FZ55", harga: 85000, tanggalSewa: parseNotionDate("July 5, 2026", "15.00"), tanggalKembali: parseNotionDate("July 5, 2026", "15.00"), gajiTransport: 5000 },
  { nama: "OCTA", catatan: "Status: Book | Waktu: 15.00 WIB | Single day", kamera: "Canon IXUS 185", harga: 25000, tanggalSewa: parseNotionDate("July 18, 2026", "15.00"), tanggalKembali: parseNotionDate("July 18, 2026", "15.00") },
];

// ---- Parsing kolom Catatan jadi field terstruktur ----
function parseCatatan(catatan: string) {
  const parts = catatan.split("|").map((s) => s.trim()).filter(Boolean);
  const timeMatch = parts.find((p) => p.startsWith("Waktu:"));
  const waktu = timeMatch ? timeMatch.replace("Waktu:", "").trim() : null; // "19.00 WIB"
  const jaminan = parts.find((p) => p.startsWith("Jaminan:"))?.replace("Jaminan:", "").trim() ?? null;
  const cod = parts.find((p) => p.startsWith("COD:"))?.replace("COD:", "").trim() ?? null;
  const durasiJam = Number(parts.find((p) => p.startsWith("Durasi:"))?.match(/(\d+)/)?.[1] ?? 0);
  const singleDay = parts.some((p) => p === "Single day");
  return { waktu, jaminan, cod, durasiJam, singleDay, parts };
}

function mapMethod(m?: string): string | null {
  if (!m) return null;
  const lower = m.toLowerCase();
  if (lower.includes("transfer")) return "transfer_lain";
  if (lower.includes("cash") || lower.includes("cod")) return "cash";
  return lower;
}

async function main() {
  console.log("Menghapus data impor sebelumnya (hanya customer placeholder 08900000*)…");
  const importCustomerIds = (
    await prisma.customer.findMany({
      where: { phone: { startsWith: "08900000" } },
      select: { id: true },
    })
  ).map((c) => c.id);
  await prisma.returnPhoto.deleteMany({
    where: { order: { customerId: { in: importCustomerIds } } },
  });
  await prisma.payment.deleteMany({ where: { order: { customerId: { in: importCustomerIds } } } });
  await prisma.orderItem.deleteMany({ where: { order: { customerId: { in: importCustomerIds } } } });
  await prisma.order.deleteMany({ where: { customerId: { in: importCustomerIds } } });
  await prisma.document.deleteMany({ where: { customerId: { in: importCustomerIds } } });
  await prisma.customer.deleteMany({ where: { id: { in: importCustomerIds } } });
  // Unit kembali available
  await prisma.unit.updateMany({ data: { status: "available" } });

  console.log("Mengimpor 19 order dari Notion…");

  // Nomor order mengikuti tanggal order masing-masing (ORD-YYYYMMDD-NNN)
  const perDay = new Map<string, number>();
  let idx = 0;

  for (const row of ROWS) {
    idx++;
    const meta = parseCatatan(row.catatan);

    // Customer: No. HP tidak ada di Notion → placeholder unik
    // Cari dulu berdasarkan nama untuk hindari duplikat (TOPA ×3, KEVIN ×3)
    const existing = await prisma.customer.findFirst({
      where: { name: { equals: row.nama } },
    });
    let phone = "";
    if (existing) {
      phone = existing.phone;
    } else {
      phone = `08900000${String(idx).padStart(2, "0")}`;
    }
    const customer = await prisma.customer.upsert({
      where: { phone },
      update: { name: row.nama },
      create: {
        name: row.nama,
        phone,
        notes: "No. HP tidak tercatat di Notion (placeholder) — mohon dilengkapi",
      },
    });
    // Produk dari nama kamera
    const sku = CAMERA_BY_NAME[row.kamera];
    if (!sku) throw new Error(`Kamera tidak terpetakan: ${row.kamera}`);
    const product = await prisma.product.findUniqueOrThrow({ where: { sku } });

    // Durasi: prioritas eksplisit (12 jam), else dari tanggal (min 1 jam)
    const explicitHours = meta.durasiJam;
    const spanHours = Math.max(
      1,
      Math.round((row.tanggalKembali.getTime() - row.tanggalSewa.getTime()) / 3_600_000)
    );
    const durationHours = explicitHours || spanHours;

    // Nomor order per tanggal sewa
    const ymd = `${row.tanggalSewa.getFullYear()}${String(row.tanggalSewa.getMonth() + 1).padStart(2, "0")}${String(row.tanggalSewa.getDate()).padStart(2, "0")}`;
    const n = (perDay.get(ymd) ?? 0) + 1;
    perDay.set(ymd, n);
    const orderNumber = `ORD-${ymd}-${String(n).padStart(3, "0")}`;

    const rescheduledFrom = (row as NotionRow & { rescheduled?: boolean }).rescheduled
      ? parseNotionDate("July 6, 2026", "13.00")
      : null;

    const courier = (row.gajiTransport ?? 0) > 0;
    const isFirda = row.nama === "FIRDA";

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        status: "completed",
        startDate: row.tanggalSewa,
        endDate: row.tanggalKembali,
        returnedAt: row.tanggalKembali,
        noteOrder: row.catatan,
        deliveryMode: courier || isFirda ? "courier" : "pickup",
        deliveryAddress: isFirda ? "Weleri" : courier ? "COD" : null,
        courierFee: row.gajiTransport ?? 0,
        guaranteeType: meta.jaminan ? "ktp" : null,
        rescheduledFrom,
        createdAt: row.tanggalSewa,
      },
    });

    // Item: harga total Notion dipakai langsung (sudah termasuk tier/durasi)
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: product.id,
        quantity: 1,
        durationHours,
        unitPrice: row.harga,
        subtotal: row.harga,
      },
    });

    // Semua order di Notion berstatus Lunas → buat pelunasan penuh otomatis
    // (nominal dari kolom Pelunasan Notion, fallback ke Harga)
    const amount = row.pelunasan ?? row.harga;
    if (amount > 0) {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          amount,
          paymentType: "pelunasan",
          method: mapMethod(row.metode),
          paidAt: row.tanggalKembali,
        },
      });
    }

    console.log(`  ${orderNumber} ${row.nama.padEnd(8)} ${product.name.padEnd(24)} ${durationHours}j Rp${row.harga.toLocaleString("id-ID")}${row.pelunasan ? " ✓lunas" : " —"}`);
  }

  const counts = {
    order: await prisma.order.count(),
    orderItem: await prisma.orderItem.count(),
    payment: await prisma.payment.count(),
    customer: await prisma.customer.count(),
  };
  console.log("Selesai:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
