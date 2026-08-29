import type { StoreSettings } from "@/lib/shop";
import { cn } from "@/lib/utils";
import { type HeroProduct, HERO_MIN_H } from "./types";
import { HeroTitle } from "./HeroTitle";
import { HeroSubtitle } from "./HeroSubtitle";
import { CtaButtons } from "./CtaButtons";
import { TrustChips } from "./TrustChips";

/* ---------- Varian C: Minimalis + film strip marquee ---------- */
export function FilmStripHero({ products, settings }: { products: HeroProduct[]; settings: StoreSettings }) {
  const frames = [...products, ...products]; // duplikasi untuk loop mulus
  return (
    <section className={cn("flex flex-col", HERO_MIN_H)}>
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 pb-8 pt-10 text-center md:px-8">
        <span className="animate-fade-up digicam-timestamp text-sm">
          ▶ PLAY &nbsp;·&nbsp; RENT · ROLL · REPEAT
        </span>
        <HeroTitle settings={settings} className="mx-auto mt-4 max-w-3xl" />
        <HeroSubtitle settings={settings} className="mx-auto mt-4 max-w-xl" />
        <div className="animate-fade-up mt-6 flex justify-center" style={{ animationDelay: "0.24s" }}>
          <CtaButtons size="md" settings={settings} />
        </div>
        <div className="animate-fade-up mt-4 flex justify-center" style={{ animationDelay: "0.32s" }}>
          <TrustChips settings={settings} />
        </div>
      </div>

      {/* Film strip marquee */}
      <div className="mt-auto overflow-hidden bg-foreground py-3">
        <div className="film-sprockets h-3 w-full opacity-70" />
        <div className="film-strip-track gap-3 py-3">
          {frames.map((p, i) => (
            <figure key={`${p.name}-${i}`} className="relative w-56 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.image}
                alt={p.name}
                className="aspect-[3/2] w-full rounded-sm object-cover"
              />
              <figcaption className="digicam-timestamp absolute bottom-1 right-2 text-[10px]">
                {p.timestamp}
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="film-sprockets h-3 w-full opacity-70" />
      </div>
    </section>
  );
}
