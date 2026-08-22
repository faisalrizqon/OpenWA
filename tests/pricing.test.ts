import { describe, it, expect } from "vitest";
import { getTierPrice, calcSubtotal, calcOrderTotal, formatRupiah } from "@/lib/pricing";
import type { TieredProduct } from "@/lib/pricing";

// Harga fixture = Kodak Pixpro FZ55 (ribuan rupiah)
const kodak: TieredProduct = { price6h: 30000, price12h: 50000, price24h: 75000, price48h: 115000 };

describe("getTierPrice", () => {
  it("durasi <= 6 jam pakai tier 6 jam", () => {
    expect(getTierPrice(kodak, 3)).toBe(30000);
    expect(getTierPrice(kodak, 6)).toBe(30000);
  });

  it("durasi 7-12 jam pakai tier 12 jam", () => {
    expect(getTierPrice(kodak, 8)).toBe(50000);
    expect(getTierPrice(kodak, 12)).toBe(50000);
  });

  it("durasi 13-24 jam pakai tier 24 jam", () => {
    expect(getTierPrice(kodak, 13)).toBe(75000);
    expect(getTierPrice(kodak, 24)).toBe(75000);
  });

  it("durasi 25-48 jam pakai tier 48 jam", () => {
    expect(getTierPrice(kodak, 30)).toBe(115000);
    expect(getTierPrice(kodak, 48)).toBe(115000);
  });

  it("durasi > 48 jam: kelipatan harga 24 jam (ceil)", () => {
    expect(getTierPrice(kodak, 49)).toBe(75000 * 3); // 3 hari
    expect(getTierPrice(kodak, 72)).toBe(75000 * 3);
    expect(getTierPrice(kodak, 96)).toBe(75000 * 4);
  });

  it("tier harga 0 di-skip ke tier berikutnya", () => {
    const tanpaTier6: TieredProduct = { price6h: 0, price12h: 40000, price24h: 55000, price48h: 100000 };
    expect(getTierPrice(tanpaTier6, 4)).toBe(40000);
  });

  it("durasi tidak valid (<= 0) → throw", () => {
    expect(() => getTierPrice(kodak, 0)).toThrow();
    expect(() => getTierPrice(kodak, -5)).toThrow();
  });
});

describe("calcSubtotal", () => {
  it("tanpa diskon: harga × qty", () => {
    expect(calcSubtotal({ unitPrice: 75000, quantity: 1 })).toBe(75000);
    expect(calcSubtotal({ unitPrice: 75000, quantity: 2 })).toBe(150000);
  });

  it("diskon amount: base - nominal", () => {
    expect(
      calcSubtotal({ unitPrice: 75000, quantity: 2, discountType: "amount", discountValue: 50000 })
    ).toBe(100000);
  });

  it("diskon percent: base × (1 - p/100)", () => {
    expect(
      calcSubtotal({ unitPrice: 100000, quantity: 2, discountType: "percent", discountValue: 10 })
    ).toBe(180000);
  });

  it("hasil diskon tidak boleh negatif", () => {
    expect(
      calcSubtotal({ unitPrice: 50000, quantity: 1, discountType: "amount", discountValue: 100000 })
    ).toBe(0);
  });
});

describe("calcOrderTotal", () => {
  it("menjumlahkan semua subtotal item", () => {
    expect(calcOrderTotal([100000, 250000])).toBe(350000);
  });
  it("array kosong = 0", () => {
    expect(calcOrderTotal([])).toBe(0);
  });
});

describe("formatRupiah", () => {
  it("format Rupiah tanpa desimal", () => {
    // Intl id-ID memakai no-break space (U+00A0) antara "Rp" dan angka
    expect(formatRupiah(115000).replace(/\u00a0/g, " ")).toBe("Rp 115.000");
  });
});
