import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getReminderSettings, parseAdminPhones } from "@/lib/reminders/config";
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
 * POST /api/reminders/test — kirim pesan test langsung ke semua nomor target
 * yang dikonfigurasi (customer sample / nomor admin). Dipakai dari tombol
 * "Test Kirim" di tab Reminder untuk verifikasi pengaturan sebelum production.
 *
 * Body: { type: "cod" | "return" | "late" }
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !["admin", "mitra"].includes(session.user.role)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { type?: string };
    const type = body.type === "return" || body.type === "late" ? body.type : "cod";

    const settings = await getReminderSettings();

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

    // Kumpulkan nomor target sesuai pengaturan
    const targets: Array<{ phone: string; label: string }> = [];
    const adminPhones = parseAdminPhones(settings.adminPhones);

    if (settings.sendToCustomer) {
      // Pakai nomor pemesan terbaru sebagai sample (test tidak butuh order nyata)
      const sampleOrder = await prisma.order.findFirst({
        orderBy: { createdAt: "desc" },
        include: { customer: { select: { phone: true } } },
      });
      if (sampleOrder?.customer.phone) {
        targets.push({ phone: sampleOrder.customer.phone, label: "customer (sample)" });
      }
    }
    if (settings.sendToAdmin) {
      for (const phone of adminPhones) {
        targets.push({ phone, label: "admin" });
      }
    }

    if (targets.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Tidak ada target penerima. Nyalakan 'Kirim ke Customer' atau 'Kirim ke Admin' dan isi nomor admin di tab Reminder.",
        },
        { status: 400 }
      );
    }

    const message = buildTestMessage(type, new Date());

    // Kirim ke semua target
    let okCount = 0;
    let failCount = 0;
    const sentTo: Array<{ phone: string; label: string; ok: boolean; error?: string }> = [];

    for (const target of targets) {
      const chatId = phoneToChatId(target.phone);
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
        sentTo.push({ phone: target.phone, label: target.label, ok: true });
      } else {
        failCount++;
        sentTo.push({ phone: target.phone, label: target.label, ok: false, error: sendResult.error });
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
