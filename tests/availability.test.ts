import { describe, it, expect } from "vitest";
import { rangesOverlap, countOverlapUnits } from "@/lib/availability";

const d = (iso: string) => new Date(iso);

describe("rangesOverlap (half-open: start inklusif, end eksklusif)", () => {
  it("bentrok: rentang bersinggungan", () => {
    expect(rangesOverlap(d("2026-08-20"), d("2026-08-23"), d("2026-08-22"), d("2026-08-25"))).toBe(true);
  });
  it("tidak bentrok: berurutan (return & ambil hari sama)", () => {
    expect(rangesOverlap(d("2026-08-20"), d("2026-08-22"), d("2026-08-22"), d("2026-08-25"))).toBe(false);
  });
  it("bentrok: salah satu di dalam yang lain", () => {
    expect(rangesOverlap(d("2026-08-20"), d("2026-08-30"), d("2026-08-22"), d("2026-08-23"))).toBe(true);
  });
});

describe("countOverlapUnits", () => {
  const orders = [
    { status: "active", startDate: d("2026-08-20"), endDate: d("2026-08-23"), productId: 1, quantity: 1 },
    { status: "booking", startDate: d("2026-08-22"), endDate: d("2026-08-24"), productId: 1, quantity: 1 },
    { status: "completed", startDate: d("2026-08-21"), endDate: d("2026-08-22"), productId: 1, quantity: 1 },
    { status: "cancelled", startDate: d("2026-08-21"), endDate: d("2026-08-22"), productId: 1, quantity: 1 },
    { status: "active", startDate: d("2026-08-20"), endDate: d("2026-08-23"), productId: 2, quantity: 2 },
  ];

  it("hitung unit sibuk: booking + active + late saja, produk yang sama", () => {
    expect(countOverlapUnits(1, d("2026-08-22"), d("2026-08-23"), orders)).toBe(2);
  });

  it("completed/cancelled tidak dihitung", () => {
    expect(countOverlapUnits(1, d("2026-08-21"), d("2026-08-22"), orders)).toBe(1);
  });

  it("produk lain tidak ikut", () => {
    expect(countOverlapUnits(3, d("2026-08-20"), d("2026-08-30"), orders)).toBe(0);
  });

  it("quantity diperhitungkan", () => {
    expect(countOverlapUnits(2, d("2026-08-21"), d("2026-08-22"), orders)).toBe(2);
  });
});
