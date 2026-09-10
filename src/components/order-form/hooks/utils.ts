import { type ItemDraft, type ProductOption } from "../types";

export { parseWhatsAppPhone, isValidWaPhone, phoneDigits } from "@/lib/phone";

/** Convert a Date object to local HTML input value (datetime-local format). */
export function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/** Return a new item draft with default values for the first product. */
export function addItem(products: ProductOption[]): Omit<ItemDraft, "key"> {
  return {
    productId: products[0]?.id ?? 0,
    quantity: 1,
    durationHours: 24,
    unitPriceOverride: "",
    discountType: "none",
    discountValue: "",
  };
}

/** Return updated items array with patched item at given key. */
export function updateItem(items: ItemDraft[], key: number, patch: Partial<ItemDraft>): ItemDraft[] {
  return items.map((it) => (it.key === key ? { ...it, ...patch } : it));
}

/** Return filtered items array without item at given key. */
export function removeItem(items: ItemDraft[], key: number): ItemDraft[] {
  return items.filter((it) => it.key !== key);
}
