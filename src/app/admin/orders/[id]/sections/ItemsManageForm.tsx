"use client";

import { useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { manageOrderItems } from "@/actions/orders";
import { calcSubtotal, formatRupiah, getTierPrice } from "@/lib/pricing";
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

export interface ManageableItem {
  id: number;
  productName: string;
  productId: number;
  quantity: number;
  durationHours: number;
  unitPrice: number;
  subtotal: number;
}

export interface ProductOption {
  id: number;
  name: string;
  price6h: number;
  price12h: number;
  price24h: number;
  price48h: number;
}

const DURATIONS = [6, 12, 24, 48];

/** Ikon edit (pensil) di pojok kanan atas card Item → buka dialog overlay
 *  untuk kelola item order: ubah qty/durasi, hapus item, dan tambah item baru.
 *  Harga otomatis mengikuti tier durasi produk. */
export function ItemsManageForm({
  orderId,
  items,
  products,
  locked,
}: {
  orderId: string;
  items: ManageableItem[];
  products: ProductOption[];
  locked: boolean;
}) {
  const [open, setOpen] = useState(false);
  // qty & durasi per item (draft)
  const [draft, setDraft] = useState<Record<number, { quantity: number; durationHours: number }>>(() =>
    Object.fromEntries(items.map((it) => [it.id, { quantity: it.quantity, durationHours: it.durationHours }]))
  );
  const [removed, setRemoved] = useState<number[]>([]);
  // item baru yang mau ditambah
  const [newItems, setNewItems] = useState<Array<{ productId: number; quantity: number; durationHours: number }>>([]);

  const productOf = (pid: number) => products.find((p) => p.id === pid);

  function subtotalOf(it: ManageableItem) {
    const d = draft[it.id];
    if (!d) return it.subtotal;
    const product = productOf(it.productId);
    if (!product) return it.subtotal;
    const unitPrice = getTierPrice(product, d.durationHours);
    return calcSubtotal({ unitPrice, quantity: d.quantity });
  }

  const anyChanged =
    items.some((it) => {
      const d = draft[it.id];
      return d && (d.quantity !== it.quantity || d.durationHours !== it.durationHours);
    }) || removed.length > 0 || newItems.length > 0;

  function resetAndClose() {
    setDraft(Object.fromEntries(items.map((it) => [it.id, { quantity: it.quantity, durationHours: it.durationHours }])));
    setRemoved([]);
    setNewItems([]);
    setOpen(false);
  }

  const availableProducts = products.filter(
    (p) => !items.some((it) => it.productId === p.id && !removed.includes(it.id))
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label="Edit item order"
            title={locked ? "Order selesai/dibatalkan — item tidak bisa diubah" : "Kelola item order"}
            disabled={locked}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <Pencil className="size-4" aria-hidden />
          </button>
        }
      />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Kelola Item Order</DialogTitle>
          <DialogDescription>
            Ubah jumlah/durasi, hapus, atau tambah item. Harga otomatis mengikuti tier durasi produk.
          </DialogDescription>
        </DialogHeader>

        <form action={manageOrderItems} onSubmit={() => setOpen(false)} className="space-y-4">
          <input type="hidden" name="orderId" value={orderId} />
          <input type="hidden" name="adds" value={JSON.stringify(newItems)} />
          <input
            type="hidden"
            name="updates"
            value={JSON.stringify(
              items
                .filter((it) => !removed.includes(it.id))
                .map((it) => ({ itemId: it.id, ...(draft[it.id] ?? { quantity: it.quantity, durationHours: it.durationHours }) }))
            )}
          />
          {removed.map((rid) => (
            <input key={rid} type="hidden" name="removeItemId" value={rid} />
          ))}

          {/* Item existing */}
          <div className="space-y-3">
            {items.map((it) => {
              if (removed.includes(it.id)) {
                return (
                  <div key={it.id} className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    <span className="line-through">{it.productName} ×{it.quantity}</span>
                    <button
                      type="button"
                      onClick={() => setRemoved((r) => r.filter((id) => id !== it.id))}
                      className="text-xs font-medium underline"
                    >
                      Batalkan hapus
                    </button>
                  </div>
                );
              }
              const d = draft[it.id] ?? { quantity: it.quantity, durationHours: it.durationHours };
              return (
                <div key={it.id} className="rounded-lg border p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{it.productName}</span>
                    <button
                      type="button"
                      aria-label={`Hapus ${it.productName}`}
                      onClick={() => setRemoved((r) => [...r, it.id])}
                      className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor={`qty-${it.id}`} className="text-xs">Jumlah</Label>
                      <input
                        id={`qty-${it.id}`}
                        type="number"
                        min={1}
                        value={d.quantity}
                        onChange={(e) =>
                          setDraft((p) => ({ ...p, [it.id]: { ...d, quantity: Math.max(1, Number(e.target.value) || 1) } }))
                        }
                        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm tabular-nums"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`dur-${it.id}`} className="text-xs">Durasi (jam)</Label>
                      <select
                        id={`dur-${it.id}`}
                        value={d.durationHours}
                        onChange={(e) =>
                          setDraft((p) => ({ ...p, [it.id]: { ...d, durationHours: Number(e.target.value) } }))
                        }
                        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      >
                        {DURATIONS.map((h) => (
                          <option key={h} value={h}>{h} jam</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="mt-2 text-right text-sm font-medium tabular-nums">
                    {formatRupiah(subtotalOf(it))}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Tambah item baru */}
          {availableProducts.length > 0 && (
            <div className="rounded-lg border border-dashed p-3">
              <Label className="mb-2 block text-xs font-medium text-muted-foreground">Tambah item baru</Label>
              {newItems.map((ni, idx) => {
                const product = productOf(ni.productId);
                const unitPrice = product ? getTierPrice(product, ni.durationHours) : 0;
                return (
                  <div key={idx} className="mb-3 space-y-2 rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center justify-between">
                      <select
                        value={ni.productId}
                        onChange={(e) =>
                          setNewItems((p) => p.map((x, i) => (i === idx ? { ...x, productId: Number(e.target.value) } : x)))
                        }
                        className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
                      >
                        {availableProducts.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        aria-label="Batalkan item baru"
                        onClick={() => setNewItems((p) => p.filter((_, i) => i !== idx))}
                        className="ml-2 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-600"
                      >
                        <X className="size-4" aria-hidden />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min={1}
                        value={ni.quantity}
                        onChange={(e) =>
                          setNewItems((p) => p.map((x, i) => (i === idx ? { ...x, quantity: Math.max(1, Number(e.target.value) || 1) } : x)))
                        }
                        aria-label="Jumlah item baru"
                        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm tabular-nums"
                      />
                      <select
                        value={ni.durationHours}
                        onChange={(e) =>
                          setNewItems((p) => p.map((x, i) => (i === idx ? { ...x, durationHours: Number(e.target.value) } : x)))
                        }
                        aria-label="Durasi item baru"
                        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      >
                        {DURATIONS.map((h) => (
                          <option key={h} value={h}>{h} jam</option>
                        ))}
                      </select>
                    </div>
                    <p className="text-right text-sm font-medium tabular-nums">
                      {formatRupiah(calcSubtotal({ unitPrice, quantity: ni.quantity }))}
                    </p>
                  </div>
                );
              })}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const first = availableProducts[0];
                  if (first) setNewItems((p) => [...p, { productId: first.id, quantity: 1, durationHours: 12 }]);
                }}
                className="w-full gap-1.5"
              >
                <Plus className="size-3.5" aria-hidden />
                Tambah Item
              </Button>
            </div>
          )}

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
