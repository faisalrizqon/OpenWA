/** Smoke test checkoutOrder — deterministik & self-cleaning.
 *  Jalankan: npx tsx scripts/smoke-checkout.ts
 *  (checkoutOrder tidak memanggil revalidatePath, jadi aman dijalankan di luar Next.) */
import { prisma } from "../src/lib/db";
import { checkoutOrder } from "../src/app/(shop)/actions/checkout";

const TEST_PHONES = ["089000000001", "089000000002", "089000000003"];

/** Ambil target redirect dari error NEXT_REDIRECT via narrowing runtime. */
function redirectTarget(e: unknown): string {
  if (e && typeof e === "object" && "digest" in e && typeof e.digest === "string") {
    return e.digest.split(";").find((p) => p.startsWith("/")) ?? "";
  }
  return "";
}

async function runCheckout(fields: Record<string, string>): Promise<string> {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  const loc = redirectTarget(await checkoutOrder(form).catch((e) => e));
  return loc;
}

/** Cari jendela 24 jam tanpa order aktif/booking untuk sebuah produk (maks 60 hari ke depan). */
async function findFreeWindow(productId: number, hours: number): Promise<Date> {
  for (let day = 1; day <= 60; day++) {
    const start = new Date();
    start.setDate(start.getDate() + day);
    start.setHours(10, 0, 0, 0);
    const end = new Date(start.getTime() + hours * 3600_000);
    const busy = await prisma.orderItem.count({
      where: {
        productId,
        order: {
          status: { in: ["booking", "active", "late"] },
          startDate: { lt: end },
          endDate: { gt: start },
        },
      },
    });
    if (busy === 0) return start;
  }
  throw new Error("Tidak menemukan jendela kosong 60 hari ke depan");
}

const createdOrderIds: string[] = [];

async function cleanup() {
  if (createdOrderIds.length > 0) {
    await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
    console.log(`Cleanup: ${createdOrderIds.length} order test dihapus`);
  }
  await prisma.customer.deleteMany({ where: { phone: { in: TEST_PHONES } } });
  console.log("Cleanup: customer test dihapus");
}

function makeFields(start: Date, overrides: Record<string, string>): Record<string, string> {
  return {
    items: JSON.stringify([{ productId: 1, quantity: 1, durationHours: 24 }]),
    startDate: start.toISOString(),
    name: "Smoke Tester",
    phone: TEST_PHONES[0],
    email: "smoke@test.id",
    address: "Jl. Smoke No 1",
    note: "smoke test otomatis",
    deliveryMode: "pickup",
    paymentMethod: "qris",
    ...overrides,
  };
}

async function main() {
  const product = await prisma.product.findUnique({ where: { id: 1 }, include: { units: true } });
  if (!product) throw new Error("Produk id=1 tidak ada; jalankan seed dulu");
  const unitCount = product.units.filter((u) => !["maintenance", "lost"].includes(u.status)).length;
  console.log(`Produk: ${product.name} (${unitCount} unit aktif)`);

  const windowA = await findFreeWindow(1, 24);
  const windowB = new Date(windowA.getTime() + 25 * 3600_000); // setelah window A selesai
  console.log(`Jendela A: ${windowA.toISOString()} | Jendela B: ${windowB.toISOString()}`);

  // 1) Checkout QRIS
  const locQris = await runCheckout(makeFields(windowA, {}));
  const qrisNumber = locQris.split("/payment/")[1];
  if (!qrisNumber) throw new Error(`Checkout QRIS gagal -> ${locQris}`);
  const qrisOrder = await prisma.order.findUnique({ where: { orderNumber: qrisNumber } });
  if (!qrisOrder) throw new Error("Order QRIS tidak ada di DB");
  createdOrderIds.push(qrisOrder.id);
  if (qrisOrder.source !== "online") throw new Error("source harus online");
  if (qrisOrder.paymentMethod !== "qris") throw new Error("paymentMethod harus qris");
  if (qrisOrder.paymentStatus !== "unpaid") throw new Error("paymentStatus awal harus unpaid");
  if (qrisOrder.status !== "booking") throw new Error("status order harus booking");
  console.log(`✔ Order QRIS ${qrisOrder.orderNumber} (source=online, booking, unpaid)`);

  // Harga tier terkunci di order item (harga dihitung server, bukan client)
  const item = await prisma.orderItem.findFirst({ where: { orderId: qrisOrder.id } });
  if (!item || item.unitPrice <= 0 || item.subtotal !== item.unitPrice) {
    throw new Error("Harga item tidak terkunci dengan benar");
  }
  console.log(`✔ Harga tier terkunci: unitPrice=${item.unitPrice}, subtotal=${item.subtotal}`);

  // 2) Checkout cash di jendela berbeda
  const locCash = await runCheckout(
    makeFields(windowB, { paymentMethod: "cash", phone: TEST_PHONES[1], name: "Cash Tester" })
  );
  const cashNumber = locCash.split("/payment/")[1];
  if (!cashNumber) throw new Error(`Checkout cash gagal -> ${locCash}`);
  const cashOrder = await prisma.order.findUnique({ where: { orderNumber: cashNumber } });
  if (!cashOrder || cashOrder.paymentMethod !== "cash") throw new Error("Order cash gagal");
  createdOrderIds.push(cashOrder.id);
  console.log(`✔ Order Cash ${cashOrder.orderNumber} (method=cash)`);

  // 3) Stok dijaga: pesan melebihi sisa unit di jendela A -> ditolak
  const locOverflow = await runCheckout(
    makeFields(windowA, {
      phone: TEST_PHONES[2],
      name: "Overflow",
      items: JSON.stringify([{ productId: 1, quantity: unitCount + 5, durationHours: 24 }]),
    })
  );
  if (locOverflow.startsWith("/payment/")) throw new Error("Order melebihi stok seharusnya ditolak");
  if (!locOverflow.startsWith("/checkout?error=")) throw new Error(`Overflow arah salah: ${locOverflow}`);
  console.log(`✔ Stok dijaga: qty ${unitCount + 5} (unit ${unitCount}, 1 sudah dibooking) -> ditolak`);

  // 4) Midtrans tanpa key -> tidak bisa dipilih (fallback validasi server)
  const locMidtrans = await runCheckout(
    makeFields(windowB, { paymentMethod: "midtrans", phone: TEST_PHONES[2], name: "Midtrans Tester" })
  );
  if (!locMidtrans.startsWith("/checkout?error=invalid")) {
    throw new Error(`Midtrans tanpa key harus ditolak, dapat: ${locMidtrans}`);
  }
  console.log("✔ Midtrans tanpa API key ditolak dengan benar");

  console.log("\nSMOKE TEST CHECKOUT: SEMUA LULUS ✔");
}

main()
  .catch((e) => {
    console.error("\nSMOKE TEST GAGAL:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup().catch((e) => console.error("Cleanup gagal:", e));
    await prisma.$disconnect();
  });
