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
 *  - Papan kayu dengan serat kayu multi-lapis + knot kayu + bingkai ukir dalam.
 *  - Tali anyam serat hemp/jute (gradient 3D + twist marks) dengan kait logam.
 *  - Teks serif natural (Instrument Serif) dengan efek terukir.
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
        className="z-20 size-3 rounded-full bg-[radial-gradient(circle_at_35%_30%,#f1f5f9,#94a3b8_45%,#475569_90%)] shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
        aria-hidden
      />

      {/* Kelompok ayun: tali + papan (poros di paku) */}
      <span
        onAnimationEnd={() => setSwinging(false)}
        className={cn(
          "relative -mt-1 flex w-[140px] flex-col items-center",
          swinging ? "animate-sign-swing" : "animate-sign-sway"
        )}
      >
        {/* TALI ANYAM — serat hemp/jute twisted + kait logam */}
        <svg width="140" height="36" viewBox="0 0 140 36" aria-hidden className="block rope-fluid">
          <defs>
            <linearGradient id="ropeShade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e0cda0" />
              <stop offset="50%" stopColor="#c4a76a" />
              <stop offset="100%" stopColor="#8e7544" />
            </linearGradient>
          </defs>
          {/* Tali kiri — cubic bezier catenary (lebih smooth dari quadratic) */}
          <path d="M70,1 C58,10 45,20 26,34" stroke="url(#ropeShade)" strokeWidth="4" fill="none" strokeLinecap="round" />
          {/* Tali kanan — cubic bezier catenary simetris */}
          <path d="M70,1 C82,10 95,20 114,34" stroke="url(#ropeShade)" strokeWidth="4" fill="none" strokeLinecap="round" />
          {/* Highlight 3D — sisi atas tali (kurve sama dengan highlight tipis) */}
          <path d="M70,0.8 C58,9.5 45,19.5 26,33.8" stroke="#f0e0b8" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.55" />
          <path d="M70,0.8 C82,9.5 95,19.5 114,33.8" stroke="#f0e0b8" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.55" />
          {/* Twist marks kiri — mengikuti kelengkungan tali */}
          <g className="flex-group">
            <line x1="62" y1="6" x2="67" y2="9" transform="rotate(-35 64.5 7.5)" className="twist-mark" />
            <line x1="54" y1="12" x2="59" y2="16" transform="rotate(-32 56.5 14)" className="twist-mark" />
            <line x1="46" y1="17" x2="51" y2="21" transform="rotate(-28 48.5 19)" className="twist-mark" />
            <line x1="37" y1="23" x2="42" y2="27" transform="rotate(-22 39.5 25)" className="twist-mark" />
            <line x1="30" y1="28" x2="34" y2="32" transform="rotate(-18 32 30)" className="twist-mark" />
          </g>
          {/* Twist marks kanan — simetris */}
          <g className="flex-group">
            <line x1="78" y1="6" x2="73" y2="9" transform="rotate(35 75.5 7.5)" className="twist-mark" />
            <line x1="86" y1="12" x2="81" y2="16" transform="rotate(32 83.5 14)" className="twist-mark" />
            <line x1="94" y1="17" x2="89" y2="21" transform="rotate(28 91.5 19)" className="twist-mark" />
            <line x1="103" y1="23" x2="98" y2="27" transform="rotate(22 100.5 25)" className="twist-mark" />
            <line x1="110" y1="28" x2="106" y2="32" transform="rotate(18 108 30)" className="twist-mark" />
          </g>
          {/* Mata kait logam di ujung tali */}
          <circle cx="26" cy="34" r="2.5" fill="#a8a29e" stroke="#57534e" strokeWidth="0.6" />
          <circle cx="114" cy="34" r="2.5" fill="#a8a29e" stroke="#57534e" strokeWidth="0.6" />
          <circle cx="26" cy="34" r="0.9" fill="#44403c" />
          <circle cx="114" cy="34" r="0.9" fill="#44403c" />
        </svg>
        {/* Style inline untuk animasi fluid */}
        <style>{`
          @keyframes rope-wiggle {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-0.5px); }
          }
          .rope-fluid {
            animation: rope-wiggle 4s ease-in-out infinite;
            transform-origin: top center;
          }
          .twist-mark {
            transition: all 0.4s ease;
          }
          .flex-group:hover .twist-mark {
            opacity: 0.7;
          }
        `}</style>

        {/* PAPAN KAYU */}
        <span
          className={cn(
            "relative -mt-px flex items-center justify-center gap-1.5 overflow-hidden rounded-lg border-2 px-4 py-2.5",
            "shadow-[0_5px_12px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.3),inset_0_-3px_6px_rgba(0,0,0,0.2)]",
            "border-[#5a3a1e]"
          )}
          style={{
            backgroundImage: open
              ? "radial-gradient(ellipse at 30% 20%, #d4a06e 0%, #b8845a 55%, #9c6e42 100%)"
              : "radial-gradient(ellipse at 30% 20%, #c0905e 0%, #a8744a 55%, #8e5e36 100%)",
          }}
        >
          {/* SERAT KAYU — garis horizontal berulang */}
          <span
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(80,50,20,0.28) 0px, rgba(80,50,20,0.28) 1px, transparent 1px, transparent 5px, rgba(120,80,35,0.18) 5px, rgba(120,80,35,0.18) 6px, transparent 6px, transparent 9px)",
            }}
            aria-hidden
          />
          {/* Serat kayu lengkung halus + knot kayu dengan cincin */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full opacity-50"
            viewBox="0 0 130 30"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path d="M0 4 Q 30 1, 65 4 T 130 3" stroke="#5e3a18" strokeWidth="0.7" fill="none" opacity="0.55" />
            <path d="M0 9 Q 40 6, 70 9 T 130 8" stroke="#704519" strokeWidth="0.6" fill="none" opacity="0.45" />
            <path d="M0 15 Q 35 12, 75 15 T 130 14" stroke="#5e3a18" strokeWidth="0.7" fill="none" opacity="0.55" />
            <path d="M0 21 Q 45 18, 80 21 T 130 20" stroke="#704519" strokeWidth="0.6" fill="none" opacity="0.45" />
            <path d="M0 26 Q 38 23, 72 26 T 130 25" stroke="#5e3a18" strokeWidth="0.6" fill="none" opacity="0.5" />
            {/* Knot kayu kiri dengan cincin konsentrik */}
            <ellipse cx="20" cy="18" rx="3" ry="2" stroke="#4a2e12" strokeWidth="0.7" fill="rgba(74,46,18,0.25)" opacity="0.65" />
            <ellipse cx="20" cy="18" rx="1.8" ry="1.2" stroke="#4a2e12" strokeWidth="0.5" fill="none" opacity="0.55" />
            <ellipse cx="20" cy="18" rx="0.8" ry="0.5" fill="#3a220c" opacity="0.6" />
            {/* Knot kayu kanan */}
            <ellipse cx="108" cy="7" rx="2.5" ry="1.6" stroke="#4a2e12" strokeWidth="0.6" fill="rgba(74,46,18,0.25)" opacity="0.6" />
            <ellipse cx="108" cy="7" rx="1.4" ry="0.9" stroke="#4a2e12" strokeWidth="0.4" fill="none" opacity="0.5" />
            <ellipse cx="108" cy="7" rx="0.6" ry="0.4" fill="#3a220c" opacity="0.55" />
          </svg>

          {/* Overlay warna status (tipis, serat tetap terlihat) */}
          <span
            className={cn(
              "pointer-events-none absolute inset-0",
              open ? "bg-emerald-700/10" : "bg-rose-800/12"
            )}
            aria-hidden
          />

          {/* Bingkai dalam — ukiran tepi kayu */}
          <span
            className="pointer-events-none absolute inset-[3px] rounded-md border border-[#3a220c]/35 shadow-[inset_0_0_3px_rgba(0,0,0,0.25)]"
            aria-hidden
          />

          {/* Isi papan: lampu + teks terukir */}
          <span
            className={cn(
              "relative size-2 rounded-full shadow-inner",
              open ? "animate-pulse bg-emerald-500" : "bg-rose-500"
            )}
            aria-hidden
          />
          <span
            className={cn(
              "relative text-[13px] font-semibold tracking-[0.12em]",
              open ? "text-[#2a4d20]" : "text-[#6a1e1e]"
            )}
            style={{
              fontFamily: "var(--font-instrument), Georgia, serif",
              textShadow:
                "0 1px 0 rgba(255,210,160,0.25), 0 -1px 1px rgba(0,0,0,0.25)",
            }}
          >
            {open ? "OPEN" : "CLOSED"}
          </span>
        </span>
      </span>
    </button>
  );
}
