export function nextOrderNumber(existingCount: number, date: Date = new Date()): string {
  // Format lokal (bukan UTC) — nomor order mengikuti hari kalender lokal
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(
    date.getDate()
  ).padStart(2, "0")}`;
  return `ORD-${ymd}-${String(existingCount + 1).padStart(3, "0")}`;
}
