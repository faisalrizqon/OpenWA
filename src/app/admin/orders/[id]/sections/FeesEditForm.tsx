"use client";

import { useState } from "react";
import { Pencil, Save, X } from "lucide-react";
import { updateOrderFees } from "@/actions/orders";
import { formatRupiah } from "@/lib/pricing";
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

/** Ikon edit (pensil) di pojok kanan atas card Ringkasan Pembayaran → buka
 *  dialog overlay berisi form ongkos antar & tip. */
export function FeesEditForm({
  orderId,
  initialCourierFee,
  initialTipAmount,
  deliveryMode,
}: {
  orderId: string;
  initialCourierFee: number;
  initialTipAmount: number;
  deliveryMode: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [courierFee, setCourierFee] = useState(String(initialCourierFee));
  const [tipAmount, setTipAmount] = useState(String(initialTipAmount));

  const courierNum = Number(courierFee) || 0;
  const tipNum = Number(tipAmount) || 0;
  const changed = courierNum !== initialCourierFee || tipNum !== initialTipAmount;

  function resetAndClose() {
    setCourierFee(String(initialCourierFee));
    setTipAmount(String(initialTipAmount));
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
          <DialogTitle>Ongkos Antar & Tip</DialogTitle>
          <DialogDescription>
            Keduanya menambah total tagihan &amp; sisa order.
          </DialogDescription>
        </DialogHeader>

        <form
          action={updateOrderFees}
          onSubmit={() => setOpen(false)}
          className="space-y-4"
        >
          <input type="hidden" name="orderId" value={orderId} />

          <div className="space-y-1.5">
            <Label htmlFor="fees-courier">Ongkos antar (Rp)</Label>
            <input
              id="fees-courier"
              name="courierFee"
              type="number"
              min={0}
              value={courierFee}
              onChange={(e) => setCourierFee(e.target.value)}
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
              name="tipAmount"
              type="number"
              min={0}
              value={tipAmount}
              onChange={(e) => setTipAmount(e.target.value)}
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm tabular-nums"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Nilai saat ini: ongkir {formatRupiah(courierNum)} · tip{" "}
            {formatRupiah(tipNum)}.
          </p>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={resetAndClose} className="gap-1.5">
              <X className="size-3.5" aria-hidden />
              Batal
            </Button>
            <Button type="submit" size="sm" disabled={!changed} className="gap-1.5">
              <Save className="size-3.5" aria-hidden />
              Simpan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
