import { NextResponse } from "next/server";
import { processAllReminders, startReminderLoop, getReminderStatusSummary } from "@/lib/reminders/scheduler";

/**
 * Endpoint reminder COD/RETURN/LATE — dipakai untuk dua hal:
 *  1. GET  → status ringkas + memastikan scheduler interval berjalan (start loop).
 *  2. Dipanggil manual (mis. dari tombol di dashboard) → langsung scan & kirim.
 *
 * Loop utama berjalan sebagai setInterval di dalam proses server (lihat
 * startReminderLoop) sehingga reminder tetap terkirim tanpa cron eksternal.
 * Endpoint ini aman & idempoten (status tracking per slot).
 */
export async function GET() {
  startReminderLoop();

  try {
    const result = await processAllReminders();
    const status = await getReminderStatusSummary();
    return NextResponse.json({ ok: true, ...result, status });
  } catch (error) {
    console.error("[cron/reminder] failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
