"use client";

import Link from "next/link";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ArrowRight, Camera } from "lucide-react";
import type { CSSProperties } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { OrderSpan } from "@/lib/calendarSpans";

export type { OrderSpan };
const STATUS_DOT: Record<string, string> = {
  booking: "bg-amber-400",
  active: "bg-rose-500",
  late: "bg-rose-600",
};

const STATUS_LABEL: Record<string, string> = {
  booking: "Booking",
  active: "Aktif",
  late: "Terlambat",
};

const STATUS_BAR: Record<string, string> = {
  booking: "bg-amber-100/90 ring-amber-300 hover:bg-amber-200/90 text-amber-900",
  active: "bg-rose-100/90 ring-rose-300 hover:bg-rose-200/90 text-rose-900",
  late: "bg-rose-200/95 ring-rose-400 hover:bg-rose-300/90 text-rose-950",
};

/**
 * Batang satu order yang membentang melintasi tanggal-tanggal sewa-nya.
 * Diposisikan di overlay batang (grid 7-kolom) lewat gridColumn/gridRow
 * yang dihitung CalendarMonth.
 */
export function OrderBar({
  span,
  gridRow,
}: {
  span: OrderSpan;
  gridRow: number;
}) {
  const start = new Date(span.startIso);
  const end = new Date(span.endIso);
  const sameDay = format(start, "yyyy-MM-dd") === format(end, "yyyy-MM-dd");

  const barStyle: CSSProperties = {
    gridColumnStart: span.colStart,
    gridColumnEnd: `span ${span.colSpan}`,
    gridRow,
    height: "24px",
  };

  return (
    <Popover>
      <PopoverTrigger
        style={barStyle}
        className={cn(
          "group relative z-10 mx-[3px] flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 transition-all",
          "hover:-translate-y-px hover:shadow-md hover:shadow-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
          STATUS_BAR[span.status] ?? "bg-zinc-100 ring-zinc-300 text-zinc-800"
        )}
      >
        <span
          className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[span.status] ?? "bg-zinc-400")}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate">
          {span.customerName} · {span.products}
        </span>
        {span.clippedStart && (
          <span className="absolute left-0 top-0 h-full w-1 rounded-l-md bg-current opacity-40" aria-hidden />
        )}
        {span.clippedEnd && (
          <span className="absolute right-0 top-0 h-full w-1 rounded-r-md bg-current opacity-40" aria-hidden />
        )}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">{span.customerName}</p>
          <p className="text-xs text-muted-foreground tabular-nums">{span.orderNumber}</p>
          {/* Produk dalam order — klik untuk buka katalog */}
          <div className="mt-2 flex flex-wrap gap-1">
            {span.productsWithLinks.map((p) => (
              <Link
                key={p.id}
                href={`/katalog/${p.id}`}
                target="_blank"
                className="inline-flex items-center gap-1 rounded-md bg-accent px-1.5 py-0.5 text-[11px] font-medium text-accent-foreground transition-colors hover:bg-accent/70"
              >
                <Camera className="size-3" aria-hidden />
                {p.name}
              </Link>
            ))}
          </div>
        </div>
        <div className="space-y-1.5 px-4 py-3 text-xs">
          <div className="flex items-center gap-2">
            <span className={cn("size-2 rounded-full", STATUS_DOT[span.status] ?? "bg-zinc-400")} aria-hidden />
            <span className="font-medium">{STATUS_LABEL[span.status] ?? span.status}</span>
          </div>
          <p className="text-muted-foreground">
            {format(start, "EEEE, dd MMMM yyyy, HH:mm", { locale: localeId })}
            {sameDay
              ? ` – ${format(end, "HH:mm", { locale: localeId })}`
              : ` → ${format(end, "EEEE, dd MMMM yyyy, HH:mm", { locale: localeId })}`}
          </p>
          {span.clippedStart && (
            <p className="text-muted-foreground/70 italic">Mulai sebelum bulan ini</p>
          )}
          {span.clippedEnd && (
            <p className="text-muted-foreground/70 italic">Berakhir setelah bulan ini</p>
          )}
        </div>
        <Link
          href={`/admin/orders/${span.orderId}`}
          className="flex items-center justify-center gap-1.5 border-t px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
        >
          Buka order
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </PopoverContent>
    </Popover>
  );
}
