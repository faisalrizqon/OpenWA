/**
 * Pengaturan reminder COD — baris tunggal (id=1) di tabel ReminderConfig.
 *
 * Akses via SQL terketik (bukan Prisma delegate) karena tabel dibuat lewat
 * raw SQL — db push terblokir drift SQLite legacy dan engine DLL terkunci
 * dev server. Pola sama dengan pembuatan tabel CodReminder.
 */

import { prisma } from "@/lib/db";

export const SLOT_KEYS = ["3h", "1h", "30m", "5m"] as const;
export type SlotKey = (typeof SLOT_KEYS)[number];

export interface ReminderSettings {
  enabled: boolean;
  /** Toggle + menit per slot (menit sebelum waktu ambil/antar). */
  slots: Record<SlotKey, { enabled: boolean; minutes: number }>;
  /** Jendela toleransi (menit) — slot lewat jendela di-skip anti-spam. */
  graceMinutes: number;
  /** Interval scan scheduler (detik). */
  scanIntervalSeconds: number;
  /** Kirim salinan notifikasi ke admin setelah reminder terkirim. */
  notifyAdmin: boolean;
  /** Nomor WA admin tujuan notifikasi (format 08xx). */
  adminPhone: string | null;
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: true,
  slots: {
    "3h": { enabled: true, minutes: 180 },
    "1h": { enabled: true, minutes: 60 },
    "30m": { enabled: true, minutes: 30 },
    "5m": { enabled: true, minutes: 5 },
  },
  graceMinutes: 10,
  scanIntervalSeconds: 60,
  notifyAdmin: false,
  adminPhone: null,
};

const SLOT_FIELDS: Record<SlotKey, { enabled: string; minutes: string }> = {
  "3h": { enabled: "slot3hEnabled", minutes: "slot3hMinutes" },
  "1h": { enabled: "slot1hEnabled", minutes: "slot1hMinutes" },
  "30m": { enabled: "slot30mEnabled", minutes: "slot30mMinutes" },
  "5m": { enabled: "slot5mEnabled", minutes: "slot5mMinutes" },
};

/** Pastikan tabel & baris config ada (idempoten). */
export async function ensureReminderConfigTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ReminderConfig" (
      "id" INTEGER NOT NULL PRIMARY KEY DEFAULT 1,
      "enabled" BOOLEAN NOT NULL DEFAULT 1,
      "slot3hEnabled" BOOLEAN NOT NULL DEFAULT 1,
      "slot3hMinutes" INTEGER NOT NULL DEFAULT 180,
      "slot1hEnabled" BOOLEAN NOT NULL DEFAULT 1,
      "slot1hMinutes" INTEGER NOT NULL DEFAULT 60,
      "slot30mEnabled" BOOLEAN NOT NULL DEFAULT 1,
      "slot30mMinutes" INTEGER NOT NULL DEFAULT 30,
      "slot5mEnabled" BOOLEAN NOT NULL DEFAULT 1,
      "slot5mMinutes" INTEGER NOT NULL DEFAULT 5,
      "graceMinutes" INTEGER NOT NULL DEFAULT 10,
      "scanIntervalSeconds" INTEGER NOT NULL DEFAULT 60,
      "notifyAdmin" BOOLEAN NOT NULL DEFAULT 0,
      "adminPhone" TEXT,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(
    `INSERT OR IGNORE INTO "ReminderConfig" ("id") VALUES (1)`
  );
}

type ConfigRow = Record<string, number | string | null>;

function rowToSettings(row: ConfigRow | undefined): ReminderSettings {
  const d = DEFAULT_REMINDER_SETTINGS;
  if (!row) return { ...d, slots: { ...d.slots } };
  const bool = (v: unknown, fb: boolean) =>
    typeof v === "number" ? v !== 0 : typeof v === "string" ? v === "true" || v === "1" : fb;
  const num = (v: unknown, fb: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fb;
  };
  const slot = (key: SlotKey): { enabled: boolean; minutes: number } => ({
    enabled: bool(row[SLOT_FIELDS[key].enabled], d.slots[key].enabled),
    minutes: Math.max(1, num(row[SLOT_FIELDS[key].minutes], d.slots[key].minutes)),
  });
  return {
    enabled: bool(row.enabled, true),
    slots: { "3h": slot("3h"), "1h": slot("1h"), "30m": slot("30m"), "5m": slot("5m") },
    graceMinutes: Math.max(1, num(row.graceMinutes, 10)),
    scanIntervalSeconds: Math.max(15, num(row.scanIntervalSeconds, 60)),
    notifyAdmin: bool(row.notifyAdmin, false),
    adminPhone: typeof row.adminPhone === "string" && row.adminPhone.trim() ? row.adminPhone.trim() : null,
  };
}

/** Baca pengaturan (fallback default bila tabel/baris belum ada). */
export async function getReminderSettings(): Promise<ReminderSettings> {
  try {
    await ensureReminderConfigTable();
    const rows = await prisma.$queryRawUnsafe<ConfigRow[]>(
      `SELECT * FROM "ReminderConfig" WHERE "id" = 1 LIMIT 1`
    );
    return rowToSettings(rows[0]);
  } catch (e) {
    console.warn("[reminder-config] gagal membaca, pakai default:", e instanceof Error ? e.message : e);
    return { ...DEFAULT_REMINDER_SETTINGS, slots: { ...DEFAULT_REMINDER_SETTINGS.slots } };
  }
}

/** Simpan pengaturan (validasi angka dilakukan di server action). */
export async function saveReminderSettings(s: ReminderSettings): Promise<void> {
  await ensureReminderConfigTable();
  await prisma.$executeRawUnsafe(
    `UPDATE "ReminderConfig" SET
       "enabled" = ${s.enabled ? 1 : 0},
       "slot3hEnabled" = ${s.slots["3h"].enabled ? 1 : 0}, "slot3hMinutes" = ${s.slots["3h"].minutes},
       "slot1hEnabled" = ${s.slots["1h"].enabled ? 1 : 0}, "slot1hMinutes" = ${s.slots["1h"].minutes},
       "slot30mEnabled" = ${s.slots["30m"].enabled ? 1 : 0}, "slot30mMinutes" = ${s.slots["30m"].minutes},
       "slot5mEnabled" = ${s.slots["5m"].enabled ? 1 : 0}, "slot5mMinutes" = ${s.slots["5m"].minutes},
       "graceMinutes" = ${s.graceMinutes},
       "scanIntervalSeconds" = ${s.scanIntervalSeconds},
       "notifyAdmin" = ${s.notifyAdmin ? 1 : 0},
       "adminPhone" = ${s.adminPhone ? `'${s.adminPhone.replace(/'/g, "''")}'` : "NULL"},
       "updatedAt" = CURRENT_TIMESTAMP
     WHERE "id" = 1`
  );
}

/** Label manusiawi dari menit: 180 → "3 jam", 45 → "45 menit". */
export function minutesToLabel(minutes: number): string {
  if (minutes % 60 === 0 && minutes >= 60) {
    const h = minutes / 60;
    return `${h} jam`;
  }
  return `${minutes} menit`;
}
