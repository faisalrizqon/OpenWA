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
 *  - Papan kayu dengan serat kayu jelas + bingkai dalam.
 *  - Tali anyam putih dari paku tengah ke sudut atas papan.
 *  - Status mengikuti jam operasional otomatis (dicek tiap menit).
 *  - Diklik -> berayun besar bolak-balik, lalu kembali tenang;
 *    status selalu kembali ke kondisi asli sesuai jam. */
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
          {/* Tali kiri */}
          <line x1="65" y1="0" x2="22" y2="32" stroke="#fafaf9" strokeWidth="2.6" strokeLinecap="round" />
          <line x1="65" y1="0" x2="22" y2="32" stroke="#d6d3d1" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="4 3" strokeDashoffset="2" />
          {/* Tali kanan */}
          <line x1="65" y1="0" x2="108" y2="32" stroke="#fafaf9" strokeWidth="2.6" strokeLinecap="round" />
          <line x1="65" y1="0" x2="108" y2="32" stroke="#d6d3d1" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="4 3" strokeDashoffset="2" />
          {/* Mata kait logam di ujung tali */}
          <circle cx="22" cy="32" r="2.2" fill="#a8a29e" stroke="#78716c" strokeWidth="0.5" />
          <circle cx="108" cy="32" r="2.2" fill="#a8a29e" stroke="#78716c" strokeWidth="0.5" />
        </svg>

        {/* PAPAN KAYU */}
        <span
          className={cn(
            "relative -mt-px flex items-center justify-center gap-1.5 overflow-hidden rounded-lg border-2 px-4 py-2",
            "shadow-[0_4px_10px_rgba(0,0,0,0.25),inset_0_1px_2px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.12)]",
            open
              ? "border-amber-900/40 bg-[#deb887]"
              : "border-amber-900/40 bg-[#d2a679]"
          )}
        >
          {/* SERAT KAYU — garis horizontal coklat jelas */}
          <span
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(101,67,33,0.35) 0px, rgba(101,67,33,0.35) 1.5px, transparent 1.5px, transparent 6px, rgba(139,90,43,0.25) 6px, rgba(139,90,43,0.25) 7px, transparent 7px, transparent 11px)",
            }}
            aria-hidden
          />
          {/* Serat kayu lengkung halus */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
            viewBox="0 0 130 30"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path d="M0 6 Q 40 3, 70 6 T 130 5" stroke="#8b5a2b" strokeWidth="0.8" fill="none" />
            <path d="M0 13 Q 50 10, 85 13 T 130 12" stroke="#6d4426" strokeWidth="0.7" fill="none" />
            <path d="M0 20 Q 35 17, 75 20 T 130 19" stroke="#8b5a2b" strokeWidth="0.8" fill="none" />
            <path d="M0 26 Q 55 23, 90 26 T 130 25" stroke="#6d4426" strokeWidth="0.6" fill="none" />
            {/* Mata kayu kecil */}
            <ellipse cx="18" cy="22" rx="2.2" ry="1.3" stroke="#6d4426" strokeWidth="0.7" fill="none" />
            <ellipse cx="112" cy="8" rx="1.8" ry="1.1" stroke="#6d4426" strokeWidth="0.6" fill="none" />
          </svg>

          {/* Overlay warna status (tipis, serat tetap terlihat) */}
          <span
            className={cn(
              "pointer-events-none absolute inset-0",
              open ? "bg-emerald-600/15" : "bg-rose-600/20"
            )}
            aria-hidden
          />

          {/* Bingkai dalam */}
          <span
            className="pointer-events-none absolute inset-[3px] rounded-md border border-amber-900/25 shadow-inner"
            aria-hidden
          />

          {/* Isi papan: lampu + teks di atas lapisan serat */}
          <span
            className={cn(
              "relative size-2 rounded-full shadow-inner",
              open ? "animate-pulse bg-emerald-500" : "bg-rose-500"
            )}
            aria-hidden
          />
          <span
            className={cn(
              "relative font-mono text-xs font-extrabold tracking-[0.2em] drop-shadow-[0_1px_0_rgba(255,255,255,0.4)]",
              open ? "text-emerald-950" : "text-rose-950"
            )}
          >
            {open ? "OPEN" : "CLOSED"}
          </span>
        </span>
      </span>
    </button>
  );
}
