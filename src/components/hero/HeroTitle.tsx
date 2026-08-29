import { cn } from "@/lib/utils";
import type { StoreSettings } from "@/lib/shop";

/** Judul hero dengan kata aksen — teks dikontrol dari admin. */
export function HeroTitle({ settings, className }: { settings: StoreSettings; className?: string }) {
  return (
    <h1
      className={cn(
        "animate-fade-up text-4xl font-extrabold leading-[1.08] tracking-tight md:text-5xl lg:text-6xl",
        className
      )}
      style={{ animationDelay: "0.08s" }}
    >
      {settings.heroTitleBefore}{" "}
      <span className="font-display italic font-normal text-primary">{settings.heroAccent}</span>
      {settings.heroTitleAfter}
    </h1>
  );
}
