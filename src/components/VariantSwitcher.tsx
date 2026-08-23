"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Palette, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type BgVariant = "kertas" | "y2k" | "darkroom";

const BG_OPTIONS: { value: BgVariant; label: string; desc: string }[] = [
  { value: "kertas", label: "Kertas Foto", desc: "Cream hangat + grain" },
  { value: "y2k", label: "Y2K Chrome", desc: "Lavender futuristik" },
  { value: "darkroom", label: "Darkroom", desc: "Gelap + amber" },
];

const HERO_OPTIONS: { value: string; label: string; desc: string }[] = [
  { value: "polaroid", label: "Polaroid", desc: "Kolase foto tersebar" },
  { value: "exif", label: "EXIF Chips", desc: "Produk besar + chips" },
  { value: "filmstrip", label: "Film Strip", desc: "Marquee film berjalan" },
];

/** Panel preview untuk mencoba varian bg & hero lewat URL (?bg=&hero=). */
export function VariantSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(true);

  const bg = (searchParams.get("bg") ?? "kertas") as BgVariant;
  const hero = searchParams.get("hero") ?? "polaroid";

  const setVariant = (key: "bg" | "hero", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn-retro fixed bottom-4 right-4 z-50 flex size-11 items-center justify-center rounded-full bg-card shadow-lg"
        aria-label="Buka panel preview tema"
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
        Background
      </p>
      <div className="mb-3 grid gap-1.5">
        {BG_OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => setVariant("bg", o.value)}
            className={cn(
              "flex items-baseline justify-between rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors",
              bg === o.value
                ? "border-primary bg-accent font-semibold"
                : "hover:bg-muted"
            )}
          >
            {o.label}
            <span className="text-[10px] font-normal text-muted-foreground">{o.desc}</span>
          </button>
        ))}
      </div>

      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Hero Section
      </p>
      <div className="grid gap-1.5">
        {HERO_OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => setVariant("hero", o.value)}
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
    </div>
  );
}
