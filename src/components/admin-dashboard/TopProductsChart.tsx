import { formatRupiah } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const RANK_TONES = [
  "bg-amber-100 text-amber-700",
  "bg-slate-200 text-slate-600",
  "bg-orange-100 text-orange-700",
];

/**
 * Bar horizontal top produk dengan badge peringkat.
 */
export function TopProductsChart({
  products,
}: {
  products: { name: string; qty: number; revenue: number }[];
}) {
  if (products.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Belum ada data produk dalam 30 hari terakhir.
      </p>
    );
  }
  const maxQty = Math.max(1, products[0]?.qty ?? 1);

  return (
    <div className="space-y-4">
      {products.map((p, i) => (
        <div key={p.name} className="flex items-center gap-3 text-sm">
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              RANK_TONES[i] ?? "bg-accent text-accent-foreground"
            )}
          >
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="truncate font-medium">{p.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {p.qty}× sewa ·{" "}
                <span className="font-semibold text-foreground">{formatRupiah(p.revenue)}</span>
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-300"
                style={{ width: `${(p.qty / maxQty) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
