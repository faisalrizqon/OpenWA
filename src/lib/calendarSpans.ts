import { addDays, differenceInCalendarDays, startOfWeek } from "date-fns";

const WEEK_STARTS_ON = 1;

/** Nama & ID produk dalam order — dipakai untuk link ke katalog */
export interface ProductLink {
  name: string;
  id: number;
}

export interface CalendarOrder {
  orderId: string;
  orderNumber: string;
  customerName: string;
  status: string;
  units: number;
  /** String nama produk (untuk display). Contoh: "Kodak FZ55, Canon IXUS" */
  products: string;
  /** Array product dengan link info — bisa banyak item berbeda per order */
  productsWithLinks: ProductLink[];
  startDate: Date;
  endDate: Date;
}

export interface OrderSpan {
  orderId: string;
  orderNumber: string;
  customerName: string;
  status: string;
  units: number;
  products: string;
  /** Produk dalam order dengan ID — untuk link ke katalog di popover. */
  productsWithLinks: ProductLink[];
  startIso: string;
  endIso: string;
  segStartIso: string;
  week: number;
  colStart: number;
  colSpan: number;
  clippedStart: boolean;
  clippedEnd: boolean;
}

/** Bangun spans untuk semua order (server-safe, murni perhitungan tanggal). */
export function buildSpans(orders: CalendarOrder[], gridStart: Date, weeks: number): OrderSpan[] {
  return orders.flatMap((o) => spansForOrder(o, gridStart, weeks));
}

/** Hitung span grid sebuah order di grid 7-kolom / multi-minggu. */
export function spansForOrder(order: CalendarOrder, gridStart: Date, weeks: number): OrderSpan[] {
  const oStartDay = new Date(order.startDate);
  oStartDay.setHours(0, 0, 0, 0);

  const oEndDay = new Date(order.endDate);
  const atMidnight =
    oEndDay.getHours() === 0 &&
    oEndDay.getMinutes() === 0 &&
    oEndDay.getSeconds() === 0 &&
    oEndDay.getMilliseconds() === 0;
  if (atMidnight) oEndDay.setDate(oEndDay.getDate() - 1);
  oEndDay.setHours(0, 0, 0, 0);

  const viewStart = gridStart;
  const viewEnd = addDays(gridStart, weeks * 7); // eksklusif
  const clippedStart = oStartDay < viewStart;
  const clippedEnd = addDays(oEndDay, 1) > viewEnd;

  const effStart = oStartDay < viewStart ? viewStart : oStartDay;
  const effEnd = oEndDay >= viewEnd ? addDays(viewEnd, -1) : oEndDay;
  if (effStart > effEnd) return [];

  const spans: OrderSpan[] = [];
  let cursor = effStart;
  while (cursor <= effEnd) {
    const weekStart = startOfWeek(cursor, { weekStartsOn: WEEK_STARTS_ON });
    const weekEnd = addDays(weekStart, 7); // eksklusif
    const segStart = cursor;
    const segEnd = effEnd < weekEnd ? effEnd : addDays(weekEnd, -1);

    const week = Math.floor(differenceInCalendarDays(segStart, gridStart) / 7) + 1;
    const colStart = (differenceInCalendarDays(segStart, gridStart) % 7) + 1;
    const colSpan = differenceInCalendarDays(segEnd, segStart) + 1;

    spans.push({
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      status: order.status,
      units: order.units,
      products: order.products,
      /** Produk dalam order dengan ID — untuk link ke katalog di popover. */
      productsWithLinks: order.productsWithLinks,
      startIso: order.startDate.toISOString(),
      endIso: order.endDate.toISOString(),
      segStartIso: segStart.toISOString(),
      week,
      colStart,
      colSpan,
      clippedStart: clippedStart && segStart.getTime() === effStart.getTime(),
      clippedEnd: clippedEnd && segEnd.getTime() === effEnd.getTime(),
    });

    cursor = weekEnd;
  }
  return spans;
}
