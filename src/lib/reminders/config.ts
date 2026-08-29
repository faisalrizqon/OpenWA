/**
 * Pengaturan reminder COD & RETURN & LATE — baris tunggal di tabel ReminderConfig.
 *
 * Reminder types:
 * - COD: reminder sebelum pickup/antar order baru
 * - RETURN: reminder sebelum jatuh tempo pengembalian
 * - LATE: warning keterlambatan + denda berjalan
 *
 * Target pengiriman: customer, admin, atau keduanya (pilihan nomor admin).
 *
 * Akses via SQL terketik (bukan Prisma delegate) karena tabel dibuat lewat
 * raw SQL — db push terblokir drift SQLite legacy. Kolom di bawah HARUS
 * sinkron dengan struktur tabel aktual (lihat ensureReminderConfigTable).
 */

import { prisma } from "@/lib/db";

export type ReminderType = "cod" | "return" | "late";

type SlotDef = { enabled: boolean; minutesBefore: number; label: string };

const COD_SLOTS: Record<"3h" | "1h" | "30m" | "5m", SlotDef> = {
  "3h": { enabled: true, minutesBefore: 180, label: "3 jam" },
  "1h": { enabled: true, minutesBefore: 60, label: "1 jam" },
  "30m": { enabled: true, minutesBefore: 30, label: "30 menit" },
  "5m": { enabled: true, minutesBefore: 5, label: "5 menit" },
};

const RETURN_SLOTS: Record<"24h" | "12h" | "1h", SlotDef> = {
  "24h": { enabled: true, minutesBefore: 1_440, label: "1 hari" },
  "12h": { enabled: true, minutesBefore: 720, label: "12 jam" },
  "1h": { enabled: false, minutesBefore: 60, label: "1 jam" },
};

export interface ReminderSettings {
  /** Global toggle semua reminder */
  enabled: boolean;

  /** Setting per reminder type */
  cod: { slots: typeof COD_SLOTS; graceMinutes: number };
  return: { slots: typeof RETURN_SLOTS; graceMinutes: number };
  late: {
    enabled: boolean;
    initialDelayHours: number; // delay setelah status late baru kirim
    repeatIntervalDays: number; // update berkala setiap X hari
  };

  /** Interval scan scheduler (detik) */
  scanIntervalSeconds: number;

  /** --- Target pengiriman --- */
  sendToCustomer: boolean;
  sendToAdmin: boolean;
  /** Daftar nomor WA admin tujuan (format 08xx), disimpan sebagai JSON string. */
  adminPhones: string | null;

  /** @deprecated pakai sendToAdmin + adminPhones */
  notifyAdmin: boolean;
  /** @deprecated pakai adminPhones */
  adminPhone: string | null;
}

export const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: true,
  cod: { slots: COD_SLOTS, graceMinutes: 10 },
  return: { slots: RETURN_SLOTS, graceMinutes: 60 },
  late: { enabled: true, initialDelayHours: 2, repeatIntervalDays: 1 },
  scanIntervalSeconds: 60,
  sendToCustomer: false,
  sendToAdmin: true,
  adminPhones: null,
  notifyAdmin: false,
  adminPhone: null,
};

/** Key slot COD yang dikenal (dipakai merge settings di API). */
export const SLOT_KEYS = Object.keys(COD_SLOTS) as Array<keyof typeof COD_SLOTS>;

/** Nama kolom DB aktual per slot (HARUS sinkron dengan tabel). */
const SLOT_COLUMNS: Record<string, { enabled: string; minutes: string }> = {
  "3h": { enabled: "slot3hEnabled", minutes: "slot3hMinutes" },
  "1h": { enabled: "slot1hEnabled", minutes: "slot1hMinutes" },
  "30m": { enabled: "slot30mEnabled", minutes: "slot30mMinutes" },
  "5m": { enabled: "slot5mEnabled", minutes: "slot5mMinutes" },
  "24h": { enabled: "slotReturn24hEnabled", minutes: "slotReturn24hMinutes" },
  "12h": { enabled: "slotReturn12hEnabled", minutes: "slotReturn12hMinutes" },
};
// "1h" return berbagi nama? Tidak — return punya slotReturn1h* sendiri.
// Ditangani eksplisit di builder agar tidak bentrok dengan COD 1h.

