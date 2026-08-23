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
import { SelectField } from "@/components/SelectField";
import { updateOrderStatus, addPayment } from "@/actions/orders";
import {
  StatusChangeForm,
  DeleteOrderDialog,
  PaymentRowActions,
} from "@/components/OrderAdminActions";
import { confirmOnlinePayment } from "@/app/(shop)/actions/checkout";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, type PaymentMethod } from "@/lib/payment";
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

const GUARANTEE_TYPES: Record<string, string> = {
  ktp: "KTP",
  sim: "SIM",
  kartu_pelajar: "Kartu Pelajar",
  lainnya: "Lainnya",
};

const METHODS: Record<string, string> = {
  "": "—",
  cash: "Cash",
  qris: "QRIS",
  midtrans: "Midtrans",
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
  // Hanya pembayaran confirmed yang dihitung lunas; pending (bukti belum diverifikasi) tidak ikut
  const paid = order.payments
    .filter((p) => ["dp", "pelunasan", "denda"].includes(p.paymentType) && p.status !== "pending")
    .reduce((s, p) => s + p.amount, 0);
  const sisa = total - paid;
  const overdue = order.status === "active" && order.endDate < new Date();
  const active = order.status === "active" || order.status === "late";

  const isOnline = order.source === "online";
  const pendingProof = order.payments.find((p) => p.status === "pending" && p.proofPath);
  const hasPendingPayment = order.payments.some((p) => p.status === "pending");

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
      {/* Flow instructions */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">1</span>
            Alur Order
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p><strong>Order baru</strong> dibuat otomatis sebagai <span className="font-medium text-foreground">Booking</span>. Admin mengklik tombol <strong>Aktifkan</strong> (atau ubah status via dropdown) saat barang diambil customer — unit akan ter-assign ke stok.</p>
          <p>Setelah masa sewa habis, tandai <strong>Terlambat</strong> jika memang belum kembali. Klik selesaikan setelah item dikembalikan (tambah foto return & catatan kondisi).</p>
          <p>Pembayaran dicatat: DP saat booking, pelunasan sebelum/sehabis sewa, atau denda kalau telat.</p>
          <hr className="my-2 border-border" />
          <p><strong>Edit/Hapus</strong> pembayaran bisa langsung lewat kolom Aksi per baris. Semua order bebas diubah statusnya kapan saja (tidak ada batasan workflow). Hapus order hanya jika benar-benar batal dan ingin data hilang permanen.</p>
          <div className="flex items-center gap-2 pt-1">
            <Link href="/orders" className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-card border px-2.5 text-xs font-medium hover:bg-accent transition-colors">
              ← Daftar Orders
            </Link>
            <Link href="/calendar" className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-card border px-2.5 text-xs font-medium hover:bg-accent transition-colors ml-auto">
              Lihat Kalender ·
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
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

      {/* Error banners */}
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

            {/* Ubah status bebas (admin override) + hapus order */}
            <div className="flex flex-wrap items-center gap-2 border-t pt-4">
              <StatusChangeForm orderId={order.id} status={order.status} />
              <DeleteOrderDialog orderId={order.id} orderNumber={order.orderNumber} />
            </div>

            {order.noteOrder && (
              <p className="rounded-lg bg-muted px-3 py-2 text-sm">{order.noteOrder}</p>
            )}

            {(order.guaranteeType || order.deliveryMode === "courier" || order.rescheduledFrom) && (
              <dl className="grid gap-x-4 gap-y-1.5 border-t pt-3 text-sm sm:grid-cols-2">
                {order.guaranteeType && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Jaminan</dt>
                    <dd className="font-medium">
                      {GUARANTEE_TYPES[order.guaranteeType] ?? order.guaranteeType}
                      {order.guaranteeNumber ? ` · ${order.guaranteeNumber}` : ""}
                    </dd>
                  </div>
                )}
                {order.deliveryMode === "courier" && (
                  <>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Pengantaran</dt>
                      <dd className="font-medium">
                        Diantar kurir{order.deliveryAddress ? ` · ${order.deliveryAddress}` : ""}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Gaji Transport</dt>
                      <dd className="font-medium tabular-nums">
                        {formatRupiah(order.courierFee)}
                      </dd>
                    </div>
                  </>
                )}
                {order.rescheduledFrom && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Reschedule dari</dt>
                    <dd className="font-medium">{dateFmt(order.rescheduledFrom)}</dd>
                  </div>
                )}
                {order.returnedAt && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Dikembalikan</dt>
                    <dd className="font-medium">{dateFmt(order.returnedAt)}</dd>
                  </div>
                )}
              </dl>
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

            {isOnline && (
              <div className="space-y-2 border-t pt-3">
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Sumber order</dt>
                    <dd className="font-medium">Checkout website (customer)</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Metode pembayaran</dt>
                    <dd className="font-medium">
                      {order.paymentMethod
                        ? PAYMENT_METHOD_LABELS[order.paymentMethod as PaymentMethod] ?? order.paymentMethod
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Status pembayaran</dt>
                    <dd className="font-medium">{PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}</dd>
                  </div>
                  {order.paymentRef && order.paymentMethod === "midtrans" && (
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Ref Midtrans</dt>
                      <dd className="truncate font-mono text-xs">{order.paymentRef.slice(0, 40)}</dd>
                    </div>
                  )}
                </dl>

                {pendingProof && (
                  <div className="space-y-2 rounded-xl border bg-muted/40 p-3">
                    <p className="text-xs font-semibold">Bukti transfer customer (perlu verifikasi)</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <a href={pendingProof.proofPath!} target="_blank" rel="noopener noreferrer">
                      <img
                        src={pendingProof.proofPath!}
                        alt="Bukti pembayaran"
                        className="h-32 rounded-lg border object-cover"
                      />
                    </a>
                    <form action={confirmOnlinePayment}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <Button type="submit" size="sm" className="w-full gap-1.5">
                        <CheckCircle2 className="size-4" aria-hidden />
                        Konfirmasi Pembayaran Ini
                      </Button>
                    </form>
                  </div>
                )}
                {!pendingProof && hasPendingPayment && (
                  <form action={confirmOnlinePayment}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <Button type="submit" variant="secondary" size="sm">
                      Konfirmasi pembayaran pending
                    </Button>
                  </form>
                )}
              </div>
            )}
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
                <SelectField
                  id="paymentType"
                  name="paymentType"
                  defaultValue="dp"
                  options={Object.entries(PAYMENT_TYPES).map(([v, l]) => ({
                    label: l,
                    value: v,
                  }))}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="method" className="text-xs font-medium text-muted-foreground">
                  Metode
                </label>
                <SelectField
                  id="method"
                  name="method"
                  defaultValue=""
                  options={Object.entries(METHODS).map(([v, l]) => ({ label: l, value: v }))}
                />
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
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
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
                      <TableCell>
                        <span
                          className={cn(
                            "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                            p.status === "confirmed"
                              ? "bg-emerald-100 text-emerald-700"
                              : p.status === "pending"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-700"
                          )}
                        >
                          {p.status === "confirmed" ? "Terverifikasi" : p.status === "pending" ? "Menunggu" : "Gagal"}
                        </span>
                        {p.proofPath && (
                          <a
                            href={p.proofPath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 block text-xs text-primary underline underline-offset-2"
                          >
                            Lihat bukti
                          </a>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatRupiah(p.amount)}
                      </TableCell>
                      <TableCell className="w-[90px]">
                        <PaymentRowActions orderId={order.id} payment={{ id: Number(p.id), amount: p.amount, method: p.method, note: p.note, status: p.status }} />
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
