"use client";

import { useRef } from "react";
import { Camera, ImagePlus, Trash2, X, ZoomIn } from "lucide-react";
import { uploadProductImages, deleteProductImage } from "@/actions/products";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const MAX_IMAGES = 10;

// Batas ukuran per file (sama dengan validasi server di uploadProductImages).
// Validasi client-side penting: jika total body melebihi proxyClientMaxBodySize,
// Next.js memotong stream request dan busboy gagal parse multipart
const MAX_FILE_SIZE = 15 * 1024 * 1024; // Updated to match server


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
              <Dialog>
                <DialogTrigger
                  render={
                    <button
                      type="button"
                      aria-label={`Perbesar foto produk ${img.id}`}
                      title="Klik untuk memperbesar"
                      className="group relative block size-full cursor-zoom-in"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.filePath}
                        alt={`Foto produk ${img.id}`}
                        className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                      />
                      {/* Petunjuk zoom di pojok kiri atas */}
                      <span className="pointer-events-none absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                        <ZoomIn className="size-3" aria-hidden />
                        Zoom
                      </span>
                    </button>
                  }
                />
                <DialogContent className="max-w-5xl sm:max-w-5xl">
                  <DialogHeader>
                    <DialogTitle>Foto Produk #{img.id}</DialogTitle>
                  </DialogHeader>
                  <div className="flex items-center justify-center bg-muted p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.filePath}
                      alt={`Foto produk ${img.id}`}
                      className="max-h-[75vh] max-w-full object-contain"
                    />
                  </div>
                </DialogContent>
              </Dialog>

              {/* Overlay gradasi saat hover — murni visual (pointer-events-none)
                  sehingga klik foto tetap membuka dialog zoom. */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/25 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

              {/* Tombol hapus foto — muncul saat hover, konfirmasi lewat dialog in-app
                  (bukan window.confirm bawaan browser). */}
              <DeleteImageDialog imageId={img.id} productId={productId} src={img.filePath} />
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
            accept="*/*"
            className="sr-only"
            onChange={(e) => {
              const input = e.currentTarget;
              const files = input.files;
              if (!files || files.length === 0) return;

              // Validasi jumlah file dulu — jika total body melebihi
              // proxyClientMaxBodySize, Next.js memotong stream dan busboy
              // gagal parse multipart ("Unexpected end of form").
              if (files.length > remaining) {
                toast.error(`Maksimal ${remaining} foto lagi untuk galeri ini`, {
                  description: `Kamu memilih ${files.length} file — pilih paling banyak ${remaining}.`,
                });
                input.value = ""; // reset agar file yang sama bisa dipilih lagi
                return;
              }

              // Validasi ukuran per file (maks 15MB, sama dengan aturan server).
              const oversized = Array.from(files).filter((f) => f.size > MAX_FILE_SIZE);
              if (oversized.length > 0) {
                toast.error("Ada file melebihi batas 15MB — tidak diupload", {
                  description: oversized.map((f) => `• ${f.name}`).join("\n"),
                });
                input.value = "";
                return;
              }

              input.form?.requestSubmit();
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
              sisa {remaining} slot · semua format, maks 15MB (dikompres otomatis)
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
    </div>
  );
}

/**
 * Konfirmasi hapus satu foto galeri — dialog in-app dengan preview foto,
 * pengganti window.confirm bawaan browser yang tampilannya tidak konsisten.
 * Pola sama dengan DeleteProductDialog di ProductAdminActions.
 */
function DeleteImageDialog({
  imageId,
  productId,
  src,
}: {
  imageId: number;
  productId: number;
  src: string;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label="Hapus foto dari galeri"
            className="absolute right-1.5 top-1.5 z-10 flex size-7 items-center justify-center rounded-full bg-card/95 text-muted-foreground opacity-0 shadow-sm ring-1 ring-border/70 backdrop-blur-sm transition-all duration-200 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Hapus foto ini dari galeri?</DialogTitle>
          <DialogDescription>
            Foto akan dihapus permanen dan tidak bisa dikembalikan.
          </DialogDescription>
        </DialogHeader>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Preview foto yang akan dihapus"
          className="h-36 w-full rounded-lg border object-cover"
        />
        <form action={deleteProductImage}>
          <input type="hidden" name="imageId" value={imageId} />
          <input type="hidden" name="productId" value={productId} />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline">Batal</Button>} />
            <Button type="submit" variant="destructive" className="gap-1.5">
              <Trash2 className="size-3.5" aria-hidden />
              Ya, Hapus
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
