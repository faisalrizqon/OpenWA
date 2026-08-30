import { type StoreSettings } from "@/lib/shop";
import { cn } from "@/lib/utils";
import { type HeroProduct, HERO_MIN_H } from "./types";
import { HeroTitle } from "./HeroTitle";
import { HeroSubtitle } from "./HeroSubtitle";
import { CtaButtons } from "./CtaButtons";
import { TrustChips } from "./TrustChips";

/* ---------- Varian A: Polaroid Collage (foto melayang pelan) ---------- */
export function PolaroidHero({ products, settings }: { products: HeroProduct[]; settings: StoreSettings }) {
  const rotations = ["-6deg", "4deg", "-3deg", "7deg"];
  const offsets = [
    "md:top-0 md:-left-4",
    "md:top-10 md:right-6",
    "md:top-36 md:left-16",
    "md:top-40 md:right-10",
  ];
  return (
    <section className={cn("flex items-center overflow-hidden py-10", HERO_MIN_H)}>
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 md:grid-cols-2 md:px-8">
        <div className="space-y-5">
          <span className="animate-fade-up digicam-timestamp text-sm">
            {"'"}26 · 08 · 23 &nbsp;AM 10:24
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

        {/* Polaroid collage.
            Desktop: kolase foto melayang (posisi absolut).
            Mobile: grid 2x2 rapi agar tidak tumpang tindih. */}
        <div className="mx-auto grid w-full max-w-md grid-cols-2 gap-3 md:relative md:block md:h-[420px]">
          {products.slice(0, 4).map((p, i) => (
            <figure
              key={p.name}
              className={cn("animate-fade-in polaroid md:absolute md:w-48", offsets[i])}
              style={{
                transform: `rotate(${rotations[i]})`,
                animationDelay: `${0.2 + i * 0.15}s`,
              }}
            >
              <span className="tape -top-2 left-1/2 -translate-x-1/2 -rotate-2" aria-hidden />
              <div className="animate-float" style={{ animationDelay: `${i * 0.7}s` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image} alt={p.name} className="aspect-square w-full object-cover" />
                <figcaption className="mt-2 flex items-baseline justify-between px-1">
                  <span className="text-xs font-semibold">{p.name}</span>
                  <span className="digicam-timestamp text-[10px]">{p.timestamp}</span>
                </figcaption>
              </div>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
