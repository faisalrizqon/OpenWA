import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Image, PackageCheck, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/pricing";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, type PaymentMethod } from "@/lib/payment";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { ExternalLink } from "@/components/LinkButton";
import { waLink } from "@/lib/shop";
import { getStoreSettings } from "@/lib/content";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { GuaranteeUpload } from "@/components/GuaranteeUpload";
import { submitGuarantee } from "../../actions/checkout";

export const dynamic = "force-dynamic";

export default async function OrderStatusPage({ params }: PageProps<"/order-status/[orderNumber]">) {
  const { orderNumber } = await params;
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      customer: true,
      items: { include: { product: { select: { name: true } } } },
      payments: { orderBy: { paidAt: "desc" } },
      documents: { orderBy: { uploadedAt: "desc" } },
    },
  });
  if (!order) notFound();

  const shop = await getStoreSettings();

  const total = order.items.reduce((s, it) => s + it.subtotal, 0);
  const methodLabel = order.paymentMethod
    ? PAYMENT_METHOD_LABELS[order.paymentMethod as PaymentMethod] ?? order.paymentMethod
    : "-";
  const statusLabel = PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus;
  const waText = `Halo, saya mau cek pesanan *${order.orderNumber}* a.n. ${order.customer.name}. Terima kasih!`;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto w-full max-w-2xl">
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
              <dt className="text-muted-foreground">No. WhatsApp</dt>
              <dd className="font-mono font-medium tabular-nums">{order.customer.phone}</dd>
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
      {/* Jaminan: upload KTP/selfie + dokumen terupload */}
      <Card className="mt-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-600" aria-hidden />
            Jaminan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {order.documents.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {order.documents.map((d) => (
                <a key={d.id} href={d.filePath} target="_blank" rel="noopener noreferrer" className="group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={d.filePath}
                    alt={d.docType}
                    className="h-24 w-full rounded-lg border object-cover transition-opacity group-hover:opacity-80"
                  />
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {d.docType === "ktp" ? "KTP" : d.docType === "selfie_ktp" ? "Selfie KTP" : d.docType === "kartu_pelajar" ? "Kartu Pelajar" : "Lainnya"}
                  </p>
                </a>
              ))}
            </div>
          ) : (
            <p className="rounded-lg bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground">
              Belum ada jaminan terupload. Setelah barang diambil, upload foto KTP / selfie + KTP sebagai bukti.
            </p>
          )}
          <GuaranteeUpload orderId={order.id} action={submitGuarantee} />
        </CardContent>
      </Card>

      {/* Link Drive foto hasil */}
      {order.photoLink && (
        <Card className="mt-5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="size-4 text-primary" aria-hidden />
              Foto Hasil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Link Drive berisi foto hasil dari kamera yang disewa:
            </p>
            <a
              href={order.photoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 break-all rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20"
            >
              Buka Drive
            </a>
          </CardContent>
        </Card>
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
        <ExternalLink
          href={waLink(shop.whatsapp, waText)}
          label="Tanya via WhatsApp"
          tone="neutral"
          icon={<WhatsAppIcon aria-hidden />}
        />
      </div>
      </div>
    </div>
  );
}
