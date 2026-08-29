import { CalendarClock, ClipboardList, CheckCircle2, AlertTriangle, Flag, Ban, Wallet, ShieldCheck } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { formatRupiah } from "@/lib/pricing";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, type PaymentMethod } from "@/lib/payment";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { DriveIcon } from "@/components/DriveIcon";
import { ExternalLink } from "@/components/LinkButton";
import { waLink } from "@/lib/shop";
import type { StoreSettings } from "@/lib/content";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UnifiedPaymentPanel } from "@/components/UnifiedPaymentPanel";
import { PageNotifier, type PageNotification } from "@/components/PageNotifier";
import { completeOrder } from "@/app/(shop)/actions/checkout";

/** Bentuk order lengkap yang dirender view ini (relasi sama persis dengan
 *  halaman status pesanan publik). */
export type OrderStatusData = Prisma.OrderGetPayload<{
  include: {
    customer: true;
    items: { include: { product: { select: { name: true } } } };
    payments: { orderBy: { paidAt: "desc" } };
    documents: { orderBy: { uploadedAt: "desc" } };
  };
}>;

/** View status pesanan customer — dipakai halaman publik `/order-status/[orderNumber]`
 *  dan portal `/portal/orders/[orderNumber]` agar tampilannya SELALU SAMA PERSIS.
 *  Semua aksi pembayaran/jaminan juga identik (UnifiedPaymentPanel + completeOrder). */
export function OrderStatusView({
  order,
  shop,
  notifications,
  statusPath = (orderNumber) => `/order-status/${orderNumber}`,
}: {
  order: OrderStatusData;
  shop: StoreSettings;
  notifications: PageNotification[];
  /** Path halaman ini sendiri untuk URL kembali aksi server action.
   *  Publik: /order-status/[orderNumber] · Portal: /portal/orders/[orderNumber]. */
  statusPath?: (orderNumber: string) => string;
}) {
  const back = statusPath(order.orderNumber);

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
      <PageNotifier notifications={notifications} />

      {/* Status order & pembayaran — tengah, besar, prominent */}
      <div className="mt-4 flex justify-center">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-yellow-100 px-6 py-2.5 text-lg font-bold text-yellow-800 shadow-sm">
            {order.status === "pending" && (<><AlertTriangle className="size-5" aria-hidden />Menunggu Konfirmasi</>)}
            {order.status === "booking" && (<><ClipboardList className="size-5" aria-hidden />Booking</>)}
            {order.status === "active" && (<><CheckCircle2 className="size-5" aria-hidden />Aktif</>)}
            {order.status === "late" && (<><AlertTriangle className="size-5" aria-hidden />Terlambat</>)}
            {order.status === "completed" && (<><Flag className="size-5" aria-hidden />Selesai</>)}
            {order.status === "cancelled" && (<><Ban className="size-5" aria-hidden />Dibatalkan</>)}
          </span>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-lg font-bold shadow-sm ${
              order.paymentStatus === "paid"
                ? "bg-emerald-500 text-white"
                : order.paymentStatus === "pending"
                  ? "bg-amber-500 text-white"
                  : "bg-blue-500 text-white"
            }`}
          >
            <Wallet className="size-5" aria-hidden />
            {order.paymentStatus === "paid" ? "Pembayaran: LUNAS" : `Pembayaran: ${statusLabel}`}
          </span>
        </div>
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

      {/* Link Drive foto hasil — selalu tampil; bila admin belum menyimpan link,
          tampilkan catatan agar customer bisa meminta admin meng-upload. */}
      <Card className="mt-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DriveIcon className="size-5" />
            Foto Hasil Sewa
          </CardTitle>
        </CardHeader>
        <CardContent>
          {order.photoLink ? (
            <>
              <p className="text-sm text-muted-foreground">
                Link Drive berisi foto hasil dari kamera yang disewa:
              </p>
              <a
                href={order.photoLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-2 break-all rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20"
              >
                <DriveIcon className="size-5" />
                Buka Foto di Google Drive
              </a>
            </>
          ) : (
            <p className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Link foto hasil belum di-upload. Anda bisa menghubungi admin dan meminta{" "}
              <span className="font-medium text-foreground">
                meng-upload link Google Drive berisi foto hasil
              </span>{" "}
              sewa Anda — link akan tampil di halaman ini setelah tersimpan.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pembayaran & jaminan langsung di halaman ini — tidak perlu pindah tab */}
      <div className="mt-5">
        <UnifiedPaymentPanel
          order={order}
          shop={shop}
          total={total}
          back={back}
        />
      </div>

      {/* Tombol selesaikan orderan — satu-satunya finalisasi order.
          COD: wajib jaminan lengkap. QRIS/transfer: wajib bukti tersimpan.
          Gateway: menunggu pembayaran lunas. Anti salah upload & anti-spam. */}
      {!order.paymentCompleted && order.status !== "cancelled" && (
        <div className="mt-6">
          {(() => {
            const method = order.paymentMethod ?? "cash";
            const hasIdentityDoc = order.documents.some((d) => ["ktp", "kartu_pelajar"].includes(d.docType));
            const hasSelfieDoc = order.documents.some((d) => d.docType === "selfie_ktp");
            const proofSaved = order.payments.some((p) => p.status === "pending" && p.proofPath);
            const paid = order.payments.some((p) => p.status === "confirmed") || order.paymentStatus === "paid";

            const isComplete =
              method === "cash"
                ? hasIdentityDoc && hasSelfieDoc
                : method === "qris" || method === "transfer"
                  ? proofSaved
                  : paid; // midtrans / gopay
            return (
              <form action={completeOrder} className="flex flex-col items-center">
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="back" value={back} />
                <input type="hidden" name="paymentMethod" value={method} />
                <button
                  type="submit"
                  disabled={!isComplete}
                  className={`${
                    !isComplete
                      ? "flex w-full max-w-sm items-center justify-center gap-2 rounded-lg bg-muted px-6 py-3 text-base font-semibold text-muted-foreground/80 cursor-not-allowed"
                      : "flex w-full max-w-sm items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-base font-semibold hover:bg-emerald-700 text-white"
                  }`}
                >
                  <ShieldCheck className="size-5" aria-hidden />
                  Selesaikan Orderan
                </button>
                {!isComplete && method === "cash" && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Wajib upload jaminan: foto identitas (KTP / kartu pelajar) DAN foto selfie.
                  </p>
                )}
                {!isComplete && (method === "qris" || method === "transfer") && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Simpan bukti pembayaran terlebih dahulu di panel di atas, lalu klik tombol ini.
                  </p>
                )}
                {!isComplete && (method === "midtrans" || method === "gopay") && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    Selesaikan pembayaran terlebih dahulu. Setelah lunas, klik tombol ini untuk mengirim pesanan.
                  </p>
                )}
              </form>
            );
          })()}
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-3">
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
