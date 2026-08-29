/**
 * WhatsApp Integration Hooks
 * Auto-notifications untuk order/payment events via OpenWA
 */

import { prisma } from "@/lib/db";
import { sendMessage, formatWhatsAppPhone, phoneToChatId, logMessage } from "./openwa-api-client";

interface WhatsappConfig {
  enabled: boolean;
  sessionId: string;
}

/** Check if WhatsApp integration is active */
export function isWhatsappEnabled(): boolean {
  return Boolean(process.env.OPENWA_API_KEY && process.env.OPENWA_SESSION_ID);
}

/** 
 * Send booking confirmation after order created (online checkout)
 */
export async function sendBookingConfirmation(orderId: string): Promise<void> {
  if (!isWhatsappEnabled()) return;
  
  const config = getOpenWAConfig();
  
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        items: { include: { product: { select: { name: true } } } }
      }
    });

    if (!order || !order.customer?.phone) return;
    
    // Build message
    const itemNames = order.items.map(i => i.product.name).join(', ');
    const message = `*PESANAN BERHASIL!* 🎉\n\n` +
      `Terima kasih sudah pesan di MudahSewa!\n\n` +
      `*Order #${order.orderNumber}*\n` +
      `Items:\n${order.items.map(i => `- ${i.product.name}`).join('\n')}\n\n` +
      `📅 Jadwal sewa:\n` +
      `Mulai: ${formatDate(order.startDate)}\n` +
      `Selesai: ${formatDate(order.endDate)}\n\n` +
      `Silakan upload bukti pembayaran ke portal atau chat admin.\n\n` +
      `Ada pertanyaan? Chat kami kapan saja! 😊`;

    // Log before sending
    await logMessage({ sessionId: config.sessionId, chatId: phoneToChatId(order.customer.phone), body: message, status: "pending" });
    
    // Send via OpenWA
    await sendMessage(config.sessionId, { chatId: phoneToChatId(order.customer.phone), text: message });
    
    console.log(`[WhatsApp] Booking confirmation sent to ${order.customer.phone}`);
  } catch (error) {
    console.error('[WhatsApp] Failed to send booking confirmation:', error);
  }
}

// Helper functions
function getOpenWAConfig(): WhatsappConfig {
  return {
    enabled: isWhatsappEnabled(),
    sessionId: process.env.OPENWA_SESSION_ID!,
  };
}

function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return date.toLocaleDateString('id-ID', options);
}

export type { WhatsappConfig };
