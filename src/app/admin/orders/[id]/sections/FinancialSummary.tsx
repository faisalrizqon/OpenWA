import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/pricing";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, type PaymentMethod } from "@/lib/payment";
import { DriveIcon } from "@/components/DriveIcon";
import { PhotoDriveForm } from "@/components/PhotoDriveForm";
export interface FinancialSummaryProps {
  order: {
    id: string;
    courierFee: number;
    tipAmount: number;
    photoLink?: string | null;
    source: string;
    paymentMethod?: string | null;
    paymentStatus: string;
    paymentRef?: string | null;
    payments: Array<{
      id: number;
      amount: number;
      method: string | null;
      status: string;
      proofPath?: string | null;
    }>;
  };
  total: number;
  paid: number;
  sisa: number;
}

/** Ringkasan pembayaran, link Drive foto hasil, dan info online checkout. */
export function FinancialSummary({
  order,
  total,
  paid,
  sisa,
}: FinancialSummaryProps) {
  return (
    <div className="min-w-0 rounded-xl border bg-card p-4 shadow-sm sm:p-6">
      <h2 className="mb-5 text-lg font-semibold tracking-tight text-foreground">Ringkasan Pembayaran</h2>

      {/* Total / Dibayar / Sisa — baris bersih tanpa garis pemisah */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-xl font-bold tabular-nums">{formatRupiah(total)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Dibayar</span>
          <span className="text-base font-medium tabular-nums text-emerald-600">
            {formatRupiah(paid)}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
          <span className="text-sm font-semibold">Sisa</span>
          <span
            className={cn(
              "text-lg font-bold tabular-nums",
              sisa > 0 ? "text-red-600" : "text-emerald-600"
            )}
          >
            {formatRupiah(Math.max(0, sisa))}
          </span>
        </div>
      </div>

      {/* Additional fees */}
      {(order.courierFee > 0 || order.tipAmount > 0) && (
        <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
          {order.courierFee > 0 && (
            <div className="flex justify-between gap-2">
              <span>Ongkos antar</span>
              <span className="font-medium tabular-nums text-foreground">{formatRupiah(order.courierFee)}</span>
            </div>
          )}
          {order.tipAmount > 0 && (
            <div className="flex justify-between gap-2">
              <span>Tip</span>
              <span className="font-medium tabular-nums text-foreground">{formatRupiah(order.tipAmount)}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between gap-2 pt-2 font-semibold text-foreground">
            <span>Grand total</span>
            <span className="tabular-nums">{formatRupiah(total + order.courierFee + order.tipAmount)}</span>
          </div>
        </div>
      )}

      {/* Foto hasil sewa — link Google Drive (tanpa upload file), dengan ikon Drive berwarna */}
      <div className="mt-4 space-y-1.5 pt-4 border-t">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <DriveIcon className="size-4" />
          Foto Hasil Sewa (Link Google Drive)
        </span>
        <p className="text-xs text-muted-foreground mb-2">
          Simpan link folder Google Drive berisi foto hasil kamera yang disewa.
          Tampil di halaman status order customer.
        </p>
        <PhotoDriveForm orderId={order.id} initialLink={order.photoLink} />
      </div>
      {/* Online payment details */}
      {order.source === "online" && (
        <div className="mt-4 space-y-2 pt-4 border-t">
          <dl className="space-y-2">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Metode pembayaran</dt>
              <dd className="font-medium text-foreground">
                {order.paymentMethod
                  ? PAYMENT_METHOD_LABELS[order.paymentMethod as PaymentMethod] ?? order.paymentMethod
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Status pembayaran</dt>
              <dd className="font-medium text-foreground">{PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}</dd>
            </div>
            {order.paymentRef && order.paymentMethod === "midtrans" && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Ref Midtrans</dt>
                <dd className="truncate font-mono text-xs text-foreground">{order.paymentRef.slice(0, 40)}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
