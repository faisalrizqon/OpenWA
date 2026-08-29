/** Validasi & perhitungan kode promo — dipakai checkout server-side. */

export interface PromoLike {
  id: number;
  code: string;
  discountType: string; // amount | percent
  discountValue: number;
  minOrderAmount: number | null;
  maxDiscount: number | null;
  startDate: Date;
  endDate: Date;
  usageLimit: number;
  usedCount: number;
  active: boolean;
}

/** Cek kelayakan promo; return null bila valid, atau pesan error bila tidak. */
export function checkPromoEligibility(
  promo: PromoLike,
  itemsTotal: number,
  now: Date = new Date()
): string | null {
  if (!promo.active) return "Kode promo tidak aktif";
  if (now < promo.startDate || now > promo.endDate) return "Kode promo sudah tidak berlaku";
  if (promo.usageLimit > 0 && promo.usedCount >= promo.usageLimit) {
    return "Kode promo sudah habis dipakai";
  }
  if (promo.minOrderAmount != null && itemsTotal < promo.minOrderAmount) {
    return `Minimal order Rp ${promo.minOrderAmount.toLocaleString("id-ID")} untuk kode ini`;
  }
  return null;
}

/** Hitung nilai diskon dari subtotal item (dibulatkan, tidak negatif). */
export function calcPromoDiscount(promo: PromoLike, itemsTotal: number): number {
  let discount =
    promo.discountType === "percent"
      ? (itemsTotal * promo.discountValue) / 100
      : promo.discountValue;
  if (promo.discountType === "percent" && promo.maxDiscount != null) {
    discount = Math.min(discount, promo.maxDiscount);
  }
  return Math.max(0, Math.min(Math.round(discount), itemsTotal));
}

/** Format label diskon untuk tampilan, mis. "LEBARAN20 (10%)". */
export function formatPromoLabel(promo: PromoLike): string {
  return `${promo.code} (${promo.discountType === "percent" ? `${promo.discountValue}%` : `Rp ${promo.discountValue.toLocaleString("id-ID")}`})`;
}
