import type { StoreSettings } from "@/lib/shop";
import { cn } from "@/lib/utils";
import { type HeroProduct, HERO_MIN_H } from "./types";
import { HeroTitle } from "./HeroTitle";
import { HeroSubtitle } from "./HeroSubtitle";
import { CtaButtons } from "./CtaButtons";
import { FlipCards } from "./FlipCards";

/* ---------- Varian E: 3D flip cards (server component; grid interaktif di FlipCards) ---------- */
export function FlipHero({ products, settings }: { products: HeroProduct[]; settings: StoreSettings }) {
  return (
    <section className={cn("flex flex-col justify-center py-10", HERO_MIN_H)}>
      <div className="mx-auto w-full max-w-6xl px-4 text-center md:px-8">
        <HeroTitle settings={settings} className="mx-auto max-w-2xl" />
        <HeroSubtitle settings={settings} className="mx-auto mt-3 max-w-xl" />

        <FlipCards products={products} />

        <div className="animate-fade-up mt-8 flex justify-center" style={{ animationDelay: "0.5s" }}>
          <CtaButtons size="md" settings={settings} />
        </div>
      </div>
    </section>
  );
}
