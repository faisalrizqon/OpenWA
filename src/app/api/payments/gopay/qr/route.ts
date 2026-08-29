/**
 * GET /api/payments/gopay/qr?orderNumber=XXX
 *
 * Endpoint tunggal untuk panel GoPayQrisPanel (client):
 * - Menjalankan satu siklus rekonsiliasi (tick) — murah karena dibatasi
 *   jumlah order pending.
 * - Mengambil/membuat QRIS dinamis per order (unique amount).
 * - Mengembalikan status pembayaran terkini.
 *
 * Publik (tanpa auth): customer sudah memegang orderNumber; respons tidak
 * memuat data sensitif (hanya payload QRIS milik order itu).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureGopayPaymentForOrder, getGopayPanelData, settleGopayPayments } from "@/lib/gopay-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const orderNumber = request.nextUrl.searchParams.get("orderNumber")?.trim();
  if (!orderNumber) {
    return NextResponse.json({ error: "orderNumber wajib diisi" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: { items: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
  }

  // Rekonsiliasi dulu: pembayaran yang baru masuk feed langsung melunasi order.
  await settleGopayPayments();

  if (order.paymentStatus === "paid") {
    return NextResponse.json({ status: "paid" });
  }
  if (order.paymentStatus === "refunded" || order.status === "cancelled") {
    return NextResponse.json({ status: "closed" });
  }

  const grandTotal =
    order.items.reduce((sum, item) => sum + item.subtotal, 0) +
    order.courierFee +
    order.tipAmount;

  // Ambil QRIS yang ada, atau buat baru bila belum / sudah expired.
  const panel =
    (await getGopayPanelData(order.id)) ??
    (await ensureGopayPaymentForOrder({ orderId: order.id, amount: grandTotal }));

  if (!panel || !panel.qrString) {
    return NextResponse.json({ status: "unavailable" });
  }

  // QRIS yang sudah expired/cancelled diganti otomatis oleh ensure di atas;
  // bila status akhirnya bukan pending, laporkan apa adanya.
  return NextResponse.json({
    status: panel.status === "paid" ? "paid" : panel.status,
    qrString: panel.qrString,
    uniqueAmount: panel.uniqueAmount,
    expiresAt: panel.expiresAt,
  });
}
