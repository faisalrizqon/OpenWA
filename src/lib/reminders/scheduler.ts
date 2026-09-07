/**
 * Mesin reminder umum: COD (sebelum pickup), RETURN (sebelum kembali),
 * dan LATE (warning keterlambatan + denda berjalan).
 *
 * Semua slot di-seed saat order dibuat (ensureOrderReminders) dengan target
 * waktu dihitung dari startDate/endDate. Scanner berjalan berkala (loop
 * internal + endpoint manual), mengirim yang jatuh tempo via OpenWA.
 *
 * Desain idempoten: baris Reminder unik per (orderId, slot, type);
 * status pending → sent/skipped. Order selesai/batal otomatis di-skip.
 * Late reminder auto-repeat tiap `repeatIntervalDays` selama order belum kembali.
 */

import { prisma } from "@/lib/db";
import {
  sendMessage,
  phoneToChatId,
  logMessage,
  resolveSessionId,
  openwaConfigured,
} from "@/lib/openwa-api-client";
import { getReminderSettings, parseAdminPhones, isValidPhone, type ReminderType } from "@/lib/reminders/config";
import { formatReturnReminderWA, formatLateWarningWA } from "@/lib/wa";
import { computeLateInfo, loadLateFeeItems } from "@/lib/late";

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

type SlotDef = { slot: string; minutesBefore: number; label: string };

/** Slot aktif untuk satu tipe reminder (dari config DB). */
async function loadActiveSlots(
  type: ReminderType,
  settings: Awaited<ReturnType<typeof getReminderSettings>>
): Promise<SlotDef[]> {
  if (!settings.enabled) return [];
  if (type === "cod") {
    return Object.entries(settings.cod.slots)
      .filter(([_, s]) => s.enabled)
      .map(([slot, s]) => ({ slot, minutesBefore: s.minutesBefore, label: s.label }));
  }
  if (type === "return") {
    return Object.entries(settings.return.slots)
      .filter(([_, s]) => s.enabled)
      .map(([slot, s]) => ({ slot, minutesBefore: s.minutesBefore, label: s.label }));
  }
  if (type === "late") {
    return settings.late.enabled
      ? [{ slot: "late", minutesBefore: settings.late.initialDelayHours * 60, label: "peringatan terlambat" }]
      : [];
  }
  return [];
}

/** Seed semua slot reminder untuk satu order. Dipanggil setelah order dibuat
 *  (admin & online checkout) dan saat status berubah (mis. active → late). */
export async function ensureOrderReminders(orderId: string): Promise<void> {
  try {
    const settings = await getReminderSettings();
    if (!settings.enabled) return;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true, startDate: true, endDate: true },
    });
    if (!order || ["completed", "cancelled"].includes(order.status)) return;

    const creates: Array<{ slot: string; type: ReminderType; scheduledAt: Date | null }> = [];

    // COD — sebelum waktu ambil/antar
    if (["booking", "pending"].includes(order.status)) {
      for (const s of await loadActiveSlots("cod", settings)) {
        creates.push({ slot: s.slot, type: "cod", scheduledAt: null });
      }
    }

    // RETURN — sebelum jatuh tempo pengembalian (order masih jalan)
    if (["booking", "pending", "active"].includes(order.status)) {
      for (const s of await loadActiveSlots("return", settings)) {
        creates.push({ slot: s.slot, type: "return", scheduledAt: null });
      }
      // LATE — peringatan pertama beberapa jam setelah jatuh tempo lewat
      for (const s of await loadActiveSlots("late", settings)) {
        creates.push({
          slot: s.slot,
          type: "late",
          scheduledAt: new Date(order.endDate.getTime() + settings.late.initialDelayHours * HOUR_MS),
        });
      }
    }

    if (creates.length) {
      await prisma.$transaction(
        creates.map((c) =>
          prisma.reminder.upsert({
            where: { orderId_slot_type: { orderId, slot: c.slot, type: c.type } },
            update: {},
            create: { orderId, slot: c.slot, type: c.type, status: "pending", scheduledAt: c.scheduledAt },
          })
        )
      );
    }
  } catch (e) {
    console.warn("[reminder] gagal seed:", e instanceof Error ? e.message : e);
  }
}

