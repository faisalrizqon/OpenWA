"use client";

import { useRef } from "react";
import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { uploadProductImages, deleteProductImage } from "@/actions/products";
import { Button } from "@/components/ui/button";

const MAX_IMAGES = 8;

export interface ProductImageItem {
  id: number;
  filePath: string;
}

/**
 * Galeri foto produk ala marketplace seller: grid foto terupload + upload
 * multi-file (auto-submit saat file dipilih) + hapus per foto dengan
 * konfirmasi. Maksimal 8 foto per produk.
 */
export function ProductGalleryControl({
  productId,
  images,
}: {
  productId: number;
  images: ProductImageItem[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const remaining = MAX_IMAGES - images.length;

  return (
    <div className="space-y-3">
      {/* Grid foto terupload */}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((img) => (
            <div key={img.id} className="group relative aspect-square overflow-hidden rounded-xl border bg-muted/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.filePath}
                alt={`Foto produk ${img.id}`}
                className="size-full object-cover"
              />
              {/* Overlay hapus muncul saat hover */}
              <form
                action={deleteProductImage}
                onSubmit={(e) => {
                  if (!window.confirm("Hapus foto ini dari galeri produk?")) e.preventDefault();
                }}
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <input type="hidden" name="imageId" value={img.id} />
                <input type="hidden" name="productId" value={productId} />
                <Button
                  type="submit"
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  aria-label="Hapus foto produk"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Hapus
                </Button>
              </form>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Belum ada foto galeri — foto utama produk memakai gambar produk utama.
        </p>
      )}

      {/* Upload multi-file — pilih file langsung submit */}
      {remaining > 0 ? (
        <form action={uploadProductImages}>
          <input type="hidden" name="productId" value={productId} />
          <input
            ref={inputRef}
            type="file"
            name="files"
            multiple
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
            variant="secondary"
            className="w-full gap-2 border border-dashed"
            onClick={() => inputRef.current?.click()}
          >
            {images.length > 0 ? (
              <ImagePlus className="size-4" aria-hidden />
            ) : (
              <Camera className="size-4" aria-hidden />
            )}
            {images.length > 0 ? "Tambah Foto" : "Upload Foto Produk"}
            <span className="text-xs font-normal text-muted-foreground">
              (sisa {remaining} slot · JPG/PNG/WebP maks 5MB)
            </span>
          </Button>
        </form>
      ) : (
        <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Maksimal {MAX_IMAGES} foto per produk sudah tercapai. Hapus salah satu
          untuk menambah foto baru.
        </p>
      )}
    </div>
  );
}
