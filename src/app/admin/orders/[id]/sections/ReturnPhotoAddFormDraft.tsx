"use client";

import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UploadField } from "@/components/UploadField";
import { useOptionalOrderDraft } from "@/components/order-draft/OrderDraftContext";

/**
 * Form tambah foto kondisi untuk order yang SUDAH SELESAI — mode DRAFT.
 *
 * Hanya menambah foto + catatan (revisi/kelengkapan) tanpa mengubah status
 * order. Foto masuk draft dan baru tersimpan setelah tombol "Simpan" di header.
 */
export function ReturnPhotoAddFormDraft() {
  const draft = useOptionalOrderDraft();
  const [photos, setPhotos] = useState<File[]>(draft?.returnPhotos ?? []);
  const [notes, setNotes] = useState(draft?.returnNotes ?? "");

  // Tanpa provider draft tidak ada jalur simpan → sembunyikan form.
  if (!draft) return null;

  function applyToDraft() {
    if (!draft) return;
    // complete=false & conditions=[] supaya tidak memicu ulang penyelesaian order.
    draft.setReturn({
      complete: draft.returnComplete,
      conditions: draft.returnConditions,
      notes: notes.trim(),
      photos,
    });
  }

  const anyInput = photos.length > 0 || notes.trim() !== "";

  return (
    <div className="flex min-h-full flex-col gap-y-1.5">
      <div className="space-y-1.5">
        <Label htmlFor="add-photos">Tambah foto kondisi barang</Label>
        <UploadField
          id="add-photos"
          name="photos"
          multiple
          placeholder="Pilih foto kondisi barang…"
          helper="Semua format diterima, maksimal 15 MB per foto (dikompres otomatis). Foto salah bisa dihapus lewat tombol ✕ di atas."
          onFilesChange={setPhotos}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="add-notes">Catatan (opsional)</Label>
        <textarea
          id="add-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-14 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
        />
      </div>

      <Button
        type="button"
        variant={anyInput ? "default" : "outline"}
        className="w-full gap-1.5"
        onClick={applyToDraft}
        disabled={!anyInput}
      >
        <ImagePlus className="size-4" aria-hidden />
        Terapkan ke Draft
      </Button>

      {(draft.returnPhotos.length > 0 || draft.returnNotes) && (
        <p className="text-xs text-muted-foreground">
          Foto return sudah tercatat — tekan <strong>Simpan</strong> di atas
          halaman untuk menyimpannya ke database.
        </p>
      )}
    </div>
  );
}
