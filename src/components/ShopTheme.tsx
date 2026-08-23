"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { VariantSwitcher } from "@/components/VariantSwitcher";
import {
  ALL_THEME_CLASSES,
  DEFAULT_THEME,
  HERO_STORAGE_KEY,
  THEME_STORAGE_KEY,
  isValidTheme,
  themeClass,
  type BgVariant,
} from "@/lib/theme";

export const HERO_VARIANTS = [
  "polaroid",
  "exif",
  "filmstrip",
  "stamp",
  "flip",
  "grid",
  "sticker",
] as const;

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode / storage penuh — abaikan */
  }
}

function isValidHero(v: string | null | undefined): v is string {
  return typeof v === "string" && (HERO_VARIANTS as readonly string[]).includes(v);
}

/** Terapkan & persist tema + varian hero.
 *
 *  Tema background: URL ?bg= (sekali, untuk link share) > localStorage > default.
 *  Setelah dipilih, tema disimpan permanen di localStorage — tetap berlaku di
 *  tab/halaman mana pun sampai user menggantinya lagi.
 *
 *  Hero section: dirender server dari ?hero=, jadi kalau URL tidak membawa
 *  hero tapi ada pilihan tersimpan, URL dilengkapi otomatis (router.replace)
 *  supaya server merender varian yang benar. */
function ShopThemeInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlBg = searchParams.get("bg");
  const urlHero = searchParams.get("hero");

  const [theme, setThemeState] = useState<BgVariant>(() =>
    isValidTheme(urlBg) ? urlBg : DEFAULT_THEME
  );
  const [hero, setHero] = useState<string>(() => (isValidHero(urlHero) ? urlHero : "polaroid"));

  // Apply kelas tema ke body (idempoten dengan script anti-FOUC di layout).
  // Cleanup: lepas tema saat keluar dari area shop supaya halaman admin
  // tetap memakai tema default.
  useEffect(() => {
    document.body.classList.remove(...ALL_THEME_CLASSES);
    document.body.classList.add(themeClass(theme));
    return () => {
      document.body.classList.remove(...ALL_THEME_CLASSES);
    };
  }, [theme]);

  // Inisialisasi: prioritas URL ?bg= > localStorage > default.
  // Simpan pilihan dari URL supaya kunjungan berikutnya permanen.
  useEffect(() => {
    const stored = readStored(THEME_STORAGE_KEY);
    let next: BgVariant;
    if (isValidTheme(urlBg)) {
      next = urlBg;
      writeStored(THEME_STORAGE_KEY, next);
    } else if (isValidTheme(stored)) {
      next = stored;
    } else {
      next = DEFAULT_THEME;
    }
    setThemeState(next);
  }, [urlBg]);

  // Hero: simpan pilihan dari URL; bila URL tanpa hero tapi ada simpanan,
  // lengkapi URL (replace, tanpa riwayat baru) agar server merender sesuai.
  useEffect(() => {
    const storedHero = readStored(HERO_STORAGE_KEY);
    if (isValidHero(urlHero)) {
      setHero(urlHero);
      writeStored(HERO_STORAGE_KEY, urlHero);
    } else if (isValidHero(storedHero)) {
      setHero(storedHero);
      const params = new URLSearchParams(searchParams.toString());
      params.set("hero", storedHero);
      router.replace(`${pathname}?${params.toString()}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlHero]);

  /** Dipanggil switcher saat user memilih tema — langsung permanen. */
  const selectTheme = useCallback((t: BgVariant) => {
    setThemeState(t);
    writeStored(THEME_STORAGE_KEY, t);
    document.body.classList.remove(...ALL_THEME_CLASSES);
    document.body.classList.add(themeClass(t));
  }, []);

  /** Dipanggil switcher saat memilih hero — persist + update URL. */
  const selectHero = useCallback(
    (h: string) => {
      setHero(h);
      writeStored(HERO_STORAGE_KEY, h);
      const params = new URLSearchParams(searchParams.toString());
      params.set("hero", h);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  return (
    <VariantSwitcher
      theme={theme}
      hero={hero}
      onSelectTheme={selectTheme}
      onSelectHero={selectHero}
    />
  );
}

export function ShopTheme() {
  return (
    <Suspense fallback={null}>
      <ShopThemeInner />
    </Suspense>
  );
}
