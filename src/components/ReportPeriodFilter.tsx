"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, RotateCcw } from "lucide-react";

import { DatePicker } from "@/components/DateTimePicker";
import { Button } from "@/components/ui/button";
import { MAX_REPORT_DAYS, REPORT_PRESET_DAYS } from "@/lib/reportRange";
import { cn } from "@/lib/utils";

/** Label preset periode laporan (sinkron dengan REPORT_PRESET_DAYS di lib). */
const PRESET_LABELS: Record<number, string> = {
  7: "7 hari",
  30: "30 hari",
  90: "90 hari",
  180: "6 bulan",
  365: "1 tahun",
};

/** Format `YYYY-MM-DD` dari Date lokal. */
function toDateValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Jumlah hari inklusif antara dua tanggal `YYYY-MM-DD`. */
function diffDaysInclusive(from: string, to: string): number {
  const a = new Date(`${from}T00:00`);
  const b = new Date(`${to}T00:00`);
  return Math.round((b.getTime() - a.getTime()) / (24 * 3600_000)) + 1;
}

/**
 * Filter periode laporan: tab preset (7/30/90/180/365 hari) + rentang custom
 * memakai DatePicker kalender (pola sama dengan OrdersPeriodFilter).
 *
 * Aturan (ditegakkan di sini DAN di `resolveReportRange` backend):
 * - `from`/`to` wajib berpasangan; `from` tidak boleh setelah `to`.
 * - Rentang maksimal {@link MAX_REPORT_DAYS} hari (±1 tahun).
 * - `to` tidak boleh melewati hari ini.
 */
export function ReportPeriodFilter({
  days,
  from,
  to,
  error,
}: {
  /** Preset aktif (null bila mode custom). */
  days: number | null;
  /** Tanggal awal custom `YYYY-MM-DD` (kosong bila preset). */
  from: string;
  /** Tanggal akhir custom `YYYY-MM-DD` (kosong bila preset). */
  to: string;
  /** Pesan error rentang dari server (mis. > 365 hari) — tampil di atas picker. */
  error?: string;
}) {
  const router = useRouter();
  const isCustom = Boolean(from || to);
  const [start, setStart] = React.useState(from);
  const [end, setEnd] = React.useState(to);
  const [showRange, setShowRange] = React.useState(isCustom);
  const [errorState, setErrorState] = React.useState("");

  const todayValue = toDateValue(new Date());
  // Error server menang atas error lokal; lokal dibersihkan saat admin mengetik.
  const shownError = error || errorState;

  const handleStart = (v: string) => {
    setStart(v);
    // Aturan: jika "Dari" melewati "Sampai", geser "Sampai" mengikuti
    if (end && v && v > end) setEnd(v);
    setErrorState("");
  };

  const handleEnd = (v: string) => {
    setEnd(v);
    // Aturan: jika "Sampai" sebelum "Dari", geser "Dari" mengikuti
    if (start && v && v < start) setStart(v);
    setErrorState("");
  };

  const apply = () => {
    if (!start || !end) {
      setErrorState("Isi tanggal awal dan tanggal akhir.");
      return;
    }
    if (start > end) {
      setErrorState("Tanggal awal tidak boleh setelah tanggal akhir.");
      return;
    }
    if (end > todayValue) {
      setErrorState("Tanggal akhir tidak boleh melewati hari ini.");
      return;
    }
    const span = diffDaysInclusive(start, end);
    if (span > MAX_REPORT_DAYS) {
      setErrorState(
        `Rentang maksimal ${MAX_REPORT_DAYS} hari (±1 tahun). Rentang yang dipilih ${span} hari.`
      );
      return;
    }
    router.push(`/admin/reports?from=${start}&to=${end}`);
  };

  const reset = () => {
    setStart("");
    setEnd("");
    setErrorState("");
    router.push("/admin/reports");
  };

  const openRange = () => {
    // Pre-fill: 30 hari terakhir bila belum ada pilihan
    if (!start && !end) {
      const now = new Date();
      const back = new Date(now.getTime() - 29 * 24 * 3600_000);
      setStart(toDateValue(back));
      setEnd(toDateValue(now));
    }
    setShowRange(true);
  };

  const spanDays = start && end ? diffDaysInclusive(start, end) : null;

  return (
    <div className="space-y-2">
      {/* Label Periode di atas baris tab */}
      <div className="px-0.5">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <CalendarDays className="size-3.5" aria-hidden />
          Periode Laporan · maksimal {MAX_REPORT_DAYS} hari
        </span>
      </div>

      {/* Tab preset periode + tombol rentang custom */}
      <div className="flex flex-wrap items-center gap-1.5">
        {REPORT_PRESET_DAYS.map((d) => (
          <Link
            key={d}
            href={`/admin/reports?days=${d}`}
            className={cn(
              "inline-flex h-8 items-center rounded-full border px-3 text-sm font-medium transition-colors",
              !isCustom && days === d
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {PRESET_LABELS[d] ?? `${d} hari`}
          </Link>
        ))}
        <button
          type="button"
          onClick={openRange}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
            isCustom || showRange
              ? "border-primary bg-primary text-primary-foreground shadow-sm"
              : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <CalendarDays className="size-3.5" aria-hidden />
          Rentang
        </button>
      </div>

      {/* Rentang custom dengan DatePicker kalender.
          PENTING: DatePicker dibungkus <div> sendiri — saat popover terbuka,
          Base UI menginjeksi elemen helper di root Popover. Tanpa wrapper,
          elemen itu menjadi saudara trigger di dalam kontainer `space-y-*`
          dan menggeser layout (pola sama dengan OrdersPeriodFilter). */}
      <div className={cn(showRange ? "block" : "hidden", "space-y-2")}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Dari</span>
            <div>
              <DatePicker
                value={start}
                onChange={handleStart}
                placeholder="Pilih tanggal awal"
                className="min-w-44"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Sampai</span>
            <div>
              <DatePicker
                value={end}
                onChange={handleEnd}
                placeholder="Pilih tanggal akhir"
                className="min-w-44"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" onClick={apply}>
              Terapkan
            </Button>
            <Button type="button" variant="outline" onClick={reset} className="gap-1.5">
              <RotateCcw className="size-3.5" aria-hidden />
              Reset
            </Button>
          </div>
        </div>
        {shownError && <p className="text-xs font-medium text-red-600">{shownError}</p>}
        {start && end && !shownError && (
          <p className="text-xs text-muted-foreground">
            Rentang aktif:{" "}
            <span className="font-medium text-foreground">
              {start} s.d. {end}
              {spanDays != null ? ` · ${spanDays} hari` : ""}
            </span>
          </p>
        )}
      </div>

      {/* Shortcut cepat saat panel rentang tertutup */}
      {!showRange && (
        <button
          type="button"
          onClick={openRange}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary transition-colors hover:text-primary/80"
        >
          <CalendarDays className="size-3.5" aria-hidden />
          Atau pilih rentang tanggal manual
        </button>
      )}
    </div>
  );
}
