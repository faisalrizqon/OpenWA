/**
 * Auto-send review request WhatsApp after order completion.
 * Dipanggil server action `submitReturn` setelah order berubah status → completed.
 *
 * Template pesan WA ada di `src/lib/wa.ts` (formatReviewRequestWA) — SATU sumber
 * kebenaran, jangan duplikasi string di sini (lihat AGENTS.md domain conventions).
 *
 * Tidak pernah melempar: kegagalan kirim WA tidak boleh menggagalkan proses return.
 */

import { sendMessage, phoneToChatId, logMessage, resolveSessionId } from "./openwa-api-client";
import { formatReviewRequestWA } from "./wa";

export async function sendReviewRequestWA(
  orderId: string,
  customerName: string,
  customerPhone: string,
  orderNumber: string
): Promise<void> {
  if (!customerPhone) return;

  const sessionId = await resolveSessionId();
  if (!sessionId) return; // OpenWA belum dikonfigurasi

  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const reviewUrl = `${baseUrl.replace(/\/+$/, "")}/portal/reviews`;

    const text = formatReviewRequestWA({ customerName, orderNumber, reviewUrl });
    const chatId = phoneToChatId(customerPhone);

    await logMessage({ sessionId, chatId, body: text.slice(0, 1000), status: "pending", orderId });
    await sendMessage(sessionId, { chatId, text });

    console.log(`[WhatsApp] Review request sent to ${customerPhone} for order ${orderNumber}`);
  } catch (error) {
    console.error("[review-request] gagal kirim WA:", error instanceof Error ? error.message : error);
    // Silent fail — bukan operasi kritis.
  }
}
