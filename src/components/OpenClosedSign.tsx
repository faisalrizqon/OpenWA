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
 *  Konstruksi seperti papan nama toko asli:
 *  - Satu PAKU di tengah atas.
 *  - Dua TALI dari paku ke sudut kiri & kanan atas papan (membentuk V).
 *  - Papan kayu menggantung di bawahnya.
 *
 *  Perilaku:
 *  - Status mengikuti jam operasional otomatis (dicek tiap menit).
 *  - Mengayun pelan terus-menerus (poros di paku).
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
      {/* PAKU di tengah atas (logam, dengan highlight) */}
      <span
        className="z-10 size-2.5 rounded-full bg-[radial-gradient(circle_at_32%_30%,#f3f4f6,#9ca3af_55%,#4b5563)] shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
        aria-hidden
      />

      {/* Kelompok ayun: tali + papan. Poros ayunan = paku (top center). */}
      <span
        onAnimationEnd={() => setSwinging(false)}
        className={cn(
          "relative -mt-1 flex w-[120px] flex-col items-center",
          swinging ? "animate-sign-swing" : "animate-sign-sway"
        )}
      >
        {/* TALI kanan & kiri dari paku ke sudut atas papan */}
        <svg width="120" height="30" viewBox="0 0 120 30" aria-hidden className="block">
          <line x1="60" y1="0" x2="20" y2="29" strokeWidth="1.5" className="stroke-amber-800/70" />
          <line x1="60" y1="0" x2="100" y2="29" strokeWidth="1.5" className="stroke-amber-800/70" />
          {/* Mata kait di ujung tali yang menempel ke papan */}
          <circle cx="20" cy="29" r="2" className="fill-amber-900/80" />
          <circle cx="100" cy="29" r="2" className="fill-amber-900/80" />
        </svg>

        {/* PAPAN kayu — sudut atasnya tepat di ujung tali (x=20 & x=100, lebar 80px) */}
        <span
          className={cn(
            "relative -mt-px flex w-20 items-center justify-center gap-1.5 rounded-md border border-amber-800/40 bg-gradient-to-b from-amber-100 to-amber-200 px-1.5 py-1.5 shadow-[0_3px_6px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.6)]"
          )}
        >
          {/* Sekrup kecil di sudut atas papan */}
          <span className="absolute left-1 top-0.5 size-1 rounded-full bg-zinc-500/80 shadow-[inset_0_0.5px_1px_rgba(0,0,0,0.6)]" aria-hidden />
          <span className="absolute right-1 top-0.5 size-1 rounded-full bg-zinc-500/80 shadow-[inset_0_0.5px_1px_rgba(0,0,0,0.6)]" aria-hidden />

          <span
            className={cn(
              "size-1.5 rounded-full",
              open ? "animate-pulse bg-emerald-500" : "bg-rose-500"
            )}
            aria-hidden
          />
          <span
            className={cn(
              "font-mono text-[11px] font-extrabold tracking-[0.18em]",
              open ? "text-emerald-700" : "text-rose-700"
            )}
          >
            {open ? "OPEN" : "CLOSED"}
          </span>
        </span>
      </span>
    </button>
  );
}
