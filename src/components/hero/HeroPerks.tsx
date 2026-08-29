import {
  ShieldCheck,
  Clock,
  Star,
  Wallet,
  Camera,
  Truck,
  Heart,
  Zap,
  Package,
  BadgeCheck,
  type LucideIcon,
} from "lucide-react";
import type { PerkItem } from "./types";

/** Ikon kartu keunggulan yang bisa dipilih lewat admin. */
const PERK_ICONS: Record<string, LucideIcon> = {
  wallet: Wallet,
  shield: ShieldCheck,
  clock: Clock,
  star: Star,
  camera: Camera,
  truck: Truck,
  heart: Heart,
  zap: Zap,
  package: Package,
  badge: BadgeCheck,
};

/** Kartu keunggulan — flow normal tepat di bawah hero, animasi fade-up berurutan. */
export function HeroPerks({ perks }: { perks: PerkItem[] }) {
  if (perks.length === 0) return null;
  return (
    <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-8 md:px-8">
      <div className="grid gap-3 sm:grid-cols-3">
        {perks.map((perk, i) => {
          const Icon = PERK_ICONS[perk.icon] ?? Camera;
          return (
            <div
              key={perk.title + i}
              className="group flex animate-fade-up items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-md shadow-foreground/5 transition-all hover:-translate-y-1 hover:shadow-lg"
              style={{ animationDelay: `${0.15 + i * 0.12}s` }}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
                <Icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 leading-tight">
                <p className="text-sm font-bold">{perk.title}</p>
                <p className="text-xs text-muted-foreground">{perk.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
