import { DayPoint } from "@/lib/dashboard";
import { formatRupiah } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { niceCeil, formatShortRp } from "./utils";

/**
 * Bar chart pendapatan harian (14 hari) — gridline, sumbu Y/Rp, tooltip,
 * dan ringkasan total/rata-rata/puncak.
 */
export function RevenueChart({ data }: { data: DayPoint[] }) {
  const maxAmount = Math.max(0, ...data.map((d) => d.amount));
  const niceMax = niceCeil(maxAmount || 1);
  const total = data.reduce((a, d) => a + d.amount, 0);
  const peak = data.reduce((b, d) => (d.amount > b.amount ? d : b), data[0]);
  const avg = Math.round(total / Math.max(1, data.length));

  return (
    <div className="space-y-4">
      {/* Ringkasan */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-xl bg-muted/60 px-3 py-2">
          <p className="text-[11px] font-medium text-muted-foreground">Total 14 Hari</p>
          <p className="text-sm font-bold tabular-nums">{formatRupiah(total)}</p>
        </div>
        <div className="rounded-xl bg-muted/60 px-3 py-2">
          <p className="text-[11px] font-medium text-muted-foreground">Rata-rata / Hari</p>
          <p className="text-sm font-bold tabular-nums">{formatRupiah(avg)}</p>
        </div>
        <div className="rounded-xl bg-muted/60 px-3 py-2">
          <p className="text-[11px] font-medium text-muted-foreground">Puncak</p>
          <p className="truncate text-sm font-bold tabular-nums">
            {peak && peak.amount > 0 ? `${peak.label} · ${formatRupiah(peak.amount)}` : "—"}
          </p>
        </div>
      </div>

      {/* Area plot: sumbu Y + gridline + bar */}
      <div className="flex gap-2">
        <div className="flex h-48 w-10 shrink-0 flex-col justify-between text-right">
          {[1, 0.75, 0.5, 0.25, 0].map((f) => (
            <span
              key={f}
              className="-translate-y-1/2 text-[10px] leading-none tabular-nums text-muted-foreground"
            >
              {formatShortRp(niceMax * f)}
            </span>
          ))}
        </div>
        <div className="relative h-48 min-w-0 flex-1">
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <div
              key={f}
              className="absolute inset-x-0 border-t border-dashed border-border/80"
              style={{ bottom: `${f * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 flex items-end justify-between gap-1 sm:gap-1.5">
            {data.map((d) => {
              const h = d.amount === 0 ? 0 : Math.max(3, (d.amount / niceMax) * 100);
              return (
                <div key={d.key} className="group relative flex h-full flex-1 items-end">
                  <div
                    className={cn(
                      "w-full rounded-t-[5px] bg-gradient-to-t from-primary to-primary/50 transition-all duration-200 group-hover:to-primary/85",
                      d.amount === 0 && "bg-none bg-muted-foreground/15"
                    )}
                    style={{ height: `${h}%`, minHeight: d.amount === 0 ? 2 : undefined }}
                  />
                  {/* Tooltip */}
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 text-xs text-background shadow-lg group-hover:block">
                    <p className="font-semibold">{d.label}</p>
                    <p className="tabular-nums">{formatRupiah(d.amount)}</p>
                    <p className="opacity-70">{d.orders} order dibuat</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Label sumbu X */}
      <div className="ml-12 flex justify-between gap-1 sm:gap-1.5">
        {data.map((d, i) => (
          <span
            key={d.key}
            className={cn(
              "flex-1 text-center text-[9px] tabular-nums text-muted-foreground",
              i % 2 === 1 && "invisible sm:visible"
            )}
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
