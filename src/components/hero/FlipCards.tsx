"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { type HeroProduct } from "./types";

/**
 * Grid kartu 3D flip — client component karena butuh state tap-to-flip.
 * Hanya menerima data produk murni (tanpa import server-only seperti Prisma),
 * sehingga aman dibundel ke browser.
 */
export function FlipCards({ products }: { products: HeroProduct[] }) {
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});

  const toggle = (i: number) =>
    setFlipped((prev) => ({ ...prev, [i]: !prev[i] }));

  return (
    <>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:grid-cols-4">
        {products.map((p, i) => (
          <div
            key={p.name}
            className="animate-fade-in flip-scene h-[240px] sm:h-[270px] md:h-[300px]"
            style={{ animationDelay: `${0.2 + i * 0.12}s` }}
            role="button"
            tabIndex={0}
            aria-pressed={!!flipped[i]}
            title={flipped[i] ? "Balik ke foto" : "Balik ke info"}
            onClick={() => toggle(i)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggle(i);
              }
            }}
          >
            {/* Wrapper tilt: kemiringan kartu dipisah dari transform flip
                agar rotateY (via CSS) tidak tertimpa inline style. */}
            <div className="h-full" style={{ transform: `rotate(${[-1.5, 1, -0.8, 1.2][i % 4]}deg)` }}>
              <div className={cn("flip-card h-full", flipped[i] && "is-flipped")}>
                {/* Depan: foto kamera dengan bingkai film */}
                <div className="flip-face overflow-hidden rounded-xl border-[3px] border-zinc-900 bg-white shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                  <span className="digicam-timestamp absolute bottom-1 right-2 text-[10px]">
                    {p.timestamp}
                  </span>
                </div>
                {/* Belakang: info produk */}
                <div className="flip-face flip-back flex flex-col items-center justify-center gap-2.5 rounded-xl border-[3px] border-zinc-900 bg-zinc-50 p-4 shadow-lg md:gap-3 md:p-5">
                  <span className="digicam-timestamp text-xs">{p.timestamp}</span>
                  <p className="line-clamp-1 font-bold tracking-tight">{p.name}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground md:text-sm">
                    Ready · cek & bersihkan sebelum sewa
                  </p>
                  <a
                    href="#katalog"
                    onClick={(e) => e.stopPropagation()}
                    className="btn-retro mt-1 inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground md:h-9 md:px-4 md:text-sm"
                  >
                    Lihat katalog
                    <ArrowRight className="size-4" aria-hidden />
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground md:hidden">Ketuk kartu untuk membalik</p>
    </>
  );
}
