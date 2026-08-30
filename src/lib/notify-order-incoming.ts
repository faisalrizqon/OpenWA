import { prisma } from "@/lib/db";
import { sendMessage, logMessage, phoneToChatId } from "./openwa-api-client";
import { resolveSessionId } from "./openwa-api-client";
import { getReminderSettings, parseAdminPhones, isValidPhone } from "./reminders/config";
import { formatOrderIncomingWA, formatOrderReceivedWA, type OrderIncomingInput } from "./wa";

/** Kirim notifikasi pesanan baru — admin dan/atau customer berdasarkan
 *  pengaturan tab Reminder (orderIncoming). Dipanggil setelah order dibuat
 *  (checkout online & form admin) dan saat order pending diterima admin.
 *  Tidak pernah melempar: kegagalan kirim tidak boleh menggagalkan order. */
export async function notifyOrderIncoming(orderId: string): Promise<{ sentToAdmin: boolean; sentToCustomer: boolean }> {
  const result = { sentToAdmin: false, sentToCustomer: false };

  try {
    const [settings, sessionId] = await Promise.all([getReminderSettings(), resolveSessionId()]);
    if (!sessionId || !settings.orderIncoming.enabled) return result;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true, items: { include: { product: { select: { name: true } } } } },
    });
    if (!order || !order.customer?.phone) return result;

    const subtotal = order.items.reduce((sum, it) => sum + Number(it.subtotal ?? 0), 0);
    const input: OrderIncomingInput = {
      orderNumber: order.orderNumber,
      customerName: order.customer.name,
      customerPhone: order.customer.phone,
      source: order.source,
      deliveryMode: order.deliveryMode ?? "pickup",
      items: order.items.map((i) => i.product.name),
      startDate: order.startDate,
      endDate: order.endDate,
      total: subtotal,
      paymentMethod: order.paymentMethod ?? null,
    };

    // --- Notif admin: ringkasan order masuk ke semua nomor admin valid ---
    if (settings.orderIncoming.toAdmin) {
      const adminPhones = parseAdminPhones(settings.adminPhones).filter(isValidPhone);
      if (adminPhones.length > 0) {
        const text = formatOrderIncomingWA(input);
        for (const phone of adminPhones) {
          const chatId = phoneToChatId(phone);
          await logMessage({ sessionId, chatId, body: text.slice(0, 1000), status: "pending", orderId });
          const r = await sendMessage(sessionId, { chatId, text });
          if (r.ok) result.sentToAdmin = true;
        }
      }
    }

    // --- Konfirmasi customer: pesanan diterima ---
    if (settings.orderIncoming.toCustomer) {
      const text = formatOrderReceivedWA(input);
      const chatId = phoneToChatId(order.customer.phone);
      await logMessage({ sessionId, chatId, body: text.slice(0, 1000), status: "pending", orderId });
      const r = await sendMessage(sessionId, { chatId, text });
      if (r.ok) result.sentToCustomer = true;
    }
  } catch (error) {
    console.error("[order-notify] gagal:", error instanceof Error ? error.message : error);
  }

  return result;
}
