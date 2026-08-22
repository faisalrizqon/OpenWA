import Link from "next/link";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { BarChart3, FileSpreadsheet, ClipboardList, TrendingUp } from "lucide-react";
import { getReportMetrics } from "@/lib/reports";
import { formatRupiah } from "@/lib/pricing";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default async function ReportsPage({
  searchParams,
}: PageProps<"/reports">) {
  const sp = await searchParams;
  const daysRaw = Number(sp.days);
  const metrics = await getReportMetrics(daysRaw);

  const cards = [
    { label: "Total Diterima", value: formatRupiah(metrics.totalReceived), money: true },
    { label: "Nilai Order Dibuat", value: formatRupiah(metrics.orderValue), money: true },
    { label: "Order Selesai", value: String(metrics.ordersCompleted) },
    { label: "Order Terlambat", value: String(metrics.ordersLate) },
    { label: "Pelanggan Baru", value: String(metrics.newCustomers) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan"
        description={`Rentang ${format(metrics.rangeStart, "dd MMM", { locale: localeId })} — ${format(
          metrics.rangeEnd,
          "dd MMM yyyy",
          { locale: localeId }
        )}`}
        action={
          <a
            href={`/api/reports/export?days=${metrics.days}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <FileSpreadsheet className="size-4" aria-hidden />
            Ekspor Excel
          </a>
        }
      />

      <div className="flex gap-1.5">
        {[7, 30, 90].map((d) => (
          <Link
            key={d}
            href={`/reports?days=${d}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              metrics.days === d
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {d} hari
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label} size="sm">
            <CardContent>
              <p className="truncate text-xs font-medium text-muted-foreground">{c.label}</p>
              <p
                className={cn(
                  "mt-1 font-bold tabular-nums tracking-tight",
                  c.money ? "text-lg md:text-xl" : "text-2xl md:text-3xl"
                )}
              >
                {c.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-4 text-muted-foreground" aria-hidden />
            Top Produk
          </CardTitle>
          <CardDescription>5 produk paling sering disewa dalam rentang</CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.topProducts.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Belum ada data — buat order dulu.
            </p>
          ) : (
            <div className="space-y-2">
              {metrics.topProducts.map((t, i) => {
                const maxQty = metrics.topProducts[0].totalQty || 1;
                return (
                  <div key={t.productName} className="flex items-center gap-3 text-sm">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                      {i + 1}
                    </span>
                    <span className="w-40 truncate font-medium">{t.productName}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(t.totalQty / maxQty) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-right tabular-nums text-muted-foreground">
                      {t.totalQty}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order dalam Rentang</CardTitle>
          <CardDescription>{metrics.orders.length} order</CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.orders.length === 0 ? (
            <EmptyState
              icon={<BarChart3 className="size-5" aria-hidden />}
              title="Belum ada order dalam rentang ini"
              description="Coba perpanjang rentang atau buat order baru."
              ctaHref="/orders/new"
              ctaLabel="Buat order"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Dibayar</TableHead>
                  <TableHead className="text-right">Sisa</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Link href={`/orders/${o.id}`} className="font-medium text-primary hover:underline">
                        {o.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {format(new Date(o.createdAt), "dd MMM yyyy", { locale: localeId })}
                    </TableCell>
                    <TableCell>{o.customerName}</TableCell>
                    <TableCell className="max-w-48 truncate text-muted-foreground">
                      {o.itemSummary}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatRupiah(o.total)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatRupiah(o.paid)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatRupiah(o.sisa)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={o.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
