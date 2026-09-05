import { describe, it, expect } from "vitest";
import {
  resolveReportRange,
  MAX_REPORT_DAYS,
  MAX_ORDER_ROWS_ON_PAGE,
  REPORT_PRESET_DAYS,
  reportDateValue,
  reportSpanDays,
  validateReportRange,
  buildReportQuery,
} from "@/lib/reportRange";

/** Tanggal lokal start-of-day dari komponen eksplisit. */
function dateOnly(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/**
 * Selisih hari antara dua Date yang sudah dinormalkan
 * (start-of-day → end-of-day), dibulatkan. Untuk rentang N hari hasilnya N.
 */
function spanDays(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / (24 * 3600_000));
}

describe("resolveReportRange — preset hari", () => {
  it("preset 7 hari → days=7, non-custom", () => {
    const r = resolveReportRange({ days: 7 });
    expect(r.days).toBe(7);
    expect(r.custom).toBe(false);
    expect(spanDays(r.rangeStart, r.rangeEnd)).toBe(7);
    expect(r.rangeEnd.getHours()).toBe(23);
  });

  it("preset 30 hari → days=30", () => {
    const r = resolveReportRange({ days: 30 });
    expect(r.days).toBe(30);
    expect(r.custom).toBe(false);
  });

  it("preset 90 hari → days=90", () => {
    const r = resolveReportRange({ days: 90 });
    expect(r.days).toBe(90);
    expect(r.custom).toBe(false);
  });

  it("preset 180 hari (6 bulan) → days=180", () => {
    const r = resolveReportRange({ days: 180 });
    expect(r.days).toBe(180);
    expect(r.custom).toBe(false);
  });

  it("preset 365 hari (1 tahun) → days=365", () => {
    const r = resolveReportRange({ days: 365 });
    expect(r.days).toBe(365);
    expect(r.custom).toBe(false);
    expect(spanDays(r.rangeStart, r.rangeEnd)).toBe(365);
  });

  it("preset tidak dikenal (mis. 1000) → fallback 30", () => {
    const r = resolveReportRange({ days: 1000 });
    expect(r.days).toBe(30);
    expect(r.custom).toBe(false);
  });

  it("tanpa input → fallback 30 hari", () => {
    const r = resolveReportRange({});
    expect(r.days).toBe(30);
    expect(r.custom).toBe(false);
  });

  it("days null + from/to kosong → fallback 30 hari", () => {
    const r = resolveReportRange({ days: null, from: "", to: "" });
    expect(r.days).toBe(30);
    expect(r.custom).toBe(false);
  });
});

describe("resolveReportRange — rentang custom", () => {
  it("dari & to valid → days inklusif, custom=true", () => {
    const r = resolveReportRange({ from: "2025-01-01", to: "2025-01-07" });
    expect(r.days).toBe(7);
    expect(r.custom).toBe(true);
    expect(r.rangeStart.getTime()).toBe(dateOnly(2025, 1, 1).getTime());
    expect(r.rangeEnd.getFullYear()).toBe(2025);
    expect(r.rangeEnd.getMonth()).toBe(0);
    expect(r.rangeEnd.getDate()).toBe(7);
    expect(r.rangeEnd.getHours()).toBe(23);
    expect(r.rangeEnd.getMinutes()).toBe(59);
  });

  it("1 hari (from == to) → days=1", () => {
    const r = resolveReportRange({ from: "2025-06-15", to: "2025-06-15" });
    expect(r.days).toBe(1);
    expect(r.custom).toBe(true);
    expect(r.rangeStart.getTime()).toBe(dateOnly(2025, 6, 15).getTime());
  });

  it("tepat 365 hari → diterima", () => {
    const r = resolveReportRange({ from: "2025-01-01", to: "2025-12-31" });
    expect(r.days).toBe(365);
    expect(r.custom).toBe(true);
  });

  it("melewati 365 hari → throw RangeError", () => {
    expect(() => resolveReportRange({ from: "2025-01-01", to: "2026-01-15" })).toThrow(
      /maksimal .* hari/
    );
  });

  it("start > end → throw error", () => {
    expect(() => resolveReportRange({ from: "2025-01-10", to: "2025-01-05" })).toThrow(
      /awal tidak boleh setelah/i
    );
  });

  it("hanya 'from' tanpa 'to' → throw error", () => {
    expect(() => resolveReportRange({ from: "2025-01-01" })).toThrow(/harus lengkap/i);
  });

  it("hanya 'to' tanpa 'from' → throw error", () => {
    expect(() => resolveReportRange({ to: "2025-01-07" })).toThrow(/harus lengkap/i);
  });

  it("tanggal tidak eksis (2025-02-30) → throw format tidak valid", () => {
    expect(() => resolveReportRange({ from: "2025-02-30", to: "2025-03-05" })).toThrow(
      /format.*tidak valid/i
    );
  });

  it("format salah (bukan YYYY-MM-DD) → throw format tidak valid", () => {
    expect(() => resolveReportRange({ from: "01/01/2025", to: "2025-01-07" })).toThrow(
      /format.*tidak valid/i
    );
  });

  it("'to' melewati hari ini → throw error", () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    const futureStr = reportDateValue(future);
    const pastStr = reportDateValue(new Date(future.getTime() - 10 * 24 * 3600_000));
    expect(() => resolveReportRange({ from: pastStr, to: futureStr })).toThrow(
      /melewati hari ini/i
    );
  });
});

