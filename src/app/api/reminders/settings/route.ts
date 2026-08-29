import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getReminderSettings, saveReminderSettings, ReminderSettings, SLOT_KEYS } from "@/lib/reminders/config";
import { startReminderLoop } from "@/lib/reminders/scheduler";

export async function GET() {
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

    const current = await getReminderSettings();

    const num = (v: unknown, fb: number) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? n : fb;
    };

    // Merge COD slots — hanya slot yang dikenal
    const codSlots = { ...current.cod.slots };
    if (data.cod?.slots) {
      for (const key of SLOT_KEYS) {
        const incoming = (data.cod.slots as Record<string, { enabled?: boolean; minutesBefore?: number }>)[key];
        if (incoming) {
          codSlots[key] = {
            ...codSlots[key],
            enabled: incoming.enabled ?? codSlots[key].enabled,
            minutesBefore: num(incoming.minutesBefore, codSlots[key].minutesBefore),
          };
        }
      }
    }

    // Merge RETURN slots
    const returnSlots = { ...current.return.slots };
    if (data.return?.slots) {
      for (const key of Object.keys(current.return.slots)) {
        const incoming = (data.return.slots as Record<string, { enabled?: boolean; minutesBefore?: number }>)[key];
        if (incoming) {
          returnSlots[key as keyof typeof returnSlots] = {
            ...returnSlots[key as keyof typeof returnSlots],
            enabled: incoming.enabled ?? returnSlots[key as keyof typeof returnSlots].enabled,
            minutesBefore: num(incoming.minutesBefore, returnSlots[key as keyof typeof returnSlots].minutesBefore),
          };
        }
      }
    }

    const settings: ReminderSettings = {
      enabled: data.enabled ?? current.enabled,
      cod: {
        slots: codSlots,
        graceMinutes: num(data.cod?.graceMinutes, current.cod.graceMinutes),
      },
      return: {
        slots: returnSlots,
        graceMinutes: num(data.return?.graceMinutes, current.return.graceMinutes),
      },
      late: {
        enabled: data.late?.enabled ?? current.late.enabled,
        initialDelayHours: num(data.late?.initialDelayHours, current.late.initialDelayHours),
        repeatIntervalDays: Math.max(1, num(data.late?.repeatIntervalDays, current.late.repeatIntervalDays)),
      },
      scanIntervalSeconds: Math.max(15, num(data.scanIntervalSeconds, current.scanIntervalSeconds)),
      sendToCustomer: data.sendToCustomer ?? current.sendToCustomer,
      sendToAdmin: data.sendToAdmin ?? current.sendToAdmin,
      adminPhones: typeof data.adminPhones === "string" ? (data.adminPhones.trim() || null) : current.adminPhones,
      notifyAdmin: data.notifyAdmin ?? current.notifyAdmin,
      adminPhone: typeof data.adminPhone === "string" ? (data.adminPhone.trim() || null) : current.adminPhone,
    };

    await saveReminderSettings(settings);

    // Restart loop agar interval baru langsung berlaku
    startReminderLoop();

    return NextResponse.json({ ok: true, message: "Settings saved" });
  } catch (error) {
    console.error("[reminder-settings] POST failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "Failed to save settings" }, { status: 500 });
  }
}
