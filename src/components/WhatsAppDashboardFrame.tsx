"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Deteksi perangkat mobile — di mobile kita hindari Fullscreen API karena
 * browser mobile menampilkan bar sistem "Untuk keluar dari layar penuh..."
 * yang tidak bisa disembunyikan lewat setting maupun kode. */
const isMobile = () =>
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

/**
 * Bingkai dashboard OpenWA dengan tombol maximize/minimize.
 *
 * Mode maximize memakai Fullscreen API pada CONTAINER iframe (bukan seluruh
 * dokumen) + posisi `fixed inset-0` sebagai fallback. Jadi chat mengisi SATU
 * layar penuh dan header/sidebar admin benar-benar hilang dari tampilan — rasa
 * pemakaian seperti WhatsApp di HP. Tombolnya digambar di atas iframe (bukan di
 * dalam dashboard) supaya tetap bisa di-klik saat iframe full-bleed.
 *
 * DI MOBILE: Fullscreen API dilewati (bar sistem browser). Sebagai gantinya
 * layout `fixed inset-0` dipakai, DAN dashboard di dalam iframe ikut memberi
 * tahu lewat postMessage (`openwa-dashboard` / `pseudo-fullscreen`) supaya
 * bingkai iframe melebar sepenuh layar ponsel — tanpa pesan itu, pseudo-
 * fullscreen di dalam iframe hanya menutup kotak iframe, menyisakan latar
 * halaman admin di sekelilingnya.
 *
 * `sandbox` sengaja TIDAK dipasang: dashboard OpenWA login via fragment hash,
 * memutar WebSocket event, dan men-generate QR — sandbox membatasi semuanya
 * dan bikin sesi gagal connect. `allow` hanya menambah clipboard-write seperti
 * versi sebelumnya.
 */
