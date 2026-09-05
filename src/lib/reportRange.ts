/**
 * Logika rentang periode laporan — modul murni TANPA dependensi prisma/DB.
 *
 * PENTING: file ini diimpor oleh client component (`ReportPeriodFilter.tsx`).
 * Jangan pernah menambah `import { prisma } from "@/lib/db"` di sini —
 * itu akan menyeret PrismaClient ke bundle browser dan memicu runtime error
 * "PrismaClient is unable to run in this browser environment".
 */

/** Preset periode yang tersedia di UI laporan. */
export const REPORT_PRESET_DAYS = [7, 30, 90, 180, 365] as const;

/** Batas maksimal rentang laporan (hari) — jaga performa query & ukuran tabel. */
export const MAX_REPORT_DAYS = 365;

/** Preset fallback bila param tidak valid. */
export const DEFAULT_REPORT_DAYS = 30;

/** Jumlah baris order maksimal yang dirender di halaman (ekspor tetap penuh). */
export const MAX_ORDER_ROWS_ON_PAGE = 300;

export interface ReportRangeInput {
  /** Preset jumlah hari terakhir (dipakai bila from/to tidak diberikan). */
  days?: number | null;
  /** Tanggal awal rentang custom, format `YYYY-MM-DD`. */
  from?: string | null;
  /** Tanggal akhir rentang custom, format `YYYY-MM-DD`. */
  to?: string | null;
}

export interface ResolvedReportRange {
  rangeStart: Date;
  rangeEnd: Date;
  /** Jumlah hari rentang (inklusif). */
  days: number;
  /** true bila rentang ditentukan manual via from/to, false bila preset. */
  custom: boolean;
}

function isPreset(n: number): boolean {
  return (REPORT_PRESET_DAYS as readonly number[]).includes(n);
}

function normalizePreset(raw?: number | null): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return DEFAULT_REPORT_DAYS;
  return isPreset(raw) ? raw : DEFAULT_REPORT_DAYS;
}

/** Format Date lokal → `YYYY-MM-DD`. */
export function reportDateValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Ubah param query laporan menjadi rentang waktu konkret.
 *
 * Aturan:
 * - `from`/`to` (YYYY-MM-DD) menang atas `days` — mode rentang custom.
 * - Keduanya wajib diisi bersamaan; bila hanya satu, dilempar sebagai error.
 * - `from` tidak boleh setelah `to`.
 * - Rentang tidak boleh melebihi {@link MAX_REPORT_DAYS} hari.
 * - Rentang tidak boleh berakhir di masa depan (data belum ada).
 * - Tanpa `from`/`to` → preset `days` (7/30/90/180/365), fallback 30.
 *
 * Melempar `RangeError` dengan pesan siap-tampil bila rentang tidak valid.
 */
export function resolveReportRange(input: ReportRangeInput = {}): ResolvedReportRange {
  const fromRaw = typeof input.from === "string" ? input.from.trim() : "";
  const toRaw = typeof input.to === "string" ? input.to.trim() : "";

  // --- Mode preset: N hari terakhir ---
  if (!fromRaw && !toRaw) {
    const days = normalizePreset(input.days ?? undefined);
    const rangeEnd = endOfToday();
    const rangeStart = startOfDay(new Date(rangeEnd.getTime() - (days - 1) * 24 * 3600_000));
    return { rangeStart, rangeEnd, days, custom: false };
  }

  // --- Mode custom: rentang tanggal eksplisit ---
  if (!fromRaw || !toRaw) {
    throw new RangeError("Rentang tanggal harus lengkap: isi tanggal awal dan tanggal akhir.");
  }

  const from = parseDateOnly(fromRaw, "start");
  const to = parseDateOnly(toRaw, "end");

  if (!from || !to) {
    throw new RangeError("Format tanggal tidak valid. Gunakan format YYYY-MM-DD.");
  }

  if (from.getTime() > to.getTime()) {
    throw new RangeError("Tanggal awal tidak boleh setelah tanggal akhir.");
  }

  // `to` sudah dinormalkan ke 23:59:59.999, jadi selisih from→to sudah
  // mencakup hari akhir. Math.round (bukan +1) agar inklusif & aman terhadap DST.
  const days = Math.round((to.getTime() - from.getTime()) / (24 * 3600_000));

  if (days > MAX_REPORT_DAYS) {
    throw new RangeError(
      `Rentang laporan maksimal ${MAX_REPORT_DAYS} hari (±1 tahun). Rentang yang diminta ${days} hari — persempit tanggalnya.`
    );
  }

  if (to.getTime() > endOfToday().getTime()) {
    throw new RangeError("Tanggal akhir tidak boleh melewati hari ini.");
  }

  return { rangeStart: from, rangeEnd: to, days, custom: true };
}

/**
 * Jumlah hari inklusif antara dua string `YYYY-MM-DD`.
 * Dipakai validasi client-side sebelum submit (pesan error tanpa round-trip).
 */
export function reportSpanDays(from: string, to: string): number {
  const a = parseDateOnly(from, "start");
  const b = parseDateOnly(to, "end");
  if (!a || !b) return 0;
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / (24 * 3600_000)));
}

/**
 * Validasi rentang tanpa melempar — kembalikan pesan error (string kosong = valid).
 * Berguna untuk client component agar bisa menampilkan pesan inline.
 */
export function validateReportRange(from: string, to: string): string {
  try {
    resolveReportRange({ from, to });
    return "";
  } catch (err) {
    return err instanceof Error ? err.message : "Rentang laporan tidak valid.";
  }
}

/** Susun query string laporan (dipakai UI + tombol ekspor agar konsisten). */
export function buildReportQuery(params: {
  days?: number | null;
  from?: string | null;
  to?: string | null;
  format?: "csv" | "xlsx" | null;
}): string {
  const qs = new URLSearchParams();
  if (params.from && params.to) {
    qs.set("from", params.from);
    qs.set("to", params.to);
  } else if (params.days) {
    qs.set("days", String(params.days));
  }
  if (params.format) qs.set("format", params.format);
  return qs.toString();
}

/** Parse `YYYY-MM-DD` jadi Date lokal; `start` → 00:00:00.000, `end` → 23:59:59.999. */
function parseDateOnly(value: string, edge: "start" | "end"): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  if (Number.isNaN(date.getTime())) return null;
  // Tolak tanggal yang tidak eksis (mis. 2025-02-30 → rollover ke Maret).
  if (
    date.getFullYear() !== Number(y) ||
    date.getMonth() !== Number(mo) - 1 ||
    date.getDate() !== Number(d)
  ) {
    return null;
  }
  if (edge === "end") date.setHours(23, 59, 59, 999);
  else date.setHours(0, 0, 0, 0);
  return date;
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function endOfToday(): Date {
  const out = new Date();
  out.setHours(23, 59, 59, 999);
  return out;
}
