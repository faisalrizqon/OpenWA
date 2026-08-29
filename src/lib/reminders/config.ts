/**
 * Pengaturan reminder COD & RETURN (pengembalian) — baris tunggal di tabel ReminderConfig.
 * 
 * Reminder types:
 * - COD: reminder sebelum pickup/antar order baru
 * - RETURN: reminder H-1 pengembalian
 * - LATE: warning keterlambatan + denda berjalan
 * 
 * Akses via raw SQL (bypass Prisma drift issues).
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

/** Key slot COD yang dikenal (dipakai merge settings di API). */
export const SLOT_KEYS = Object.keys(COD_SLOTS) as Array<keyof typeof COD_SLOTS>;

const RETURN_SLOTS: Record<"24h" | "12h" | "1h", SlotDef> = {
  "24h": { enabled: true, minutesBefore: 1_440, label: "1 hari" },
  "12h": { enabled: true, minutesBefore: 720, label: "12 jam" },
  "1h": { enabled: false, minutesBefore: 60, label: "1 jam" },
};

export interface ReminderSettings {
  /** Global toggle semua reminder */
  enabled: boolean;
  
  /** Setting per reminder type */
  cod: {
    slots: typeof COD_SLOTS;
    graceMinutes: number;
  };
  return: {
    slots: typeof RETURN_SLOTS;
    graceMinutes: number;
  };
  late: {
    enabled: boolean;
    initialDelayHours: number; // delay setelah status late baru kirim
    repeatIntervalDays: number; // update berkala setiap X hari
  };
  
  /** Interval scan scheduler (detik) */
  scanIntervalSeconds: number;
  /** Salinan notifikasi ke admin */
  notifyAdmin: boolean;
  /** Nomor WA admin */
  adminPhone: string | null;
}

export const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: true,
  cod: { slots: COD_SLOTS, graceMinutes: 10 },
  return: { slots: RETURN_SLOTS, graceMinutes: 60 },
  late: { enabled: true, initialDelayHours: 2, repeatIntervalDays: 1 },
  scanIntervalSeconds: 60,
  notifyAdmin: false,
  adminPhone: null,
};

const SLOT_FIELDS: Record<ReminderType, { slotFields: Record<string, { enabled: string; minutes: string }> }> = {
  cod: {
    slotFields: {
      "3h": { enabled: "slotCod3hEnabled", minutes: "slotCod3hMinutes" },
      "1h": { enabled: "slotCod1hEnabled", minutes: "slotCod1hMinutes" },
      "30m": { enabled: "slotCod30mEnabled", minutes: "slotCod30mMinutes" },
      "5m": { enabled: "slotCod5mEnabled", minutes: "slotCod5mMinutes" },
    },
  },
  return: {
    slotFields: {
      "24h": { enabled: "slotReturn24hEnabled", minutes: "slotReturn24hMinutes" },
      "12h": { enabled: "slotReturn12hEnabled", minutes: "slotReturn12hMinutes" },
      "1h": { enabled: "slotReturn1hEnabled", minutes: "slotReturn1hMinutes" },
    },
  },
  late: {
    slotFields: {}, // late tidak pakai slots
  },
};

/** Pastikan tabel & baris config ada (idempoten). */
export async function ensureReminderConfigTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ReminderConfig" (
      "id" INTEGER NOT NULL PRIMARY KEY DEFAULT 1,
      
      -- Global
      "enabled" BOOLEAN NOT NULL DEFAULT 1,
      "scanIntervalSeconds" INTEGER NOT NULL DEFAULT 60,
      "notifyAdmin" BOOLEAN NOT NULL DEFAULT 0,
      "adminPhone" TEXT,
      
      -- COD reminders
      "codGraceMinutes" INTEGER NOT NULL DEFAULT 10,
      "slotCod3hEnabled" BOOLEAN NOT NULL DEFAULT 1, "slotCod3hMinutes" INTEGER NOT NULL DEFAULT 180,
      "slotCod1hEnabled" BOOLEAN NOT NULL DEFAULT 1, "slotCod1hMinutes" INTEGER NOT NULL DEFAULT 60,
      "slotCod30mEnabled" BOOLEAN NOT NULL DEFAULT 1, "slotCod30mMinutes" INTEGER NOT NULL DEFAULT 30,
      "slotCod5mEnabled" BOOLEAN NOT NULL DEFAULT 1, "slotCod5mMinutes" INTEGER NOT NULL DEFAULT 5,
      
      -- Return reminders
      "returnGraceMinutes" INTEGER NOT NULL DEFAULT 60,
      "slotReturn24hEnabled" BOOLEAN NOT NULL DEFAULT 1, "slotReturn24hMinutes" INTEGER NOT NULL DEFAULT 1440,
      "slotReturn12hEnabled" BOOLEAN NOT NULL DEFAULT 1, "slotReturn12hMinutes" INTEGER NOT NULL DEFAULT 720,
      "slotReturn1hEnabled" BOOLEAN NOT NULL DEFAULT 0, "slotReturn1hMinutes" INTEGER NOT NULL DEFAULT 60,
      
      -- Late warnings
      "lateEnabled" BOOLEAN NOT NULL DEFAULT 1,
      "lateInitialDelayHours" INTEGER NOT NULL DEFAULT 2,
      "lateRepeatIntervalDays" INTEGER NOT NULL DEFAULT 1,
      
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(
    `INSERT OR IGNORE INTO "ReminderConfig" ("id") VALUES (1)`
  );
}

