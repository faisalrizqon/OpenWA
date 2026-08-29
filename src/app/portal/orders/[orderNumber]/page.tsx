import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ArrowLeft, ArrowRight, Banknote, CalendarClock, CreditCard, ShieldCheck, Star } from "lucide-react";
import { prisma } from "@/lib/db";
import { DriveIcon } from "@/components/DriveIcon";
import { auth } from "@/lib/auth";
import { formatRupiah } from "@/lib/pricing";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, type PaymentMethod } from "@/lib/payment";
import { computeLateInfo, loadLateFeeItems } from "@/lib/late";
import { storageUrl } from "@/lib/storage-url";
import { submitGuarantee, submitPaymentProof } from "@/app/(shop)/actions/checkout";
import { GuaranteeDocs, GuaranteeUpload } from "@/components/GuaranteeUpload";
import { StatusBadge } from "@/components/StatusBadge";
import { PageNotifier, type PageNotification } from "@/components/PageNotifier";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { productPhotosOf } from "@/lib/productPhotos";
import { ReviewForm } from "../../ReviewForm";

export const dynamic = "force-dynamic";

export default async function PortalOrderDetailPage({ params, searchParams }: PageProps<"/portal/orders/[orderNumber]">) {
  const session = await auth();
  const customerId = Number(session?.user?.customerId);
  if (!session?.user || session.user.role !== "customer" || !Number.isInteger(customerId) || customerId <= 0) {
    redirect("/portal/login");
  }

  const { orderNumber } = await params;
  const sp = await searchParams;
  const back = `/portal/orders/${orderNumber}`;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: {
        include: {
          product: {
            select: {
              name: true,
              units: { select: { id: true, photoPath: true } },
              images: { select: { filePath: true, sortOrder: true } },
            },
          },
        },
      },
      payments: { orderBy: { paidAt: "desc" } },
      documents: { orderBy: { uploadedAt: "desc" }, select: { id: true, docType: true, filePath: true, fileSize: true, uploadedAt: true } },
      review: true,
    },
  });
  if (!order || order.customerId !== customerId) notFound();

  const error = Array.isArray(sp.error) ? sp.error[0] : sp.error;
  const proof = Array.isArray(sp.proof) ? sp.proof[0] : sp.proof;
  const guarantee = Array.isArray(sp.guarantee) ? sp.guarantee[0] : sp.guarantee;

  const notifications: PageNotification[] = [];
  if (error === "nofile") notifications.push({ type: "error", message: "Pilih file bukti pembayaran terlebih dahulu." });
  if (error === "file") notifications.push({ type: "error", message: "File tidak valid — hanya JPG/PNG/WebP maksimal 5MB." });
  if (error && error !== "nofile" && error !== "file") notifications.push({ type: "error", message: decodeURIComponent(error) });
  if (proof === "uploaded") notifications.push({ type: "success", message: "Bukti pembayaran berhasil diupload." });
  if (guarantee === "uploaded") notifications.push({ type: "success", message: "Dokumen jaminan berhasil diupload." });
  if (guarantee === "deleted") notifications.push({ type: "info", message: "Dokumen jaminan berhasil dihapus." });

  const itemsTotal = order.items.reduce((s, it) => s + it.subtotal, 0);
  const total = itemsTotal - order.promoDiscount + order.courierFee + order.tipAmount;
  const paidAmount = order.payments.filter((p) => p.status === "confirmed").reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, total - paidAmount);
  const proofUploaded = order.payments.some((p) => p.status === "pending" && p.proofPath);
  const needsPayment = order.paymentStatus === "unpaid" || order.paymentStatus === "pending" || order.paymentStatus === "partial";

  const lateFeeItems = await loadLateFeeItems(order.id);
  const lateInfo = computeLateInfo(order.endDate, lateFeeItems, order.returnedAt ?? new Date());

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:py-12 space-y-6">
      <PageNotifier notifications={notifications} />

      {/* Back & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b">
        <Link href="/portal" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden /> Kembali ke dashboard
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{order.orderNumber}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarClock className="size-4" aria-hidden />
            {format(order.startDate, "dd MMM yyyy", { locale: localeId })}{" "}
            <ArrowRight className="size-3 inline text-muted-foreground" aria-hidden />{" "}
            {format(order.endDate, "dd MMM yyyy", { locale: localeId })}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Timeline */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CalendarClock className="size-4 text-primary" aria-hidden /> Timeline</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[{label:"Pesanan dibuat",date:order.createdAt,done:true},{label:"Sewa dimulai",date:order.startDate,done:["active","late","completed"].includes(order.status)}].map((s,i)=>(
                <li key={i} className="flex items-start gap-3">
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${s.done?"bg-emerald-500":"bg-muted-foreground/40"}`} aria-hidden />
                  <div><p className="text-sm font-medium">{s.label}</p>{s.date&&<p className="text-xs text-muted-foreground">{format(s.date,"dd MMMM yyyy HH:mm",{locale:localeId})}</p>}</div>
                </li>
              ))}
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Banknote className="size-4 text-primary" aria-hidden /> Barang Sewaan</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {order.items.map((it) => {
                  const { main } = productPhotosOf(it.product);
                  return (
                    <li key={it.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border">
                      {main ? (
                        <img src={main.src} alt="" className="size-12 shrink-0 rounded-lg object-cover border" />
                      ) : (
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground" aria-hidden>
                          <Banknote className="size-6" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{it.product.name}</p>
                        <p className="text-xs text-muted-foreground">×{it.quantity} · {it.durationHours} jam</p>
                      </div>
                      <span className="tabular-nums font-semibold">{formatRupiah(it.subtotal)}</span>
                    </li>
                  );
                })}
              </ul>
              <dl className="space-y-1.5 border-t pt-3 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular-nums">{formatRupiah(itemsTotal)}</dd></div>
                {order.promoDiscount>0&&<div className="flex justify-between text-emerald-600"><dt>Diskon promo</dt><dd className="tabular-nums">−{formatRupiah(order.promoDiscount)}</dd></div>}
                {order.courierFee>0&&<div className="flex justify-between"><dt className="text-muted-foreground">Ongkos antar</dt><dd className="tabular-nums">{formatRupiah(order.courierFee)}</dd></div>}
                {order.tipAmount>0&&<div className="flex justify-between"><dt className="text-muted-foreground">Tip</dt><dd className="tabular-nums">{formatRupiah(order.tipAmount)}</dd></div>}
                <div className="flex justify-between border-t pt-1.5 font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatRupiah(total)}</dd></div>
              </dl>
              {lateInfo.hasFeeRules&&(order.status==="late"||lateInfo.lateDays>0)&&<p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Terlambat {lateInfo.lateDays} hari — estimasi denda <span className="font-semibold tabular-nums">{formatRupiah(lateInfo.suggestedFine)}</span>.</p>}

              {/* Review Section */}
              {order.status === "completed" && (
                order.review ? (
                  <div className="mt-4 rounded-xl bg-accent/50 px-4 py-3 text-sm">
                    <p className="flex items-center gap-1 font-medium">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`size-4 ${i < order.review!.rating ? "fill-amber-400 text-amber-400" : "text-neutral-300"}`} aria-hidden />
                      ))}
                      <span className="ml-1 text-xs text-muted-foreground">Review kamu</span>
                    </p>
                    {order.review.text && <p className="mt-2 text-sm text-muted-foreground">"{order.review.text}"</p>}
                  </div>
                ) : (
                  <ReviewForm orderId={order.id} />
                )
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Payment */}
          <Card className="">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CreditCard className="size-4 text-blue-500" aria-hidden /> Pembayaran</CardTitle><CardDescription>{order.paymentMethod?PAYMENT_METHOD_LABELS[order.paymentMethod as PaymentMethod]:"-"}</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Status</dt><dd className="font-medium">{PAYMENT_STATUS_LABELS[order.paymentStatus]}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Total</dt><dd className="tabular-nums">{formatRupiah(total)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Sudah dibayar</dt><dd className="tabular-nums text-emerald-600">{formatRupiah(paidAmount)}</dd></div>
                {remaining>0&&order.status!=="cancelled"&&<div className="flex justify-between border-t pt-1.5 font-semibold"><dt>Sisa</dt><dd className="tabular-nums text-red-600">{formatRupiah(remaining)}</dd></div>}
              </dl>
              {needsPayment&&!proofUploaded&&order.status!=="cancelled"&&(<form action={submitPaymentProof} className="space-y-2 border-t pt-3">
                <input type="hidden" name="orderNumber" value={order.orderNumber}/>
                <input type="hidden" name="back" value={back}/>
                <label htmlFor="proof" className="block text-sm font-medium text-foreground mb-1">Upload bukti pembayaran</label>
                <input id="proof" name="proof" type="file" accept="image/jpeg,image/png,image/webp" required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 hover:border-primary/50 transition-colors"/>
                <Button type="submit" className="mt-2 w-full gap-1.5 bg-primary hover:bg-primary/90"><Banknote className="size-4" aria-hidden/>Kirim Bukti Bayar</Button>
              </form>)}
              {proofUploaded&&<p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">Bukti diterima — menunggu verifikasi admin.</p>}
            </CardContent>
          </Card>

          {/* Jaminan */}
          <Card className="">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-4 text-emerald-500" aria-hidden /> Dokumen Jaminan</CardTitle><CardDescription>Opsional — pelengkap data.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <GuaranteeDocs orderId={order.id} documents={order.documents.map((d)=>({id:d.id,docType:d.docType,filePath:d.filePath,fileSize:d.fileSize,uploadedAt:d.uploadedAt}))} back={back} columns="grid-cols-2"/>
              <div className="border-t pt-3"><GuaranteeUpload orderId={order.id} action={submitGuarantee} back={back}/></div>
            </CardContent>
          </Card>

          {/* Foto Hasil */}
          {order.photoLink&&(<Card className="">
            <CardHeader><CardTitle className="text-base">Foto Hasil</CardTitle></CardHeader>
            <CardContent><a href={order.photoLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"><DriveIcon className="size-4" aria-hidden/>Lihat di Google Drive</a></CardContent>
          </Card>)}
        </div>
      </div>
    </div>
  );
}
