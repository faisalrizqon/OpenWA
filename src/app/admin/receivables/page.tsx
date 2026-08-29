import Link from "next/link";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { AlertTriangle, ClipboardList, ExternalLink, Wallet } from "lucide-react";
import { prisma } from "@/lib/db";
import { waLink } from "@/lib/wa";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRupiah } from "@/lib/pricing";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export default async function ReceivablesPage() {
  const orders = await prisma.order.findMany({
    where: {
      // Piutang = order apa pun yang belum lunas, termasuk yang sudah
      // completed (barang kembali tapi uang belum masuk) — justru paling
      // penting ditagih. Hanya cancelled yang dikecualikan.
      status: { notIn: ["cancelled"] },
      paymentStatus: { in: ["unpaid", "partial", "pending"] },
    },
    include: {
      customer: true,
      items: { include: { product: true, unit: true } },
      payments: {
        where: { status: "confirmed" },
        select: { amount: true, paymentType: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const rows = orders.map((o) => {
    const total = o.items.reduce((s, it) => s + it.subtotal, 0);
    const paid = o.payments.filter((p) => ["dp", "pelunasan", "denda"].includes(p.paymentType)).reduce((s, p) => s + p.amount, 0);
    const sisa = Math.max(0, total - paid);
    const overdue = o.status === "late" || (o.status === "active" && o.endDate < new Date());
    const statusInfo =
      sisa === 0
        ? { label: "Lunas", className: "bg-green-100 text-green-800" }
        : overdue
          ? { label: "Terlambat", className: "bg-red-100 text-red-800" }
          : { label: "Belum Lunas", className: "bg-amber-100 text-amber-800" };
    return {
      order: o,
      total,
      paid,
      sisa,
      overdue,
      phone: o.customer.phone,
      statusInfo,
    };
  }).filter((r) => r.sisa > 0);

  const summary = rows.reduce(
    (acc, r) => ({ total: acc.total + r.sisa, count: r.sisa > 0 ? acc.count + 1 : acc.count }),
    { total: 0, count: 0 }
  );

  if (rows.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Piutang / Belum Lunas"
          description="Daftar order yang masih aktif tetapi belum lunas pembayaran."
          action={<Link href="/admin/orders/new" className={cn("h-8 inline-flex items-center rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white shadow transition-colors hover:bg-emerald-700")}>
            <ClipboardList className="mr-2 size-4" aria-hidden />
            Buat Order
          </Link>}
        />
        <EmptyState
          icon={<Wallet className="size-5" aria-hidden />}
          title="Tidak ada piutang"
          description="Semua order sudah lunas atau belum ada order aktif."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Piutang / Belum Lunas"
        description="Pantau tagihan yang belum dibayar pelanggan."
      />

      <Card>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-4 md:grid-cols-3">
            <Card className="rounded-xl border-amber-200 bg-amber-50/60">
              <CardContent className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-900">
                  <Wallet className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-medium text-amber-900">Total Piutang</p>
                  <p className="text-xl font-bold tracking-tight">
                    Rp {summary.total.toLocaleString("id-ID")}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl border-amber-200 bg-amber-50/60">
              <CardContent className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-900">
                  <AlertTriangle className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-medium text-amber-900">Order Tidak Lunas</p>
                  <p className="text-xl font-bold tracking-tight">{summary.count}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl border-border bg-card">
              <CardContent className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <ExternalLink className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Order</p>
                  <p className="text-xl font-bold tracking-tight">{rows.length}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detail Tagihan</CardTitle>
          <CardDescription>Urut dari order pertama hingga terbaru</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/6">No. Order</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Jatuh Tempo</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Sudah Bayar</TableHead>
                <TableHead>Sisa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.order.id}>
                  <TableCell className="font-semibold">
                    <Link
                      href={`/admin/orders/${r.order.id}`}
                      className="text-blue-600 underline-offset-2 hover:underline"
                      title={`Buka detail order ${r.order.orderNumber}`}
                    >
                      {r.order.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{r.order.customer.name}</TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      {r.order.items.map((it) => (
                        <p key={it.id} className="text-xs leading-4">
                          <span className="font-medium">{it.product.name}</span>
                          {it.unit && (
                            <span className="text-muted-foreground">
                              {" "}· Unit #{it.unit.serialNumber ?? it.unit.id}
                            </span>
                          )}
                        </p>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {format(r.order.endDate, "dd MMMM yyyy HH.mm", { locale: localeId })}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatRupiah(r.total)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatRupiah(r.paid)}</TableCell>
                  <TableCell className={cn("text-right font-semibold tabular-nums", r.sisa > 0 ? "text-red-600" : "text-emerald-600")}>
                    {formatRupiah(r.sisa)}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${r.statusInfo.className}`}>
                      {r.statusInfo.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={waLink(r.phone, `Halo ${r.order.customer.name}, mohon selesaikan pelunasan order *${r.order.orderNumber}* sebesar ${formatRupiah(r.sisa)}. Terima kasih! 🙏`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-7 items-center gap-1.5 rounded-md bg-emerald-600 px-2 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
                    >
                      <WhatsAppIcon className="size-3" />
                      WA
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
