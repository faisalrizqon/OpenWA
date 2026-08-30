import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export interface DayData {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  busy: number;
  total: number;
}

/** Level warna heatmap berdasarkan rasio pemakaian unit. */
function loadClasses(busy: number, total: number): string {
  if (total === 0) return "bg-card";
  const ratio = busy / total;
  if (ratio === 0) return "bg-emerald-50/60";
  if (ratio < 0.5) return "bg-amber-50";
  if (ratio < 1) return "bg-orange-100/70";
  return "bg-rose-100";
}

/**
 * Sel background kalender: nomor hari, badge ketersediaan, heatmap.
 * Dipasang sebagai grid item yang membentang seluruh baris (header + lane + konten)
 * lewat prop `style` (gridColumn / gridRow) dari CalendarMonth.
 * Interaksi order ada pada batang (OrderBar) yang di-overlay di atas sel ini.
 */
export function DayCell({ data, style }: { data: DayData; style?: CSSProperties }) {
  const { day, inMonth, isToday, isWeekend, busy, total } = data;
  const free = Math.max(0, total - busy);

  return (
    <div
      className={cn(
        "relative z-0 flex flex-col gap-1 rounded-xl border p-1.5 sm:p-2",
        "min-h-[64px] md:min-h-[var(--row-h,160px)]",
        inMonth ? loadClasses(busy, total) : "bg-muted/30",
        isToday ? "border-primary ring-2 ring-primary/30" : "border-border/60"
      )}
    >
      <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between">
        <span
          className={cn(
            "flex size-5 items-center justify-center rounded-lg text-[10px] font-semibold tabular-nums sm:size-6 sm:text-xs",
            isToday
              ? "bg-primary text-primary-foreground shadow-sm"
              : inMonth
                ? isWeekend
                  ? "text-rose-500/80"
                  : "text-foreground"
                : "text-muted-foreground/40"
          )}
        >
          {day}
        </span>
        {inMonth && total > 0 && (
          <span
            className={cn(
              "rounded-full px-1.5 text-[10px] font-medium tabular-nums",
              free === 0
                ? "bg-rose-100 text-rose-700"
                : free === total
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
            )}
            title={`${free} dari ${total} unit tersedia`}
          >
            {free}/{total}
          </span>
        )}
      </div>
    </div>
  );
}
