import { describe, it, expect } from "vitest";
import { nextOrderNumber } from "@/lib/orderNumber";

describe("nextOrderNumber", () => {
  it("format ORD-YYYYMMDD-XXX", () => {
    expect(nextOrderNumber(0, new Date(2026, 7, 22))).toBe("ORD-20260822-001");
  });

  it("increment counter", () => {
    expect(nextOrderNumber(2, new Date(2026, 7, 22))).toBe("ORD-20260822-003");
  });

  it("padding 3 digit untuk counter besar", () => {
    expect(nextOrderNumber(999, new Date(2026, 0, 1))).toBe("ORD-20260101-1000");
  });

  it("default date = sekarang", () => {
    const n = nextOrderNumber(0);
    expect(n).toMatch(/^ORD-\d{8}-001$/);
  });
});
