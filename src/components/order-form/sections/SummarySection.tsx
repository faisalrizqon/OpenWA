"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatRupiah } from "@/lib/pricing";

export interface SummarySectionProps {
  noteOrder: string;
  setNoteOrder: (value: string) => void;
  total: number;
  canSubmit: boolean;
}

/** Note + total section with form submission. */
export function SummarySection({ noteOrder, setNoteOrder, total, canSubmit }: SummarySectionProps) {
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
      <div className="flex items-center justify-between border-t pt-3">
        <span className="text-sm font-medium text-muted-foreground">Total</span>
        <span className="text-xl font-bold tabular-nums">{formatRupiah(total)}</span>
      </div>
      <Button type="submit" disabled={!canSubmit} className="w-full">
        Simpan Order
      </Button>
    </section>
  );
}
