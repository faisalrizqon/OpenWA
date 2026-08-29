import { ArrowRight } from "lucide-react";
import type { StoreSettings } from "@/lib/shop";
import { cn } from "@/lib/utils";
import { type HeroProduct, HERO_MIN_H } from "./types";
import { HeroTitle } from "./HeroTitle";
import { HeroSubtitle } from "./HeroSubtitle";
import { CtaButtons } from "./CtaButtons";

/* ---------- Varian E: 3D flip cards ---------- */
export function FlipHero({ products, settings }: { products: HeroProduct[]; settings: StoreSettings }) {
  return (
    <section className={cn("flex flex-col justify-center py-10", HERO_MIN_H)}>
      <div className="mx-auto w-full max-w-6xl px-4 text-center md:px-8">
        <HeroTitle settings={settings} className="mx-auto max-w-2xl" />
        <HeroSubtitle settings={settings} className="mx-auto mt-3 max-w-xl" />

        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {products.map((p, i) => (
            <div
              key={p.name}
              className="animate-fade-in flip-scene h-56 md:h-60"
              style={{ animationDelay: `${0.2 + i * 0.12}s` }}
            >
              <div
                className="flip-card h-full"
                style={{ transform: `rotate(${[-1.5, 1, -0.8, 1.2][i % 4]}deg)` }}
              >
                {/* Depan: foto kamera */}
                <div className="flip-face overflow-hidden rounded-2xl border bg-card shadow-md">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image} alt={p.name} className="size-full object-cover" />
                </div>
                {/* Belakang: info + timestamp */}
                <div className="flip-face flip-back flex flex-col items-center justify-center gap-3 rounded-2xl border bg-card p-5 shadow-md">
                  <span className="digicam-timestamp text-xs">{p.timestamp}</span>
                  <p className="text-lg font-bold">{p.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Ready · cek & bersihkan sebelum sewa
                  </p>
                  <a
                    href="#katalog"
                    className="btn-retro mt-1 inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground"
                  >
                    Lihat katalog
                    <ArrowRight className="size-4" aria-hidden />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="animate-fade-up mt-8 flex justify-center" style={{ animationDelay: "0.5s" }}>
          <CtaButtons size="md" settings={settings} />
        </div>
      </div>
    </section>
  );
}
