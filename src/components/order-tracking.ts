/** Utilitas riwayat order di perangkat (localStorage) — supaya customer
 *  tanpa login tetap bisa melacak pesanannya dari perangkat yang sama. */

export const ORDER_HISTORY_KEY = "mudahsewa-orders";
const MAX_HISTORY = 20;

export function readOrderHistory(): string[] {
  try {
    const raw = localStorage.getItem(ORDER_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string" && v.length > 0);
  } catch {
    return [];
  }
}

export function saveOrderToHistory(orderNumber: string): void {
  try {
    const list = readOrderHistory().filter((n) => n !== orderNumber);
    list.unshift(orderNumber);
    localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
  } catch {
    /* private mode — abaikan */
  }
}

export function removeOrderFromHistory(orderNumber: string): void {
  try {
    const list = readOrderHistory().filter((n) => n !== orderNumber);
    localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(list));
  } catch {
    /* abaikan */
  }
}
