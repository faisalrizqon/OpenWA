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
