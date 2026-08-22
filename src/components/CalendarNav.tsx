"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarClock } from "lucide-react";

import { DatePicker } from "@/components/DateTimePicker";
import { Button } from "@/components/ui/button";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Date-window navigator for the availability calendar. Pushes `?start=YYYY-MM-DD`. */
export function CalendarNav({ start, spanDays }: { start: string; spanDays: number }) {
  const router = useRouter();
  const base = new Date(`${start}T00:00`);
  const valid = !isNaN(base.getTime());
  const today = new Date();

  const go = (d: Date) => router.push(`/calendar?start=${ymd(d)}`);
  const shift = (days: number) => {
    const next = new Date(valid ? base : today);
    next.setDate(next.getDate() + days);
    go(next);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={() => shift(-spanDays)}
      >
        <ChevronLeft className="size-4" aria-hidden />
        <span className="hidden sm:inline">{spanDays} hari</span>
      </Button>

      <DatePicker
        value={valid ? ymd(base) : ymd(today)}
        onChange={(v) => router.push(`/calendar?start=${v}`)}
        className="min-w-44"
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={() => shift(spanDays)}
      >
        <span className="hidden sm:inline">{spanDays} hari</span>
        <ChevronRight className="size-4" aria-hidden />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1.5"
        onClick={() => go(today)}
      >
        <CalendarClock className="size-4" aria-hidden />
        Hari ini
      </Button>

      {valid && (
        <span className="ml-auto hidden text-sm text-muted-foreground sm:block">
          Mulai {format(base, "EEEE, dd MMMM yyyy", { locale: localeId })}
        </span>
      )}
    </div>
  );
}
