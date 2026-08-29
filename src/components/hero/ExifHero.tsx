import { Star } from "lucide-react";
import type { StoreSettings } from "@/lib/shop";
import { cn } from "@/lib/utils";
import { type HeroProduct, HERO_MIN_H } from "./types";
import { HeroTitle } from "./HeroTitle";
import { HeroSubtitle } from "./HeroSubtitle";
import { CtaButtons } from "./CtaButtons";
import { TrustChips } from "./TrustChips";

/* ---------- Varian B: Produk besar + EXIF chips (zoom pelan) ---------- */
export function ExifHero({ products, settings }: { products: HeroProduct[]; settings: StoreSettings }) {
  const featured = products[0];
  const chips = [
    { label: "ISO 400", pos: "top-6 -left-2 md:-left-6" },
    { label: "f/2.8", pos: "top-24 -right-3 md:-right-8" },
    { label: "3.2 MP", pos: "bottom-16 -left-3 md:-left-8" },
    { label: "AUTO ⚡︎", pos: "-bottom-3 right-6" },
  ];
  return (
    <section className={cn("flex flex-col justify-center py-10", HERO_MIN_H)}>
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 md:grid-cols-[1.1fr_0.9fr] md:px-8">
        <div className="space-y-5">
          <span className="animate-fade-up inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            <Star className="size-3.5 fill-current" aria-hidden />
            Digicam paling dicari bulan ini
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

        <div className="animate-fade-in relative mx-auto w-full max-w-sm" style={{ animationDelay: "0.2s" }}>
          <div className="overflow-hidden rounded-3xl border bg-card shadow-xl shadow-foreground/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={featured.image}
              alt={featured.name}
              className="animate-kenburns aspect-[4/3] w-full object-cover"
            />
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-semibold">{featured.name}</span>
              <span className="digicam-timestamp text-xs">{featured.timestamp}</span>
            </div>
          </div>
          {chips.map((c, i) => (
            <span
              key={c.label}
              className={cn(
                "animate-pop absolute rounded-full border bg-card px-3 py-1.5 font-mono text-xs font-bold shadow-md",
                c.pos
              )}
              style={{ animationDelay: `${0.4 + i * 0.12}s` }}
            >
              {c.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
