"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { countOverlapUnits } from "@/lib/availability";
import { calcSubtotal, getTierPrice } from "@/lib/pricing";
import { nextOrderNumber } from "@/lib/orderNumber";
import {
  createMidtransTransaction,
  midtransConfigured,
  type PaymentMethod,
} from "@/lib/payment";

interface CheckoutItemInput {
  productId: number;
  quantity: number;
  durationHours: number;
}

const PHONE_RE = /^0\d{8,13}$/;

function parseCheckoutItems(raw: string): CheckoutItemInput[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const items = parsed as CheckoutItemInput[];
    const valid = items.every(
      (it) =>
        Number.isInteger(it.productId) &&
        it.productId > 0 &&
        Number.isInteger(it.quantity) &&
        it.quantity > 0 &&
        Number.isInteger(it.durationHours) &&
        it.durationHours > 0
    );
    return valid ? items : null;
  } catch {
    return null;
  }
}

/** Checkout customer dari katalog: buat Order (status booking, source online). */
export async function checkoutOrder(formData: FormData) {
  const back = "/checkout?error=invalid";

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const startDateRaw = String(formData.get("startDate") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const deliveryMode = String(formData.get("deliveryMode") ?? "pickup") === "courier" ? "courier" : "pickup";
  const methodRaw = String(formData.get("paymentMethod") ?? "cash").trim();

  const items = parseCheckoutItems(String(formData.get("items") ?? "[]"));
  const startDate = new Date(startDateRaw);
  const paymentMethod: PaymentMethod = ["cash", "qris", "midtrans"].includes(methodRaw)
    ? (methodRaw as PaymentMethod)
    : "cash";

  if (!items || isNaN(startDate.getTime()) || name.length < 2 || !PHONE_RE.test(phone)) {
    redirect(back);
  }
  // Midtrans hanya boleh dipilih kalau memang dikonfigurasi
  if (paymentMethod === "midtrans" && !midtransConfigured()) {
    redirect(back);
  }

  let orderId: string;
  let orderNumber: string;
  let total: number;

  try {
    ({ orderId, orderNumber, total } = await prisma.$transaction(async (tx) => {
      // 1) Upsert customer by phone (tolak blacklist)
      const customer = await tx.customer.upsert({
        where: { phone },
        update: {
          name,
          ...(email ? { email } : {}),
          ...(address ? { address } : {}),
        },
        create: { name, phone, ...(email ? { email } : {}), ...(address ? { address } : {}) },
      });
      if (customer.isBlacklisted) throw new Error("Mohon maaf, akun Anda tidak dapat melakukan pemesanan.");

      // 2) Kunci harga tier dari server + cek stok
      const maxDuration = Math.max(...items.map((it) => it.durationHours));
      const endDate = new Date(startDate.getTime() + maxDuration * 3600_000);
      const productIds = Array.from(new Set(items.map((it) => it.productId)));

      const pricedItems: (CheckoutItemInput & { unitPrice: number; name: string; sku: string })[] = [];
      for (const it of items) {
        const product = await tx.product.findUnique({ where: { id: it.productId } });
        if (!product || !product.active) throw new Error("Produk tidak tersedia");
        const unitPrice = getTierPrice(product, it.durationHours);
        if (unitPrice <= 0) throw new Error(`Harga belum diatur untuk ${product.name}`);
        pricedItems.push({ ...it, unitPrice, name: product.name, sku: product.sku });
      }

      for (const pid of productIds) {
        const [totalUnits, busyItems] = await Promise.all([
          tx.unit.count({ where: { productId: pid, status: { notIn: ["maintenance", "lost"] } } }),
          tx.orderItem.findMany({
            where: {
              productId: pid,
              order: {
                status: { in: ["booking", "active", "late"] },
                startDate: { lt: endDate },
                endDate: { gt: startDate },
              },
            },
            select: {
              quantity: true,
              order: { select: { status: true, startDate: true, endDate: true } },
            },
          }),
        ]);
        const busy = countOverlapUnits(
          pid,
          startDate,
          endDate,
          busyItems.map((b) => ({
            status: b.order.status,
            startDate: b.order.startDate,
            endDate: b.order.endDate,
            productId: pid,
            quantity: b.quantity,
          }))
        );
        const needed = items.filter((it) => it.productId === pid).reduce((s, it) => s + it.quantity, 0);
        if (needed > totalUnits - busy) {
          throw new Error("Maaf, stok tidak tersedia untuk tanggal tersebut. Silakan pilih tanggal lain.");
        }
      }

      // 3) Nomor order
      const now = new Date();
      const localStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const localEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const todayCount = await tx.order.count({
        where: { createdAt: { gte: localStart, lt: localEnd } },
      });
      const orderNumber = nextOrderNumber(todayCount, now);

      // 4) Order + items
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          status: "booking",
          source: "online",
          paymentMethod,
          paymentStatus: "unpaid",
          startDate,
          endDate,
          noteOrder: note || null,
          deliveryMode,
          deliveryAddress: deliveryMode === "courier" ? address || null : null,
        },
      });

      let total = 0;
      for (const it of pricedItems) {
        const subtotal = calcSubtotal({ unitPrice: it.unitPrice, quantity: it.quantity });
        total += subtotal;
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: it.productId,
            quantity: it.quantity,
            durationHours: it.durationHours,
            unitPrice: it.unitPrice,
            subtotal,
          },
        });
      }

      return { orderId: order.id, orderNumber, total };
    }));
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    const msg = e instanceof Error ? e.message : "Gagal membuat pesanan";
    redirect(`/checkout?error=${encodeURIComponent(msg)}`);
  }

  // Midtrans: buat transaksi Snap lalu arahkan customer ke halaman pembayaran
  if (paymentMethod === "midtrans") {
    try {
      const orderItems = await prisma.orderItem.findMany({
        where: { orderId },
        include: { product: { select: { name: true, sku: true } } },
      });
      const { token } = await createMidtransTransaction({
        orderId: orderNumber,
        grossAmount: total,
        customerName: name,
        customerPhone: phone,
        customerEmail: email || undefined,
        itemDetails: orderItems.map((it) => ({
          id: it.product.sku,
          price: it.unitPrice,
          quantity: it.quantity,
          name: `${it.product.name} (${it.durationHours} jam)`,
        })),
      });
      await prisma.order.update({
        where: { id: orderId },
        data: { paymentRef: token, paymentStatus: "pending" },
      });
    } catch (e) {
      // Gateway gagal -> order tetap dibuat, arahkan ke halaman pembayaran
      // (admin bisa follow-up); jangan gagalkan checkout.
      if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    }
    redirect(`/payment/${orderNumber}`);
  }

  redirect(`/payment/${orderNumber}`);
}

