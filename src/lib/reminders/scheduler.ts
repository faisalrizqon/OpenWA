/**
 * Mesin reminder COD otomatis via WhatsApp (OpenWA).
 *
 * Setiap order baru mendapat 4 slot reminder sebelum waktu pengambilan
 * (startDate): 3 jam, 1 jam, 30 menit, dan 5 menit. Scheduler berjalan
 * periodik (loop internal server + endpoint /api/cron/reminders), mencari
 * slot yang sudah jatuh tempo lalu mengirim pesan WA ke customer via OpenWA —
 * supaya order tidak lupa ditangani.
 *
 * Desain idempoten: tiap slot punya baris CodReminder unik (orderId+slot),
 * status pending → sent/skipped. Slot yang sudah terkirim tidak dikirim lagi.
 * Order yang dibatalkan/selesai otomatis di-skip.
 */

import { prisma } from "@/lib/db";
import {
  sendMessage,
  phoneToChatId,
  logMessage,
  resolveSessionId,
  openwaConfigured,
} from "@/lib/openwa-api-client";

/** Slot reminder: jarak sebelum waktu ambil (startDate). */
export const REMINDER_SLOTS = [
  { slot: "3h", minutesBefore: 180, label: "3 jam" },
  { slot: "1h", minutesBefore: 60, label: "1 jam" },
  { slot: "30m", minutesBefore: 30, label: "30 menit" },
  { slot: "5m", minutesBefore: 5, label: "5 menit" },
] as const;

export type ReminderSlot = (typeof REMINDER_SLOTS)[number]["slot"];

/** Jendela toleransi: slot dianggap jatuh tempo bila waktu target sudah
 *  lewat TAPI belum lebih lama dari ini (mencegah spam reminder lama). */
const GRACE_MINUTES = 10;

/** Pastikan order punya baris CodReminder untuk semua slot.
 *  Dipanggil saat order dibuat (admin maupun online checkout). */
export async function ensureCodReminders(orderId: string): Promise<void> {
  try {
    await prisma.$transaction(
      REMINDER_SLOTS.map((s) =>
        prisma.codReminder.upsert({
          where: { orderId_slot: { orderId, slot: s.slot } },
          update: {},
          create: { orderId, slot: s.slot, status: "pending" },
        })
      )
    );
  } catch (e) {
    console.warn("[cod-reminder] gagal menyiapkan slot reminder:", e instanceof Error ? e.message : e);
  }
}

