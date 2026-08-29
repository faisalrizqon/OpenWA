import { NextResponse } from "next/server";
import { processCodReminders, startCodReminderLoop, getCodReminderStatus } from "@/lib/reminders/scheduler";

/**
 * Endpoint reminder COD — dipakai untuk dua hal:
 *  1. GET  → status ringkas + memastikan scheduler interval berjalan (start loop).
 *  2. Dipanggil manual (mis. dari tombol di dashboard) → langsung scan & kirim.
 *
 * Loop utama berjalan sebagai setInterval di dalam proses server (lihat
 * startCodReminderLoop) sehingga reminder tetap terkirim tanpa cron eksternal.
 * Endpoint ini aman & idempoten (status tracking per slot).
 */
export async function GET() {
  startCodReminderLoop();

  try {
    const result = await processCodReminders();
    const status = await getCodReminderStatus();
    return NextResponse.json({ ok: true, ...result, status });
  } catch (error) {
    console.error("[cron/reminder] failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