const PROOF_MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Customer upload bukti transfer/QRIS statis. */
export async function submitPaymentProof(formData: FormData) {
  const orderNumber = String(formData.get("orderNumber") ?? "").trim();
  const back = `/payment/${orderNumber}`;
  if (!orderNumber) redirect(back);

  const file = formData.get("proof");
  if (!(file instanceof File) || file.size === 0) redirect(`${back}?error=nofile`);
  const ext = PROOF_MIME_EXT[file.type];
  if (!ext || file.size > 5 * 1024 * 1024) redirect(`${back}?error=file`);

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { payments: { orderBy: { paidAt: "asc" } } },
  });
  if (!order) redirect(back);

  // Hitung total order untuk jumlah pada record pembayaran
  const items = await prisma.orderItem.findMany({ where: { orderId: order.id } });
  const total = items.reduce((s, it) => s + it.subtotal, 0);

  const dir = path.join(process.cwd(), "public", "uploads", "payment");
  await mkdir(dir, { recursive: true });
  const fileName = `${order.orderNumber}-${Date.now()}.${ext}`;
  await writeFile(path.join(dir, fileName), Buffer.from(await file.arrayBuffer()));

  await prisma.$transaction([
    prisma.payment.create({
      data: {
        orderId: order.id,
        amount: total,
        paymentType: "pelunasan",
        method: order.paymentMethod ?? "qris",
        status: "pending",
        proofPath: `/uploads/payment/${fileName}`,
        note: "Bukti bayar dari customer (menunggu verifikasi)",
      },
    }),
    prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "pending" },
    }),
  ]);

  revalidatePath(`/payment/${orderNumber}`);
  revalidatePath(`/orders`);
  redirect(`${back}?proof=uploaded`);
}

/** Admin: konfirmasi pembayaran online yang masih pending (bukti QRIS / Midtrans manual). */
export async function confirmOnlinePayment(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");
  const back = `/orders/${orderId}`;
  if (!orderId) redirect(back);

  await prisma.$transaction([
    prisma.payment.updateMany({
      where: { orderId, status: "pending" },
      data: { status: "confirmed", note: "Dikonfirmasi admin" },
    }),
    prisma.order.update({ where: { id: orderId }, data: { paymentStatus: "paid" } }),
  ]);

  revalidatePath(back);
  revalidatePath("/orders");
  revalidatePath("/");
  redirect(back);
}
