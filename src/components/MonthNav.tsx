"use client";

import { useRouter } from "next/navigation";
import { addMonths, format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarClock } from "lucide-react";

import { Button } from "@/components/ui/button";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Month navigator for the availability calendar. Pushes `?month=YYYY-MM`. */
export function MonthNav({ month }: { month: string }) {
  const router = useRouter();
  const base = new Date(`${month}-01T00:00`);
  const valid = !isNaN(base.getTime());
  const current = valid ? base : new Date();
  const now = new Date();
  const isCurrentMonth = monthKey(current) === monthKey(now);

  const go = (d: Date) => router.push(`/calendar?month=${monthKey(d)}`);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1 rounded-xl border bg-card p-1 shadow-sm">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Bulan sebelumnya"
          onClick={() => go(addMonths(current, -1))}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Button>
        <span className="min-w-40 text-center text-sm font-semibold capitalize tabular-nums">
          {format(current, "MMMM yyyy", { locale: localeId })}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Bulan berikutnya"
          onClick={() => go(addMonths(current, 1))}
        >
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={isCurrentMonth}
        onClick={() => go(now)}
      >
        <CalendarClock className="size-4" aria-hidden />
        Bulan ini
      </Button>
    </div>
  );
}