/** Format waktu lokal ringkas: "Sabtu, 30 Agu 14:00". */
function fmtDateTime(d: Date): string {
  return d.toLocaleString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Template pesan reminder COD — konsisten dengan gaya pesan booking. */
export function buildCodReminderMessage(input: {
  customerName: string;
  orderNumber: string;
  startDate: Date;
  itemsLabel: string;
  slotLabel: string;
  deliveryMode: string;
}): string {
  const isCourier = input.deliveryMode === "courier";
  const kegiatan = isCourier ? "pengantaran" : "pengambilan";
  return (
    `*PENGINGAT ${input.slotLabel.toUpperCase()} ⏰*\n\n` +
    `Halo ${input.customerName}! ${input.slotLabel} lagi jadwal ${kegiatan} pesanan Anda.\n\n` +
    `*Order #${input.orderNumber}*\n` +
    `📦 ${input.itemsLabel}\n` +
    `🕐 ${isCourier ? "Diantar" : "Ambil"}: ${fmtDateTime(input.startDate)}\n\n` +
    (isCourier
      ? `Mohon standby di alamat pengantaran. Admin akan menghubungi Anda sebentar lagi.\n\n`
      : `Silakan datang sesuai jadwal. Jangan lupa bawa identitas (KTP/kartu pelajar) untuk jaminan.\n\n`) +
    `Ada pertanyaan? Balas pesan ini. 😊`
  );
}

export interface ReminderScanResult {
  scanned: number;
  sent: number;
  skipped: number;
  failed: number;
  whatsappEnabled: boolean;
}

/** Scan slot reminder yang jatuh tempo lalu kirim via WhatsApp.
 *  Idempoten — aman dipanggil berulang (tiap menit). Guard mencegah dua scan
 *  berjalan bersamaan (interval + trigger manual bisa tumpang tindih). */
let scanning = false;
export async function processCodReminders(now: Date = new Date()): Promise<ReminderScanResult> {
  if (scanning) {
    return { scanned: 0, sent: 0, skipped: 0, failed: 0, whatsappEnabled: false };
  }
  scanning = true;
  try {
    return await runScan(now);
  } finally {
    scanning = false;
  }
}

async function runScan(now: Date): Promise<ReminderScanResult> {
  const result: ReminderScanResult = { scanned: 0, sent: 0, skipped: 0, failed: 0, whatsappEnabled: false };

  const sessionId = openwaConfigured() ? await resolveSessionId() : null;
  result.whatsappEnabled = sessionId !== null;

  // Slot jatuh tempo: waktu target (startDate - offset) ada di antara
  // (now - grace) dan now. Ambil semua pending lalu filter di memori
  // (jumlah order kecil — rental lokal).
  const pendings = await prisma.codReminder.findMany({
    where: { status: "pending" },
    include: {
      order: {
        include: {
          customer: true,
          items: { include: { product: { select: { name: true } } } },
        },
      },
    },
  });

  result.scanned = pendings.length;

  for (const rem of pendings) {
    const slotDef = REMINDER_SLOTS.find((s) => s.slot === rem.slot);
    if (!slotDef) continue;

    const target = new Date(rem.order.startDate.getTime() - slotDef.minutesBefore * 60_000);
    const graceAgo = new Date(now.getTime() - GRACE_MINUTES * 60_000);

    // Belum waktunya → biarkan pending
    if (target > now) continue;

    // Order sudah tidak relevan (batal/selesai) → skip permanen
    if (["cancelled", "completed"].includes(rem.order.status)) {
      await prisma.codReminder.update({
        where: { id: rem.id },
        data: { status: "skipped" },
      });
      result.skipped++;
      continue;
    }

    // Terlalu lama lewat jendela → skip (mencegah spam setelah server down)
    if (target < graceAgo) {
      await prisma.codReminder.update({
        where: { id: rem.id },
        data: { status: "skipped", error: "lewat jendela toleransi" },
      });
      result.skipped++;
      continue;
    }

    // WhatsApp tidak tersedia → biarkan pending agar terkirim nanti
    if (!sessionId) continue;

    const itemsLabel = rem.order.items.map((it) => it.product.name).join(", ");
    const message = buildCodReminderMessage({
      customerName: rem.order.customer.name,
      orderNumber: rem.order.orderNumber,
      startDate: rem.order.startDate,
      itemsLabel,
      slotLabel: slotDef.label,
      deliveryMode: rem.order.deliveryMode,
    });
    const chatId = phoneToChatId(rem.order.customer.phone);

    await logMessage({ sessionId, chatId, body: message, status: "pending", orderId: rem.order.id });
    const sendResult = await sendMessage(sessionId, { chatId, text: message });

    if (sendResult.ok) {
      await prisma.codReminder.update({
        where: { id: rem.id },
        data: { status: "sent", sentAt: new Date() },
      });
      result.sent++;
    } else {
      await prisma.codReminder.update({
        where: { id: rem.id },
        data: { error: sendResult.error ?? "gagal kirim" },
      });
      result.failed++;
    }
  }

  return result;
}

// --- Loop scheduler internal (tanpa cron eksternal) ---

let loopStarted = false;
let lastResult: ReminderScanResult | null = null;

/** Jalankan scan reminder tiap 60 detik di dalam proses server.
 *  Idempoten — aman dipanggil berkali-kali (hanya interval pertama yang jalan).
 *  Dipanggil dari /api/cron/reminders agar loop hidup begitu app menerima request. */
export function startCodReminderLoop(): void {
  if (loopStarted) return;
  loopStarted = true;
  const intervalMs = Number(process.env.COD_REMINDER_INTERVAL_MS ?? 60_000);
  const timer = setInterval(() => {
    processCodReminders()
      .then((r) => {
        lastResult = r;
        if (r.sent > 0 || r.failed > 0) {
          console.log(`[cod-reminder] scan: sent=${r.sent} failed=${r.failed} skipped=${r.skipped}`);
        }
      })
      .catch((e) => console.error("[cod-reminder] scan error:", e instanceof Error ? e.message : e));
  }, Math.max(15_000, intervalMs));
  // Jangan menahan proses Node saat shutdown (dev/test)
  timer.unref?.();
}

/** Status ringkas reminder untuk dashboard. */
export async function getCodReminderStatus(): Promise<{
  pending: number;
  sent: number;
  skipped: number;
  lastScan: ReminderScanResult | null;
  nextUpcoming: { orderNumber: string; slot: string; targetAt: Date } | null;
}> {
  const [pending, sent, skipped] = await Promise.all([
    prisma.codReminder.count({ where: { status: "pending" } }),
    prisma.codReminder.count({ where: { status: "sent" } }),
    prisma.codReminder.count({ where: { status: "skipped" } }),
  ]);

  // Slot pending terdekat yang akan terkirim
  const pendings = await prisma.codReminder.findMany({
    where: { status: "pending" },
    include: { order: { select: { orderNumber: true, startDate: true, status: true } } },
    take: 100,
  });
  let nextUpcoming: { orderNumber: string; slot: string; targetAt: Date } | null = null;
  const now = Date.now();
  for (const rem of pendings) {
    if (["cancelled", "completed"].includes(rem.order.status)) continue;
    const slotDef = REMINDER_SLOTS.find((s) => s.slot === rem.slot);
    if (!slotDef) continue;
    const targetAt = new Date(rem.order.startDate.getTime() - slotDef.minutesBefore * 60_000);
    if (targetAt.getTime() < now) continue;
    if (!nextUpcoming || targetAt < nextUpcoming.targetAt) {
      nextUpcoming = { orderNumber: rem.order.orderNumber, slot: rem.slot, targetAt };
    }
  }

  return { pending, sent, skipped, lastScan: lastResult, nextUpcoming };
}
