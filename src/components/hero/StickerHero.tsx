import type { StoreSettings } from "@/lib/shop";
import { cn } from "@/lib/utils";
import { type HeroProduct, HERO_MIN_H } from "./types";
import { HeroTitle } from "./HeroTitle";
import { HeroSubtitle } from "./HeroSubtitle";
import { CtaButtons } from "./CtaButtons";

/* ---------- Varian G: Cute sticker wall ---------- */
export function StickerHero({ products, settings }: { products: HeroProduct[]; settings: StoreSettings }) {
  return (
    <section className={cn("flex flex-col justify-center py-10", HERO_MIN_H)}>
      <div className="mx-auto w-full max-w-6xl px-4 text-center md:px-8">
        <HeroTitle settings={settings} className="mx-auto max-w-2xl" />
        <HeroSubtitle settings={settings} className="mx-auto mt-3 max-w-xl" />

        {/* Sticker wall grid — tiap stiker goyang halus */}
        <div className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-4 lg:grid-cols-4">
          {products.map((p, i) => (
            <figure
              key={p.name}
              className="animate-pop sticker-card relative overflow-hidden rounded-2xl border bg-card shadow-md"
              style={{
                transform: `rotate(${[-1.5, 1, -0.8, 1.2][i % 4]}deg)`,
                animationDelay: `${0.2 + i * 0.12}s`,
              }}
            >
              <span className="washi-tape" aria-hidden />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image} alt={p.name} className="aspect-square w-full object-cover" />
              <figcaption className="px-3 py-3">
                <p className="text-sm font-semibold">{p.name}</p>
                <p className="digicam-timestamp text-xs opacity-70">{p.timestamp}</p>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="animate-fade-up mt-8 flex justify-center" style={{ animationDelay: "0.5s" }}>
          <CtaButtons size="md" settings={settings} />
        </div>
      </div>
    </section>
  );
}
