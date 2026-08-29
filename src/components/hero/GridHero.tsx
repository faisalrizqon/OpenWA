import { Star } from "lucide-react";
import type { StoreSettings } from "@/lib/shop";
import { cn } from "@/lib/utils";
import { type HeroProduct, HERO_MIN_H } from "./types";
import { HeroTitle } from "./HeroTitle";
import { HeroSubtitle } from "./HeroSubtitle";
import { CtaButtons } from "./CtaButtons";
import { TrustChips } from "./TrustChips";

/* ---------- Varian F: Camera wall grid ---------- */
export function GridHero({ products, settings }: { products: HeroProduct[]; settings: StoreSettings }) {
  const wall = [...products, ...products.slice(0, 2)];
  return (
    <section className={cn("flex flex-col justify-center py-10", HERO_MIN_H)}>
      <div className="mx-auto w-full max-w-6xl px-4 md:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="order-2 grid grid-cols-3 gap-3 lg:order-1">
            {wall.map((p, i) => (
              <figure
                key={`${p.name}-${i}`}
                className={cn(
                  "animate-fade-in flash-hover group relative overflow-hidden rounded-xl border shadow-sm",
                  i % 2 === 0 ? "rotate-[1.5deg]" : "-rotate-[1.5deg]",
                  i === 2 && "col-span-2 row-span-2"
                )}
                style={{ animationDelay: `${0.2 + i * 0.08}s` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image}
                  alt={p.name}
                  loading="lazy"
                  className={cn(
                    "w-full object-cover transition-transform duration-300 group-hover:scale-105",
                    i === 2 ? "aspect-square" : "aspect-[3/2]"
                  )}
                />
                <figcaption className="digicam-timestamp absolute bottom-1.5 right-2 text-[10px] opacity-0 transition-opacity group-hover:opacity-100">
                  {p.timestamp}
                </figcaption>
              </figure>
            ))}
          </div>

          <div className="order-1 space-y-5 lg:order-2">
            <span className="animate-fade-up inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
              <Star className="size-3.5 fill-current" aria-hidden />
              {products.length}+ unit kamera siap pakai
            </span>
            <HeroTitle settings={settings} />
            <HeroSubtitle settings={settings} />
            <div className="animate-fade-up" style={{ animationDelay: "0.24s" }}>
              <CtaButtons settings={settings} />
            </div>
            <div className="animate-fade-up" style={{ animationDelay: "0.32s" }}>
              <TrustChips settings={settings} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
