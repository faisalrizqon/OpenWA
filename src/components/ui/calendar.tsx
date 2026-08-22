"use client";

import * as React from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sn", "Sl", "Rb", "Km", "Jm", "Sb", "Mg"];

function stripTime(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

/** Headless-ish month calendar. Single date selection. Week starts Monday. */
export function Calendar({
  selected,
  onSelect,
  month: monthProp,
  onMonthChange,
  className,
}: {
  selected?: Date | null;
  onSelect?: (date: Date) => void;
  month?: Date;
  onMonthChange?: (date: Date) => void;
  className?: string;
}) {
  const [internalMonth, setInternalMonth] = React.useState(
    () => startOfMonth(selected ?? new Date())
  );
  const month = monthProp ?? internalMonth;
  const setMonth = (d: Date) => {
    setInternalMonth(d);
    onMonthChange?.(d);
  };

  const today = stripTime(new Date());
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className={cn("w-64 select-none", className)}>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth(subMonths(month, 1))}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label="Bulan sebelumnya"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <span className="text-sm font-semibold capitalize">
          {format(month, "MMMM yyyy", { locale: localeId })}
        </span>
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, 1))}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label="Bulan berikutnya"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="flex h-7 items-center justify-center text-[11px] font-semibold text-muted-foreground/70"
          >
            {w}
          </div>
        ))}
        {days.map((day) => {
          const inMonth = isSameMonth(day, month);
          const isSelected = selected != null && isSameDay(day, selected);
          const isToday = isSameDay(day, today);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelect?.(day)}
              aria-current={isToday ? "date" : undefined}
              aria-pressed={isSelected}
              className={cn(
                "relative flex h-8 items-center justify-center rounded-lg text-sm tabular-nums transition-colors",
                inMonth ? "text-foreground" : "text-muted-foreground/40",
                isSelected
                  ? "bg-primary font-semibold text-primary-foreground shadow-sm"
                  : "hover:bg-accent hover:text-accent-foreground",
                !isSelected && isToday && "font-semibold text-primary"
              )}
            >
              {format(day, "d")}
              {!isSelected && isToday && (
                <span className="absolute bottom-1 size-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