/** Batalkan reminder belum terkirim bila order batal/selesai (defensif). */
export async function cancelPendingReminders(orderId: string): Promise<void> {
  try {
    await prisma.reminder.updateMany({
      where: { orderId, status: "pending" },
      data: { status: "skipped", error: "order selesai/batal" },
    });
  } catch (e) {
    console.warn("[reminder] gagal cancel:", e instanceof Error ? e.message : e);
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

/** Hitung waktu target kirim per reminder. */
function computeTarget(
  rem: { type: string; slot: string; scheduledAt: Date | null; order: { startDate: Date; endDate: Date } },
  settings: Awaited<ReturnType<typeof getReminderSettings>>
): Date | null {
  if (rem.type === "cod") {
    const def = settings.cod.slots[rem.slot as keyof typeof settings.cod.slots];
    if (!def || !def.enabled) return null;
    return new Date(rem.order.startDate.getTime() - def.minutesBefore * 60_000);
  }
  if (rem.type === "return") {
    const def = settings.return.slots[rem.slot as keyof typeof settings.return.slots];
    if (!def || !def.enabled) return null;
    return new Date(rem.order.endDate.getTime() - def.minutesBefore * 60_000);
  }
  if (rem.type === "late") {
    return rem.scheduledAt ?? new Date(rem.order.endDate.getTime() + settings.late.initialDelayHours * HOUR_MS);
  }
  return null;
}

export async function processAllReminders(now: Date = new Date()): Promise<ReminderScanResult> {
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

  if (!settings.enabled) return result;

  const pendings = await prisma.reminder.findMany({
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
    const target = computeTarget(rem, settings);
    if (!target) {
      await prisma.reminder.update({ where: { id: rem.id }, data: { status: "skipped", error: "slot dinonaktifkan" } });
      result.skipped++;
      continue;
    }

    // Belum waktunya → biarkan pending
    if (target > now) continue;

    // Order tidak relevan lagi → skip permanen.
    // `draft` ikut di-skip: order belum difinalisasi customer (belum "masuk"),
    // jadi tidak boleh ada reminder yang terkirim untuknya.
    if (["cancelled", "completed", "draft"].includes(rem.order.status)) {
      await prisma.reminder.update({ where: { id: rem.id }, data: { status: "skipped" } });
      result.skipped++;
      continue;
    }

    // Jendela toleransi anti-spam (COD & RETURN; late dikecualikan karena
    // scheduledAt-nya eksplisit dan repeat-nya terjadwal)
    if (rem.type !== "late") {
      const graceMinutes = rem.type === "cod" ? settings.cod.graceMinutes : settings.return.graceMinutes;
      if (target < new Date(now.getTime() - graceMinutes * 60_000)) {
        await prisma.reminder.update({ where: { id: rem.id }, data: { status: "skipped", error: "lewat jendela toleransi" } });
        result.skipped++;
        continue;
      }
    }

    if (!sessionId) continue;

    // --- Bangun pesan sesuai tipe ---
    let message = "";
    if (rem.type === "cod") {
      const def = settings.cod.slots[rem.slot as keyof typeof settings.cod.slots];
      const mins = def?.minutesBefore ?? 0;
      const label = mins >= 60 && mins % 60 === 0 ? `${mins / 60} jam` : `${mins} menit`;
      const kegiatan = rem.order.deliveryMode === "courier" ? "pengantaran" : "pengambilan";
      message =
        `*PENGINGAT ${label.toUpperCase()} ⏰*\n\n` +
        `Halo ${rem.order.customer.name}! ${label} lagi jadwal ${kegiatan} pesanan Anda.\n\n` +
        `*Order #${rem.order.orderNumber}*\n` +
        `📦 ${rem.order.items.map((i) => i.product.name).join(", ")}\n` +
        `🕐 ${rem.order.deliveryMode === "courier" ? "Diantar" : "Ambil"}: ${rem.order.startDate.toLocaleString("id-ID", { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}\n\n` +
        (rem.order.deliveryMode === "courier"
          ? `Mohon standby di alamat pengantaran.\n\n`
          : `Silakan datang sesuai jadwal. Jangan lupa bawa KTP/kartu pelajar untuk jaminan.\n\n`) +
        `Ada pertanyaan? Balas pesan ini. 😊`;
    } else if (rem.type === "return") {
      message = formatReturnReminderWA({
        customerName: rem.order.customer.name,
        orderNumber: rem.order.orderNumber,
        endDate: rem.order.endDate,
        productNames: rem.order.items.map((i) => i.product.name),
      });
    } else {
      // late — hitung denda berjalan
      const lateItems = await loadLateFeeItems(rem.order.id);
      const lateInfo = computeLateInfo(rem.order.endDate, lateItems, now);
      message = formatLateWarningWA({
        customerName: rem.order.customer.name,
        orderNumber: rem.order.orderNumber,
        endDate: rem.order.endDate,
        lateDays: Math.max(1, lateInfo.lateDays),
        fine: lateInfo.suggestedFine,
      });
    }

    // --- Tentukan penerima berdasarkan pengaturan ---
    // ATURAN KETAT: jangan pernah kirim bila nomor tidak diinput/tidak valid.
    const recipients: string[] = [];
    if (settings.sendToCustomer && isValidPhone(rem.order.customer.phone)) {
      recipients.push(phoneToChatId(rem.order.customer.phone));
    }
    if (settings.sendToAdmin) {
      const adminPhones = parseAdminPhones(settings.adminPhones).filter(isValidPhone);
      for (const phone of adminPhones) {
        recipients.push(phoneToChatId(phone));
      }
    }
    if (recipients.length === 0) {
      // Tidak ada nomor tujuan valid → skip, jangan pernah kirim.
      await prisma.reminder.update({
        where: { id: rem.id },
        data: { status: "skipped", error: "tidak ada nomor tujuan valid" },
      });
      result.skipped++;
      continue;
    }

    let anyOk = false;
    let lastError: string | null = null;
    for (const chatId of recipients) {
      await logMessage({ sessionId, chatId, body: message.slice(0, 1000), status: "pending", orderId: rem.order.id });
      const sendResult = await sendMessage(sessionId, { chatId, text: message });
      if (sendResult.ok) {
        anyOk = true;
      } else {
        lastError = sendResult.error ?? "gagal kirim";
      }
    }

    const sendResult = { ok: anyOk, error: lastError };

    if (sendResult.ok) {
      await prisma.reminder.update({
        where: { id: rem.id },
        data: { status: "sent", sentAt: new Date() },
      });
      result.sent++;

      // Late reminder auto-repeat selama order belum kembali
      if (rem.type === "late" && ["late", "active"].includes(rem.order.status)) {
        const nextAt = new Date(now.getTime() + settings.late.repeatIntervalDays * DAY_MS);
        await prisma.reminder.create({
          data: {
            orderId: rem.order.id,
            slot: `late-${Date.now()}`,
            type: "late",
            status: "pending",
            scheduledAt: nextAt,
          },
        });
      }
    } else {
      await prisma.reminder.update({
        where: { id: rem.id },
        data: { error: sendResult.error ?? "gagal kirim" },
      });
      result.failed++;
    }
  }

  return result;
}

/** Loop scheduler internal — interval dari config DB (dibaca tiap tick agar
 *  perubahan interval langsung berlaku tanpa restart). */
export function startReminderLoop(): void {
  if (loopStarted) return;
  loopStarted = true;
  const tick = () => {
    processAllReminders()
      .then((r) => {
        lastResult = r;
        if (r.sent > 0 || r.failed > 0) {
          console.log(`[reminder] scan: sent=${r.sent} failed=${r.failed} skipped=${r.skipped}`);
        }
      })
      .catch((e) => console.error("[reminder] scan error:", e instanceof Error ? e.message : e));
  };
  // Loop adaptif: baca interval dari DB tiap penjadwalan ulang
  const schedule = async () => {
    const settings = await getReminderSettings().catch(() => null);
    const ms = Math.max(15_000, (settings?.scanIntervalSeconds ?? 60) * 1000);
    setTimeout(() => {
      tick();
      void schedule();
    }, ms);
  };
  tick();
  void schedule();
}

/** Status agregat per tipe untuk dashboard tab Reminder. */
export async function getReminderStatusSummary(): Promise<{
  cod: { pending: number; sent: number; skipped: number };
  return: { pending: number; sent: number; skipped: number };
  late: { pending: number; sent: number; skipped: number };
  lastScan: ReminderScanResult | null;
  nextUpcoming: { orderNumber: string; type: string; targetAt: Date } | null;
}> {
  const settings = await getReminderSettings();
  const rows = await prisma.reminder.findMany({
    select: { status: true, type: true, slot: true, scheduledAt: true, order: { select: { orderNumber: true, startDate: true, endDate: true, status: true } } },
  });

  const acc = {
    cod: { pending: 0, sent: 0, skipped: 0 },
    return: { pending: 0, sent: 0, skipped: 0 },
    late: { pending: 0, sent: 0, skipped: 0 },
  };
  let nextUpcoming: { orderNumber: string; type: string; targetAt: Date } | null = null;
  const now = Date.now();

  for (const r of rows) {
    const bucket = acc[r.type as keyof typeof acc];
    if (!bucket) continue;
    if (r.status === "pending") bucket.pending++;
    else if (r.status === "sent") bucket.sent++;
    else bucket.skipped++;

    if (r.status === "pending" && !["cancelled", "completed"].includes(r.order.status)) {
      const target = r.type === "cod"
        ? new Date(r.order.startDate.getTime() - (settings.cod.slots[r.slot as keyof typeof settings.cod.slots]?.minutesBefore ?? 0) * 60_000)
        : r.type === "return"
          ? new Date(r.order.endDate.getTime() - (settings.return.slots[r.slot as keyof typeof settings.return.slots]?.minutesBefore ?? 0) * 60_000)
          : r.scheduledAt ?? new Date(r.order.endDate.getTime() + settings.late.initialDelayHours * HOUR_MS);
      if (target.getTime() >= now && (!nextUpcoming || target < nextUpcoming.targetAt)) {
        nextUpcoming = { orderNumber: r.order.orderNumber, type: r.type, targetAt: target };
      }
    }
  }

  return { cod: acc.cod, return: acc.return, late: acc.late, lastScan: lastResult, nextUpcoming };
}

// Alias kompatibilitas untuk kode lama (endpoint /api/cron/reminders)
export const processCodReminders = processAllReminders;
export const getCodReminderStatus = getReminderStatusSummary;
export const startCodReminderLoop = startReminderLoop;
