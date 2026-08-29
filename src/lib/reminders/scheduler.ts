/**
 * Mesin reminder COD otomatis via WhatsApp (OpenWA) — versi FINAL yang read config dari database.
 * Slot + grace window + interval scan semua dikontrol oleh ReminderConfig table.
 */

import { prisma } from "@/lib/db";
import {
  sendMessage,
  phoneToChatId,
  logMessage,
  resolveSessionId,
  openwaConfigured,
} from "@/lib/openwa-api-client";
import { getReminderSettings, SLOT_KEYS, minutesToLabel } from "@/lib/reminders/config";

export type ReminderSlot = string; // "3h", "1h", "30m", "5m"

const DEFAULT_GRACE_MINUTES = 10;

async function loadSlots(): Promise<{ slot: string; minutesBefore: number; label: string }[]> {
  const settings = await getReminderSettings();
  if (!settings.enabled) return [];
  
  return Object.entries(settings.slots)
    .filter(([_, s]) => s.enabled)
    .map(([slot, s]) => ({
      slot,
      minutesBefore: s.minutes,
      label: minutesToLabel(s.minutes),
    })) as any;
}

export async function ensureCodReminders(orderId: string): Promise<void> {
  try {
    const slots = await loadSlots();
    if (!slots.length) return; // reminder disabled globally
    
    await prisma.$transaction(
      slots.map((s) =>
        prisma.codReminder.upsert({
          where: { orderId_slot: { orderId, slot: s.slot } },
          update: {},
          create: { orderId, slot: s.slot, status: "pending" },
        })
      )
    );
  } catch (e) {
    console.warn("[cod-reminder] gagal seed:", e instanceof Error ? e.message : e);
  }
}

export interface ReminderScanResult {
  scanned: number;
  sent: number;
  skipped: number;
  failed: number;
  whatsappEnabled: boolean;
}

let scanning = false;
let loopStarted = false;
let lastResult: ReminderScanResult | null = null;

export async function processCodReminders(now: Date = new Date()): Promise<ReminderScanResult> {
  if (scanning) return { scanned: 0, sent: 0, skipped: 0, failed: 0, whatsappEnabled: false };
  scanning = true;
  try {
    return await runScan(now);
  } finally {
    scanning = false;
  }
}