/** Pastikan tabel & baris config ada (idempoten). */
export async function ensureReminderConfigTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ReminderConfig" (
      "id" INTEGER NOT NULL PRIMARY KEY DEFAULT 1,
      "enabled" BOOLEAN NOT NULL DEFAULT 1,
      "scanIntervalSeconds" INTEGER NOT NULL DEFAULT 60,

      -- Target pengiriman
      "sendToCustomer" BOOLEAN NOT NULL DEFAULT 0,
      "sendToAdmin" BOOLEAN NOT NULL DEFAULT 1,
      "adminPhones" TEXT,

      -- Legacy (tetap dipertahankan untuk kompatibilitas)
      "notifyAdmin" BOOLEAN NOT NULL DEFAULT 0,
      "adminPhone" TEXT,
      "graceMinutes" INTEGER NOT NULL DEFAULT 10,

      -- COD slots
      "slot3hEnabled" BOOLEAN NOT NULL DEFAULT 1, "slot3hMinutes" INTEGER NOT NULL DEFAULT 180,
      "slot1hEnabled" BOOLEAN NOT NULL DEFAULT 1, "slot1hMinutes" INTEGER NOT NULL DEFAULT 60,
      "slot30mEnabled" BOOLEAN NOT NULL DEFAULT 1, "slot30mMinutes" INTEGER NOT NULL DEFAULT 30,
      "slot5mEnabled" BOOLEAN NOT NULL DEFAULT 1, "slot5mMinutes" INTEGER NOT NULL DEFAULT 5,

      -- RETURN slots
      "slotReturn24hEnabled" BOOLEAN NOT NULL DEFAULT 1, "slotReturn24hMinutes" INTEGER NOT NULL DEFAULT 1440,
      "slotReturn12hEnabled" BOOLEAN NOT NULL DEFAULT 1, "slotReturn12hMinutes" INTEGER NOT NULL DEFAULT 720,
      "slotReturn1hEnabled" BOOLEAN NOT NULL DEFAULT 0, "slotReturn1hMinutes" INTEGER NOT NULL DEFAULT 60,

      -- Grace per tipe
      "codGraceMinutes" INTEGER NOT NULL DEFAULT 10,
      "returnGraceMinutes" INTEGER NOT NULL DEFAULT 60,

      -- Late warnings
      "lateEnabled" BOOLEAN NOT NULL DEFAULT 1,
      "lateInitialDelayHours" INTEGER NOT NULL DEFAULT 2,
      "lateRepeatIntervalDays" INTEGER NOT NULL DEFAULT 1,

      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`INSERT OR IGNORE INTO "ReminderConfig" ("id") VALUES (1)`);
}

type ConfigRow = Record<string, number | string | null>;

function buildSettingsFromRow(row: ConfigRow | undefined): ReminderSettings {
  const d = DEFAULT_SETTINGS;
  if (!row) {
    return {
      ...d,
      cod: { ...d.cod, slots: { ...d.cod.slots } },
      return: { ...d.return, slots: { ...d.return.slots } },
    };
  }

  const bool = (v: unknown, fb: boolean) =>
    typeof v === "number" ? v !== 0 : typeof v === "string" ? v === "true" || v === "1" : fb;
  const num = (v: unknown, fb: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, n) : fb;
  };

  return {
    enabled: bool(row.enabled, true),
    cod: {
      slots: {
        "3h": { enabled: bool(row.slot3hEnabled, true), minutesBefore: num(row.slot3hMinutes, 180), label: "3 jam" },
        "1h": { enabled: bool(row.slot1hEnabled, true), minutesBefore: num(row.slot1hMinutes, 60), label: "1 jam" },
        "30m": { enabled: bool(row.slot30mEnabled, true), minutesBefore: num(row.slot30mMinutes, 30), label: "30 menit" },
        "5m": { enabled: bool(row.slot5mEnabled, true), minutesBefore: num(row.slot5mMinutes, 5), label: "5 menit" },
      },
      graceMinutes: num(row.codGraceMinutes ?? row.graceMinutes, 10),
    },
    return: {
      slots: {
        "24h": { enabled: bool(row.slotReturn24hEnabled, true), minutesBefore: num(row.slotReturn24hMinutes, 1440), label: "1 hari" },
        "12h": { enabled: bool(row.slotReturn12hEnabled, true), minutesBefore: num(row.slotReturn12hMinutes, 720), label: "12 jam" },
        "1h": { enabled: bool(row.slotReturn1hEnabled, false), minutesBefore: num(row.slotReturn1hMinutes, 60), label: "1 jam" },
      },
      graceMinutes: num(row.returnGraceMinutes, 60),
    },
    late: {
      enabled: bool(row.lateEnabled, true),
      initialDelayHours: num(row.lateInitialDelayHours, 2),
      repeatIntervalDays: num(row.lateRepeatIntervalDays, 1),
    },
    scanIntervalSeconds: Math.max(15, num(row.scanIntervalSeconds, 60)),
    sendToCustomer: bool(row.sendToCustomer, false),
    sendToAdmin: bool(row.sendToAdmin, true),
    adminPhones: typeof row.adminPhones === "string" && row.adminPhones.trim() ? row.adminPhones.trim() : null,
    notifyAdmin: bool(row.notifyAdmin, false),
    adminPhone: typeof row.adminPhone === "string" && row.adminPhone.trim() ? row.adminPhone.trim() : null,
  };
}

