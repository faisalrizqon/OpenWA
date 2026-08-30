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

      {/* Film strip marquee — pita film gelap dengan lubang sprocket */}
      <div className="mt-auto overflow-hidden bg-zinc-950 py-2 shadow-inner md:py-3">
        <div className="film-sprockets h-2.5 w-full md:h-3" />
        <div className="film-strip-track gap-2 py-2 md:gap-3 md:py-3">
          {frames.map((p, i) => (
            <figure key={`${p.name}-${i}`} className="relative w-36 shrink-0 overflow-hidden rounded-[3px] ring-1 ring-white/15 md:w-56">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.image}
                alt={p.name}
                className="aspect-[3/2] w-full object-cover"
              />
              <figcaption className="digicam-timestamp absolute bottom-1 right-2 text-[8px] md:text-[10px]">
                {p.timestamp}
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="film-sprockets h-2.5 w-full md:h-3" />
      </div>
    </section>
  );
}
