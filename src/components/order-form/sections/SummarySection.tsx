"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatRupiah } from "@/lib/pricing";

export interface SummarySectionProps {
  noteOrder: string;
  setNoteOrder: (value: string) => void;
  /** Grand total (items + ongkos antar + tip). */
  total: number;
  canSubmit: boolean;
  /** Tip dalam Rupiah. */
  tip: number;
  setTip: (value: number) => void;
  /** Ongkos antar efektif (0 bila pickup). */
  courierFee: number;
  /** Subtotal item saja (tanpa ongkir & tip) untuk breakdown. */
  itemsTotal: number;
}

/** Note + tip + total section with form submission. */
export function SummarySection({
  noteOrder,
  setNoteOrder,
  total,
  canSubmit,
  tip,
  setTip,
  courierFee,
  itemsTotal,
}: SummarySectionProps) {
  const hasFees = courierFee > 0 || tip > 0;
  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <div className="space-y-2">
        <Label htmlFor="noteOrder">Catatan Order (opsional)</Label>
        <textarea
          id="noteOrder"
          name="noteOrder"
          value={noteOrder}
          onChange={(e) => setNoteOrder(e.target.value)}
          className="min-h-16 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
        />
      </div>

      {/* Tip — masuk total tagihan customer */}
      <div className="space-y-2">
        <Label htmlFor="tip">Tip (Rp, opsional)</Label>
        <Input
          id="tip"
          type="number"
          min={0}
          value={tip || ""}
          placeholder="0"
          onChange={(e) => setTip(Math.max(0, Number(e.target.value) || 0))}
          className="max-w-48 tabular-nums"
        />
        <p className="text-xs text-muted-foreground">
          Tip dari customer — ditambahkan ke total tagihan.
        </p>
      </div>

      {/* Hidden input agar tip ikut terkirim ke server action */}
      <input type="hidden" name="tip" value={Math.max(0, tip || 0)} />

      {/* Breakdown total */}
      <div className="space-y-1.5 border-t pt-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Subtotal item</span>
          <span className="tabular-nums">{formatRupiah(itemsTotal)}</span>
        </div>
        {courierFee > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Ongkos antar</span>
            <span className="tabular-nums">{formatRupiah(courierFee)}</span>
          </div>
        )}
        {tip > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Tip</span>
            <span className="tabular-nums">{formatRupiah(tip)}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-1">
          <span className="font-semibold">Total{hasFees ? " (grand total)" : ""}</span>
          <span className="text-xl font-bold tabular-nums">{formatRupiah(total)}</span>
        </div>
      </div>

      <Button type="submit" disabled={!canSubmit} className="w-full">
        Simpan Order
      </Button>
    </section>
  );
}
