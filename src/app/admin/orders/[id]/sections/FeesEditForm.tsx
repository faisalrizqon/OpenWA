"use client";

import { useState } from "react";
import { Check, Pencil, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatRupiah } from "@/lib/pricing";
import { useOptionalOrderDraft } from "@/components/order-draft/OrderDraftContext";

/**
 * Ikon edit (pensil) di pojok kanan atas card Ringkasan Pembayaran.
 *
 * Ongkos antar & tip TIDAK langsung disimpan — nilainya masuk draft order dan
 * baru ditulis ke database setelah tombol "Simpan" di header ditekan.
 */
export function FeesEditForm({
  initialCourierFee,
  initialTipAmount,
  deliveryMode,
}: {
  initialCourierFee: number;
  initialTipAmount: number;
  deliveryMode: string | null;
}) {
  // Semua hook dipanggil tanpa syarat — guard `draft` dilakukan setelahnya.
  const draft = useOptionalOrderDraft();

  // Nilai awal = draft (bila sudah pernah diterapkan), kalau belum = data server.
  const stagedCourier = draft?.fees?.courierFee;
  const stagedTip = draft?.fees?.tipAmount;

  const [open, setOpen] = useState(false);
  const [courierFee, setCourierFee] = useState(
    stagedCourier !== undefined ? String(stagedCourier) : String(initialCourierFee)
  );
  const [tipAmount, setTipAmount] = useState(
    stagedTip !== undefined ? String(stagedTip) : String(initialTipAmount)
  );
  const [error, setError] = useState("");

  // Tanpa provider draft, form ini tidak punya jalur simpan → sembunyikan.
  if (!draft) return null;

  const courierNum = Number(courierFee);
  const tipNum = Number(tipAmount);

  function resetToDraft() {
    setCourierFee(stagedCourier !== undefined ? String(stagedCourier) : String(initialCourierFee));
    setTipAmount(stagedTip !== undefined ? String(stagedTip) : String(initialTipAmount));
    setError("");
  }

  function applyToDraft() {
    if (!Number.isFinite(courierNum) || courierNum < 0) {
      setError("Ongkos antar harus angka 0 atau lebih.");
      return;
    }
    if (!Number.isFinite(tipNum) || tipNum < 0) {
      setError("Tip harus angka 0 atau lebih.");
      return;
    }
    draft?.setFees({ courierFee: courierNum, tipAmount: tipNum });
    setError("");
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Menutup tanpa "Terapkan" = buang perubahan yang belum diterapkan.
        if (!next) resetToDraft();
        setOpen(next);
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label="Edit ongkos antar & tip"
            title="Edit ongkos antar & tip"
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <Pencil className="size-4" aria-hidden />
          </button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ongkos Antar &amp; Tip</DialogTitle>
          <DialogDescription>
            Keduanya menambah total tagihan &amp; sisa order. Perubahan baru
            tersimpan setelah tombol <strong>Simpan</strong> di atas ditekan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fees-courier">Ongkos antar (Rp)</Label>
            <input
              id="fees-courier"
              type="number"
              min={0}
              value={courierFee}
              onChange={(e) => {
                setCourierFee(e.target.value);
                setError("");
              }}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm tabular-nums"
            />
            {deliveryMode !== "courier" && (
              <p className="text-[11px] text-muted-foreground">
                Order pickup — ongkir tetap tercatat tapi biasanya 0.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fees-tip">Tip dari customer (Rp)</Label>
            <input
              id="fees-tip"
              type="number"
              min={0}
              value={tipAmount}
              onChange={(e) => {
                setTipAmount(e.target.value);
                setError("");
              }}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm tabular-nums"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Nilai saat ini: ongkir {formatRupiah(Number.isFinite(courierNum) ? courierNum : 0)} ·
            tip {formatRupiah(Number.isFinite(tipNum) ? tipNum : 0)}.
          </p>

          {error && <p className="text-xs font-medium text-red-600">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={resetToDraft} className="gap-1.5">
              <RotateCcw className="size-3.5" aria-hidden />
              Buang perubahan
            </Button>
            <Button type="button" size="sm" onClick={applyToDraft} className="gap-1.5">
              <Check className="size-3.5" aria-hidden />
              Terapkan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
