/** Overlap dua rentang waktu [aStart,aEnd) dan [bStart,bEnd). */
export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Perpanjang waktu selesai sewa dengan jeda charge & istirahat unit (default 3 jam).
 *  Unit yang baru selesai dirental tidak bisa langsung disewa lagi — butuh waktu
 *  untuk charge & istirahat sebelum unit (atau unit dengan brand yang sama) dipakai ulang. */
export function extendWithRestBuffer(endDate: Date, chargingRestHours: number = 3): Date {
  return new Date(endDate.getTime() + chargingRestHours * 3600_000);
}

/** Hitung jumlah unit yang sibuk untuk satu produk dalam rentang waktu,
 *  dengan memperhitungkan jeda charge/istirahat setelah tiap sewa selesai.
 *
 *  Order `pending` tidak mengunci stok — hanya booking/active/late.
 *  `restBufferHours` (default 3) memperpanjang akhir tiap order sibuk sehingga
 *  unit baru dianggap bebas setelah masa charge/istirahat lewat. */
export function countOverlapUnits(
  productId: number,
  rangeStart: Date,
  rangeEnd: Date,
  orders: Array<{
    status: string;
    startDate: Date;
    endDate: Date;
    productId: number;
    quantity: number;
  }>,
  restBufferHours: number = 3
): number {
  const busyStatuses = ["active", "booking", "late"]; // pending tidak mengunci stok
  return orders
    .filter(
      (o) =>
        o.productId === productId &&
        busyStatuses.includes(o.status) &&
        rangesOverlap(rangeStart, rangeEnd, o.startDate, extendWithRestBuffer(o.endDate, restBufferHours))
    )
    .reduce((sum, o) => sum + o.quantity, 0);
}

/** Cari tanggal mulai berikutnya (maju hari demi hari, maksimum `maxDays`)
 *  di mana `quantity` unit produk tersedia untuk sewa berdurasi `durationHours`.
 *  Waktu-jam mengikuti jam pada `desiredStart`. Mengembalikan null bila tidak ada.
 *
 *  Dipakai untuk memberi saran "coba tanggal lain" saat sold out. */
export function findNextAvailableStart(
  productId: number,
  desiredStart: Date,
  durationHours: number,
  quantity: number,
  totalUnits: number,
  orders: Array<{
    status: string;
    startDate: Date;
    endDate: Date;
    productId: number;
    quantity: number;
  }>,
  restBufferHours: number = 3,
  maxDays: number = 30
): Date | null {
  const durMs = durationHours * 3600_000;
  for (let day = 0; day <= maxDays; day++) {
    const candidate = new Date(desiredStart.getTime());
    candidate.setDate(candidate.getDate() + day);
    const candidateEnd = new Date(candidate.getTime() + durMs);
    const busy = countOverlapUnits(productId, candidate, candidateEnd, orders, restBufferHours);
    if (totalUnits - busy >= quantity) return candidate;
  }
  return null;
}