async function runScan(now: Date): Promise<ReminderScanResult> {
  const result: ReminderScanResult = { scanned: 0, sent: 0, skipped: 0, failed: 0, whatsappEnabled: false };
  
  const [settings, sessionId] = await Promise.all([
    getReminderSettings(),
    openwaConfigured() ? resolveSessionId() : Promise.resolve(null),
  ]);
  result.whatsappEnabled = sessionId !== null;

  const slots = settings.enabled ? 
    Object.entries(settings.slots).filter(([_, s]) => s.enabled) : [];
  const graceMinutes = settings.graceMinutes || DEFAULT_GRACE_MINUTES;

  const pendings = await prisma.codReminder.findMany({
    where: { status: "pending" },
    include: { order: { include: { customer: true, items: { include: { product: { select: { name: true } } } } } } },
  });

  result.scanned = pendings.length;

  for (const rem of pendings) {
    const slotMinutes = Object.entries(settings.slots).find(([slot]) => slot === rem.slot)?.[1];
    if (!slotMinutes || !slotMinutes.enabled) continue;
    
    const minutesBefore = slotMinutes.minutes;
    const target = new Date(rem.order.startDate.getTime() - minutesBefore * 60_000);
    const graceAgo = new Date(now.getTime() - graceMinutes * 60_000);

    if (target > now) continue;
    if (["cancelled", "completed"].includes(rem.order.status)) {
      await prisma.codReminder.update({ where: { id: rem.id }, data: { status: "skipped" } });
      result.skipped++;
      continue;
    }
    if (target < graceAgo) {
      await prisma.codReminder.update({ where: { id: rem.id }, data: { status: "skipped", error: "lewat jendela toleransi" } });
      result.skipped++;
      continue;
    }
    if (!sessionId) continue;

    const hourLabel = minutesBefore >= 60 ? `${minutesBefore / 60} JAM` : `${minutesBefore} MENIT`;

    const message = `*PENGINGAT ${hourLabel} ⏰*\n\n` +
      `Halo ${rem.order.customer.name}! ${minutesBefore >= 60 ? `${minutesBefore / 60} jam` : `${minutesBefore} menit`} lagi jadwal ${rem.order.deliveryMode === "courier" ? "pengantaran" : "pengambilan"} pesanan Anda.\n\n` +
      `*Order #${rem.order.orderNumber}*\n📦 ${rem.order.items.map(i => i.product.name).join(", ")}\n` +
      `🕐 ${rem.order.deliveryMode === "courier" ? "Diantar" : "Ambil"}: ${target.toLocaleString("id-ID")}\n\n` +
      (rem.order.deliveryMode === "courier" 
        ? "Mohon standby di alamat pengantaran.\n\n"
        : "Silakan datang sesuai jadwal. Jangan lupa bawa KTP/kartu pelajar.\n\n") +
      "Ada pertanyaan? Balas pesan ini. 😊";
    const chatId = phoneToChatId(rem.order.customer.phone);

    await logMessage({ sessionId, chatId, body: message.slice(0, 1000), status: "pending", orderId: rem.order.id });
    const sendResult = await sendMessage(sessionId, { chatId, text: message });

    if (sendResult.ok) {
      await prisma.codReminder.update({ where: { id: rem.id }, data: { status: "sent", sentAt: new Date() } });
      result.sent++;
    } else {
      await prisma.codReminder.update({ where: { id: rem.id }, data: { error: sendResult.error ?? "gagal kirim" } });
      result.failed++;
    }
  }

  return result;
}

export function startCodReminderLoop(): void {
  if (loopStarted) return;
  loopStarted = true;
  const timer = setInterval(() => {
    processCodReminders().then((r) => {
      lastResult = r;
      if (r.sent > 0 || r.failed > 0) {
        console.log(`[cod-reminder] scan: sent=${r.sent} failed=${r.failed} skipped=${r.skipped}`);
      }
    }).catch((e) => console.error("[cod-reminder] scan error:", e instanceof Error ? e.message : e));
  }, Math.max(15_000, 60_000)); // Default 60 detik
  timer.unref?.();
}

export async function getCodReminderStatus() {
  const [pending, sent, skipped] = await Promise.all([
    prisma.codReminder.count({ where: { status: "pending" } }),
    prisma.codReminder.count({ where: { status: "sent" } }),
    prisma.codReminder.count({ where: { status: "skipped" } }),
  ]);
  
  const now = Date.now();
  let nextUpcoming: { orderNumber: string; slot: string; targetAt: Date } | null = null;
  const pendings = await prisma.codReminder.findMany({
    where: { status: "pending" },
    include: { order: { select: { orderNumber: true, startDate: true, status: true } } },
    take: 100,
  });
  
  const slots = Object.entries(await getReminderSettings()).reduce<Record<string, number>>((acc, [slot, s]: any) => {
    if (s.enabled) acc[slot] = s.minutes;
    return acc;
  }, {});
  
  for (const rem of pendings) {
    if (["cancelled", "completed"].includes(rem.order.status)) continue;
    const minutesBefore = slots[rem.slot];
    if (!minutesBefore) continue;
    const targetAt = new Date(rem.order.startDate.getTime() - minutesBefore * 60_000);
    if (targetAt.getTime() < now) continue;
    if (!nextUpcoming || targetAt < nextUpcoming.targetAt) {
      nextUpcoming = { orderNumber: rem.order.orderNumber, slot: rem.slot, targetAt };
    }
  }

  return { pending, sent, skipped, lastScan: lastResult, nextUpcoming };
}
