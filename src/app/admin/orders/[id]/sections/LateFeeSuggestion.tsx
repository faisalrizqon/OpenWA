import { AlertTriangle, PlusCircle } from "lucide-react";
import { addPayment } from "@/actions/orders";
import { formatRupiah } from "@/lib/pricing";
import { Button } from "@/components/ui/button";

/** Saran denda keterlambatan hasil hitungan server. Tombol langsung mencatat
 *  pembayaran jenis "denda" senilai saran — tanpa perlu isi form manual. */
export function LateFeeSuggestion({
  orderId,
  suggestedFine,
  lateDays,
}: {
  orderId: string;
  suggestedFine: number;
  lateDays: number;
}) {
  return (
    <form
      action={addPayment}
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2.5"
    >
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="amount" value={suggestedFine} />
      <input type="hidden" name="paymentType" value="denda" />
      <input type="hidden" name="note" value={`Denda keterlambatan ${lateDays} hari (sistem)`} />
      <p className="flex items-center gap-2 text-sm font-medium text-orange-900">
        <AlertTriangle className="size-4 shrink-0" aria-hidden />
        Saran denda: {lateDays} hari × aturan produk = {formatRupiah(suggestedFine)}
      </p>
      <Button type="submit" variant="outline" size="sm" className="gap-1.5">
        <PlusCircle className="size-4" aria-hidden />
        Catat Denda Ini
      </Button>
    </form>
  );
}
