import { notFound } from "next/navigation";
import { Banknote, QrCode, CreditCard, CheckCircle2, Clock3 } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/pricing";
import { getStoreSettings } from "@/lib/content";
import { midtransConfigured, PAYMENT_STATUS_LABELS } from "@/lib/payment";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackLink } from "@/components/BackLink";
import { ArrowLink } from "@/components/LinkButton";
import { Label } from "@/components/ui/label";
import { MidtransPayButton } from "@/components/MidtransPayButton";
import { submitPaymentProof } from "../../actions/checkout";

export const dynamic = "force-dynamic";

export default async function PaymentPage({
  params,
  searchParams,
}: PageProps<"/payment/[orderNumber]">) {
  const { orderNumber } = await params;
  const sp = await searchParams;
  const proof = Array.isArray(sp.proof) ? sp.proof[0] : sp.proof;
  const fileError = Array.isArray(sp.error) ? sp.error[0] : sp.error;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: { include: { product: { select: { name: true } } } },
      payments: { select: { status: true, proofPath: true } },
    },
  });
  if (!order) notFound();

  const shop = await getStoreSettings();

  const total = order.items.reduce((s, it) => s + it.subtotal, 0);
  const statusLabel = PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus;
  const method = order.paymentMethod ?? "cash";
  const proofUploaded = order.payments.some((p) => p.status === "pending" && p.proofPath);
  const confirmed = order.payments.some((p) => p.status === "confirmed");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 md:px-8 md:py-12">
      <div className="text-center">
        <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-emerald-100">
          <CheckCircle2 className="size-7 text-emerald-600" aria-hidden />
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">Pesanan dibuat!</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Nomor pesanan{" "}
          <span className="font-semibold text-foreground">{order.orderNumber}</span> — status
          pembayaran:{" "}
          <span className="font-semibold text-foreground">{statusLabel}</span>
        </p>
      </div>

      {/* Summary */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Ringkasan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {order.items.map((it) => (
            <div key={it.id} className="flex items-center justify-between gap-2">
              <span>
                {it.product.name} <span className="text-muted-foreground">×{it.quantity}</span>
              </span>
              <span className="font-medium tabular-nums">{formatRupiah(it.subtotal)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-2 border-t pt-2">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-bold tabular-nums text-emerald-700">
              {formatRupiah(total)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Method-specific instructions */}
      <div className="mt-4 space-y-4">
        {method === "cash" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="size-5 text-primary" aria-hidden />
                Pembayaran Cash
              </CardTitle>
              <CardDescription>
                Bayar langsung saat pengambilan / pengantaran unit.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>1. Admin akan mengonfirmasi pesanan Anda via WhatsApp.</p>
              <p>2. Siapkan jaminan KTP / kartu pelajar.</p>
              <p>3. Bayar tunai sebesar total di atas saat menerima unit.</p>
            </CardContent>
          </Card>
        )}

        {method === "qris" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="size-5 text-primary" aria-hidden />
                Pembayaran QRIS
              </CardTitle>
              <CardDescription>
                Scan QRIS di bawah dengan aplikasi e-wallet / m-banking Anda.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {proofUploaded || confirmed ? (
                <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  {confirmed
                    ? "Pembayaran telah dikonfirmasi oleh admin. Terima kasih!"
                    : "Bukti pembayaran sudah diterima. Menunggu verifikasi admin."}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-2xl border bg-white p-3 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={shop.qrisImagePath}
                      alt={`QRIS ${shop.qrisMerchantName}`}
                      className="size-56 object-contain"
                    />
                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    a.n. <span className="font-medium">{shop.qrisMerchantName}</span> — bayar sebesar{" "}
                    <span className="font-semibold text-foreground">{formatRupiah(total)}</span>
                  </p>

                  {fileError === "nofile" && (
                    <p className="text-sm font-medium text-rose-600">
                      Pilih file bukti pembayaran terlebih dahulu.
                    </p>
                  )}
                  {fileError === "file" && (
                    <p className="text-sm font-medium text-rose-600">
                      File tidak valid — hanya JPG/PNG/WebP maksimal 5MB.
                    </p>
                  )}
                  {proof === "uploaded" && (
                    <p className="text-sm font-medium text-emerald-700">
                      Bukti berhasil diupload. Menunggu verifikasi admin.
                    </p>
                  )}

                  <form action={submitPaymentProof} className="w-full space-y-3">
                    <input type="hidden" name="orderNumber" value={order.orderNumber} />
                    <div className="space-y-1.5">
                      <Label htmlFor="proof">Upload bukti pembayaran (screenshot/foto)</Label>
                      <input
                        id="proof"
                        name="proof"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        required
                        className="w-full rounded-xl border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                      />
                    </div>
                    <Button type="submit" className="h-11 w-full">
                      Kirim Bukti Pembayaran
                    </Button>
                  </form>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {method === "midtrans" && midtransConfigured() && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-5 text-primary" aria-hidden />
                Pembayaran Online
              </CardTitle>
              <CardDescription>
                QRIS dinamis, e-wallet, VA, dan kartu kredit via Midtrans.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {order.paymentRef ? (
                <MidtransPayButton
                  token={order.paymentRef}
                  isProduction={process.env.MIDTRANS_IS_PRODUCTION === "true"}
                  clientKey={process.env.MIDTRANS_CLIENT_KEY ?? ""}
                />
              ) : (
                <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                  Pembayaran online sedang tidak dapat diproses. Silakan hubungi admin untuk
                  pembayaran manual.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Next steps */}
      <div className="mt-6 rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
        <p className="flex items-start gap-2">
          <Clock3 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          Admin akan mengonfirmasi pesanan Anda via WhatsApp pada jam operasional ({shop.hours}).
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <BackLink href="/" label="Kembali ke Katalog" />
        <ArrowLink
          href={`/order-status/${order.orderNumber}`}
          label="Cek Status Pesanan"
        />
      </div>
    </div>
  );
}
