import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { mapMidtransStatus } from "@/lib/payment";

export const runtime = "nodejs";

interface MidtransNotification {
  order_id: string;
  status_code: string;
  transaction_status: string;
  transaction_id?: string;
  gross_amount?: string;
  signature_key?: string;
  payment_type?: string;
}

/** Verifikasi signature Midtrans: SHA512(order_id + status_code + gross_amount + ServerKey). */
function verifySignature(body: MidtransNotification): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey || !body.signature_key) return false;
  const raw = `${body.order_id}${body.status_code}${body.gross_amount ?? ""}${serverKey}`;
  const digest = createHash("sha512").update(raw).digest("hex");
  return digest === body.signature_key;
}

export async function POST(request: Request) {
  if (!process.env.MIDTRANS_SERVER_KEY) {
    return Response.json({ ok: false, error: "midtrans_not_configured" }, { status: 400 });
  }

  let body: MidtransNotification;
  try {
    body = (await request.json()) as MidtransNotification;
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.order_id || !body.transaction_status || !body.status_code) {
    return Response.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }
  if (!verifySignature(body)) {
    return Response.json({ ok: false, error: "invalid_signature" }, { status: 403 });
  }

  const order = await prisma.order.findUnique({ where: { orderNumber: body.order_id } });
  if (!order) {
    return Response.json({ ok: false, error: "order_not_found" }, { status: 404 });
  }

  const status = mapMidtransStatus(body.transaction_status);
  const amount = Number(body.gross_amount) || 0;

  if (status === "paid") {
    const existing = body.transaction_id
      ? await prisma.payment.findFirst({ where: { gatewayRef: body.transaction_id } })
      : null;
    if (!existing) {
      await prisma.payment.create({
        data: {
          orderId: order.id,
          amount,
          paymentType: "pelunasan",
          method: "midtrans",
          status: "confirmed",
          gatewayRef: body.transaction_id ?? null,
          note: `Midtrans ${body.payment_type ?? ""} — ${body.transaction_status}`.trim(),
        },
      });
    }
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "paid", paymentRef: body.transaction_id ?? order.paymentRef },
    });
  } else if (status === "pending") {
    await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "pending" } });
  } else if (status === "refunded") {
    await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "refunded" } });
  } else {
    await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "unpaid" } });
  }

  revalidatePath(`/order-status/${order.orderNumber}`);
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${order.id}`);
  revalidatePath("/admin");

  return Response.json({ ok: true });
}
