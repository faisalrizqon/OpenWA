/**
 * Perbaikan data hasil impor Notion:
 * 1. Gabungkan pelanggan duplikat (nama sama, case-insensitive) → order di-link ke satu customer
 * 2. Pastikan tidak ada nomor HP duplikat
 * 3. Lunasi semua order yang masih ada sisa bayar (pelunasan penuh)
 *
 * Jalankan: npx tsx prisma/fix-data.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // --- 1. Gabung pelanggan duplikat berdasarkan nama ---
  const customers = await prisma.customer.findMany({ orderBy: { id: "asc" } });
  const byName = new Map<string, typeof customers>();
  for (const c of customers) {
    const key = c.name.trim().toLowerCase();
    const group = byName.get(key) ?? [];
    group.push(c);
    byName.set(key, group);
  }

  let merged = 0;
  for (const group of byName.values()) {
    if (group.length <= 1) continue;
    const keeper = group[0]; // id terkecil dipertahankan
    for (const dup of group.slice(1)) {
      await prisma.$transaction([
        prisma.order.updateMany({
          where: { customerId: dup.id },
          data: { customerId: keeper.id },
        }),
        prisma.document.updateMany({
          where: { customerId: dup.id },
          data: { customerId: keeper.id },
        }),
        prisma.customer.delete({ where: { id: dup.id } }),
      ]);
      merged++;
      console.log(`  Gabung: ${dup.name} #${dup.id} → #${keeper.id} (${keeper.name})`);
    }
  }
  console.log(`Pelanggan digabung: ${merged}`);

  // --- 2. Verifikasi nomor HP unik ---
  const all = await prisma.customer.findMany({ select: { id: true, name: true, phone: true } });
  const seenPhone = new Map<string, number>();
  for (const c of all) {
    if (seenPhone.has(c.phone)) {
      throw new Error(
        `Nomor HP duplikat ${c.phone}: customer #${seenPhone.get(c.phone)} dan #${c.id}`
      );
    }
    seenPhone.set(c.phone, c.id);
  }
  console.log(`Nomor HP unik: ${all.length}/${all.length} ✓`);

  // --- 3. Lunasi semua order yang belum lunas ---
  // Definisi "dibayar" sama dengan halaman detail order: dp + pelunasan + denda
  const orders = await prisma.order.findMany({ include: { items: true, payments: true } });
  let paidCount = 0;
  for (const o of orders) {
    const total = o.items.reduce((s, i) => s + i.subtotal, 0);
    const paid = o.payments
      .filter((p) => ["dp", "pelunasan", "denda"].includes(p.paymentType))
      .reduce((s, p) => s + p.amount, 0);
    const sisa = total - paid;
    if (sisa <= 0) continue;
    await prisma.payment.create({
      data: {
        orderId: o.id,
        amount: sisa,
        paymentType: "pelunasan",
        paidAt: o.returnedAt ?? o.endDate,
        note: "Pelunasan — data historis Notion (semua sudah lunas)",
      },
    });
    paidCount++;
    console.log(`  Lunas: ${o.orderNumber} +Rp${sisa.toLocaleString("id-ID")}`);
  }
  console.log(`Pelunasan dibuat: ${paidCount}`);

  // --- Ringkasan akhir ---
  const finalOrders = await prisma.order.findMany({ include: { items: true, payments: true } });
  let belumLunas = 0;
  for (const o of finalOrders) {
    const total = o.items.reduce((s, i) => s + i.subtotal, 0);
    const paid = o.payments
      .filter((p) => ["dp", "pelunasan", "denda"].includes(p.paymentType))
      .reduce((s, p) => s + p.amount, 0);
    if (total - paid > 0) belumLunas++;
  }
  console.log(`\nHasil: ${await prisma.customer.count()} customer, ${finalOrders.length} order, belum lunas: ${belumLunas}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
