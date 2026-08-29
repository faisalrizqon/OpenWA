import { type StoreSettings } from "@/lib/shop";
import type { HeroProduct, PerkItem } from "./types";
import { HeroPerks } from "./HeroPerks";
import { PolaroidHero } from "./PolaroidHero";
import { ExifHero } from "./ExifHero";
import { FilmStripHero } from "./FilmStripHero";
import { StampHero } from "./StampHero";
import { FlipHero } from "./FlipHero";
import { GridHero } from "./GridHero";
import { StickerHero } from "./StickerHero";

export type HeroVariant = "polaroid" | "exif" | "filmstrip" | "stamp" | "flip" | "grid" | "sticker";

interface ShopHeroProps {
  variant: HeroVariant;
  products: HeroProduct[];
  settings: StoreSettings;
  perks: PerkItem[];
}

export function ShopHero({ variant, products, settings, perks }: ShopHeroProps) {
  let hero: React.ReactNode;
  if (variant === "exif") hero = <ExifHero products={products} settings={settings} />;
  else if (variant === "filmstrip") hero = <FilmStripHero products={products} settings={settings} />;
  else if (variant === "stamp") hero = <StampHero products={products} settings={settings} />;
  else if (variant === "flip") hero = <FlipHero products={products} settings={settings} />;
  else if (variant === "grid") hero = <GridHero products={products} settings={settings} />;
  else if (variant === "sticker") hero = <StickerHero products={products} settings={settings} />;
  else hero = <PolaroidHero products={products} settings={settings} />;

  return (
    <div>
      {hero}
      {/* Kartu keunggulan: flow normal di bawah hero, animasi fade-up berurutan */}
      <HeroPerks perks={perks} />
    </div>
  );
}
