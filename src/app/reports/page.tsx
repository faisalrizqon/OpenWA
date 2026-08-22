import Link from "next/link";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { getReportMetrics } from "@/lib/reports";
import { formatRupiah } from "@/lib/pricing";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ReportsPage({
  searchParams,
}: PageProps<"/reports">) {
  const sp = await searchParams;
  const daysRaw = Number(sp.days);
  const metrics = await getReportMetrics(daysRaw);

  return (
    <div className="p-4 space-y-6 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Laporan</h1>
        <a
          href={`/api/reports/export?days=${metrics.days}`}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Ekspor Excel
        </a>
      </div>

      <div className="flex gap-2">
        {[7, 30, 90].map((d) => (
          <Link
            key={d}
            href={`/reports?days=${d}`}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              metrics.days === d
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {d} hari
          </Link>
        ))}
      </div>

      <p className="text-sm text-zinc-500">
        Rentang: {format(metrics.rangeStart, "dd MMM yyyy", { locale: localeId })} —{" "}
        {format(metrics.rangeEnd, "dd MMM yyyy", { locale: localeId })}
      </p>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <Card>
          <CardHeader>
            <CardDescription>Total Diterima</CardDescription>
            <CardTitle className="text-2xl">{formatRupiah(metrics.totalReceived)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Nilai Order Dibuat</CardDescription>
            <CardTitle className="text-2xl">{formatRupiah(metrics.orderValue)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Order Selesai</CardDescription>
            <CardTitle className="text-3xl">{metrics.ordersCompleted}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Order Terlambat</CardDescription>
            <CardTitle className="text-3xl">{metrics.ordersLate}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Pelanggan Baru</CardDescription>
            <CardTitle className="text-3xl">{metrics.newCustomers}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Produk</CardTitle>
          <CardDescription>5 produk paling sering disewa dalam rentang</CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.topProducts.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-500">
              Belum ada data — buat order dulu.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead>Total Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.topProducts.map((t) => (
                  <TableRow key={t.productName}>
                    <TableCell className="font-medium">{t.productName}</TableCell>
                    <TableCell>{t.totalQty}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
            <p className="py-8 text-center text-sm text-zinc-500">
              Belum ada order dalam rentang ini.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Dibayar</TableHead>
                  <TableHead>Sisa</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Link href={`/orders/${o.id}`} className="font-medium hover:underline">
                        {o.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {format(new Date(o.createdAt), "dd MMM yyyy", { locale: localeId })}
                    </TableCell>
                    <TableCell>{o.customerName}</TableCell>
                    <TableCell className="max-w-64 truncate">{o.itemSummary}</TableCell>
                    <TableCell>{formatRupiah(o.total)}</TableCell>
                    <TableCell>{formatRupiah(o.paid)}</TableCell>
                    <TableCell>{formatRupiah(o.sisa)}</TableCell>
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
