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

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES_ALL = Array.from({ length: 60 }, (_, i) => i);

/**
 * Kolom scroll vertikal (model drum-roll): nilai terpilih di-highlight dan
 * otomatis di-scroll ke tengah. Hanya meng-scroll kontainer sendiri.
 */
function TimeColumn({
  label,
  values,
  selected,
  onSelect,
}: {
  label: string;
  values: number[];
  selected: number;
  onSelect: (value: number) => void;
}) {
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const container = listRef.current;
    const idx = values.indexOf(selected);
    const el = container?.children[idx] as HTMLElement | undefined;
    if (container && el) {
      container.scrollTop = el.offsetTop - container.clientHeight / 2 + el.clientHeight / 2;
    }
  }, [selected, values]);

  return (
    <div className="flex flex-1 flex-col">
      <p className="mb-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div
        ref={listRef}
        className="h-52 overflow-y-auto rounded-lg border border-border bg-muted/30 p-1"
      >
        {values.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onSelect(v)}
            className={cn(
              "mb-0.5 flex h-8 w-full items-center justify-center rounded-md text-sm tabular-nums transition-colors",
              v === selected
                ? "bg-primary font-semibold text-primary-foreground"
                : "text-foreground/80 hover:bg-accent"
            )}
          >
            {pad(v)}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Time picker 24-jam (tidak tergantung locale browser, tanpa AM/PM).
 * Model scroll: dua kolom (jam 00–23, menit 00–59) dengan highlight terpilih.
 */
function TimePicker24h({
  hours,
  minutes,
  onChange,
}: {
  hours: number;
  minutes: number;
  onChange: (hours: number, minutes: number) => void;
}) {
  return (
    <div className="w-56 space-y-3">
      <div className="text-center">
        <span className="text-3xl font-bold tabular-nums tracking-tight">
          {pad(hours)}:{pad(minutes)}
        </span>
        <span className="ml-1.5 text-xs font-medium text-muted-foreground">24 jam</span>
      </div>
      <div className="flex gap-2">
        <TimeColumn
          label="Jam"
          values={HOURS}
          selected={hours}
          onSelect={(h) => onChange(h, minutes)}
        />
        <TimeColumn
          label="Menit"
          values={MINUTES_ALL}
          selected={minutes}
          onSelect={(m) => onChange(hours, m)}
        />
      </div>
    </div>
  );
}

/**
 * Proper date + time picker (calendar popover + time field, 24 jam).
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
  const [timeOpen, setTimeOpen] = React.useState(false);
  const date = value ? new Date(value) : new Date();
  const valid = !isNaN(date.getTime());

  const setDatePart = (day: Date) => {
    const next = new Date(valid ? date : new Date());
    next.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
    onChange(toLocalValue(next));
  };

  const setTimePart = (hours: number, minutes: number) => {
    const next = new Date(valid ? date : new Date());
    next.setHours(hours, minutes, 0, 0);
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

        <Popover open={timeOpen} onOpenChange={setTimeOpen}>
          <PopoverTrigger
            className="flex h-9 items-center gap-2 rounded-xl border border-input bg-transparent px-3 text-sm transition-colors hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-[popup-open]:border-ring"
            aria-label="Pilih waktu"
          >
            <Clock className="size-4 text-muted-foreground" aria-hidden />
            <span className="font-medium tabular-nums">
              {valid ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : "00:00"}
            </span>
          </PopoverTrigger>
          <PopoverContent align="end">
            <TimePicker24h
              hours={valid ? date.getHours() : 0}
              minutes={valid ? date.getMinutes() : 0}
              onChange={setTimePart}
            />
          </PopoverContent>
        </Popover>
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
  // Root <div> wajib: saat popover terbuka Base UI menginjeksi elemen helper
  // di root Popover. Tanpa wrapper, elemen itu menjadi saudara trigger di
  // dalam kontainer `space-y-*` pemakai → trigger tak lagi :last-child →
  // dapat margin tambahan → layout bergeser 4px saat open/close.
  return (
    <div>
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
    </div>
  );
}
