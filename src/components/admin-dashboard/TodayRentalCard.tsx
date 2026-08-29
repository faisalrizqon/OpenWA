import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarClock } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { TodayRental } from "@/lib/dashboard";
import { formatRupiah } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { initialsOf } from "./utils";
import { RentalProgress } from "./RentalProgress";

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  booking: { label: "Booking", tone: "bg-blue-100 text-blue-700" },
  active: { label: "Aktif", tone: "bg-emerald-100 text-emerald-700" },
  late: { label: "Terlambat", tone: "bg-red-100 text-red-700" },
};

/**
 * Kartu sewa yang berjalan hari ini — avatar, nomor order, status,
 * progress waktu, ringkasan pembayaran, dan aksi cepat.
 */
export function TodayRentalCard({ rental }: { rental: TodayRental }) {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const isDueToday = rental.endDate >= dayStart && rental.endDate < dayEnd;
  const isOverdue = now > rental.endDate;
  const sisa = rental.total - rental.paid;
  const statusInfo = STATUS_LABELS[rental.status] ?? STATUS_LABELS.active;

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        isOverdue
          ? "border-red-200 bg-red-50/40"
          : isDueToday
            ? "border-amber-200 bg-amber-50/40"
            : "border-border"
      )}
    >
      {/* Baris atas: avatar + identitas + badge status */}
      <div className="mb-3 flex items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-2 ring-offset-1",
            isOverdue
              ? "bg-red-100 text-red-700 ring-red-200"
              : isDueToday
                ? "bg-amber-100 text-amber-700 ring-amber-200"
                : "bg-primary/10 text-primary ring-primary/20"
          )}
        >
          {initialsOf(rental.customerName)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <Link
              href={`/admin/orders/${rental.id}`}
              className="truncate font-semibold hover:text-primary hover:underline"
            >
              {rental.customerName}
            </Link>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                statusInfo.tone
              )}
            >
              {isOverdue && <AlertTriangle className="size-3" aria-hidden />}
              {!isOverdue && isDueToday && <CalendarClock className="size-3" aria-hidden />}
              {statusInfo.label}
              {isDueToday && !isOverdue ? " · kembali hari ini" : ""}
            </span>
          </div>
          <p className="truncate font-mono text-xs text-muted-foreground">{rental.orderNumber}</p>
        </div>
      </div>

      {/* Detail grid: produk + jadwal */}
      <dl className="mb-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <div className="col-span-2 flex items-baseline justify-between gap-2">
          <dt className="shrink-0 text-muted-foreground">Produk</dt>
          <dd className="truncate text-right font-medium" title={rental.items}>
            {rental.items}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="shrink-0 text-muted-foreground">Ambil</dt>
          <dd className="font-medium tabular-nums">
            {format(rental.startDate, "dd MMMM, HH:mm", { locale: localeId })}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="shrink-0 text-muted-foreground">Kembali</dt>
          <dd
            className={cn(
              "font-medium tabular-nums",
              isOverdue ? "text-red-600" : isDueToday ? "text-amber-700" : ""
            )}
          >
            {format(rental.endDate, "dd MMMM, HH:mm", { locale: localeId })}
          </dd>
        </div>
      </dl>

      {/* Progress waktu */}
      <RentalProgress rental={rental} />

      {/* Baris bawah: status bayar + aksi */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-dashed pt-3 text-xs">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold tabular-nums",
            sisa > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
          )}
        >
          {sisa > 0 ? `Sisa ${formatRupiah(sisa)}` : "Lunas"}
        </span>
        <Link
          href={`/admin/orders/${rental.id}`}
          className="group inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/80 px-2.5 py-1 font-medium text-muted-foreground shadow-sm backdrop-blur-md transition-all hover:border-primary/40 hover:text-foreground"
        >
          Lihat detail
          <ArrowRight
            className="size-3 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      </div>
    </div>
  );
}
