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
 *  - SATU tali anyam tengah (serat hemp/jute, gradient 3D + twist marks + ring logam).
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
        className="z-20 size-3 rounded-full bg-[radial-gradient(circle_at_35%_30%,#f1f5f9,#94a3b8_45%,#475569_90%)]"
        aria-hidden
      />

      <span
        onAnimationEnd={() => setSwinging(false)}
        className={cn(
          "relative -mt-1 flex w-[200px] flex-col items-center will-change-transform",
          swinging ? "animate-sign-swing" : "animate-sign-sway"
        )}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* SATU TALI TENGAH — serat hemp/jute twisted + ring logam penghubung */}
        <svg width="24" height="38" viewBox="0 0 24 38" aria-hidden className="block rope-fluid">
          <defs>
            <linearGradient id="ropeShade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8e7544" />
              <stop offset="45%" stopColor="#e0cda0" />
              <stop offset="100%" stopColor="#8e7544" />
            </linearGradient>
          </defs>
          {/* Tali utama — vertikal dengan sedikit lengkung S natural */}
          <path d="M12,1 Q10,12 12,20 Q14,27 12,33" stroke="url(#ropeShade)" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          {/* Highlight 3D — sisi kiri tali */}
          <path d="M11,1 Q9,12 11,20 Q13,27 11,33" stroke="#f0e0b8" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.5" />
          {/* Twist marks — serat anyaman melintang */}
          <g className="flex-group" stroke="#6e5a2e" strokeWidth="0.9" strokeLinecap="round" opacity="0.5">
            <line x1="9.5" y1="6" x2="14.5" y2="5" />
            <line x1="9.5" y1="11" x2="14.5" y2="10" />
            <line x1="9.5" y1="16" x2="14.5" y2="15" />
            <line x1="9.5" y1="21" x2="14.5" y2="20" />
            <line x1="9.5" y1="26" x2="14.5" y2="25" />
          </g>
          {/* Ring logam penghubung tali ke papan */}
          <circle cx="12" cy="34" r="3" fill="none" stroke="#57534e" strokeWidth="1.4" />
          <circle cx="12" cy="34" r="3" fill="none" stroke="#a8a29e" strokeWidth="0.8" />
        </svg>
        <style>{`
          @keyframes rope-wiggle {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-0.5px); }
          }
          .rope-fluid {
            animation: rope-wiggle 4s ease-in-out infinite;
            transform-origin: top center;
            backface-visibility: hidden;
          }
          .twist-mark {
            transition: all 0.4s ease;
          }
          .flex-group:hover .twist-mark {
            opacity: 0.7;
          }
        `}</style>

        {/* PAPAN KAYU — rounded tipis; overflow-hidden wajib agar overlay serat
            ter-clip mengikuti radius sudut (tanpa ini, sudut overlay "menonjol"
            keluar dari radius dan terlihat seperti shadow di ujung papan). */}
        <span
          className="relative -mt-1 flex w-[200px] items-center justify-center gap-2 overflow-hidden rounded-md px-5 py-3"
          style={{
            transform: "rotate(-2deg)",
            transformOrigin: "50% 0%",
            transformStyle: "preserve-3d",
            willChange: "transform",
            boxShadow: "none",
            backgroundImage: open
              ? "radial-gradient(ellipse at 30% 20%, #d4a06e 0%, #c0905e 70%, #b08050 100%)"
              : "radial-gradient(ellipse at 30% 20%, #c0905e 0%, #a87850 70%, #986840 100%)",
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
              open ? "bg-emerald-700/8" : "bg-rose-800/10"
            )}
            aria-hidden
          />
          {/* Bingkai dalam — ukiran tepi kayu, radius mengikuti papan */}
          <span
            className="pointer-events-none absolute inset-[3px] rounded-[3px] border border-[#3a220c]/20"
            aria-hidden
          />

          {/* BAUT di keempat sudut papan */}
          {(
            [
              { left: "9px", top: "9px" },
              { right: "9px", top: "9px" },
              { left: "9px", bottom: "9px" },
              { right: "9px", bottom: "9px" },
            ] as const
          ).map((pos, i) => (
            <span
              key={i}
              className="pointer-events-none absolute z-10"
              style={{ ...pos, width: 8, height: 8 }}
              aria-hidden
            >
              <svg viewBox="0 0 8 8" className="h-full w-full">
                <defs>
                  <radialGradient id={`screwhead-${i}`} cx="35%" cy="30%" r="85%">
                    <stop offset="0%" stopColor="#eceef0" />
                    <stop offset="45%" stopColor="#9aa0a8" />
                    <stop offset="100%" stopColor="#6b7280" />
                  </radialGradient>
                </defs>
                <circle cx="4" cy="4" r="3.4" fill={`url(#screwhead-${i})`} stroke="#4b5563" strokeWidth="0.6" />
                <path
                  d="M2 4 H6"
                  stroke="#374151"
                  strokeWidth="1"
                  strokeLinecap="round"
                  transform={`rotate(${i * 33 + 15} 4 4)`}
                />
              </svg>
            </span>
          ))}
          <span
            className="relative size-2.5 rounded-full bg-white"
            aria-hidden
          />
          <span
            className="relative pl-[0.3em] text-[16px] tracking-[0.3em] text-white"
            style={{
              fontFamily: "var(--font-spray), var(--font-instrument), Georgia, serif",
            }}
          >
            {open ? "OPEN" : "CLOSED"}
          </span>
        </span>
      </span>
    </button>
  );
}
