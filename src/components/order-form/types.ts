export interface ProductOption {
  id: number;
  name: string;
  sku: string;
  price6h: number;
  price12h: number;
  price24h: number;
  price48h: number;
  availableUnits: number;
}

export interface CustomerOption {
  id: number;
  name: string;
  phone: string;
  isBlacklisted: boolean;
}

export interface ItemDraft {
  key: number;
  productId: number;
  quantity: number;
  durationHours: number;
  unitPriceOverride: string;
  discountType: "none" | "amount" | "percent";
  discountValue: string;
}
