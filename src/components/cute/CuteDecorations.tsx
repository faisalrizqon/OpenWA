import { cn } from "@/lib/utils";

/**
 * Dekorasi "cute" untuk landing page.
 *
 * Semua komponen di bawah dirender server-side SELALU ada di DOM, tetapi
 * visibility-nya di-gate oleh CSS: default `display:none`, baru muncul saat
 * `html.theme-coquette` aktif (lihat globals.css → "Theme-GATED Coquette
 * Enhancements"). Dengan begitu tidak ada hydration mismatch dan dekorasi
 * otomatis ikut theme-switcher (y2k/album/mono tidak terpengaruh).
 */

// Sakura petals falling animation - no static emoji needed

/** Jumlah kelopak sakura yang berjatuhan. */
const PETAL_COUNT = 24;

/**
 * Kelopak sakura (SVG) berjatuhan dari atas — hanya tampil di theme coquette.
 *
 * Bentuk kelopak memakai path SVG asli (ada notch/lekukan khas sakura), diisi
 * gradient pink. Posisi horizontal, ukuran, durasi, delay & jarak ayun dibuat
 * deterministik dari index (bukan Math.random) supaya hasil render server &
 * client identik → tidak ada hydration mismatch.
 */
export function CuteBackground() {
  // 24 kelopak dengan posisi & animasi berbeda (deterministik = server/client sama)
  const petals = Array.from({ length: 24 }, (_, i) => ({
    left: (i * 41) % 100,
    size: 16 + ((i * 11) % 10), // 16–25px
    duration: 12 + ((i * 7) % 8), // 12–19s
    delay: -(i * 6) % 20, // mulai tersebar (negative delay)
    sway: 20 + ((i * 19) % 60), // ayun kiri-kanan 20–79px
  }));

  return (
    <div className="sakura-field" aria-hidden>
      {petals.map((p, i) => (
        <svg
          key={i}
          className="sakura-petal"
          viewBox="0 0 20 24"
          width={p.size}
          height={p.size * 1.2}
          style={{
            left: `${p.left}%`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            '--sway': `${p.sway}px`,
          } as React.CSSProperties}
        >
          <defs>
            <linearGradient id={`sakura-${i}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffeef8" /> {/* pale pink top */}
              <stop offset="50%" stopColor="#ffb6e0" /> {/* medium pink */}
              <stop offset="100%" stopColor="#ff93d2" /> {/* warm pink bottom */}
            </linearGradient>
          </defs>
          {/* Kelopak sakura 5 kelop dengan notch di tiap ujung */}
          <path
            d="M12.0 10.5 Q17.0 6.5 16.0 2.0 L12.0 4.2 L8.0 2.0 Q7.0 6.5 12.0 10.5 Z M13.43 11.54 Q18.78 15.06 22.75 12.71 L19.42 9.59 L20.27 5.11 Q15.69 5.55 13.43 11.54 Z M12.88 13.21 Q11.19 19.39 14.64 22.44 L16.58 18.31 L21.11 17.74 Q19.28 13.51 12.88 13.21 Z M11.12 13.21 Q4.72 13.51 2.89 17.74 L7.42 18.31 L9.36 22.44 Q12.81 19.39 11.12 13.21 Z M10.57 11.54 Q8.31 5.55 3.73 5.11 L4.58 9.59 L1.25 12.71 Q5.22 15.06 10.57 11.54 Z"
            fill={`url(#sakura-${i})`}
          />
        </svg>
      ))}
    </div>
  );
}

/** Pembatas section dengan emoji berdenyut di tengah garis gradasi. */
export function CuteDivider({
  emoji = "🎀",
  className,
}: {
  emoji?: string;
  className?: string;
}) {
  return (
    <div className={cn("cute-divider", className)} aria-hidden>
      <span>{emoji}</span>
    </div>
  );
}

/** Papan pengumuman berjalan (marquee) dengan pesan-pesan lucu. */
export function CuteMarquee({
  items,
  className,
}: {
  items?: string[];
  className?: string;
}) {
  const messages =
    items && items.length > 0
      ? items
      : [
          "✨ Gratis antar area Weleri",
          "💖 Booking via WhatsApp, gampang banget",
          "🎀 Kamera & digicam kece siap sewa",
          "🌸 Harga pelajar friendly",
        ];

  // Digandakan agar loop marquee mulus (translateX -50%).
  const loop = [...messages, ...messages];

  return (
    <div className={cn("cute-marquee", className)} aria-hidden>
      <div className="marquee-content">
        {loop.map((m, i) => (
          <span key={`${m}-${i}`}>
            <span className="sparkle">✦</span>
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}
