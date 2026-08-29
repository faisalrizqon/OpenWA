import { addPayment } from "@/actions/orders";
import { formatRupiah } from "@/lib/pricing";
import { storageUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/SelectField";
import { PaymentRowActions } from "@/components/OrderAdminActions";
import { UploadField } from "@/components/UploadField";
import { PAYMENT_TYPES, METHODS, dateFmtDay } from "./constants";
import { LateFeeSuggestion } from "./LateFeeSuggestion";

export interface PaymentSectionProps {
  order: {
    id: string;
    payments: Array<{
      id: number;
      paymentType: string;
      amount: number;
      method: string | null;
      note: string | null;
      status: string;
      paidAt: Date;
      proofPath?: string | null;
    }>;
  };
  isAdmin: boolean;
  /** Saran denda keterlambatan (null bila tidak terlambat / tidak ada aturan denda). */
  lateFee?: { suggestedFine: number; lateDays: number } | null;
}

/** Form catat pembayaran + riwayat pembayaran per order. */
export function PaymentSection({ order, isAdmin, lateFee }: PaymentSectionProps) {
  return (
    <div id="catat-pembayaran" className="rounded-xl border bg-card p-6 shadow-sm scroll-mt-4">
      <h2 className="mb-5 text-lg font-semibold tracking-tight text-foreground">Catat Pembayaran</h2>
      
      {/* Late fee suggestion */}
      {lateFee && (
        <div className="mb-6">
          <LateFeeSuggestion
            orderId={order.id}
            suggestedFine={lateFee.suggestedFine}
            lateDays={lateFee.lateDays}
          />
        </div>
      )}

      {/* Form tambah pembayaran */}
      <form action={addPayment} className="grid gap-3 sm:grid-cols-2 mb-6">
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
            className="h-8 w-full rounded-lg border border-input px-2 text-sm tabular-nums"
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
            className="h-8 w-full rounded-lg border border-input px-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <UploadField
            id="proof"
            name="proof"
            placeholder="Klik untuk pilih file…"
            helper="Foto bukti transfer atau QRIS (JPG/PNG/WebP, maks 5MB)"
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" variant="secondary">
            Catat Pembayaran
          </Button>
        </div>
      </form>

      {/* Payment history table - simplified borders */}
      {order.payments.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Tanggal</th>
                <th className="px-4 py-2 text-left font-medium">Jenis</th>
                <th className="px-4 py-2 text-left font-medium">Metode</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Jumlah</th>
                <th className="px-4 py-2 w-[90px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {order.payments.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {dateFmtDay(new Date(p.paidAt))}
                  </td>
                  <td className="px-4 py-3">{PAYMENT_TYPES[p.paymentType] ?? p.paymentType}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.method ? (METHODS[p.method] ?? p.method) : "—"}
                  </td>
                  <td className="px-4 py-3">
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
                        href={storageUrl(p.proofPath)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 block"
                        title="Klik untuk lihat ukuran penuh"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={storageUrl(p.proofPath)}
                          alt="Bukti pembayaran"
                          className="h-10 w-auto rounded border object-cover transition-transform hover:scale-105"
                        />
                        <span className="mt-0.5 block text-[10px] text-primary underline underline-offset-2">
                          Lihat bukti
                        </span>
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums whitespace-nowrap">
                    {formatRupiah(p.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <PaymentRowActions
                      orderId={order.id}
                      isAdmin={isAdmin}
                      payment={{ id: Number(p.id), amount: p.amount, method: p.method, note: p.note, status: p.status }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

