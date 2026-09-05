"use client";

import { useState } from "react";
import { Camera, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface GalleryImage {
  src: string;
  alt: string;
}

/**
 * Galeri produk ala marketplace: foto utama besar + deretan thumbnail di
 * bawahnya. Klik thumbnail untuk mengganti foto utama (state lokal, tanpa
 * reload). Klik foto utama untuk zoom (modal ukuran penuh).
 */
export function ProductGallery({ images }: { images: GalleryImage[] }) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border bg-muted">
          <Camera className="size-24 text-muted-foreground/25" aria-hidden />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex aspect-square items-center justify-center rounded-xl border bg-muted/60"
            >
              <Camera className="size-6 text-muted-foreground/20" aria-hidden />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)];

  return (
    <div className="space-y-3">
      {/* Foto utama — klik untuk zoom di modal */}
      <Dialog>
        <DialogTrigger
          render={
            <button
              type="button"
              aria-label={`Perbesar ${current.alt}`}
              title="Klik untuk perbesar"
              className="group relative block w-full cursor-zoom-in"
            >
              <span className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={current.src}
                  alt={current.alt}
                  className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
                {/* Petunjuk zoom di pojok kiri atas */}
                <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <ZoomIn className="size-3" aria-hidden />
                  Zoom
                </span>
                {images.length > 1 && (
                  <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-xs font-medium text-white tabular-nums">
                    {Math.min(active, images.length - 1) + 1}/{images.length}
                  </span>
                )}
              </span>
            </button>
          }
        />
        <DialogContent className="max-w-5xl sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{current.alt}</DialogTitle>
            <DialogDescription>Klik di luar atau tekan ESC untuk menutup</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center bg-muted p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.src}
              alt={current.alt}
              className="max-h-[75vh] max-w-full object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Thumbnail — klik untuk ganti foto utama */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Lihat ${img.alt}`}
              className={cn(
                "aspect-square overflow-hidden rounded-xl border transition-all",
                i === active
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border/60 opacity-70 hover:opacity-100"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.src} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
