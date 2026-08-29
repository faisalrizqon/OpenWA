import { describe, it, expect } from "vitest";
import { orderNumberPrefix, nextOrderNumberFrom } from "@/lib/orderNumber";

describe("orderNumberPrefix", () => {
  it("format ORD-YYYYMMDD- mengikuti tanggal lokal", () => {
    expect(orderNumberPrefix(new Date(2026, 7, 22))).toBe("ORD-20260822-");
  });

  it("padding bulan & tanggal", () => {
    expect(orderNumberPrefix(new Date(2026, 0, 1))).toBe("ORD-20260101-");
  });
});

describe("nextOrderNumberFrom", () => {
  const d = new Date(2026, 7, 22);

  it("belum ada nomor hari itu → 001", () => {
    expect(nextOrderNumberFrom([], d)).toBe("ORD-20260822-001");
  });

  it("nomor terbesar + 1 (bukan count) — aman walau ada nomor yang dihapus", () => {
    // 002 sudah dihapus → count-based akan salah menghasilkan 003 duplikat;
    // max-based tetap benar: 003 sudah ada → berikutnya 004.
    expect(nextOrderNumberFrom(["ORD-20260822-001", "ORD-20260822-003"], d)).toBe(
      "ORD-20260822-004"
    );
  });

  it("abaikan nomor dari tanggal lain", () => {
    expect(nextOrderNumberFrom(["ORD-20260821-007"], d)).toBe("ORD-20260822-001");
  });

  it("padding 3 digit untuk counter besar", () => {
    expect(nextOrderNumberFrom(["ORD-20260822-999"], d)).toBe("ORD-20260822-1000");
  });

  it("abaikan nomor dengan format rusak", () => {
    expect(nextOrderNumberFrom(["ORD-20260822-abc", "ORD-20260822-2"], d)).toBe(
      "ORD-20260822-003"
    );
  });

  it("default date = sekarang", () => {
    const n = nextOrderNumberFrom([]);
    expect(n).toMatch(/^ORD-\d{8}-001$/);
  });
});
