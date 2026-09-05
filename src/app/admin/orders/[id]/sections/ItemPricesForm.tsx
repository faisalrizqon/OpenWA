"use client";

import { useState } from "react";
import { Check, Pencil, RotateCcw } from "lucide-react";
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
import { useOptionalOrderDraft } from "@/components/order-draft/OrderDraftContext";

export interface EditableItem {
  id: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountType: string | null;
  discountValue: number;
}

/**
 * Ikon edit (pensil) di pojok kanan atas card Item → dialog revisi harga satuan.
 *
 * Harga TIDAK langsung disimpan — masuk draft order dan baru ditulis ke database
 * setelah tombol "Simpan" di header ditekan.
 */
export function ItemPricesForm({ items }: { items: EditableItem[] }) {
  // Semua hook dipanggil tanpa syarat; guard `draft` dilakukan setelahnya.
  const draft = useOptionalOrderDraft();

  // Nilai awal = draft (harga yang sudah pernah diterapkan), kalau belum = data server.
  const stagedPrices = draft?.itemPricesToEdit ?? [];

  const [open, setOpen] = useState(false);
  const [prices, setPrices] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      items.map((it) => {
        const staged = stagedPrices.find((p) => p.itemId === it.id);
        return [it.id, String(staged?.unitPrice ?? it.unitPrice)];
      })
    )
  );
  const [error, setError] = useState("");

  // Tanpa provider draft, tidak ada jalur simpan → sembunyikan ikon edit.
  if (!draft) return null;

  const anyChanged = items.some((it) => {
    const staged = stagedPrices.find((p) => p.itemId === it.id);
    const baseline = staged?.unitPrice ?? it.unitPrice;
    return Number(prices[it.id]) !== baseline;
  });

  function resetToDraft() {
    setPrices(
      Object.fromEntries(
        items.map((it) => {
          const staged = stagedPrices.find((p) => p.itemId === it.id);
          return [it.id, String(staged?.unitPrice ?? it.unitPrice)];
        })
      )
    );
    setError("");
  }

  function applyToDraft() {
    const invalid = items.find((it) => {
      const v = Number(prices[it.id]);
      return !Number.isFinite(v) || v <= 0;
    });
    if (invalid) {
      setError(`Harga "${invalid.productName}" harus angka lebih dari 0.`);
      return;
    }

    for (const it of items) {
      const unitPrice = Number(prices[it.id]);
      if (unitPrice === it.unitPrice) continue;
      draft?.addItemPrice({ itemId: it.id, unitPrice });
    }
    setError("");
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetToDraft();
        setOpen(next);
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label="Edit harga item"
            title="Edit harga satuan item"
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <Pencil className="size-4" aria-hidden />
          </button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Harga Satuan per Item</DialogTitle>
          <DialogDescription>
            Revisi harga bila ada salah input. Perubahan baru tersimpan setelah
            tombol <strong>Simpan</strong> di atas ditekan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {items.map((it) => {
            const raw = prices[it.id] ?? String(it.unitPrice);
            const num = Number(raw);
            const subtotal = calcSubtotal({
              unitPrice: Number.isFinite(num) ? num : it.unitPrice,
              quantity: it.quantity,
              discountType:
                it.discountType === "amount" || it.discountType === "percent"
                  ? it.discountType
                  : null,
              discountValue: it.discountValue,
            });
            return (
              <div key={it.id} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{it.productName}</span>
                  <span className="text-xs text-muted-foreground">×{it.quantity}</span>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`price-${it.id}`} className="text-xs">
                    Harga satuan (Rp)
                  </Label>
                  <input
                    id={`price-${it.id}`}
                    type="number"
                    min={0}
                    value={raw}
                    onChange={(e) => {
                      setPrices((p) => ({ ...p, [it.id]: e.target.value }));
                      setError("");
                    }}
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm tabular-nums"
                  />
                </div>
                <p className="mt-2 text-right text-sm font-medium tabular-nums">
                  Subtotal: {formatRupiah(subtotal)}
                </p>
              </div>
            );
          })}

          {error && <p className="text-xs font-medium text-red-600">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={resetToDraft} className="gap-1.5">
              <RotateCcw className="size-3.5" aria-hidden />
              Buang perubahan
            </Button>
            <Button type="button" size="sm" disabled={!anyChanged} onClick={applyToDraft} className="gap-1.5">
              <Check className="size-3.5" aria-hidden />
              Terapkan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
