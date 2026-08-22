import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  MessageCircle,
  PlayCircle,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/pricing";
import { formatBookingWA, waLink } from "@/lib/wa";
import { StatusBadge } from "@/components/StatusBadge";
import { ReturnForm } from "@/components/ReturnForm";
import { updateOrderStatus, addPayment } from "@/actions/orders";
import { Button } from "@/components/ui/button";
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

const PAYMENT_TYPES: Record<string, string> = {
  dp: "DP",
  pelunasan: "Pelunasan",
  denda: "Denda",
  deposit_refund: "Refund Deposit",
};

const METHODS: Record<string, string> = {
  "": "—",
  cash: "Cash",
  transfer_bca: "Transfer BCA",
  transfer_mandiri: "Transfer Mandiri",
  transfer_lain: "Transfer Lain",
};

const dateFmt = (d: Date) => format(d, "dd MMM yyyy HH:mm", { locale: localeId });

export default async function OrderDetailPage({
  params,
  searchParams,
}: PageProps<"/orders/[id]">) {
  const { id } = await params;
  const errorParam = await searchParams;
  const error = Array.isArray(errorParam.error) ? errorParam.error[0] : errorParam.error;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { include: { product: true, unit: true } },
      payments: { orderBy: { paidAt: "desc" } },
      returnPhotos: { orderBy: { uploadedAt: "desc" } },
    },
  });
  if (!order) notFound();

  const total = order.items.reduce((s, it) => s + it.subtotal, 0);
  const paid = order.payments
    .filter((p) => ["dp", "pelunasan", "denda"].includes(p.paymentType))
    .reduce((s, p) => s + p.amount, 0);
  const sisa = total - paid;
  const overdue = order.status === "active" && order.endDate < new Date();
  const active = order.status === "active" || order.status === "late";

  const bookingWA = formatBookingWA({
    orderNumber: order.orderNumber,
    customerName: order.customer.name,
    items: order.items.map((it) => ({
      productName: it.product.name,
      quantity: it.quantity,
      durationHours: it.durationHours,
    })),
    startDate: order.startDate,
    endDate: order.endDate,
    total,
    sisa: Math.max(0, sisa),
  });
  const reminderWA = `Halo ${order.customer.name}, mohon selesaikan pelunasan order *${order.orderNumber}* sebesar Rp ${Math.max(0, sisa).toLocaleString("id-ID")}. Terima kasih! 🙏`;

  const assignedUnits = order.items
    .filter((it) => it.unit != null)
    .map((it) => ({
      unitId: it.unit!.id,
      productName: it.product.name,
      serialNumber: it.unit!.serialNumber,
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/orders"
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          ← Orders
        </Link>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">{order.orderNumber}</h1>
        <StatusBadge status={order.status} />
        <span className="text-sm text-muted-foreground">
          {dateFmt(order.startDate)} → {dateFmt(order.endDate)}
        </span>
      </div>

      {overdue && (
        <p className="flex items-center gap-2 rounded-lg bg-amber-100 px-4 py-3 text-sm font-medium text-amber-900">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          Melewati tanggal kembali ({dateFmt(order.endDate)}) — pertimbangkan tandai terlambat
        </p>
      )}

      {error === "payment" && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Pembayaran tidak valid — jumlah harus lebih dari 0.
        </p>
      )}
      {error === "file" && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          File tidak valid — hanya JPG/PNG/WebP maksimal 5MB.
        </p>
      )}
      {error === "return" && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Data return tidak valid.
        </p>
      )}
      {error && !["payment", "file", "return"].includes(error) && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {decodeURIComponent(error)}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Customer + status actions */}
        <Card>
          <CardHeader>
            <CardTitle>Pelanggan & Aksi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Link
                href={`/customers/${order.customerId}`}
                className="font-medium text-primary hover:underline"
              >
                {order.customer.name}
              </Link>
              {order.customer.isBlacklisted && (
                <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                  Blacklist
                </span>
              )}
              <span className="text-sm text-muted-foreground">{order.customer.phone}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href={waLink(order.customer.phone, bookingWA)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
              >
                <MessageCircle className="size-4" aria-hidden />
                Konfirmasi Booking
              </a>
              {sisa > 0 && (
                <a
                  href={waLink(order.customer.phone, reminderWA)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-amber-500 px-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-600"
                >
                  <Wallet className="size-4" aria-hidden />
                  Ingatkan Pelunasan
                </a>
              )}
            </div>

            <div className="flex flex-wrap gap-2 border-t pt-4">
              {order.status === "booking" && (
                <form action={updateOrderStatus}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="newStatus" value="active" />
                  <Button type="submit" className="gap-1.5">
                    <PlayCircle className="size-4" aria-hidden />
                    Aktifkan
                  </Button>
                </form>
              )}
              {order.status === "active" && (
                <form action={updateOrderStatus}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="newStatus" value="late" />
                  <Button type="submit" variant="destructive" className="gap-1.5">
                    <AlertTriangle className="size-4" aria-hidden />
                    Tandai Terlambat
                  </Button>
                </form>
              )}
              {order.status !== "cancelled" && order.status !== "completed" && (
                <form action={updateOrderStatus}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="newStatus" value="cancelled" />
                  <Button type="submit" variant="outline" className="gap-1.5">
                    <Ban className="size-4" aria-hidden />
                    Batalkan
                  </Button>
                </form>
              )}
              {order.status === "completed" && (
                <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 text-sm font-medium text-emerald-700">
                  <CheckCircle2 className="size-4" aria-hidden />
                  Order selesai
                </span>
              )}
            </div>

            {order.noteOrder && (
              <p className="rounded-lg bg-muted px-3 py-2 text-sm">{order.noteOrder}</p>
            )}
          </CardContent>
        </Card>

        {/* Financial summary */}
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Pembayaran</CardTitle>
            <CardDescription>
              {order.payments.length} transaksi tercatat
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-xl font-bold tabular-nums">{formatRupiah(total)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Dibayar</span>
              <span className="font-medium tabular-nums text-emerald-600">
                {formatRupiah(paid)}
              </span>
            </div>
            <div className="flex items-baseline justify-between border-t pt-2">
              <span className="text-sm font-medium">Sisa</span>
              <span
                className={cn(
                  "text-lg font-bold tabular-nums",
                  sisa > 0 ? "text-red-600" : "text-emerald-600"
                )}
              >
                {formatRupiah(sisa)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle>Item</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-center">Durasi</TableHead>
                <TableHead className="text-right">Harga/unit</TableHead>
                <TableHead className="text-right">Diskon</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell>
                    <p className="font-medium">{it.product.name}</p>
                    {it.unit && (
                      <p className="text-xs text-muted-foreground">
                        Unit #{it.unit.serialNumber ?? it.unit.id} · {it.unit.condition}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">{it.quantity}</TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {it.durationHours} jam
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatRupiah(it.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {it.discountType === "amount"
                      ? `-${formatRupiah(it.discountValue)}`
                      : it.discountType === "percent"
                        ? `-${it.discountValue}%`
                        : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatRupiah(it.subtotal)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Payment form + history */}
        <Card>
          <CardHeader>
            <CardTitle>Catat Pembayaran</CardTitle>
            <CardDescription>DP / pelunasan / denda / refund deposit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={addPayment} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="orderId" value={order.id} />
              <div className="space-y-1">
                <label htmlFor="amount" className="text-xs font-medium text-muted-foreground">
                  Jumlah (Rp)
                </label>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  min="1"
                  required
                  placeholder="30000"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm tabular-nums"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="paymentType" className="text-xs font-medium text-muted-foreground">
                  Jenis
                </label>
                <select
                  id="paymentType"
                  name="paymentType"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
                  defaultValue="dp"
                >
                  {Object.entries(PAYMENT_TYPES).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="method" className="text-xs font-medium text-muted-foreground">
                  Metode
                </label>
                <select
                  id="method"
                  name="method"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
                  defaultValue=""
                >
                  {Object.entries(METHODS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="note" className="text-xs font-medium text-muted-foreground">
                  Catatan
                </label>
                <input
                  id="note"
                  name="note"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" variant="secondary">
                  Catat Pembayaran
                </Button>
              </div>
            </form>

            {order.payments.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Metode</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(p.paidAt), "dd MMM yyyy", { locale: localeId })}
                      </TableCell>
                      <TableCell>{PAYMENT_TYPES[p.paymentType] ?? p.paymentType}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.method ? (METHODS[p.method] ?? p.method) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatRupiah(p.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Return panel */}
        <Card>
          <CardHeader>
            <CardTitle>Return & Penyelesaian</CardTitle>
            <CardDescription>
              {active
                ? "Foto kondisi barang + set kondisi unit, lalu selesaikan"
                : "Tersedia saat order aktif / terlambat"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {active ? (
              <>
                <ReturnForm orderId={order.id} units={assignedUnits} />
                {order.returnPhotos.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {order.returnPhotos.map((rp) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={rp.id}
                        src={rp.filePath}
                        alt="Foto return"
                        className="h-24 w-24 rounded-lg border object-cover"
                      />
                    ))}
                  </div>
                )}
              </>
            ) : order.returnPhotos.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {order.returnPhotos.map((rp) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={rp.id}
                    src={rp.filePath}
                    alt="Foto return"
                    className="h-24 w-24 rounded-lg border object-cover"
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada proses return.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
