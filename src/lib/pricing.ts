export interface TieredProduct {
  price6h: number;
  price12h: number;
  price24h: number;
  price48h: number;
}

/** Pilih harga tier terkecil yang ≥ durasi. Tier berharga 0 dilewati.
 *  Durasi > 48 jam dihitung kelipatan harga 24 jam (ceil). */
export function getTierPrice(product: TieredProduct, durationHours: number): number {
  if (durationHours <= 0) throw new Error("Duration must be positive");

  if (durationHours <= 6 && product.price6h > 0) return product.price6h;
  if (durationHours <= 12 && product.price12h > 0) return product.price12h;
  if (durationHours <= 24 && product.price24h > 0) return product.price24h;
  if (durationHours <= 48 && product.price48h > 0) return product.price48h;

  const dailyRate =
    product.price24h || product.price48h / 2 || product.price12h / 2 || product.price6h;
  return Math.ceil(durationHours / 24) * dailyRate;
}

export interface PricingInput {
  unitPrice: number;
  quantity: number;
  discountType?: "amount" | "percent" | null;
  discountValue?: number;
}

export function calcSubtotal(input: PricingInput): number {
  const base = input.unitPrice * input.quantity;
  let subtotal = base;
  if (input.discountType === "amount") {
    subtotal = base - (input.discountValue ?? 0);
  } else if (input.discountType === "percent") {
    subtotal = base * (1 - (input.discountValue ?? 0) / 100);
  }
  return Math.max(Math.round(subtotal), 0);
}

export function calcOrderTotal(subtotals: number[]): number {
  return subtotals.reduce((a, b) => a + b, 0);
}

export function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}
