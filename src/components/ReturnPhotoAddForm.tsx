"use client";

import { ImagePlus } from "lucide-react";
import { addReturnPhotos } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UploadField } from "@/components/UploadField";

/**
 * Form tambah foto kondisi untuk order yang SUDAH SELESAI — hanya menambah
 * foto (revisi/kelengkapan), tanpa mengubah status order & unit.
 * Kolom upload seragam dengan jaminan & form return via UploadField.
 */
export function ReturnPhotoAddForm({ orderId }: { orderId: string }) {
  return (
    <form action={addReturnPhotos} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />

      <div className="space-y-1.5">
        <Label htmlFor="add-photos">Tambah foto kondisi barang</Label>
        <UploadField
          id="add-photos"
          name="photos"
          multiple
          required
          placeholder="Pilih foto kondisi barang…"
          helper="JPG/PNG/WebP, maksimal 5 MB per foto. Foto salah bisa dihapus lewat tombol ✕ di atas."
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="add-notes">Catatan (opsional)</Label>
        <textarea
          id="add-notes"
          name="notes"
          className="min-h-14 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
        />
      </div>

      <Button type="submit" variant="secondary" className="w-full gap-1.5">
        <ImagePlus className="size-4" aria-hidden />
        Simpan Foto
      </Button>
    </form>
  );
}