describe("reportDateValue", () => {
  it("format Date lokal → YYYY-MM-DD", () => {
    expect(reportDateValue(new Date(2025, 0, 1))).toBe("2025-01-01");
    expect(reportDateValue(new Date(2025, 5, 15))).toBe("2025-06-15");
    expect(reportDateValue(new Date(2025, 11, 31))).toBe("2025-12-31");
  });

  it("round-trip: reportDateValue → resolveReportRange menghasilkan 1 hari", () => {
    const d = new Date(2025, 2, 10);
    const v = reportDateValue(d);
    const r = resolveReportRange({ from: v, to: v });
    expect(r.days).toBe(1);
    expect(r.rangeStart.getTime()).toBe(dateOnly(2025, 3, 10).getTime());
  });
});

describe("reportSpanDays", () => {
  it("Jan 1 - Jan 7 → 7 hari inklusif", () => {
    expect(reportSpanDays("2025-01-01", "2025-01-07")).toBe(7);
  });

  it("same day → 1 hari inklusif", () => {
    expect(reportSpanDays("2025-06-15", "2025-06-15")).toBe(1);
  });

  it("tanggal invalid → 0", () => {
    expect(reportSpanDays("invalid", "2025-01-07")).toBe(0);
    expect(reportSpanDays("2025-01-01", "not-a-date")).toBe(0);
  });
});

describe("validateReportRange", () => {
  it("rentang valid → string kosong", () => {
    expect(validateReportRange("2025-01-01", "2025-01-07")).toBe("");
  });

  it("start > end → pesan error", () => {
    expect(validateReportRange("2025-01-10", "2025-01-05")).toContain("awal tidak boleh setelah");
  });

  it("rentang > 365 hari → pesan error", () => {
    expect(validateReportRange("2025-01-01", "2026-06-30")).toContain("maksimal");
  });

  it("'to' di masa depan → pesan error", () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    const toStr = reportDateValue(future);
    const fromStr = reportDateValue(new Date(future.getTime() - 10 * 24 * 3600_000));
    expect(validateReportRange(fromStr, toStr)).toContain("melewati hari ini");
  });

  it("tanggal invalid → pesan error format", () => {
    expect(validateReportRange("2025-02-30", "2025-03-05")).toContain("format");
  });
});

describe("buildReportQuery", () => {
  it("param days saja", () => {
    expect(buildReportQuery({ days: 30 })).toBe("days=30");
  });

  it("param from/to saja", () => {
    const q = buildReportQuery({ from: "2025-01-01", to: "2025-12-31" });
    expect(q).toContain("from=2025-01-01");
    expect(q).toContain("to=2025-12-31");
  });

  it("from/to menang atas days", () => {
    const q = buildReportQuery({ days: 7, from: "2025-01-01", to: "2025-01-07" });
    expect(q).not.toContain("days=");
    expect(q).toContain("from=2025-01-01");
  });

  it("dengan format parameter", () => {
    expect(buildReportQuery({ days: 7, format: "csv" })).toContain("format=csv");
    expect(
      buildReportQuery({ from: "2025-01-01", to: "2025-01-07", format: "xlsx" })
    ).toContain("format=xlsx");
  });

  it("input kosong → string kosong", () => {
    expect(buildReportQuery({})).toBe("");
  });
});

describe("konstanta", () => {
  it("MAX_REPORT_DAYS = 365 (1 tahun)", () => {
    expect(MAX_REPORT_DAYS).toBe(365);
  });

  it("REPORT_PRESET_DAYS mencakup hingga 1 tahun", () => {
    expect(REPORT_PRESET_DAYS).toContain(365);
    expect(Math.max(...REPORT_PRESET_DAYS)).toBe(MAX_REPORT_DAYS);
  });

  it("MAX_ORDER_ROWS_ON_PAGE = 300", () => {
    expect(MAX_ORDER_ROWS_ON_PAGE).toBe(300);
  });
});
