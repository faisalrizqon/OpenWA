/**
 * Orkestrasi GoPay Merchant via HTTP Gateway (`gopay-gateway/`).
 *
 * Login OTP GoPay Merchant dilakukan SEKALI via terminal di sisi gateway
 * (`node login.js`); gateway menyimpan sesi + auto-refresh token tiap 6 jam.
 * MudahSewa tidak menyimpan token GoPay — hanya status fitur (gopayEnabled)
 * dan record pembayaran QRIS dinamis per order.
 *
 * Alur:
 * - `ensureGopayPaymentForOrder` → POST /create-qris (QRIS dinamis, nominal order)
 * - `settleGopayPayments` → POST /check-payment per pending payment
 *   (scope klaim = reference order, anti double-claim dipegang gateway)
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { createDynamicQris, verifyPayment, checkSessionStatus } from "@/lib/gopay-client";

/** Prefix reference payment → Order.id. */
export const ORDER_REF_PREFIX = "order:";

/** Data QRIS untuk panel pembayaran customer. */
export interface GopayPanelData {
  qrString: string;
  uniqueAmount: number;
  expiresAt: number;
  status: string;
}

/** Sesi GoPay aktif bila gateway online dan login terminal masih valid. */
export async function isGoPayAuthenticated(): Promise<boolean> {
  const result = await checkSessionStatus();
  return result.valid;
}

/**
 * Sinkronkan status gateway ke DB (dipakai tombol "Sinkronkan" di admin):
 * - gateway valid  → tulis GopaySession id=1 + gopayEnabled=true
 * - gateway offline/invalid → hapus sesi + gopayEnabled=false + batalkan pending
 */
export async function syncGopaySessionFromGateway(): Promise<{ valid: boolean; message: string }> {
  const status = await checkSessionStatus();

  if (status.valid) {
    await prisma.gopaySession.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        sessionJson: JSON.stringify({ source: "gopay-api-gateaway", valid: true }),
        merchantName: "GoPay Merchant (via gateway)",
        lastLoginAt: new Date(),
      },
      update: {
        sessionJson: JSON.stringify({ source: "gopay-api-gateaway", valid: true }),
        lastLoginAt: new Date(),
      },
    });
    await prisma.storeContent.update({ where: { id: 1 }, data: { gopayEnabled: true } });
  } else {
    await prisma.$transaction([
      prisma.gopaySession.deleteMany({ where: { id: 1 } }),
      prisma.storeContent.update({ where: { id: 1 }, data: { gopayEnabled: false } }),
      prisma.gopayPayment.updateMany({
        where: { status: "pending" },
        data: { status: "cancelled" },
      }),
    ]);
  }

  return status;
}

/** Ambil QRIS dinamis untuk order; buat baru bila belum ada / sudah expired. */
export async function ensureGopayPaymentForOrder(params: {
  orderId: string;
  amount: number;
}): Promise<GopayPanelData | null> {
  const amount = Math.round(params.amount);
  if (!Number.isInteger(amount) || amount <= 0) return null;

  const reference = `${ORDER_REF_PREFIX}${params.orderId}`;
  const existing = await prisma.gopayPayment.findFirst({
    where: { reference },
    orderBy: { createdAt: "desc" },
  });

  // Pakai ulang selama masih pending dan belum lewat masa berlaku.
  if (existing && existing.status === "pending" && existing.expiresAt.getTime() > Date.now()) {
    return {
      qrString: existing.qrString ?? "",
      uniqueAmount: Math.round(existing.uniqueAmount),
      expiresAt: existing.expiresAt.getTime(),
      status: existing.status,
    };
  }

  try {
    const qrisData = await createDynamicQris({ amount });

    await prisma.gopayPayment.create({
      data: {
        id: qrisData.qris_id,
        orderId: params.orderId,
        reference,
        scope: qrisData.trx_id, // trx_id gateway — scope klaim anti double-claim
        baseAmount: amount,
        uniqueOffset: 0,
        uniqueAmount: amount,
        status: "pending",
        qrString: qrisData.qris_code,
        expiresAt: new Date(qrisData.expires_at),
      },
    });

    return {
      qrString: qrisData.qris_code,
      uniqueAmount: amount,
      expiresAt: new Date(qrisData.expires_at).getTime(),
      status: "pending",
    };
  } catch (error) {
    console.error("[GoPay] Gagal membuat QRIS via gateway:", error);
    return null;
  }
}

/** Data panel untuk order (tanpa membuat payment baru). */
export async function getGopayPanelData(orderId: string): Promise<GopayPanelData | null> {
  const row = await prisma.gopayPayment.findFirst({
    where: { reference: `${ORDER_REF_PREFIX}${orderId}` },
    orderBy: { createdAt: "desc" },
  });
  if (!row || !row.qrString) return null;
  return {
    qrString: row.qrString,
    uniqueAmount: Math.round(row.uniqueAmount),
    expiresAt: row.expiresAt.getTime(),
    status: row.status,
  };
}

/** Jalankan satu siklus rekonsiliasi lalu lunasi order yang cocok. */
export async function settleGopayPayments(): Promise<{ paidCount: number }> {
  const now = Date.now();

  // 1. Tandai pending yang sudah lewat masa berlaku sebagai expired.
  await prisma.gopayPayment.updateMany({
    where: { status: "pending", expiresAt: { lt: new Date(now) } },
    data: { status: "expired" },
  });

  // 2. Verifikasi tiap pending payment yang masih hidup ke gateway.
  const pendingPayments = await prisma.gopayPayment.findMany({
    where: { status: "pending", reference: { startsWith: ORDER_REF_PREFIX } },
    orderBy: { createdAt: "asc" },
    take: 20, // batasi beban gateway per siklus
  });

  let paidCount = 0;
  for (const payment of pendingPayments) {
    const orderId = payment.reference?.slice(ORDER_REF_PREFIX.length);
    if (!orderId) continue;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.paymentStatus === "paid") continue;

    // Jendela feed mulai sedikit sebelum payment dibuat (toleransi indexing).
    const startTime = new Date(payment.createdAt.getTime() - 5 * 60 * 1000);
    const scopeId = payment.scope || payment.reference || payment.id;
    const transaction = await verifyPayment(Math.round(payment.uniqueAmount), startTime, scopeId);
    if (!transaction) continue;

    await prisma.$transaction([
      prisma.gopayPayment.update({
        where: { id: payment.id },
        data: {
          status: "paid",
          settledAt: transaction.transaction_time ? new Date(transaction.transaction_time) : new Date(now),
          transactionJson: JSON.stringify(transaction),
        },
      }),
      prisma.payment.create({
        data: {
          orderId,
          amount: Math.round(payment.uniqueAmount),
          paymentType: "pelunasan",
          method: "gopay",
          status: "confirmed",
          gatewayRef: payment.id,
          note: `QRIS GoPay dinamis — diverifikasi otomatis via gateway (${transaction.payer_issuer})`,
        },
      }),
      prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: "paid", paymentRef: payment.id },
      }),
    ]);
    paidCount += 1;

    revalidatePath(`/order-status/${order.orderNumber}`);
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/payments");
  }

  return { paidCount };
}
