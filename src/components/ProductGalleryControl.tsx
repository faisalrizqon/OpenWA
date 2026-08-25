"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import { uploadProductImages, deleteProductImage } from "@/actions/products";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const MAX_IMAGES = 10;

export interface ProductImageItem {
  id: number;
  filePath: string;
}

/**
 * Galeri foto produk ala marketplace seller: grid foto terupload + upload
 * multi-file (auto-submit saat file dipilih) + hapus per foto dengan tombol
 * ✕ di kanan atas (seragam dengan jaminan). Klik foto untuk lihat detail
 * (lightbox). Maksimal 10 foto per produk.
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
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {/* Grid foto terupload — klik foto untuk detail, ✕ kanan atas untuk hapus */}
      {images.length > 0 ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {images.map((img) => (
            <div
              key={img.id}
              className="group relative aspect-square overflow-hidden rounded-xl border bg-muted/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.filePath}
                alt={`Foto produk ${img.id}`}
                className="size-full cursor-zoom-in object-cover transition-transform duration-200 group-hover:scale-105"
                onClick={() => setLightboxSrc(img.filePath)}
              />
              {/* Tombol ✕ di kanan atas — seragam dengan pola jaminan */}
              <form
                action={deleteProductImage}
                onSubmit={(e) => {
                  if (!window.confirm("Hapus foto ini dari galeri produk?")) e.preventDefault();
                }}
              >
                <input type="hidden" name="imageId" value={img.id} />
                <input type="hidden" name="productId" value={productId} />
                <button
                  type="submit"
                  aria-label="Hapus foto produk"
                  className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-card/95 text-muted-foreground shadow-sm ring-1 ring-border/70 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
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
      {remaining > 0 && (
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
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 px-3 py-3 text-sm transition-colors hover:bg-accent"
          >
            {images.length > 0 ? (
              <ImagePlus className="size-4 text-muted-foreground" aria-hidden />
            ) : (
              <Camera className="size-4 text-muted-foreground" aria-hidden />
            )}
            {images.length > 0 ? "Tambah Foto" : "Upload Foto Produk"}
            <span className="text-xs text-muted-foreground">
              sisa {remaining} slot · JPG/PNG/WebP maks 5MB
            </span>
          </button>
        </form>
      )}
      {remaining === 0 && (
        <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Maksimal {MAX_IMAGES} foto per produk sudah tercapai. Hapus salah satu
          untuk menambah foto baru.
        </p>
      )}

      {/* Lightbox detail foto */}
      <Dialog open={lightboxSrc !== null} onOpenChange={(open) => !open && setLightboxSrc(null)}>
        <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0">
          <DialogTitle className="sr-only">Detail foto produk</DialogTitle>
          {lightboxSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lightboxSrc}
              alt="Foto produk — tampilan penuh"
              className="max-h-[80vh] w-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
