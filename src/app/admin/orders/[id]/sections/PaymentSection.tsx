import { addPayment } from "@/actions/orders";
import { formatRupiah } from "@/lib/pricing";
import { storageUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/SelectField";
import { PaymentRowActions } from "@/components/OrderAdminActions";
import { UploadField } from "@/components/UploadField";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PAYMENT_TYPES, METHODS, dateFmtDay } from "./constants";
import { Eye, Wallet } from "lucide-react";
import { LateFeeSuggestion } from "./LateFeeSuggestion";

export interface PaymentSectionProps {
  order: {
    id: string;
    orderNumber: string;
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

/** Form catat pembayaran + riwayat pembayaran per order.
 *  Bukti pembayaran tampil di samping field upload bukti (thumbnail klik → modal zoom). */
export function PaymentSection({ order, isAdmin, lateFee }: PaymentSectionProps) {
  const paymentsWithProof = order.payments.filter((p) => p.proofPath);

  return (
    <div id="catat-pembayaran" className="min-w-0 rounded-xl border bg-card p-4 shadow-sm sm:p-6 scroll-mt-4">
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
      <form action={addPayment} className="mb-6 grid gap-4 sm:grid-cols-2">
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
            className="h-9 w-full rounded-lg border border-input px-3 text-sm tabular-nums"
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
            className="h-9 w-full rounded-lg border border-input px-3 text-sm"
          />
        </div>

        {/* Upload bukti (kiri) + bukti pembayaran yang sudah ada (kanan) */}
        <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1 space-y-1">
            <UploadField
              id="proof"
              name="proof"
              placeholder="Klik untuk pilih file…"
              helper="Bukti transfer atau QRIS — semua format diterima, maks 15MB (dikompres otomatis)"
            />
          </div>
          {paymentsWithProof.length > 0 && (
            <div className="min-w-0 flex-1">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Bukti Pembayaran</p>
              <div className="flex flex-wrap gap-2">
                {paymentsWithProof.map((p) => (
                  <Dialog key={p.id}>
                    <DialogTrigger
                      className="cursor-zoom-in overflow-hidden rounded-lg border transition-transform hover:scale-[1.03]"
                      title={`${PAYMENT_TYPES[p.paymentType] ?? p.paymentType} · ${formatRupiah(p.amount)} — klik untuk lihat`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={storageUrl(p.proofPath!)}
                        alt={`Bukti ${PAYMENT_TYPES[p.paymentType] ?? p.paymentType}`}
                        className="h-24 w-24 object-cover"
                      />
                    </DialogTrigger>
                    <DialogContent className="max-w-5xl sm:max-w-5xl">
                      <DialogHeader>
                        <DialogTitle>Bukti Pembayaran — {order.orderNumber}</DialogTitle>
                        <DialogDescription>
                          {PAYMENT_TYPES[p.paymentType] ?? p.paymentType} · {formatRupiah(p.amount)} · {dateFmtDay(new Date(p.paidAt))}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex items-center justify-center bg-muted p-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={storageUrl(p.proofPath!)}
                          alt="Bukti pembayaran ukuran penuh"
                          className="max-h-[75vh] max-w-full object-contain"
                        />
                      </div>
                      <p className="px-4 pb-4 text-center text-xs text-muted-foreground">
                        Tekan ESC atau tombol tutup untuk menutup
                      </p>
                    </DialogContent>
                  </Dialog>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="sm:col-span-2">
          <Button type="submit" className="gap-1.5">
            <Wallet className="size-4" aria-hidden />
            Catat Pembayaran
          </Button>
        </div>
      </form>

      {/* Riwayat pembayaran — bisa di-scroll menyamping bila kolom tidak muat */}
      {order.payments.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="whitespace-nowrap px-3 py-2 text-left font-medium">Tanggal</th>
                <th className="whitespace-nowrap px-3 py-2 text-left font-medium">Jenis</th>
                <th className="hidden whitespace-nowrap px-3 py-2 text-left font-medium sm:table-cell">Metode</th>
                <th className="whitespace-nowrap px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-center font-medium">Bukti</th>
                <th className="whitespace-nowrap px-3 py-2 text-right font-medium">Jumlah</th>
                <th className="w-[84px] px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {order.payments.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                    {dateFmtDay(new Date(p.paidAt))}
                  </td>
                  <td className="px-3 py-3">{PAYMENT_TYPES[p.paymentType] ?? p.paymentType}</td>
                  <td className="hidden px-3 py-3 text-muted-foreground sm:table-cell">
                    {p.method ? (METHODS[p.method] ?? p.method) : "—"}
                  </td>
                  <td className="px-3 py-3">
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
                  </td>
                  <td className="px-3 py-3 text-center">
                    {p.proofPath ? (
                      <Dialog>
                        <DialogTrigger
                          className="cursor-zoom-in text-muted-foreground transition-colors hover:text-primary"
                          title="Lihat bukti pembayaran"
                          aria-label={`Lihat bukti pembayaran ${PAYMENT_TYPES[p.paymentType] ?? p.paymentType}`}
                        >
                          <Eye className="size-4" aria-hidden />
                        </DialogTrigger>
                        <DialogContent className="max-w-5xl sm:max-w-5xl">
                          <DialogHeader>
                            <DialogTitle>Bukti Pembayaran — {order.orderNumber}</DialogTitle>
                            <DialogDescription>
                              {PAYMENT_TYPES[p.paymentType] ?? p.paymentType} · {formatRupiah(p.amount)} · {dateFmtDay(new Date(p.paidAt))}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex items-center justify-center bg-muted p-4">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={storageUrl(p.proofPath)}
                              alt="Bukti pembayaran ukuran penuh"
                              className="max-h-[75vh] max-w-full object-contain"
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <span className="text-xs italic text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-medium tabular-nums">
                    {formatRupiah(p.amount)}
                  </td>
                  <td className="px-3 py-3">
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
