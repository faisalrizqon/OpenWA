export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Count busy units for a product in a time range.
 * orders = active/booking/late orders with productId and quantity */
export function countOverlapUnits(
  productId: number,
  rangeStart: Date,
  rangeEnd: Date,
  orders: { status: string; startDate: Date; endDate: Date; productId: number; quantity: number }[]
): number {
  const busyStatuses = ["active", "booking", "late"];
  return orders
    .filter(
      (o) =>
        o.productId === productId &&
        busyStatuses.includes(o.status) &&
        rangesOverlap(rangeStart, rangeEnd, o.startDate, o.endDate)
    )
    .reduce((sum, o) => sum + o.quantity, 0);
}
