import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { processCodReminders, startCodReminderLoop, getCodReminderStatus } from "@/lib/reminders/scheduler";

/** Scan manual reminder COD — admin/mitra saja (dipakai dari tab Reminder).
 *  Sekaligus memastikan loop scheduler internal berjalan. */
export async function GET() {
  const session = await auth();
  if (!session?.user || !["admin", "mitra"].includes(session.user.role)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  startCodReminderLoop();

  try {
    const result = await processCodReminders();
    const status = await getCodReminderStatus();
    return NextResponse.json({ ok: true, ...result, status });
  } catch (error) {
    console.error("[reminder-scan] failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