export function WhatsAppDashboardFrame({
  dashboardUrl,
}: {
  dashboardUrl?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHint, setShowHint] = useState(true);

  // Elemen yang sedang fullscreen (kalau ada) — dipakai sinkronisasi state.
  const getFullscreenElement = () => document.fullscreenElement ?? null;

  // Sinkronkan state dengan fullscreen browser — penting karena user bisa
  // keluar pakai ESC / tombol back Android, bukan hanya lewat tombol kita.
  useEffect(() => {
    const handleChange = () => setIsFullscreen(Boolean(getFullscreenElement()));
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  // Hint hanya berguna sebelum user sadar ada tombolnya — sembunyikan sendiri.
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 6_000);
    return () => clearTimeout(timer);
  }, []);

  // Kunci scroll latar belakang saat maximize — berlaku di desktop maupun
  // mobile supaya halaman admin di belakang container tidak ikut scroll
  // (rubber-band) saat chat sedang satu layar penuh.
  useEffect(() => {
    if (!isFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isFullscreen]);

  // Dengarkan dashboard di dalam iframe: saat pseudo-fullscreen aktif atau
  // mati, bingkai iframe di sini ikut melebar/menyempit sepenuh layar.
  // Sengaja TIDAK dibatasi mobile: jendela desktop yang sempit (<768px) juga
  // memakai layout mobile dashboard, dan fallback "Fullscreen API ditolak"
  // di desktop sama-sama butuh container yang melebar — tanpa ini container
  // tetap 700px dan pseudo-fullscreen hanya menutup kotak iframe.
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as { source?: string; type?: string; active?: boolean } | null;
      if (!data || data.source !== "openwa-dashboard" || data.type !== "pseudo-fullscreen") return;
      setIsFullscreen(Boolean(data.active));
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const toggleFullscreen = async () => {
    setShowHint(false);
    const el = containerRef.current;
    if (!el) return;
    // Browser mobile (Chrome/Samsung Internet) menampilkan bar sistem
    // "Untuk keluar dari layar penuh..." setiap kali Fullscreen API dipakai,
    // dan bar itu TIDAK bisa disembunyikan lewat setting maupun kode.
    // Di mobile cukup andalkan layout `fixed inset-0` (pseudo-fullscreen)
    // yang sudah ada — tampilan sama, tanpa bar sistem.
    if (isMobile()) {
      const next = !isFullscreen;
      setIsFullscreen(next);
      // Dashboard di dalam iframe TIDAK tahu tombol ini diklik. Tanpa pesan ini
      // bingkai iframe memang melebar sepenuh layar, tetapi chrome dashboard di
      // dalamnya (header mobile + judul halaman + padding) tetap tampil — jadi
      // "fullscreen" yang terlihat sama saja seperti belum di-maximize.
      const frame = el.querySelector("iframe");
      frame?.contentWindow?.postMessage(
        {
          source: "openwa-parent",
          type: next ? "pseudo-fullscreen-enter" : "pseudo-fullscreen-exit",
        },
        "*"
      );
      return;
    }
    try {
      if (!getFullscreenElement()) {
        // Fullscreen pada CONTAINER, bukan documentElement — supaya header &
        // sidebar admin benar-benar hilang, bukan sekadar tertutup z-index.
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      // iOS Safari menolak Fullscreen API pada elemen non-video. Tetap ubah
      // layout ke `fixed inset-0` supaya chat memenuhi layar tanpa API itu.
      console.warn("Fullscreen API ditolak, pakai fallback layout:", err);
      setIsFullscreen((prev) => !prev);
    }
  };

  // Fallback (tanpa Fullscreen API) tetap butuh posisi fixed; saat API sukses
  // state ikut dari event fullscreenchange di atas.
  const maximized = isFullscreen;

  const frame = (
    <div
      ref={containerRef}
      className={cn(
        // bg-background penting: saat fullscreen, backdrop default browser hitam
        // — warna tema mencegah "kedip hitam" sebelum iframe selesai paint.
        "relative overflow-hidden border border-border bg-background shadow-lg motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-in-out",
        maximized
          ? "fixed inset-0 z-[9999] m-0 h-dvh w-screen rounded-none border-0"
          : "h-[700px] w-full rounded-xl"
      )}
    >
      {/* Tombol maximize/minimize — selalu di atas iframe. Di mobile kendali
          fullscreen diserahkan ke tombol internal dashboard (menempati slot
          kanan baris header, sudah dicenter vertikal, dan mengirim postMessage
          ke induk saat masuk/keluar), sehingga tombol induk hanya tampil dari
          breakpoint md ke atas agar keduanya tidak bertumpuk di pojok sama. */}
      <div className="absolute right-3 top-3 z-[99] max-md:hidden">
        <Button
          size="icon"
          variant="outline"
          onClick={toggleFullscreen}
          title={maximized ? "Perkecil tampilan" : "Perbesar satu layar penuh"}
          aria-label={maximized ? "Perkecil tampilan chat" : "Perbesar tampilan chat satu layar penuh"}
          aria-pressed={maximized}
          className="shadow-md backdrop-blur-sm motion-safe:transition-transform motion-safe:hover:scale-110 motion-safe:active:scale-95"
        >
          {maximized ? (
            <Minimize2 className="size-4" aria-hidden />
          ) : (
            <Maximize2 className="size-4" aria-hidden />
          )}
        </Button>
      </div>
      {dashboardUrl ? (
        <iframe
          src={dashboardUrl}
          className="h-full w-full"
          title="OpenWA Dashboard"
          allow="clipboard-write; fullscreen"
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-muted text-muted-foreground">
          No dashboard URL configured
        </div>
      )}

      {/* Petunjuk singkat, hilang sendiri setelah 6 detik / setelah diklik */}
      {showHint && !maximized && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-[105] -translate-x-1/2 rounded-full bg-card/90 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm max-md:hidden">
          Ketuk ⛶ di kanan atas untuk chat satu layar penuh
        </div>
      )}
    </div>
  );

  // Saat maximize, container dipindah ke document.body via portal: ancestor
  // halaman admin yang punya transform/filter/backdrop-filter (dekorasi tema)
  // membuat `position: fixed` berperilaku seperti absolute terhadap ancestor
  // tersebut — akibatnya chrome admin (pita warna berbeda) tetap terlihat di
  // sekeliling bingkai. Portal menjamin fixed inset-0 relatif terhadap viewport.
  return maximized ? createPortal(frame, document.body) : frame;
}
