"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface OpenClosedSignProps {
  /** String jam operasional, mis. "Setiap hari · 08.00 – 21.00". */
  hours: string;
}

/** Parse rentang jam "08.00 – 21.00" menjadi menit dari tengah malam. */
function parseHoursRange(hours: string): { open: number; close: number } | null {
  const m = hours.match(/(\d{1,2})[.:](\d{2})\s*[–—-]\s*(\d{1,2})[.:](\d{2})/);
  if (!m) return null;
  const open = Number(m[1]) * 60 + Number(m[2]);
  const close = Number(m[3]) * 60 + Number(m[4]);
  if (isNaN(open) || isNaN(close)) return null;
  return { open, close };
}

/** Apakah toko buka sekarang menurut string jam operasional? */
function computeOpen(hours: string): boolean {
  const range = parseHoursRange(hours);
  if (!range) return true; // tidak bisa parse -> anggap buka
  const d = new Date();
  const cur = d.getHours() * 60 + d.getMinutes();
  return cur >= range.open && cur < range.close;
}

/** Papan gantung OPEN/CLOSED ala toko.
 *
 *  - Status mengikuti jam operasional secara otomatis (dicek tiap menit).
 *  - Mengayun pelan seperti papan tergantung (animasi idle).
 *  - Diklik -> berayun besar bolak-balik lalu kembali tenang;
 *    status selalu kembali ke kondisi asli (OPEN/CLOSED sesuai jam). */
export function OpenClosedSign({ hours }: OpenClosedSignProps) {
  const [actualOpen, setActualOpen] = useState<boolean | null>(null);
  const [swinging, setSwinging] = useState(false);

  useEffect(() => {
    const check = () => setActualOpen(computeOpen(hours));
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [hours]);

  // Hindari mismatch SSR/hydration — render setelah status diketahui.
  if (actualOpen === null) return null;

  const handleClick = () => {
    if (swinging) return;
    setSwinging(true);
  };

  const open = actualOpen;

  return (
    <button
      type="button"
      onClick={handleClick}
      title={open ? "Toko sedang buka — klik untuk goyang!" : "Toko sedang tutup — klik untuk goyang!"}
      aria-label={open ? "Toko buka" : "Toko tutup"}
      className="group relative flex select-none flex-col items-center focus:outline-none"
    >
      {/* Cantolan / paku di atas */}
      <span className="z-10 size-2 rounded-full border border-amber-700/60 bg-amber-600 shadow-sm" aria-hidden />
      {/* Tali gantung */}
      <span className="-mt-px h-2.5 w-px bg-amber-700/70" aria-hidden />

      {/* Papan yang berayun */}
      <span
        onAnimationEnd={() => setSwinging(false)}
        className={cn(
          "shop-sign relative flex min-w-[96px] items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 shadow-md transition-colors",
          open
            ? "border-emerald-600/60 bg-emerald-50 text-emerald-700"
            : "border-rose-600/60 bg-rose-50 text-rose-700",
          swinging ? "animate-sign-swing" : "animate-sign-sway"
        )}
      >
        {/* Dua paku pengait di sudut atas papan */}
        <span className="absolute -top-1 left-1.5 size-1.5 rounded-full bg-amber-700/70" aria-hidden />
        <span className="absolute -top-1 right-1.5 size-1.5 rounded-full bg-amber-700/70" aria-hidden />
        <span
          className={cn(
            "size-1.5 rounded-full",
            open ? "animate-pulse bg-emerald-500" : "bg-rose-500"
          )}
          aria-hidden
        />
        <span className="font-mono text-[11px] font-extrabold tracking-[0.18em]">
          {open ? "OPEN" : "CLOSED"}
        </span>
      </span>
    </button>
  );
}
