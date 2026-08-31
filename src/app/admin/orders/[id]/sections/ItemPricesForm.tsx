"use client";

import { useState } from "react";
import { Pencil, Save, X } from "lucide-react";
import { updateItemPrices } from "@/actions/orders";
import { calcSubtotal, formatRupiah } from "@/lib/pricing";
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

export interface EditableItem {
  id: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountType: string | null;
  discountValue: number;
}

/** Ikon edit (pensil) di pojok kanan atas card Item → buka dialog overlay
 *  berisi harga satuan per item yang bisa direvisi. */
export function ItemPricesForm({ orderId, items }: { orderId: string; items: EditableItem[] }) {
  const [open, setOpen] = useState(false);
  const [prices, setPrices] = useState<Record<number, string>>(() =>
    Object.fromEntries(items.map((it) => [it.id, String(it.unitPrice)]))
  );

  const anyChanged = items.some((it) => Number(prices[it.id] ?? it.unitPrice) !== it.unitPrice);

  function resetAndClose() {
    setPrices(Object.fromEntries(items.map((it) => [it.id, String(it.unitPrice)])));
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label="Edit harga satuan"
            title="Edit harga satuan"
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <Pencil className="size-4" aria-hidden />
          </button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ubah Harga Satuan</DialogTitle>
          <DialogDescription>
            Subtotal dihitung ulang otomatis — qty &amp; diskon tetap.
          </DialogDescription>
        </DialogHeader>

        <form action={updateItemPrices} onSubmit={() => setOpen(false)} className="space-y-4">
          <input type="hidden" name="orderId" value={orderId} />

          <div className="space-y-3">
            {items.map((it) => {
              const raw = prices[it.id] ?? String(it.unitPrice);
              const unitPrice = Number(raw) || 0;
              const subtotal = calcSubtotal({
                unitPrice,
                quantity: it.quantity,
                discountType:
                  it.discountType === "amount" || it.discountType === "percent"
                    ? it.discountType
                    : null,
                discountValue: it.discountValue,
              });
              return (
                <div key={it.id} className="space-y-1.5">
                  <input type="hidden" name="itemId" value={it.id} />
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={`item-price-${it.id}`}>
                      {it.productName} <span className="text-muted-foreground">×{it.quantity}</span>
                    </Label>
                    <span className="text-sm font-medium tabular-nums">
                      {formatRupiah(subtotal)}
                    </span>
                  </div>
                  <input
                    id={`item-price-${it.id}`}
                    name="unitPrice"
                    type="number"
                    min={0}
                    value={raw}
                    onChange={(e) => setPrices((p) => ({ ...p, [it.id]: e.target.value }))}
                    aria-label={`Harga satuan ${it.productName}`}
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm tabular-nums"
                  />
                </div>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground">
            Harga item terkunci saat order dibuat — revisi ini tercatat di audit log.
          </p>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={resetAndClose} className="gap-1.5">
              <X className="size-3.5" aria-hidden />
              Batal
            </Button>
            <Button type="submit" size="sm" disabled={!anyChanged} className="gap-1.5">
              <Save className="size-3.5" aria-hidden />
              Simpan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
