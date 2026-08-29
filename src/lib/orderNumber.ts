/** Generator nomor order: ORD-YYYYMMDD-NNN (tanggal lokal).
 *
 *  Nomor diambil dari NOMOR TERBESAR yang sudah ada untuk tanggal tersebut
 *  (bukan jumlah order). Ini penting: bila ada order yang dihapus di tengah
 *  hari, count-based numbering akan menghasilkan nomor duplikat dan create
 *  gagal dengan "Unique constraint failed on orderNumber". */

/** Prefix nomor order untuk tanggal lokal tertentu: "ORD-YYYYMMDD-". */
export function orderNumberPrefix(date: Date = new Date()): string {
  // Format lokal (bukan UTC) — nomor order mengikuti hari kalender lokal
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(
    date.getDate()
  ).padStart(2, "0")}`;
  return `ORD-${ymd}-`;
}

/** Hitung nomor berikutnya dari daftar nomor yang sudah ada.
 *  Pure function — mudah di-test dan dipakai ulang. */
export function nextOrderNumberFrom(existing: string[], date: Date = new Date()): string {
  const prefix = orderNumberPrefix(date);
  const lastSeq = existing.reduce((max, num) => {
    if (!num.startsWith(prefix)) return max;
    const n = Number(num.slice(prefix.length));
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return `${prefix}${String(lastSeq + 1).padStart(3, "0")}`;
}

/** Ambil nomor order berikutnya langsung dari DB (dalam transaksi).
 *  SATU sumber kebenaran — dipakai createOrder admin & checkout online.
 *  `client` boleh prisma atau tx (structural typing, tanpa import konkret). */
export async function generateOrderNumber(
  client: {
    order: { findMany(args: unknown): Promise<Array<{ orderNumber: string }>> };
  },
  date: Date = new Date()
): Promise<string> {
  const prefix = orderNumberPrefix(date);
  const rows = await client.order.findMany({
    where: { orderNumber: { startsWith: prefix } },
    select: { orderNumber: true },
  });
  return nextOrderNumberFrom(
    rows.map((r) => r.orderNumber),
    date
  );
}
