"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GalleryImage {
  src: string;
  alt: string;
}

/**
 * Galeri produk ala marketplace: foto utama besar + deretan thumbnail di
 * bawahnya. Klik thumbnail untuk mengganti foto utama (state lokal, tanpa
 * reload). Foto pertama = gambar utama produk; sisanya dari galeri.
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
      {/* Foto utama */}
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.src}
          alt={current.alt}
          className="size-full object-cover"
        />
        {images.length > 1 && (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-xs font-medium text-white tabular-nums">
            {Math.min(active, images.length - 1) + 1}/{images.length}
          </span>
        )}
      </div>

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
