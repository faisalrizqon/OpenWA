"use client";

import { useState } from "react";
import { Pencil, Save, X } from "lucide-react";
import { updateOrderFees } from "@/actions/orders";
import { formatRupiah } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/** Form inline untuk mengatur ongkos antar & tip dari halaman detail order.
 *  Pola sama dengan OrderActionsSection: tombol "Atur" → form → server action. */
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

  const courierIsNumber = Number(courierFee) || 0;
  const tipIsNumber = Number(tipAmount) || 0;

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <Pencil className="size-3.5" aria-hidden />
        Atur Ongkir & Tip
      </Button>
    );
  }

  return (
    <form
      action={updateOrderFees}
      className="space-y-3 rounded-xl border border-border bg-muted/30 p-4"
    >
      <input type="hidden" name="orderId" value={orderId} />

      <div className="grid gap-3 sm:grid-cols-2">
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
      </div>

      <p className="text-xs text-muted-foreground">
        Keduanya menambah total tagihan &amp; sisa. Nilai saat ini: ongkir{" "}
        {formatRupiah(courierIsNumber)} · tip {formatRupiah(tipIsNumber)}.
      </p>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" className="gap-1.5">
          <Save className="size-3.5" aria-hidden />
          Simpan
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setCourierFee(String(initialCourierFee));
            setTipAmount(String(initialTipAmount));
            setOpen(false);
          }}
          className="gap-1.5"
        >
          <X className="size-3.5" aria-hidden />
          Batal
        </Button>
      </div>
    </form>
  );
}
