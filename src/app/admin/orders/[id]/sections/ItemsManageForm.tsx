"use client";

import { useState } from "react";
import { Check, Pencil, Plus, RotateCcw, Trash2, X } from "lucide-react";
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
import { useOptionalOrderDraft } from "@/components/order-draft/OrderDraftContext";

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

/**
 * Ikon edit (pensil) di pojok kanan atas card Item → kelola item order:
 * ubah qty/durasi, hapus item, dan tambah item baru.
 *
 * Perubahan TIDAK langsung disimpan — masuk draft order dan baru ditulis ke
 * database setelah tombol "Simpan" di header ditekan.
 */
export function ItemsManageForm({
  items,
  products,
  locked,
}: {
  orderId?: string;
  items: ManageableItem[];
  products: ProductOption[];
  locked: boolean;
}) {
  // Semua hook dipanggil tanpa syarat; guard `draft` dilakukan setelahnya.
  const draft = useOptionalOrderDraft();

  const [open, setOpen] = useState(false);
  // qty & durasi per item (nilai lokal dialog, sebelum "Terapkan")
  const [localDraft, setLocalDraft] = useState<Record<number, { quantity: number; durationHours: number }>>(() =>
    Object.fromEntries(items.map((it) => [it.id, { quantity: it.quantity, durationHours: it.durationHours }]))
  );
  const [removed, setRemoved] = useState<number[]>([]);
  const [newItems, setNewItems] = useState<Array<{ productId: number; quantity: number; durationHours: number }>>([]);

  if (!draft) return null;

  const productOf = (pid: number) => products.find((p) => p.id === pid);

  function subtotalOf(it: ManageableItem) {
    const d = localDraft[it.id];
    if (!d) return it.subtotal;
    const product = productOf(it.productId);
    if (!product) return it.subtotal;
    const unitPrice = getTierPrice(product, d.durationHours);
    return calcSubtotal({ unitPrice, quantity: d.quantity });
  }

  const anyChanged =
    items.some((it) => {
      const d = localDraft[it.id];
      return d && (d.quantity !== it.quantity || d.durationHours !== it.durationHours);
    }) || removed.length > 0 || newItems.length > 0;

  /** Kembalikan dialog ke kondisi draft yang sudah pernah diterapkan. */
  function revertToDraft() {
    const stagedUpdates = draft?.itemsToUpdate ?? [];
    const stagedDeletes = draft?.itemsToDelete ?? [];
    setLocalDraft(
      Object.fromEntries(
        items.map((it) => {
          const staged = stagedUpdates.find((u) => u.itemId === it.id);
          return [it.id, staged ? { quantity: staged.quantity, durationHours: staged.durationHours } : { quantity: it.quantity, durationHours: it.durationHours }];
        })
      )
    );
    setRemoved(stagedDeletes.filter((id) => items.some((it) => it.id === id)));
    setNewItems(draft?.itemsToAdd ?? []);
  }

  /** Tulis seluruh perubahan dialog ke draft order. Belum masuk DB. */
  function applyToDraft() {
    if (!draft) return;

    // Item yang ditandai hapus.
    for (const rid of removed) draft.deleteItem(rid);

    // Perubahan qty/durasi pada item yang tidak dihapus.
    for (const it of items) {
      if (removed.includes(it.id)) continue;
      const d = localDraft[it.id];
      if (!d) continue;
      if (d.quantity === it.quantity && d.durationHours === it.durationHours) continue;
      draft.updateItem({ itemId: it.id, quantity: d.quantity, durationHours: d.durationHours });
    }

    // Item baru.
    for (const ni of newItems) draft.addItem(ni);

    setOpen(false);
  }

  const availableProducts = products.filter(
    (p) => !items.some((it) => it.productId === p.id && !removed.includes(it.id))
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) revertToDraft();
        setOpen(next);
      }}
    >
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
            Ubah jumlah/durasi, hapus, atau tambah item. Harga otomatis mengikuti
            tier durasi produk. Perubahan baru tersimpan setelah tombol{" "}
            <strong>Simpan</strong> di atas ditekan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Item existing */}
          <div className="space-y-3">
            {items.map((it) => {
              if (removed.includes(it.id)) {
                return (
                  <div
                    key={it.id}
                    className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                  >
                    <span className="line-through">
                      {it.productName} ×{it.quantity}
                    </span>
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
              const d = localDraft[it.id] ?? { quantity: it.quantity, durationHours: it.durationHours };
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
                      <Label htmlFor={`qty-${it.id}`} className="text-xs">
                        Jumlah
                      </Label>
                      <input
                        id={`qty-${it.id}`}
                        type="number"
                        min={1}
                        value={d.quantity}
                        onChange={(e) =>
                          setLocalDraft((p) => ({
                            ...p,
                            [it.id]: { ...d, quantity: Math.max(1, Number(e.target.value) || 1) },
                          }))
                        }
                        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm tabular-nums"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`dur-${it.id}`} className="text-xs">
                        Durasi (jam)
                      </Label>
                      <select
                        id={`dur-${it.id}`}
                        value={d.durationHours}
                        onChange={(e) =>
                          setLocalDraft((p) => ({
                            ...p,
                            [it.id]: { ...d, durationHours: Number(e.target.value) },
                          }))
                        }
                        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      >
                        {DURATIONS.map((h) => (
                          <option key={h} value={h}>
                            {h} jam
                          </option>
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
              <Label className="mb-2 block text-xs font-medium text-muted-foreground">
                Tambah item baru
              </Label>
              {newItems.map((ni, idx) => {
                const product = productOf(ni.productId);
                const unitPrice = product ? getTierPrice(product, ni.durationHours) : 0;
                return (
                  <div key={idx} className="mb-3 space-y-2 rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center justify-between">
                      <select
                        value={ni.productId}
                        onChange={(e) =>
                          setNewItems((p) =>
                            p.map((x, i) => (i === idx ? { ...x, productId: Number(e.target.value) } : x))
                          )
                        }
                        aria-label="Produk item baru"
                        className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
                      >
                        {availableProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
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
                          setNewItems((p) =>
                            p.map((x, i) =>
                              i === idx ? { ...x, quantity: Math.max(1, Number(e.target.value) || 1) } : x
                            )
                          )
                        }
                        aria-label="Jumlah item baru"
                        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm tabular-nums"
                      />
                      <select
                        value={ni.durationHours}
                        onChange={(e) =>
                          setNewItems((p) =>
                            p.map((x, i) =>
                              i === idx ? { ...x, durationHours: Number(e.target.value) } : x
                            )
                          )
                        }
                        aria-label="Durasi item baru"
                        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      >
                        {DURATIONS.map((h) => (
                          <option key={h} value={h}>
                            {h} jam
                          </option>
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
            <Button type="button" variant="ghost" size="sm" onClick={revertToDraft} className="gap-1.5">
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
