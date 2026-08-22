"use client";

import * as React from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CalendarDays, Clock } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** local `YYYY-MM-DDTHH:mm` (compatible with `new Date(value)` server-side). */
function toLocalValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/**
 * Proper date + time picker (calendar popover + time field).
 * Controlled by a `value` string in `YYYY-MM-DDTHH:mm`; emits the same.
 * Posts via hidden input `name` for server actions.
 */
export function DateTimePicker({
  name,
  value,
  onChange,
  id,
  className,
}: {
  name?: string;
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const date = value ? new Date(value) : new Date();
  const valid = !isNaN(date.getTime());
  const time = valid ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : "00:00";

  const setDatePart = (day: Date) => {
    const next = new Date(valid ? date : new Date());
    next.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
    onChange(toLocalValue(next));
  };

  const setTimePart = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const next = new Date(valid ? date : new Date());
    next.setHours(h || 0, m || 0, 0, 0);
    onChange(toLocalValue(next));
  };

  return (
    <div className={cn("space-y-2", className)}>
      {name && <input type="hidden" name={name} value={value} />}
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            id={id}
            className="flex h-9 flex-1 items-center gap-2 rounded-xl border border-input bg-transparent px-3 text-sm outline-none transition-colors hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-[popup-open]:border-ring"
          >
            <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
            <span className={cn(!valid && "text-muted-foreground")}>
              {valid ? format(date, "EEEE, dd MMM yyyy", { locale: localeId }) : "Pilih tanggal"}
            </span>
          </PopoverTrigger>
          <PopoverContent>
            <Calendar
              selected={valid ? date : null}
              month={valid ? date : undefined}
              onSelect={(d) => {
                setDatePart(d);
                setOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>

        <label className="flex h-9 items-center gap-2 rounded-xl border border-input bg-transparent px-3 text-sm focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
          <Clock className="size-4 text-muted-foreground" aria-hidden />
          <input
            type="time"
            value={time}
            onChange={(e) => setTimePart(e.target.value)}
            className="bg-transparent tabular-nums outline-none"
            aria-label="Waktu"
          />
        </label>
      </div>
    </div>
  );
}

/**
 * Date-only picker (calendar popover). Controlled by `value` in `YYYY-MM-DD`.
 */
export function DatePicker({
  value,
  onChange,
  id,
  placeholder = "Pilih tanggal",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const date = value ? new Date(`${value}T00:00`) : null;
  const valid = date != null && !isNaN(date.getTime());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        className={cn(
          "flex h-9 items-center gap-2 rounded-xl border border-input bg-transparent px-3 text-sm outline-none transition-colors hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-[popup-open]:border-ring",
          className
        )}
      >
        <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
        <span className={cn(!valid && "text-muted-foreground")}>
          {valid ? format(date!, "dd MMM yyyy", { locale: localeId }) : placeholder}
        </span>
      </PopoverTrigger>
      <PopoverContent>
        <Calendar
          selected={valid ? date : null}
          month={valid ? date! : undefined}
          onSelect={(d) => {
            onChange(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
