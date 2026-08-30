"use client";

import { useState } from "react";
import { Pencil, Save, X } from "lucide-react";
import { updateItemPrices } from "@/actions/orders";
import { calcSubtotal, formatRupiah } from "@/lib/pricing";
import { Button } from "@/components/ui/button";

interface EditableItem {
  id: number;
  quantity: number;
  unitPrice: number;
  discountType: string | null;
  discountValue: number;
}

/** Form inline untuk merevisi harga satuan item order.
 *  Pola sama dengan FeesEditForm: tombol "Ubah Harga" → input per item → server action. */
export function ItemPricesForm({ orderId, items }: { orderId: string; items: EditableItem[] }) {
  const [open, setOpen] = useState(false);
  const [prices, setPrices] = useState<Record<number, string>>(() =>
    Object.fromEntries(items.map((it) => [it.id, String(it.unitPrice)]))
  );

  function resetAndClose() {
    setPrices(Object.fromEntries(items.map((it) => [it.id, String(it.unitPrice)])));
    setOpen(false);
  }

  const anyChanged = items.some((it) => Number(prices[it.id] ?? it.unitPrice) !== it.unitPrice);

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Pencil className="size-3.5" aria-hidden />
        Ubah Harga
      </Button>
    );
  }

  return (
    <form action={updateItemPrices} className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
      <input type="hidden" name="orderId" value={orderId} />

      <div className="space-y-2">
        {items.map((it) => {
          const raw = prices[it.id] ?? String(it.unitPrice);
          const unitPrice = Number(raw) || 0;
          const subtotal = calcSubtotal({
            unitPrice,
            quantity: it.quantity,
            discountType:
              it.discountType === "amount" || it.discountType === "percent" ? it.discountType : null,
            discountValue: it.discountValue,
          });
          return (
            <div key={it.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3">
              <input type="hidden" name="itemId" value={it.id} />
              <input
                type="number"
                name="unitPrice"
                min={0}
                value={raw}
                onChange={(e) => setPrices((p) => ({ ...p, [it.id]: e.target.value }))}
                aria-label={`Harga satuan item ${it.id}`}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm tabular-nums"
              />
              <span className="text-xs text-muted-foreground">×{it.quantity}</span>
              <span className="min-w-24 text-right text-sm font-medium tabular-nums">
                {formatRupiah(subtotal)}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Subtotal item dihitung ulang otomatis (qty &amp; diskon tetap). Perubahan tercatat di audit log.
      </p>

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={!anyChanged} className="gap-1.5">
          <Save className="size-3.5" aria-hidden />
          Simpan
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={resetAndClose} className="gap-1.5">
          <X className="size-3.5" aria-hidden />
          Batal
        </Button>
      </div>
    </form>
  );
}
