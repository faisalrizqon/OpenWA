"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin, requireMitraOrAdmin } from "@/lib/permissions";
import { compressImage } from "@/lib/image";
import { logAudit } from "@/lib/audit";
import { sendMessage, phoneToChatId, logMessage } from "@/lib/openwa-api-client";

const PANEL = "/admin/payments";
const TAB_CONFIG = `${PANEL}?tab=config`;

/** Admin/mitra setujui pembayaran yang menunggu verifikasi (bukti transfer/QRIS).
 *  Menandai order lunas ("paid") hanya bila total pembayaran terkonfirmasi menutup
 *  total order; jika baru sebagian -> "partial". */
export async function approvePayment(formData: FormData) {
  const user = await requireMitraOrAdmin();
  const paymentId = String(formData.get("paymentId") ?? "");
  if (!paymentId) redirect(PANEL);

  const payment = await prisma.payment.findUnique({ where: { id: Number(paymentId) } });
  if (!payment || payment.status !== "pending") redirect(PANEL);

  const order = await prisma.order.findUnique({
    where: { id: payment.orderId },
    include: { items: true },
  });
  if (!order) redirect(PANEL);

  await prisma.$transaction(async (tx) => {
    // 1) Konfirmasi pembayaran ini dulu.
    await tx.payment.update({
      where: { id: Number(paymentId) },
      data: { status: "confirmed", note: "Dikonfirmasi admin" },
    });

    // 2) Hitung total yang sudah terkonfirmasi (termasuk yang barusan dikonfirmasi).
    const sum = await tx.payment.aggregate({
      where: { orderId: payment.orderId, status: "confirmed" },
      _sum: { amount: true },
    });
    const totalPaid = sum._sum.amount ?? 0;

    // 3) Bandingkan dengan total order -> tentukan status pembayaran order.
    const itemsSubtotal = order.items.reduce((s, it) => s + it.subtotal, 0);
    const orderTotal =
      itemsSubtotal - (order.promoDiscount ?? 0) + (order.courierFee ?? 0) + (order.tipAmount ?? 0);
    const paymentStatus: typeof order.paymentStatus =
      totalPaid >= orderTotal ? "paid" : totalPaid > 0 ? "partial" : "pending";

    await tx.order.update({
      where: { id: payment.orderId },
      data: { paymentStatus },
    });

    await logAudit(tx, {
      entityType: "payment",
      entityId: String(payment.id),
      action: "update",
      summary: `Pembayaran dikonfirmasi admin untuk Order ${order.orderNumber}`,
      userId: user.id,
      detail: {
        paymentId: payment.id,
        orderNumber: order.orderNumber,
        amount: payment.amount,
        totalPaid,
        orderTotal,
        paymentStatus,
      },
    });
  });

  revalidatePath(PANEL);
  revalidatePath(`/admin/orders/${payment.orderId}`);
  revalidatePath("/admin/orders");
  redirect(`${PANEL}?approved=1`);
}

