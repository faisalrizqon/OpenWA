import type { StoreSettings } from "@/lib/shop";
import { cn } from "@/lib/utils";
import { type HeroProduct, HERO_MIN_H } from "./types";
import { HeroTitle } from "./HeroTitle";
import { HeroSubtitle } from "./HeroSubtitle";
import { CtaButtons } from "./CtaButtons";
import { TrustChips } from "./TrustChips";

/* ---------- Varian D: Timestamp banner ala viewfinder ---------- */
export function StampHero({ products, settings }: { products: HeroProduct[]; settings: StoreSettings }) {
  const featured = products[0];
  return (
    <section className={cn("flex flex-col justify-center py-10", HERO_MIN_H)}>
      <div className="mx-auto w-full max-w-6xl px-4 md:px-8">
        <div className="grid items-center gap-10 md:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5">
            <div className="animate-fade-up digicam-timestamp inline-flex items-center gap-2 rounded-lg border border-current/30 px-3 py-1.5 text-sm">
              <span className="animate-blink size-2 rounded-full bg-current" aria-hidden />
              REC &nbsp;·&nbsp; {"'"}26 08 23 10:24
            </div>
            <HeroTitle settings={settings} />
            <HeroSubtitle settings={settings} />
            <div className="animate-fade-up" style={{ animationDelay: "0.24s" }}>
              <CtaButtons settings={settings} />
            </div>
            <div className="animate-fade-up" style={{ animationDelay: "0.32s" }}>
              <TrustChips settings={settings} />
            </div>
          </div>

          {/* Viewfinder frame berisi foto produk */}
          <div className="animate-fade-in relative" style={{ animationDelay: "0.2s" }}>
            <div className="group relative overflow-hidden rounded-3xl border-2 border-foreground/20 bg-foreground/5 p-4">
              <span className="viewfinder-corner left-2 top-2 border-l-2 border-t-2" />
              <span className="viewfinder-corner right-2 top-2 border-r-2 border-t-2" />
              <span className="viewfinder-corner bottom-2 left-2 border-b-2 border-l-2" />
              <span className="viewfinder-corner bottom-2 right-2 border-b-2 border-r-2" />
              <div className="flash-hover overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={featured.image}
                  alt={featured.name}
                  className="animate-kenburns aspect-[4/3] w-full object-cover"
                />
              </div>
              <div className="mt-3 flex items-center justify-between px-2">
                <span className="text-sm font-semibold">{featured.name}</span>
                <span className="digicam-timestamp text-xs">{featured.timestamp}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
