"use client";

import { AlertTriangle, PlusCircle } from "lucide-react";
import { formatRupiah } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { useOptionalOrderDraft } from "@/components/order-draft/OrderDraftContext";

/**
 * Saran denda keterlambatan hasil hitungan server.
 *
 * Tombol mencatat pembayaran ke DRAFT, bukan langsung ke database — baru tersimpan
 * setelah tombol "Simpan" di header ditekan.
 */
export function LateFeeSuggestion({
  suggestedFine,
  lateDays,
}: {
  suggestedFine: number;
  lateDays: number;
}) {
  const draft = useOptionalOrderDraft();

  // Tanpa provider draft tidak ada jalur simpan → sembunyikan.
  if (!draft) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2.5">
      <p className="flex items-center gap-2 text-sm font-medium text-orange-900">
        <AlertTriangle className="size-4 shrink-0" aria-hidden />
        Saran denda: {lateDays} hari × aturan produk = {formatRupiah(suggestedFine)}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() =>
          draft.addPayment({
            amount: suggestedFine,
            paymentType: "denda",
            note: `Denda keterlambatan ${lateDays} hari (sistem)`,
            proof: null,
          })
        }
      >
        <PlusCircle className="size-4" aria-hidden />
        Catat Denda Ini
      </Button>
    </div>
  );
}
