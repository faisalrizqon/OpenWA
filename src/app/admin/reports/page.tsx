import Link from "next/link";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { AlertTriangle, BarChart3, FileSpreadsheet, TrendingUp } from "lucide-react";
import {
  getReportMetrics,
  buildReportQuery,
  MAX_ORDER_ROWS_ON_PAGE,
  reportDateValue,
  type ReportMetrics,
} from "@/lib/reports";
import { formatRupiah } from "@/lib/pricing";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ReportPeriodFilter } from "@/components/ReportPeriodFilter";
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

/** Baca satu nilai query param (Next bisa memberi string[] bila param ganda). */
function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/** Tombol ekspor mengikuti rentang yang sedang aktif (preset atau custom). */
function ExportButtons({ metrics }: { metrics: ReportMetrics }) {
  const query = metrics.custom
    ? {
        from: reportDateValue(metrics.rangeStart),
        to: reportDateValue(metrics.rangeEnd),
        days: null,
      }
    : { from: null, to: null, days: metrics.days };

  return (
    <div className="flex gap-2">
      <a
        href={`/api/reports/export?${buildReportQuery({ ...query, format: "csv" })}`}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-sm font-medium text-muted-foreground shadow transition-colors hover:bg-accent"
      >
        <FileSpreadsheet className="size-4" aria-hidden />
        Ekspor CSV
      </a>
      <a
        href={`/api/reports/export?${buildReportQuery({ ...query, format: "xlsx" })}`}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
      >
        <FileSpreadsheet className="size-4" aria-hidden />
        Ekspor Excel
      </a>
    </div>
  );
}

export default async function ReportsPage({
  searchParams,
}: PageProps<"/admin/reports">) {
  const sp = await searchParams;
  const daysParam = one(sp.days);
  const daysRaw = Number(daysParam);
  const fromRaw = one(sp.from);
  const toRaw = one(sp.to);

  // Rentang diminta admin — dipakai ulang untuk filter & pesan error.
  const requested = {
    days: Number.isFinite(daysRaw) ? daysRaw : undefined,
    from: fromRaw || undefined,
    to: toRaw || undefined,
  };

  // Rentang tidak valid (>365 hari, from>to, dsb.) → tampilkan pesan + filter
  // agar admin bisa memperbaiki pilihan tanpa kehilangan konteks halaman.
  let metrics: ReportMetrics | null = null;
  let rangeError = "";
  try {
    metrics = await getReportMetrics(requested);
  } catch (err) {
    rangeError =
      err instanceof RangeError
        ? err.message
        : "Gagal memuat laporan. Coba rentang lain.";
  }

  const filter = (
    <ReportPeriodFilter
      days={metrics && !metrics.custom ? metrics.days : null}
      from={fromRaw}
      to={toRaw}
      error={rangeError}
    />
  );

  if (!metrics) {
    return (
      <div className="space-y-6">
        <PageHeader title="Laporan" description="Periode belum dapat dimuat" />
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">{rangeError}</p>
              <p className="text-xs text-muted-foreground">
                Pilih preset di bawah atau persempit rentang tanggalnya.
              </p>
            </div>
          </CardContent>
        </Card>
        {filter}
      </div>
    );
  }

  const cards = [
    { label: "Total Diterima", value: formatRupiah(metrics.totalReceived), money: true },
    { label: "Nilai Order Dibuat", value: formatRupiah(metrics.orderValue), money: true },
    { label: "Order Selesai", value: String(metrics.ordersCompleted) },
    { label: "Order Terlambat", value: String(metrics.ordersLate) },
    { label: "Pelanggan Baru", value: String(metrics.newCustomers) },
  ];

  // Rentang panjang (mis. 1 tahun) bisa memuat banyak order — batasi render
  // di halaman, sisanya tetap lengkap di ekspor CSV/Excel.
  const visibleOrders = metrics.orders.slice(0, MAX_ORDER_ROWS_ON_PAGE);
  const hiddenCount = metrics.ordersTotal - visibleOrders.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan"
        description={`Rentang ${format(metrics.rangeStart, "dd MMMM yyyy", {
          locale: localeId,
        })} — ${format(metrics.rangeEnd, "dd MMMM yyyy", { locale: localeId })} · ${
          metrics.days
        } hari`}
        action={<ExportButtons metrics={metrics} />}
      />

      {filter}

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
                const maxQty = metrics?.topProducts[0].totalQty || 1;
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
                    <span className="w-24 shrink-0 text-right tabular-nums text-muted-foreground">
                      {t.totalQty} ×
                    </span>
                    <span className="hidden w-32 shrink-0 text-right tabular-nums text-xs text-muted-foreground sm:block">
                      {formatRupiah(t.totalRevenue)}
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
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="size-4 text-muted-foreground" aria-hidden />
            Utilisasi Produk
          </CardTitle>
          <CardDescription>
            Persentase hari-unit yang terpakai dari total kapasitas dalam rentang
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.utilization.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Belum ada produk dengan unit.
            </p>
          ) : (
            <div className="space-y-2">
              {metrics.utilization.map((u) => (
                <div key={u.productName} className="flex items-center gap-3 text-sm">
                  <span className="w-40 truncate font-medium">{u.productName}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        u.pct >= 75 ? "bg-rose-500" : u.pct >= 40 ? "bg-amber-500" : "bg-emerald-500"
                      )}
                      style={{ width: `${u.pct}%` }}
                    />
                  </div>
                  <span className="w-24 text-right text-xs tabular-nums text-muted-foreground">
                    {u.usedUnitDays}/{u.capacityUnitDays} hari-unit · {u.pct}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order dalam Rentang</CardTitle>
          <CardDescription>
            {metrics.ordersTotal} order
            {hiddenCount > 0
              ? ` · menampilkan ${visibleOrders.length} teratas, sisanya ada di ekspor`
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.orders.length === 0 ? (
            <EmptyState
              icon={<BarChart3 className="size-5" aria-hidden />}
              title="Belum ada order dalam rentang ini"
              description="Coba perpanjang rentang atau buat order baru."
              ctaHref="/admin/orders/new"
              ctaLabel="Buat order"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nomor</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Periode Sewa</TableHead>
                    <TableHead>Pelanggan</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Dibayar</TableHead>
                    <TableHead className="text-right">Sisa</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <Link
                          href={`/admin/orders/${o.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {o.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {format(new Date(o.createdAt), "dd MMM yyyy", { locale: localeId })}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {format(new Date(o.startDate), "dd MMM", { locale: localeId })} —{" "}
                        {format(new Date(o.endDate), "dd MMM yyyy", { locale: localeId })}
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
