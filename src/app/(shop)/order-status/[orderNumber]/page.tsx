import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, MapPin, PackageCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/pricing";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, type PaymentMethod } from "@/lib/payment";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { waLink } from "@/lib/shop";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function OrderStatusPage({ params }: PageProps<"/order-status/[orderNumber]">) {
  const { orderNumber } = await params;
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      customer: true,
      items: { include: { product: { select: { name: true } } } },
      payments: { orderBy: { paidAt: "desc" } },
    },
  });
  if (!order) notFound();

  const total = order.items.reduce((s, it) => s + it.subtotal, 0);
  const methodLabel = order.paymentMethod
    ? PAYMENT_METHOD_LABELS[order.paymentMethod as PaymentMethod] ?? order.paymentMethod
    : "-";
  const statusLabel = PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus;
  const waText = `Halo, saya mau cek pesanan *${order.orderNumber}* a.n. ${order.customer.name}. Terima kasih!`;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-8 md:py-12">
      <h1 className="text-xl font-bold tracking-tight md:text-2xl">Status Pesanan</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Nomor pesanan <span className="font-semibold text-foreground">{order.orderNumber}</span>
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={order.status} />
        <span className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
          Pembayaran: {statusLabel}
        </span>
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Detail Pesanan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <dl className="space-y-2">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Pelanggan</dt>
              <dd className="font-medium">{order.customer.name}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Metode bayar</dt>
              <dd className="font-medium">{methodLabel}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Pengantaran</dt>
              <dd className="font-medium">
                {order.deliveryMode === "courier"
                  ? `Diantar kurir${order.deliveryAddress ? ` — ${order.deliveryAddress}` : ""}`
                  : "Ambil sendiri"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Ambil</dt>
              <dd className="flex items-center gap-1 font-medium tabular-nums">
                <CalendarClock className="size-3.5" aria-hidden />
                {order.startDate.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Kembali</dt>
              <dd className="flex items-center gap-1 font-medium tabular-nums">
                <CalendarClock className="size-3.5" aria-hidden />
                {order.endDate.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
              </dd>
            </div>
          </dl>

          <div className="border-t pt-3">
            {order.items.map((it) => (
              <div key={it.id} className="flex items-center justify-between gap-2 py-1">
                <span>
                  {it.product.name} <span className="text-muted-foreground">×{it.quantity}</span>
                </span>
                <span className="font-medium tabular-nums">{formatRupiah(it.subtotal)}</span>
              </div>
            ))}
            <div className="mt-2 flex items-baseline justify-between border-t pt-2">
              <span className="font-semibold">Total</span>
              <span className="text-lg font-bold tabular-nums text-emerald-700">
                {formatRupiah(total)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {order.noteOrder && (
        <p className="mt-4 rounded-lg bg-muted px-4 py-3 text-sm">
          Catatan: {order.noteOrder}
        </p>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {order.paymentStatus !== "paid" && (
          <Link href={`/payment/${order.orderNumber}`}>
            <Button>
              <PackageCheck className="size-4" aria-hidden />
              Lanjutkan Pembayaran
            </Button>
          </Link>
        )}
        <a href={waLink(waText)} target="_blank" rel="noopener noreferrer">
          <Button variant="outline">
            <WhatsAppIcon className="text-emerald-500" aria-hidden />
            Tanya via WhatsApp
          </Button>
        </a>
      </div>
    </div>
  );
}
