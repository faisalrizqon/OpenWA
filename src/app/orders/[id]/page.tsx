import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
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
    <div className="p-4 space-y-6 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
        <StatusBadge status={order.status} />
        <p className="w-full text-sm text-zinc-500">
          <Link href="/orders" className="hover:underline">
            ← Kembali ke daftar order
          </Link>
        </p>
      </div>

      {overdue && (
        <p className="rounded-lg bg-yellow-100 px-4 py-3 text-sm font-medium text-yellow-800">
          ⚠️ Melewati tanggal kembali ({dateFmt(order.endDate)})
        </p>
      )}

      {error === "payment" && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Pembayaran tidak valid — jumlah harus lebih dari 0
        </p>
      )}
      {error === "file" && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          File tidak valid — hanya JPG/PNG/WebP maksimal 5MB
        </p>
      )}
      {error === "return" && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Data return tidak valid
        </p>
      )}
      {error && !["payment", "file", "return"].includes(error) && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {decodeURIComponent(error)}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Customer panel */}
        <Card>
          <CardHeader>
            <CardTitle>Pelanggan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Link
                href={`/customers/${order.customerId}`}
                className="font-medium text-blue-600 hover:underline"
              >
                {order.customer.name}
              </Link>
              {order.customer.isBlacklisted && <span title="Blacklist">🚫</span>}
            </div>
            <p className="text-zinc-500">{order.customer.phone}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href={waLink(order.customer.phone, bookingWA)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
              >
                Konfirmasi Booking (WA)
              </a>
              {sisa > 0 && (
                <a
                  href={waLink(order.customer.phone, reminderWA)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600"
                >
                  Ingatkan Pelunasan (WA)
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status panel */}
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <CardDescription>Transisi stok otomatis saat aktivasi/selesai</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {order.status === "booking" && (
                <form action={updateOrderStatus}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="newStatus" value="active" />
                  <Button type="submit">Aktifkan</Button>
                </form>
              )}
              {order.status === "active" && (
                <form action={updateOrderStatus}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="newStatus" value="late" />
                  <Button type="submit" variant="destructive">
                    Tandai Terlambat
                  </Button>
                </form>
              )}
              {(order.status === "booking" || order.status === "active" || order.status === "late") && (
                <form action={updateOrderStatus}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="newStatus" value="cancelled" />
                  <Button type="submit" variant="outline">
                    Batalkan
                  </Button>
                </form>
              )}
            </div>
            <p className="text-xs text-zinc-500">
              Mulai: {dateFmt(order.startDate)} · Kembali: {dateFmt(order.endDate)}
            </p>
            {order.noteOrder && (
              <p className="rounded-lg bg-zinc-50 px-3 py-2 text-sm">{order.noteOrder}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Items table */}
      <Card>
        <CardHeader>
          <CardTitle>Item</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produk</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Durasi (jam)</TableHead>
                <TableHead>Harga/unit</TableHead>
                <TableHead>Diskon</TableHead>
                <TableHead>Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="font-medium">
                    {it.product.name}
                    {it.unit && (
                      <span className="ml-2 text-xs text-zinc-500">
                        #{it.unit.serialNumber ?? it.unit.id} ({it.unit.condition})
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{it.quantity}</TableCell>
                  <TableCell>{it.durationHours}</TableCell>
                  <TableCell>{formatRupiah(it.unitPrice)}</TableCell>
                  <TableCell className="text-xs text-zinc-500">
                    {it.discountType === "amount"
                      ? `-${formatRupiah(it.discountValue)}`
                      : it.discountType === "percent"
                        ? `-${it.discountValue}%`
                        : "—"}
                  </TableCell>
                  <TableCell className="font-medium">{formatRupiah(it.subtotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Total</span>
              <span className="font-semibold">{formatRupiah(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Dibayar</span>
              <span>{formatRupiah(paid)}</span>
            </div>
            <div className="flex justify-between">
              <span className={sisa > 0 ? "font-semibold text-red-600" : "font-semibold"}>
                Sisa
              </span>
              <span className={sisa > 0 ? "font-semibold text-red-600" : "font-semibold"}>
                {formatRupiah(sisa)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Payment panel */}
        <Card>
          <CardHeader>
            <CardTitle>Pembayaran</CardTitle>
            <CardDescription>Catat DP / pelunasan / denda</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={addPayment} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="orderId" value={order.id} />
              <div className="space-y-1">
                <label htmlFor="amount" className="text-xs font-medium text-zinc-500">
                  Jumlah (Rp)
                </label>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  min="1"
                  required
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="paymentType" className="text-xs font-medium text-zinc-500">
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
                <label htmlFor="method" className="text-xs font-medium text-zinc-500">
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
                <label htmlFor="note" className="text-xs font-medium text-zinc-500">
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
                    <TableHead>Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        {format(new Date(p.paidAt), "dd MMM yyyy", { locale: localeId })}
                      </TableCell>
                      <TableCell>{PAYMENT_TYPES[p.paymentType] ?? p.paymentType}</TableCell>
                      <TableCell>{p.method ? (METHODS[p.method] ?? p.method) : "—"}</TableCell>
                      <TableCell>{formatRupiah(p.amount)}</TableCell>
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
              {order.status === "active" || order.status === "late"
                ? "Foto kondisi barang + set kondisi unit, lalu selesaikan"
                : "Hanya tersedia saat order aktif/terlambat"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {order.status === "active" || order.status === "late" ? (
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
                        className="w-24 rounded border"
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
                    className="w-24 rounded border"
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">Belum ada proses return.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
