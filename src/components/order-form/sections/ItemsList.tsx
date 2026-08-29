"use client";

import { ListPlus, Package, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/SelectField";
import { formatRupiah } from "@/lib/pricing";
import type { ProductOption, ItemDraft } from "../types";
import { DURATIONS } from "../constants";

export interface PricedItem {
  item: ItemDraft;
  product: ProductOption | undefined;
  unitPrice: number;
  subtotal: number;
}

export interface ItemsListProps {
  items: ItemDraft[];
  products: ProductOption[];
  availability: Record<number, number>;
  pricedItems: PricedItem[];
  addItem: () => void;
  updateItem: (key: number, patch: Partial<ItemDraft>) => void;
  removeItem: (key: number) => void;
  stockErrors: string[];
}

/** Dynamic item cards list with quantity, duration, pricing, and discounts. */
export function ItemsList({
  items,
  products,
  availability,
  pricedItems,
  addItem,
  updateItem,
  removeItem,
  stockErrors,
}: ItemsListProps) {
  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-6 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <ListPlus className="size-3.5" aria-hidden />
          </span>
          Item
        </h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          disabled={products.length === 0}
          className="gap-1.5"
        >
          <Plus className="size-3.5" aria-hidden />
          Tambah Item
        </Button>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Belum ada item. Klik &quot;Tambah Item&quot;.
        </p>
      )}

      {pricedItems.map(({ item, product, unitPrice, subtotal }) => {
        const available = availability[item.productId];
        const needed =
          items
            .filter((it) => it.productId === item.productId)
            .reduce((s, it) => s + it.quantity, 0) - item.quantity + item.quantity;
        const insufficient = available !== undefined && needed > available;
        return (
          <div
            key={item.key}
            className={`space-y-3 rounded-xl border p-3 ${
              insufficient ? "border-red-300 bg-red-50/50" : "border-border bg-muted/40"
            }`}
          >
            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1 md:col-span-2">
                <Label>Produk</Label>
                <SelectField
                  value={String(item.productId)}
                  onValueChange={(v) => updateItem(item.key, { productId: Number(v) })}
                  options={products.map((p) => ({
                    label: `${p.name} (${p.sku})`,
                    value: String(p.id),
                  }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Qty</Label>
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(item.key, { quantity: Math.max(1, Number(e.target.value) || 1) })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Durasi</Label>
                <SelectField
                  value={String(item.durationHours)}
                  onValueChange={(v) => updateItem(item.key, { durationHours: Number(v) })}
                  options={DURATIONS.map((d) => ({ label: `${d} jam`, value: String(d) }))}
                />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1">
                <Label>Harga/unit (opsional)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder={product ? String(unitPrice) : "0"}
                  value={item.unitPriceOverride}
                  onChange={(e) => updateItem(item.key, { unitPriceOverride: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Diskon</Label>
                <SelectField
                  value={item.discountType}
                  onValueChange={(v) =>
                    updateItem(item.key, { discountType: v as ItemDraft["discountType"] })
                  }
                  options={[
                    { label: "Tanpa diskon", value: "none" },
                    { label: "Nominal (Rp)", value: "amount" },
                    { label: "Persen (%)", value: "percent" },
                  ]}
                />
              </div>
              <div className="space-y-1">
                <Label>Nilai Diskon</Label>
                <Input
                  type="number"
                  min={0}
                  disabled={item.discountType === "none"}
                  value={item.discountValue}
                  onChange={(e) => updateItem(item.key, { discountValue: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Subtotal</Label>
                <div className="flex h-8 items-center text-sm font-semibold tabular-nums">
                  {formatRupiah(subtotal)}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p
                className={`flex items-center gap-1.5 text-xs ${
                  insufficient ? "font-medium text-red-600" : "text-muted-foreground"
                }`}
              >
                <Package className="size-3.5" aria-hidden />
                {available === undefined
                  ? "Memeriksa stok…"
                  : `sisa ${available} unit${insufficient ? " — stok tidak cukup" : ""}`}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeItem(item.key)}
                className="gap-1 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3.5" aria-hidden />
                Hapus
              </Button>
            </div>
          </div>
        );
      })}

      {stockErrors.length > 0 && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {stockErrors.map((e) => (
            <p key={e}>{e}</p>
          ))}
        </div>
      )}
    </section>
  );
}
