"use client";

import { Palette, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { THEMES, type BgVariant } from "@/lib/theme";

const BG_OPTIONS: Record<BgVariant, { label: string; desc: string }> = {
  y2k: { label: "Y2K Chrome", desc: "Lavender futuristik ✦" },
  album: { label: "Album Kayu", desc: "Kulit kayu natural 🪵" },
  mono: { label: "Monokrom Film", desc: "Hitam putih klasik 🎞️" },
  coquette: { label: "Coquette Cute", desc: "Pink pastel & pita 🎀" },
};

const HERO_OPTIONS: { value: string; label: string; desc: string }[] = [
  { value: "polaroid", label: "Polaroid", desc: "Kolase foto tersebar" },
  { value: "exif", label: "EXIF Chips", desc: "Produk besar + chips" },
  { value: "filmstrip", label: "Film Strip", desc: "Marquee film berjalan" },
  { value: "stamp", label: "Timestamp Viewfinder", desc: "Banner timestamp oranye" },
  { value: "flip", label: "Flip Cards", desc: "3D flip interaktif" },
  { value: "grid", label: "Camera Wall Grid", desc: "Grid foto asimetris" },
  { value: "sticker", label: "Sticker Wall", desc: "Kartu stiker cute + washi" },
];

interface VariantSwitcherProps {
  theme: BgVariant;
  hero: string;
  onSelectTheme: (t: BgVariant) => void;
  onSelectHero: (h: string) => void;
}

/** Panel pilihan tema & hero. Pilihan langsung disimpan permanen
 *  (localStorage) oleh parent — berlaku di tab/halaman mana pun. */
export function VariantSwitcher({ theme, hero, onSelectTheme, onSelectHero }: VariantSwitcherProps) {
  const [open, setOpen] = useState(true);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn-retro fixed bottom-4 right-4 z-50 flex size-11 items-center justify-center rounded-full bg-card shadow-lg"
        aria-label="Buka panel pilihan tema"
      >
        <Palette className="size-5" aria-hidden />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-64 rounded-2xl border bg-card p-4 shadow-xl shadow-foreground/10">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-bold">
          <Palette className="size-4" aria-hidden />
          Coba Tampilan
        </p>
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
          aria-label="Tutup panel"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Background · tersimpan otomatis
      </p>
      <div className="mb-3 grid gap-1.5">
        {THEMES.map((value) => {
          const o = BG_OPTIONS[value];
          return (
            <button
              key={value}
              onClick={() => onSelectTheme(value)}
              aria-pressed={theme === value}
              className={cn(
                "flex items-baseline justify-between rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors",
                theme === value
                  ? "border-primary bg-accent font-semibold"
                  : "hover:bg-muted"
              )}
            >
              {o.label}
              <span className="text-[10px] font-normal text-muted-foreground">{o.desc}</span>
            </button>
          );
        })}
      </div>

      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Hero Section · tersimpan otomatis
      </p>
      <div className="grid gap-1.5">
        {HERO_OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => onSelectHero(o.value)}
            aria-pressed={hero === o.value}
            className={cn(
              "flex items-baseline justify-between rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors",
              hero === o.value
                ? "border-primary bg-accent font-semibold"
                : "hover:bg-muted"
            )}
          >
            {o.label}
            <span className="text-[10px] font-normal text-muted-foreground">{o.desc}</span>
          </button>
        ))}
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
        Pilihanmu disimpan di perangkat ini — tetap berlaku saat buka tab atau halaman lain,
        sampai kamu ganti lagi.
      </p>
    </div>
  );
}
