/**
 * Server actions untuk GoPay Merchant — via gateway `gopay-gateway/`
 * (fork ahmadzakiyox/gopay-api-gateaway).
 *
 * Login OTP GoPay Merchant TIDAK dilakukan dari sini: dijalankan SEKALI
 * lewat terminal di sisi gateway (`node login.js`). Gateway menyimpan sesi
 * dan me-refresh token otomatis tiap 6 jam.
 *
 * Actions di sini:
 * - syncGopaySession — tarik status gateway → GopaySession + toggle gopayEnabled
 * - logoutGopay      — putus dari sisi MudahSewa (hapus sesi + batalkan pending)
 * - runGopaySettle   — satu siklus rekonsiliasi manual (tombol "Cek Sekarang")
 */

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { settleGopayPayments, syncGopaySessionFromGateway } from "@/lib/gopay-server";

const PANEL = "/admin/payments";
const TAB_CONFIG = `${PANEL}?tab=config`;

export interface GopaySyncState {
  message?: string;
  error?: string;
}

/** Sinkronkan status gateway ke DB; aktifkan/nonaktifkan metode GoPay. */
export async function syncGopaySession(_prev: GopaySyncState, _formData: FormData): Promise<GopaySyncState> {
  const user = await requireAdmin();

  const status = await syncGopaySessionFromGateway();
  revalidatePath(PANEL);

  await logAudit(prisma, {
    entityType: "settings",
    entityId: "gopay",
    action: "update",
    summary: status.valid
      ? "Sesi gateway GoPay Merchant valid — metode GoPay diaktifkan"
      : "Sesi gateway GoPay tidak valid — metode GoPay dinonaktifkan",
    userId: user.id,
  });

  if (status.valid) {
    return { message: "✅ Gateway GoPay terhubung — metode GoPay QRIS aktif." };
  }
  return {
    error: `Gateway belum terhubung: ${status.message} Jalankan \`node login.js\` di server gateway lalu tekan sinkron lagi.`,
  };
}

/** Logout: hapus sesi GoPay Merchant + nonaktifkan metode GoPay (sisi MudahSewa). */
export async function logoutGopay(_formData: FormData): Promise<void> {
  const user = await requireAdmin();

  await prisma.$transaction([
    prisma.gopaySession.deleteMany({ where: { id: 1 } }),
    prisma.storeContent.update({ where: { id: 1 }, data: { gopayEnabled: false } }),
    prisma.gopayPayment.updateMany({
      where: { status: "pending" },
      data: { status: "cancelled" },
    }),
  ]);

  await logAudit(prisma, {
    entityType: "settings",
    entityId: "gopay",
    action: "update",
    summary: "GoPay Merchant diputus dari MudahSewa; metode dinonaktifkan",
    userId: user.id,
  });

  revalidatePath(PANEL);
  redirect(`${TAB_CONFIG}&loggedout=1`);
}

/** Jalankan satu siklus rekonsiliasi manual (dipakai tombol cek di admin). */
export async function runGopaySettle(_formData: FormData): Promise<void> {
  await requireAdmin();
  const { paidCount } = await settleGopayPayments();
  revalidatePath(PANEL);
  redirect(`${TAB_CONFIG}&settled=${paidCount}`);
}
