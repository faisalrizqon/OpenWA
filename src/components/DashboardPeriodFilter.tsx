"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, RotateCcw } from "lucide-react";
import { DatePicker } from "@/components/DateTimePicker";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Tab periode sewa berjalan di dashboard: preset + rentang custom. */
const PERIOD_TABS: Record<string, string> = {
  today: "Hari Ini",
  week: "Minggu Ini",
  month: "Bulan Ini",
  custom: "Rentang",
};

/** Gabungkan param jadi query string tanpa bagian yang kosong. */
function buildHref(parts: Record<string, string>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(parts)) {
    if (v) qs.set(k, v);
  }
  const s = qs.toString();
  return `/admin${s ? `?${s}` : ""}`;
}

/** Format YYYY-MM-DD dari Date lokal. */
function toDateValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Filter periode "Sewa Berjalan" di dashboard: tab preset
 * (hari/minggu/bulan) + rentang custom memakai DatePicker kalender.
 * Aturan: "Sampai" tidak boleh sebelum "Dari" — dikoreksi otomatis.
 */
export function DashboardPeriodFilter({
  period,
  startDate,
  endDate,
}: {
  period: string;
  startDate: string; // YYYY-MM-DD atau ""
  endDate: string; // YYYY-MM-DD atau ""
}) {
  const router = useRouter();
  const [start, setStart] = React.useState(startDate);
  const [end, setEnd] = React.useState(endDate);
  const [error, setError] = React.useState("");

  const showRange = period === "custom";

  const handleStart = (v: string) => {
    setStart(v);
    // Aturan: jika "Dari" melewati "Sampai", geser "Sampai" mengikuti
    if (end && v && v > end) setEnd(v);
    setError("");
  };

  const handleEnd = (v: string) => {
    setEnd(v);
    // Aturan: jika "Sampai" sebelum "Dari", geser "Dari" mengikuti
    if (start && v && v < start) setStart(v);
    setError("");
  };

  const apply = () => {
    if (start && end && start > end) {
      setError("Tanggal awal tidak boleh setelah tanggal akhir.");
      return;
    }
    const qs = new URLSearchParams();
    if (start || end) {
      qs.set("period", "custom");
      if (start) qs.set("start_date", start);
      if (end) qs.set("end_date", end);
    }
    const s = qs.toString();
    router.push(`/admin${s ? `?${s}` : ""}`);
  };

  const reset = () => {
    setStart("");
    setEnd("");
    setError("");
    router.push("/admin");
  };

  return (
    <div className="space-y-2">
      {/* Label Periode di atas baris tab */}
      <div className="px-0.5">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <CalendarDays className="size-3.5" aria-hidden />
          Periode Sewa
        </span>
      </div>
      {/* Tab preset periode */}
      <div className="flex flex-wrap items-center gap-1.5">
        {Object.entries(PERIOD_TABS).map(([value, label]) => (
          <Link
            key={value}
            href={buildHref({
              period: value,
              start_date: period === "custom" ? startDate : "",
              end_date: period === "custom" ? endDate : "",
            })}
            className={cn(
              "inline-flex h-8 items-center rounded-full border px-3 text-sm font-medium transition-colors",
              period === value
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Rentang custom dengan DatePicker kalender.
          PENTING: DatePicker dibungkus <div> sendiri — saat popover terbuka,
          Base UI menginjeksi elemen helper di root Popover. Tanpa wrapper,
          elemen itu menjadi saudara trigger di dalam kontainer `space-y-*`
          dan menggeser layout (trigger tak lagi :last-child → dapat margin). */}
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
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        {(start || end) && !error && (
          <p className="text-xs text-muted-foreground">
            Filter aktif:{" "}
            <span className="font-medium text-foreground">
              {start || "…"} s.d. {end || "…"}
            </span>
          </p>
        )}
      </div>

      {/* Shortcut cepat saat mode non-custom */}
      {!showRange && (
        <button
          type="button"
          onClick={() => {
            const today = toDateValue(new Date());
            setStart(start || today);
            setEnd(end || today);
            const qs = new URLSearchParams();
            qs.set("period", "custom");
            router.push(`/admin?${qs.toString()}`);
          }}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary transition-colors hover:text-primary/80"
        >
          <CalendarDays className="size-3.5" aria-hidden />
          Atau pilih rentang tanggal manual
        </button>
      )}
    </div>
  );
}
