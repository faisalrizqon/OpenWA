"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface OpenClosedSignProps {
  /** String jam operasional, mis. "Setiap hari · 08.00 – 21.00". */
  hours: string;
}

function parseHoursRange(hours: string): { open: number; close: number } | null {
  const m = hours.match(/(\d{1,2})[.:](\d{2})\s*[–—-]\s*(\d{1,2})[.:](\d{2})/);
  if (!m) return null;
  const open = Number(m[1]) * 60 + Number(m[2]);
  const close = Number(m[3]) * 60 + Number(m[4]);
  if (isNaN(open) || isNaN(close)) return null;
  return { open, close };
}

function computeOpen(hours: string): boolean {
  const range = parseHoursRange(hours);
  if (!range) return true;
  const d = new Date();
  const cur = d.getHours() * 60 + d.getMinutes();
  return cur >= range.open && cur < range.close;
}

/** Papan gantung OPEN/CLOSED ala toko.
 *
 *  - Papan kayu dengan serat & bingkai.
 *  - Tali ANYAM PUTIH (dua utas) dari paku tengah ke sudut atas papan.
 *  - Status mengikuti jam operasional otomatis (dicek tiap menit).
 *  - Diklik -> berayun besar bolak-balik, lalu kembali ke status asli. */
export function OpenClosedSign({ hours }: OpenClosedSignProps) {
  const [actualOpen, setActualOpen] = useState<boolean | null>(null);
  const [swinging, setSwinging] = useState(false);

  useEffect(() => {
    const check = () => setActualOpen(computeOpen(hours));
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [hours]);

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
      {/* PAKU tengah atas */}
      <span
        className="z-20 size-3 rounded-full bg-[radial-gradient(circle_at_35%_30%,#e5e7eb,#9ca3af_50%,#4b5563_90%)] shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
        aria-hidden
      />

      {/* Kelompok ayun: tali + papan (poros di paku) */}
      <span
        onAnimationEnd={() => setSwinging(false)}
        className={cn(
          "relative -mt-1 flex w-[130px] flex-col items-center",
          swinging ? "animate-sign-swing" : "animate-sign-sway"
        )}
      >
        {/* TALI ANYAM PUTIH — dua utas membentuk V */}
        <svg width="130" height="34" viewBox="0 0 130 34" aria-hidden className="block">
          {/* Tali kiri — efek anyaman: dua stroke putus-putus bergeser */}
          <line x1="65" y1="0" x2="22" y2="32" stroke="#f5f5f4" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="65" y1="0" x2="22" y2="32" stroke="#d6d3d1" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="4 3" strokeDashoffset="2" />
          {/* Tali kanan */}
          <line x1="65" y1="0" x2="108" y2="32" stroke="#f5f5f4" strokeWidth="2.4" strokeLinecap="round" />
          <line x1="65" y1="0" x2="108" y2="32" stroke="#d6d3d1" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="4 3" strokeDashoffset="2" />
          {/* Mata kait logam di ujung tali */}
          <circle cx="22" cy="32" r="2.2" fill="#a8a29e" stroke="#78716c" strokeWidth="0.5" />
          <circle cx="108" cy="32" r="2.2" fill="#a8a29e" stroke="#78716c" strokeWidth="0.5" />
        </svg>

        {/* PAPAN KAYU */}
        <span
          className={cn(
            "relative -mt-px flex items-center justify-center gap-1.5 overflow-hidden",
            "rounded-lg border-2 px-4 py-2",
            "shadow-[0_4px_10px_rgba(0,0,0,0.25),inset_0_1px_2px_rgba(255,255,255,0.3),inset_0_-2px_4px_rgba(0,0,0,0.15)]",
            open
              ? "border-emerald-700/50 bg-[linear-gradient(180deg,#ecfdf5_0%,#d1fae5_50%,#a7f3d0_100%)]"
              : "border-rose-700/50 bg-[linear-gradient(180deg,#fff1f2_0%,#ffe4e6_50%,#fecdd3_100%)]"
          )}
        >
          {/* Serat kayu horizontal */}
          <span
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 5px, rgba(120,80,40,0.15) 5px, rgba(120,80,40,0.15) 6px)",
            }}
            aria-hidden
          />
          {/* Bingkai dalam (double border effect) */}
          <span
            className={cn(
              "pointer-events-none absolute inset-[3px] rounded-md border",
              open ? "border-emerald-600/30" : "border-rose-600/30"
            )}
            aria-hidden
          />

          {/* Isi papan */}
          <span
            className={cn(
              "size-2 rounded-full shadow-inner",
              open ? "animate-pulse bg-emerald-500" : "bg-rose-500"
            )}
            aria-hidden
          />
          <span
            className={cn(
              "font-mono text-xs font-extrabold tracking-[0.2em]",
              open ? "text-emerald-800" : "text-rose-800"
            )}
          >
            {open ? "OPEN" : "CLOSED"}
          </span>
        </span>
      </span>
    </button>
  );
}