/** Baca pengaturan dari DB */
export async function getReminderSettings(): Promise<ReminderSettings> {
  try {
    await ensureReminderConfigTable();
    const rows = await prisma.$queryRawUnsafe<ConfigRow[]>(
      `SELECT * FROM "ReminderConfig" WHERE "id" = 1 LIMIT 1`
    );
    return buildSettingsFromRow(rows[0]);
  } catch (e) {
    console.warn("[reminder-config] gagal baca, pakai default:", e instanceof Error ? e.message : e);
    return {
      ...DEFAULT_SETTINGS,
      cod: { ...DEFAULT_SETTINGS.cod, slots: { ...DEFAULT_SETTINGS.cod.slots } },
      return: { ...DEFAULT_SETTINGS.return, slots: { ...DEFAULT_SETTINGS.return.slots } },
    };
  }
}

/** Simpan pengaturan */
export async function saveReminderSettings(s: ReminderSettings): Promise<void> {
  await ensureReminderConfigTable();

  const esc = (v: string) => `'${v.replace(/'/g, "''")}'`;

  await prisma.$executeRawUnsafe(`
    UPDATE "ReminderConfig" SET
      "enabled" = ${s.enabled ? 1 : 0},
      "scanIntervalSeconds" = ${Math.floor(s.scanIntervalSeconds)},
      "sendToCustomer" = ${s.sendToCustomer ? 1 : 0},
      "sendToAdmin" = ${s.sendToAdmin ? 1 : 0},
      "adminPhones" = ${s.adminPhones ? esc(s.adminPhones) : "NULL"},
      "slot3hEnabled" = ${s.cod.slots["3h"].enabled ? 1 : 0}, "slot3hMinutes" = ${Math.floor(s.cod.slots["3h"].minutesBefore)},
      "slot1hEnabled" = ${s.cod.slots["1h"].enabled ? 1 : 0}, "slot1hMinutes" = ${Math.floor(s.cod.slots["1h"].minutesBefore)},
      "slot30mEnabled" = ${s.cod.slots["30m"].enabled ? 1 : 0}, "slot30mMinutes" = ${Math.floor(s.cod.slots["30m"].minutesBefore)},
      "slot5mEnabled" = ${s.cod.slots["5m"].enabled ? 1 : 0}, "slot5mMinutes" = ${Math.floor(s.cod.slots["5m"].minutesBefore)},
      "slotReturn24hEnabled" = ${s.return.slots["24h"].enabled ? 1 : 0}, "slotReturn24hMinutes" = ${Math.floor(s.return.slots["24h"].minutesBefore)},
      "slotReturn12hEnabled" = ${s.return.slots["12h"].enabled ? 1 : 0}, "slotReturn12hMinutes" = ${Math.floor(s.return.slots["12h"].minutesBefore)},
      "slotReturn1hEnabled" = ${s.return.slots["1h"].enabled ? 1 : 0}, "slotReturn1hMinutes" = ${Math.floor(s.return.slots["1h"].minutesBefore)},
      "codGraceMinutes" = ${Math.floor(s.cod.graceMinutes)},
      "returnGraceMinutes" = ${Math.floor(s.return.graceMinutes)},
      "lateEnabled" = ${s.late.enabled ? 1 : 0},
      "lateInitialDelayHours" = ${Math.floor(s.late.initialDelayHours)},
      "lateRepeatIntervalDays" = ${Math.floor(s.late.repeatIntervalDays)},
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = 1
  `);
}

/** Parse daftar nomor admin dari JSON string → array. Toleran format lama
 *  (satu nomor plain). */
export function parseAdminPhones(raw: string | null): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const arr = JSON.parse(trimmed);
      if (Array.isArray(arr)) return arr.filter((x): x is string => typeof x === "string" && x.trim() !== "");
    } catch {
      return [];
    }
    return [];
  }
  return trimmed ? [trimmed] : [];
}

export function minutesToLabel(minutes: number): string {
  if (minutes >= 1440 && minutes % 1440 === 0) {
    return `${minutes / 1440} hari`;
  }
  if (minutes >= 60 && minutes % 60 === 0) {
    return `${minutes / 60} jam`;
  }
  return `${minutes} menit`;
}