/** Admin menolak bukti pembayaran (tidak valid / salah) — customer bisa upload ulang. */
export async function rejectPayment(formData: FormData) {
  const user = await requireAdmin();
  const paymentId = String(formData.get("paymentId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!paymentId) redirect(PANEL);

  const payment = await prisma.payment.findUnique({ where: { id: Number(paymentId) } });
  if (!payment || payment.status !== "pending") redirect(PANEL);

  const order = await prisma.order.findUnique({
    where: { id: payment.orderId },
    include: { customer: true, items: true },
  });
  if (!order) redirect(PANEL);

  await prisma.$transaction(async (tx) => {
    // 1) Tolak pembayaran.
    await tx.payment.update({
      where: { id: Number(paymentId) },
      data: { status: "failed", note: reason ? `Ditolak admin: ${reason}` : "Ditolak admin" },
    });

    // 2) Kembalikan order ke unpaid supaya customer bisa upload bukti baru.
    await tx.order.update({
      where: { id: payment.orderId },
      data: { paymentStatus: "unpaid" },
    });

    await logAudit(tx, {
      entityType: "payment",
      entityId: String(payment.id),
      action: "update",
      summary: `Pembayaran ditolak admin: ${reason || "tidak ada alasan"}`,
      userId: user.id,
      detail: { paymentId: payment.id, orderNumber: order.orderNumber, reason },
    });
  });

  // Send WhatsApp outside transaction (network I/O shouldn't hold DB connection)
  if (process.env.OPENWA_API_KEY && process.env.OPENWA_SESSION_ID && order.customer?.phone) {
    try {
      const chatId = phoneToChatId(order.customer.phone);
      const message = `Halo ${order.customer.name},\n\nPembayaran untuk Order *${order.orderNumber}* belum dapat kami konfirmasi:\n\n📝 Alasan: ${reason || "Tidak disebutkan"}\n\nSilakan upload bukti pembayaran baru melalui halaman status pesanan Anda atau hubungi admin untuk klarifikasi.\n\nTerima kasih!`;

      await logMessage({ sessionId: process.env.OPENWA_SESSION_ID!, chatId, body: message, status: "pending", orderId: order.id });
      await sendMessage(process.env.OPENWA_SESSION_ID!, { chatId, text: message });

      console.log(`[WhatsApp] Rejection notice sent to ${order.customer.phone} for order ${order.orderNumber}`);
    } catch (error) {
      console.error(`[WhatsApp] Failed to send rejection notice to ${order.customer.phone}:`, error instanceof Error ? error.message : error);
      // Don't throw — rejection still valid in DB
    }
  }

  revalidatePath(PANEL);
  revalidatePath(`/admin/orders/${payment.orderId}`);
  revalidatePath("/admin/orders");
  redirect(`${PANEL}?rejected=1`);
}

/** Batas ukuran gambar QRIS yang diupload (5 MB). */
const QRIS_MAX_BYTES = 5 * 1024 * 1024;

/** Konfigurasi metode pembayaran: toggle metode aktif + data QRIS & rekening.
 *  Checkbox yang tidak dicentang tidak ikut FormData -> dianggap false.
 *  Gambar QRIS diupload sebagai PNG — disimpan di /public/uploads/qris/ dengan
 *  nama ber-timestamp, bukan path statis /qris.png. */
export async function updatePaymentSettings(formData: FormData) {
  const _user = await requireAdmin();

  const cashEnabled = formData.get("cashEnabled") === "on";
  const qrisEnabled = formData.get("qrisEnabled") === "on";
  const transferEnabled = formData.get("transferEnabled") === "on";
  const transferBankName = String(formData.get("transferBankName") ?? "").trim();
  const transferAccountNumber = String(formData.get("transferAccountNumber") ?? "")
    .trim()
    .replace(/\D/g, "");
  const transferAccountHolder = String(formData.get("transferAccountHolder") ?? "").trim();
  let qrisImagePath = String(formData.get("qrisImagePath") ?? "").trim();
  const qrisMerchantName = String(formData.get("qrisMerchantName") ?? "").trim();

  // Upload gambar QRIS baru (PNG saja) bila admin melampirkan file
  const file = formData.get("qrisImage");
  if (file instanceof File && file.size > 0) {
    if (file.type !== "image/png") {
      redirect(`${TAB_CONFIG}&error=qris-format`);
    }
    if (file.size > QRIS_MAX_BYTES) {
      redirect(`${TAB_CONFIG}&error=qris-size`);
    }
    // QRIS harus tetap PNG tajam: kompresi lossless saja; kalau masih
    // > 3 MB disimpan apa adanya (keepPng). File ≤ 3 MB tidak disentuh.
    const image = await compressImage(Buffer.from(await file.arrayBuffer()), file.type, { keepPng: true });
    const dir = path.join(process.cwd(), "public", "uploads", "qris");
    await mkdir(dir, { recursive: true });
    const fileName = `qris-${Date.now()}.${image.ext}`;
    await writeFile(path.join(dir, fileName), image.buffer);
    qrisImagePath = `/uploads/qris/${fileName}`;
  }

  // Transfer aktif harus punya data rekening lengkap
  if (transferEnabled && (!transferBankName || !transferAccountNumber || !transferAccountHolder)) {
    redirect(`${TAB_CONFIG}&error=invalid`);
  }
  // Minimal satu metode pembayaran aktif
  if (!cashEnabled && !qrisEnabled && !transferEnabled) {
    redirect(`${TAB_CONFIG}&error=none`);
  }

  try {
    await prisma.storeContent.upsert({
      where: { id: 1 },
      update: {
        cashEnabled,
        qrisEnabled,
        transferEnabled,
        gopayEnabled: false, // Gopay enabled via GoPay Merchant login, not here
        transferBankName,
        transferAccountNumber,
        transferAccountHolder,
        qrisImagePath,
        qrisMerchantName: qrisMerchantName || "MudahSewa",
      },
      create: {
        id: 1,
        cashEnabled,
        qrisEnabled,
        transferEnabled,
        gopayEnabled: false,
        transferBankName,
        transferAccountNumber,
        transferAccountHolder,
        qrisImagePath,
        qrisMerchantName: qrisMerchantName || "MudahSewa",
      },
    });
  } catch {
    redirect(`${TAB_CONFIG}&error=invalid`);
  }

  // Konfigurasi memengaruhi halaman checkout/payment publik
  revalidatePath("/", "layout");
  revalidatePath(PANEL);
  redirect(`${TAB_CONFIG}&saved=1`);
}
