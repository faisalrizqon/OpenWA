"use client";

import Link from "next/link";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ArrowRight } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DayOrder {
  orderId: string;
  orderNumber: string;
  customerName: string;
  status: string;
  units: number;
  products: string;
}

export interface DayData {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  busy: number;
  total: number;
  orders: DayOrder[];
}

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

/** Level warna heatmap berdasarkan rasio pemakaian unit. */
function loadClasses(busy: number, total: number): string {
  if (total === 0) return "bg-card";
  const ratio = busy / total;
  if (ratio === 0) return "bg-emerald-50/60";
  if (ratio < 0.5) return "bg-amber-50";
  if (ratio < 1) return "bg-orange-100/70";
  return "bg-rose-100";
}

export function DayCell({ data }: { data: DayData }) {
  const { day, inMonth, isToday, isWeekend, busy, total, orders } = data;
  const free = Math.max(0, total - busy);
  const hasOrders = orders.length > 0;

  const cellInner = (
    <div
      className={cn(
        "flex h-full min-h-24 w-full flex-col gap-1 rounded-xl border p-2 text-left transition-all",
        inMonth ? loadClasses(busy, total) : "bg-muted/30",
        isToday ? "border-primary ring-2 ring-primary/30" : "border-border/60",
        hasOrders && "hover:-translate-y-0.5 hover:shadow-md hover:shadow-foreground/5"
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-lg text-xs font-semibold tabular-nums",
            isToday
              ? "bg-gradient-to-br from-primary to-violet-500 text-primary-foreground shadow-sm"
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

      {inMonth && (
        <div className="flex flex-1 flex-col gap-1 overflow-hidden">
          {orders.slice(0, 3).map((o) => (
            <span
              key={o.orderId}
              className="flex items-center gap-1 truncate rounded-md bg-card/80 px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-border/50"
            >
              <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[o.status] ?? "bg-zinc-400")} />
              <span className="truncate">{o.customerName}</span>
            </span>
          ))}
          {orders.length > 3 && (
            <span className="px-1 text-[10px] font-medium text-muted-foreground">
              +{orders.length - 3} lagi
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (!inMonth || !hasOrders) {
    return <div className="h-full">{cellInner}</div>;
  }

  return (
    <Popover>
      <PopoverTrigger className="h-full w-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-xl">
        {cellInner}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold capitalize">
            {format(new Date(data.iso), "EEEE, dd MMMM yyyy", { locale: localeId })}
          </p>
          <p className="text-xs text-muted-foreground">
            {busy} unit terpakai · {free} tersedia dari {total}
          </p>
        </div>
        <div className="max-h-72 divide-y overflow-y-auto">
          {orders.map((o) => (
            <Link
              key={o.orderId}
              href={`/orders/${o.orderId}`}
              className="flex items-center gap-2 px-4 py-2.5 transition-colors hover:bg-accent"
            >
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  STATUS_DOT[o.status] ?? "bg-zinc-400"
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{o.customerName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {o.orderNumber} · {o.products}
                </p>
              </div>
              <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
                {STATUS_LABEL[o.status] ?? o.status}
              </span>
              <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
