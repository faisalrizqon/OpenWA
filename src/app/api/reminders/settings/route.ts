import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getReminderSettings, saveReminderSettings, ReminderSettings, SLOT_KEYS } from "@/lib/reminders/config";
import { startCodReminderLoop } from "@/lib/reminders/scheduler";

export async function GET(request: NextRequest) {
  try {
    const settings = await getReminderSettings();
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    console.error("[reminder-settings] GET failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Failed to load settings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !["admin", "mitra"].includes(session.user.role)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  try {
    const data = await request.json() as Partial<ReminderSettings>;
    
    // Build slots dari field request — iterasi SLOT_KEYS agar index type-safe
    const buildSlots = () => {
      const result = {} as Record<"3h" | "1h" | "30m" | "5m", { enabled: boolean; minutes: number }>;
      for (const slot of SLOT_KEYS) {
        result[slot] = {
          enabled: Boolean(data.slots?.[slot]?.enabled),
          minutes: Math.max(1, Number(data.slots?.[slot]?.minutes) || 1),
        };
      }
      return result;
    };

    const settings: ReminderSettings = {
      enabled: Boolean(data.enabled ?? true),
      slots: buildSlots(),
      graceMinutes: Math.max(1, Number(data.graceMinutes) || 10),
      scanIntervalSeconds: Math.max(15, Number(data.scanIntervalSeconds) || 60),
      notifyAdmin: Boolean(data.notifyAdmin ?? false),
      adminPhone: typeof data.adminPhone === "string" && data.adminPhone.trim() ? data.adminPhone.trim() : null,
    };

    await saveReminderSettings(settings);
    
    // Restart loop bila interval berubah
    if (Number(data.scanIntervalSeconds) !== 60) {
      startCodReminderLoop();
    }

    return NextResponse.json({ ok: true, message: "Settings saved" });
  } catch (error) {
    console.error("[reminder-settings] POST failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Failed to save settings" }, { status: 500 });
  }
}