type ConfigRow = Record<string, number | string | null>;

function buildSettingsFromRow(row: ConfigRow | undefined): ReminderSettings {
  const d = DEFAULT_SETTINGS;
  if (!row) return { ...d, cod: { ...d.cod, slots: { ...d.cod.slots } }, return: { ...d.return, slots: { ...d.return.slots } } };
  
  const bool = (v: unknown, fb: boolean) =>
    typeof v === "number" ? v !== 0 : typeof v === "string" ? v === "true" || v === "1" : fb;
  const num = (v: unknown, fb: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, n) : fb;
  };
  
  // Build slots dari row
  const buildCodSlots = () => ({
    "3h": { enabled: bool(row.slotCod3hEnabled, true), minutesBefore: num(row.slotCod3hMinutes, 180), label: "3 jam" },
    "1h": { enabled: bool(row.slotCod1hEnabled, true), minutesBefore: num(row.slotCod1hMinutes, 60), label: "1 jam" },
    "30m": { enabled: bool(row.slotCod30mEnabled, true), minutesBefore: num(row.slotCod30mMinutes, 30), label: "30 menit" },
    "5m": { enabled: bool(row.slotCod5mEnabled, true), minutesBefore: num(row.slotCod5mMinutes, 5), label: "5 menit" },
  });
  
  const buildReturnSlots = () => ({
    "24h": { enabled: bool(row.slotReturn24hEnabled, true), minutesBefore: num(row.slotReturn24hMinutes, 1440), label: "1 hari" },
    "12h": { enabled: bool(row.slotReturn12hEnabled, true), minutesBefore: num(row.slotReturn12hMinutes, 720), label: "12 jam" },
    "1h": { enabled: bool(row.slotReturn1hEnabled, false), minutesBefore: num(row.slotReturn1hMinutes, 60), label: "1 jam" },
  });
  
  return {
    enabled: bool(row.enabled, true),
    cod: { slots: buildCodSlots(), graceMinutes: num(row.codGraceMinutes, 10) },
    return: { slots: buildReturnSlots(), graceMinutes: num(row.returnGraceMinutes, 60) },
    late: {
      enabled: bool(row.lateEnabled, true),
      initialDelayHours: num(row.lateInitialDelayHours, 2),
      repeatIntervalDays: num(row.lateRepeatIntervalDays, 1),
    },
    scanIntervalSeconds: Math.max(15, num(row.scanIntervalSeconds, 60)),
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
    return { ...DEFAULT_SETTINGS, cod: { ...DEFAULT_SETTINGS.cod, slots: { ...DEFAULT_SETTINGS.cod.slots } }, return: { ...DEFAULT_SETTINGS.return, slots: { ...DEFAULT_SETTINGS.return.slots } } };
  }
}

/** Simpan pengaturan */
export async function saveReminderSettings(s: ReminderSettings): Promise<void> {
  await ensureReminderConfigTable();
  
  const setBool = (key: string, val: boolean) => `${key} = ${val ? 1 : 0}`;
  const setNum = (key: string, val: number) => `${key} = ${Math.floor(val)}`;
  
  const codSlotUpdates = Object.entries(s.cod.slots) as Array<[keyof typeof s.cod.slots, any]>;
  const codFields = codSlotUpdates.flatMap(([slot, slotDef]) => [
    setBool(SLOT_FIELDS.cod.slotFields[slot].enabled, slotDef.enabled),
    setNum(SLOT_FIELDS.cod.slotFields[slot].minutes, slotDef.minutesBefore),
  ]).join(", ");
  
  const returnSlotUpdates = Object.entries(s.return.slots) as Array<[keyof typeof s.return.slots, any]>;
  const returnFields = returnSlotUpdates.flatMap(([slot, slotDef]) => [
    setBool(SLOT_FIELDS.return.slotFields[slot].enabled, slotDef.enabled),
    setNum(SLOT_FIELDS.return.slotFields[slot].minutes, slotDef.minutesBefore),
  ]).join(", ");
  
  await prisma.$executeRawUnsafe(`
    UPDATE "ReminderConfig" SET
      "enabled" = ${s.enabled ? 1 : 0},
      "scanIntervalSeconds" = ${s.scanIntervalSeconds},
      "notifyAdmin" = ${s.notifyAdmin ? 1 : 0},
      "adminPhone" = ${s.adminPhone ? `'${s.adminPhone.replace(/'/g, "''")}'` : "NULL"},
      "codGraceMinutes" = ${s.cod.graceMinutes},
      "returnGraceMinutes" = ${s.return.graceMinutes},
      ${codFields},
      ${returnFields},
      "lateEnabled" = ${s.late.enabled ? 1 : 0},
      "lateInitialDelayHours" = ${s.late.initialDelayHours},
      "lateRepeatIntervalDays" = ${s.late.repeatIntervalDays},
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = 1
  `);
}

export function minutesToLabel(minutes: number): string {
  if (minutes >= 1440 && minutes % 1440 === 0) {
    const days = minutes / 1440;
    return `${days} hari`;
  }
  if (minutes >= 60 && minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} jam`;
  }
  return `${minutes} menit`;
}
