import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getReminderSettings, parseAdminPhones, isValidPhone } from "@/lib/reminders/config";
import {
  sendMessage,
  phoneToChatId,
  resolveSessionId,
  openwaConfigured,
  logMessage,
} from "@/lib/openwa-api-client";

/** Bangun pesan test per tipe reminder. */
function buildTestMessage(type: "cod" | "return" | "late", now: Date): string {
  if (type === "cod") {
    return (
      `*PENGINGAT TEST COD ⏰*\n\n` +
      `Ini pesan TEST sistem reminder COD (sebelum pickup/antar).\n\n` +
      `Jika pesan ini masuk, konfigurasi reminder Anda benar! ✅\n\n` +
      `Dikirim: ${now.toLocaleString("id-ID")}`
    );
  }
  if (type === "return") {
    return (
      `*REMINDER TEST PENGEMBALIAN 📷*\n\n` +
      `Ini pesan TEST sistem reminder pengembalian.\n\n` +
      `Jika pesan ini masuk, konfigurasi reminder Anda benar! ✅\n\n` +
      `Dikirim: ${now.toLocaleString("id-ID")}`
    );
  }
  return (
    `*PERINGATAN TEST KETERLAMBATAN ⚠️*\n\n` +
    `Ini pesan TEST sistem peringatan keterlambatan.\n\n` +
    `Jika pesan ini masuk, konfigurasi reminder Anda benar! ✅\n\n` +
    `Dikirim: ${now.toLocaleString("id-ID")}`
  );
}

/**
 * POST /api/reminders/test — kirim pesan test LANGSUNG ke nomor yang DIINPUT.
 *
 * ATURAN KEAMANAN KETAT:
 *   • TIDAK PERNAH mengambil nomor dari database / order / customer otomatis.
 *   • Hanya mengirim ke nomor yang secara eksplisit dimasukkan di body request
 *     (dari input "Nomor WA Admin" / "Nomor WA Customer" di tab Reminder).
 *   • Nomor kosong/tidak valid dilewati — bila tidak ada satu pun nomor valid,
 *     endpoint menolak mengirim apa pun.
 *
 * Body: { type, phones: string[] }
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !["admin", "mitra"].includes(session.user.role)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      type?: string;
      /** Daftar nomor tujuan — HANYA nomor yang diinput manual di form. */
      phones?: string[];
    };
    const type = body.type === "return" || body.type === "late" ? body.type : "cod";

    if (!openwaConfigured()) {
      return NextResponse.json(
        { ok: false, error: "OpenWA belum terkonfigurasi (OPENWA_API_KEY / OPENWA_SESSION_ID)" },
        { status: 500 }
      );
    }
    const sessionId = await resolveSessionId();
    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: "Sesi OpenWA tidak ditemukan. Periksa halaman Setup & Konfigurasi." },
        { status: 500 }
      );
    }

    // Saring hanya nomor yang benar-benar diinput & valid — jangan pernah kirim ke yang lain.
    const validPhones = Array.isArray(body.phones)
      ? body.phones.filter(isValidPhone)
      : [];

    if (validPhones.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Tidak ada nomor tujuan yang diinput. Masukkan minimal satu nomor WA yang valid sebelum test kirim.",
        },
        { status: 400 }
      );
    }

    const message = buildTestMessage(type, new Date());
    const settings = await getReminderSettings();
    void settings; // settings tidak dipakai untuk menentukan penerima (aturan keamanan)

    let okCount = 0;
    let failCount = 0;
    const sentTo: Array<{ phone: string; ok: boolean; error?: string }> = [];

    for (const phone of validPhones) {
      const chatId = phoneToChatId(phone);
      await logMessage({
        sessionId,
        chatId,
        body: message.slice(0, 1000),
        status: "pending",
        orderId: null,
      });
      const sendResult = await sendMessage(sessionId, { chatId, text: message });
      if (sendResult.ok) {
        okCount++;
        sentTo.push({ phone, ok: true });
      } else {
        failCount++;
        sentTo.push({ phone, ok: false, error: sendResult.error });
      }
    }

    return NextResponse.json({
      ok: okCount > 0,
      sent: okCount,
      failed: failCount,
      sentTo,
      message:
        okCount > 0
          ? `Pesan test terkirim ke ${okCount} nomor${failCount > 0 ? ` (${failCount} gagal)` : ""}.`
          : "Semua pengiriman gagal. Periksa sesi OpenWA dan nomor tujuan.",
    });
  } catch (error) {
    console.error("[reminder-test] failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
