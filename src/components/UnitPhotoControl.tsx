"use client";

import { useRef } from "react";
import { Camera, Trash2, Upload } from "lucide-react";
import { uploadUnitPhoto, deleteUnitPhoto } from "@/actions/products";
import { Button } from "@/components/ui/button";

/**
 * Kontrol foto fisik unit di tabel admin produk: thumbnail preview + tombol
 * upload (auto-submit saat file dipilih) + hapus dengan konfirmasi.
 */
export function UnitPhotoControl({
  unitId,
  productId,
  photoPath,
}: {
  unitId: number;
  productId: number;
  photoPath: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-2">
      {/* Thumbnail / placeholder */}
      {photoPath ? (
        <a href={photoPath} target="_blank" rel="noopener noreferrer" title="Klik untuk memperbesar">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoPath}
            alt={`Foto unit #${unitId}`}
            className="size-10 rounded-md border object-cover"
          />
        </a>
      ) : (
        <span
          className="flex size-10 items-center justify-center rounded-md border bg-muted/50"
          title="Belum ada foto"
        >
          <Camera className="size-4 text-muted-foreground/40" aria-hidden />
        </span>
      )}

      {/* Upload foto — pilih file langsung submit */}
      <form action={uploadUnitPhoto}>
        <input type="hidden" name="unitId" value={unitId} />
        <input type="hidden" name="productId" value={productId} />
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              (e.currentTarget.form as HTMLFormElement).requestSubmit();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="size-3" aria-hidden />
          {photoPath ? "Ganti" : "Foto"}
        </Button>
      </form>

      {/* Hapus foto dengan konfirmasi */}
      {photoPath && (
        <form
          action={deleteUnitPhoto}
          onSubmit={(e) => {
            if (!window.confirm("Hapus foto unit ini?")) e.preventDefault();
          }}
        >
          <input type="hidden" name="unitId" value={unitId} />
          <input type="hidden" name="productId" value={productId} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
            aria-label="Hapus foto unit"
          >
            <Trash2 className="size-3" aria-hidden />
          </Button>
        </form>
      )}
    </div>
  );
}
