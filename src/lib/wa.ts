export interface BookingWAInput {
  orderNumber: string;
  customerName: string;
  items: { productName: string; quantity: number; durationHours: number }[];
  startDate: Date;
  endDate: Date;
  total: number;
  sisa: number;
}

const dateFmt = (d: Date) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(d);

export function formatBookingWA(order: BookingWAInput): string {
  const lines = [
    `Halo ${order.customerName}, terima kasih sudah booking di MudahSewa! 📷`,
    "",
    `Konfirmasi booking *${order.orderNumber}*:`,
    ...order.items.map(
      (it) => `- ${it.productName} ×${it.quantity} (${it.durationHours} jam)`
    ),
    "",
    `Ambil: ${dateFmt(order.startDate)}`,
    `Kembali: ${dateFmt(order.endDate)}`,
    "",
    `Total: Rp ${order.total.toLocaleString("id-ID")}`,
  ];
  if (order.sisa > 0) {
    lines.push(`Sisa bayar: Rp ${order.sisa.toLocaleString("id-ID")}`);
  } else {
    lines.push("Sudah lunas ✅");
  }
  lines.push("", "Sampai jumpa! Jangan lupa kembalikan tepat waktu ya 😊");
  return lines.join("\n");
}

export function waLink(phone: string, text: string): string {
  return `https://wa.me/62${phone.replace(/^0/, "")}?text=${encodeURIComponent(text)}`;
}

/** Reminder H-1 pengembalian: dikirim sehari sebelum tanggal kembali. */
export function formatReturnReminderWA(input: {
  customerName: string;
  orderNumber: string;
  endDate: Date;
  productNames: string[];
}): string {
  return [
    `Halo ${input.customerName}, mengingatkan sewa di MudahSewa 📷`,
    "",
    `Order *${input.orderNumber}* (${input.productNames.join(", ")})`,
    `jatuh tempo pengembalian: *${dateFmt(input.endDate)}*`,
    "",
    "Mohon dikembalikan tepat waktu ya. Terima kasih! 🙏",
  ].join("\n");
}

/** Peringatan keterlambatan pengembalian (order berstatus late). */
export function formatLateWarningWA(input: {
  customerName: string;
  orderNumber: string;
  endDate: Date;
  lateDays: number;
  fine: number;
}): string {
  const lines = [
    `Halo ${input.customerName}, order *${input.orderNumber}* tercatat belum dikembalikan.`,
    "",
    `Jatuh tempo: ${dateFmt(input.endDate)} (terlambat ${input.lateDays} hari)`,
  ];
  if (input.fine > 0) {
    lines.push(`Perkiraan denda berjalan: Rp ${input.fine.toLocaleString("id-ID")}`);
  }
  lines.push("", "Mohon segera dikembalikan. Terima kasih! 🙏");
  return lines.join("\n");
}

export interface OrderIncomingInput {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  source: string; // admin | online
  deliveryMode: string; // pickup | courier
  items: string[];
  startDate: Date;
  endDate: Date;
  total: number;
  paymentMethod?: string | null;
}

/** Notifikasi "order masuk" untuk admin: ringkasan pesanan baru (dibuat admin
 *  atau checkout online) agar bisa segera diproses. */
export function formatOrderIncomingWA(input: OrderIncomingInput): string {
  const sumber = input.source === "online" ? "Checkout Online 🛒" : "Dibuat Admin 🧑‍💼";
  const lines = [
    `*ORDER MASUK* 📥`,
    "",
    `Order: *${input.orderNumber}*`,
    `Sumber: ${sumber}`,
    `Customer: ${input.customerName} (${input.customerPhone})`,
    "",
    `📦 Item:`,
    ...input.items.map((n) => `• ${n}`),
    "",
    `🕐 ${input.deliveryMode === "courier" ? "Diantar" : "Ambil"}: ${dateFmt(input.startDate)}`,
    `↩️ Kembali: ${dateFmt(input.endDate)}`,
    "",
    `💰 Total: Rp ${Math.round(input.total).toLocaleString("id-ID")}`,
  ];
  if (input.paymentMethod) {
    lines.push(`Pembayaran: ${input.paymentMethod.toUpperCase()}`);
  }
  return lines.join("\n");
}

/** Konfirmasi pesanan diterima untuk customer (opsional, bila diaktifkan di
 *  pengaturan Reminder tab). */
export function formatOrderReceivedWA(input: OrderIncomingInput): string {
  return [
    `Halo ${input.customerName}! Pesanan kamu sudah kami terima ✅`,
    "",
    `Order *${input.orderNumber}*:`,
    ...input.items.map((n) => `• ${n}`),
    "",
    `Ambil/antar: ${dateFmt(input.startDate)}`,
    `Kembali: ${dateFmt(input.endDate)}`,
    "",
    `Total: Rp ${Math.round(input.total).toLocaleString("id-ID")}`,
    "",
    "Kami akan hubungi kamu untuk konfirmasi berikutnya. Terima kasih! 😊",
  ].join("\n");
}
