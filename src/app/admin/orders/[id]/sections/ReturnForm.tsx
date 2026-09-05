"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/SelectField";
import { UploadField } from "@/components/UploadField";
import { useOptionalOrderDraft } from "@/components/order-draft/OrderDraftContext";

const CONDITIONS: Record<string, string> = {
  Bagus: "Bagus",
  Cukup: "Cukup",
  Rusak: "Rusak",
};

const CONDITION_OPTIONS = Object.entries(CONDITIONS).map(([value, label]) => ({ label, value }));

interface ReturnUnit {
  unitId: number;
  productName: string;
  serialNumber: string | null;
}

/**
 * Form selesai order — kondisi unit, foto, dan catatan return.
 *
 * Perubahan masuk DRAFT dan baru tersimpan ke database setelah tombol "Simpan"
 * di header ditekan. Bila user batal/pergi, tidak ada yang berubah.
 */
export function ReturnForm({ units }: { orderId?: string; units: ReturnUnit[] }) {
  const draft = useOptionalOrderDraft();

  // Nilai awal diambil dari draft yang sudah pernah diterapkan.
  const staged = draft?.returnConditions ?? [];

  const [conditions, setConditions] = useState<Record<number, string>>(() =>
    Object.fromEntries(staged.map((c) => [c.unitId, c.condition]))
  );
  const [notes, setNotes] = useState(draft?.returnNotes ?? "");
  const [photos, setPhotos] = useState<File[]>(draft?.returnPhotos ?? []);
  const [complete, setComplete] = useState(draft?.returnComplete ?? false);

  // Tanpa provider draft tidak ada jalur simpan → sembunyikan form.
  if (!draft) return null;

  const chosen = Object.entries(conditions).filter(([, c]) => c);
  const anyInput = chosen.length > 0 || photos.length > 0 || notes.trim() !== "" || complete;

  function applyToDraft() {
    if (!draft) return;
    draft.setReturn({
      complete,
      conditions: chosen.map(([unitId, condition]) => ({
        unitId: Number(unitId),
        condition,
      })),
      notes: notes.trim(),
      photos,
    });
  }

  function clearDraft() {
    setConditions({});
    setNotes("");
    setPhotos([]);
    setComplete(false);
    draft?.setReturn({ complete: false, conditions: [], notes: "", photos: [] });
  }

  return (
    <div className="space-y-4">
      {units.length === 0 ? (
        <p className="text-sm text-muted-foreground">Tidak ada unit ter-assign pada order ini.</p>
      ) : (
        <div className="space-y-3">
          {units.map((u) => (
            <div
              key={u.unitId}
              className="flex items-center justify-between gap-4 rounded-lg bg-muted/40 px-3 py-2"
            >
              <div className="text-sm">
                <span className="font-medium">{u.productName}</span>
                {u.serialNumber && (
                  <span className="ml-2 text-muted-foreground">#{u.serialNumber}</span>
                )}
              </div>
              <div className="w-40">
                <Label htmlFor={`cond-${u.unitId}`} className="sr-only">
                  Kondisi {u.productName}
                </Label>
                <SelectField
                  id={`cond-${u.unitId}`}
                  value={conditions[u.unitId] || undefined}
                  onValueChange={(v) => setConditions((prev) => ({ ...prev, [u.unitId]: v }))}
                  placeholder="— pilih kondisi —"
                  options={CONDITION_OPTIONS}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="return-photos">Foto kondisi barang (opsional, bisa banyak)</Label>
          <UploadField
            id="return-photos"
            name="returnPhotos"
            multiple
            placeholder="Pilih foto kondisi barang…"
            helper="Semua format diterima, maksimal 15 MB per foto (dikompres otomatis)."
            onFilesChange={setPhotos}
          />
        </div>
        <div className="flex flex-col gap-3">
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={complete}
              onChange={(e) => setComplete(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <span>Tandai order selesai (barang kembali, unit dilepas ke stok)</span>
          </label>
          <Button
            type="button"
            onClick={applyToDraft}
            disabled={!anyInput}
            variant={anyInput ? "default" : "outline"}
            className="w-full gap-1.5"
          >
            <CheckCircle2 className="size-4" aria-hidden />
            Catat Pengembalian
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="return-notes">Catatan (opsional)</Label>
        <textarea
          id="return-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-16 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
        />
      </div>

      {(staged.length > 0 || draft.returnNotes || draft.returnPhotos.length > 0 || draft.returnComplete) && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-muted-foreground">
            Perubahan return sudah tercatat — tekan <strong>Simpan</strong> di atas halaman
            untuk menyimpannya ke database.
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={clearDraft}>
            Buang perubahan
          </Button>
        </div>
      )}
    </div>
  );
}
