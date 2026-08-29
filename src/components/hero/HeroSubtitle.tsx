import { cn } from "@/lib/utils";
import type { StoreSettings } from "@/lib/shop";

/** Subjudul hero — teks dikontrol dari admin. */
export function HeroSubtitle({ settings, className }: { settings: StoreSettings; className?: string }) {
  return (
    <p
      className={cn(
        "animate-fade-up max-w-md text-base text-muted-foreground md:text-lg",
        className
      )}
      style={{ animationDelay: "0.16s" }}
    >
      {settings.heroSubtitle}
    </p>
  );
}
