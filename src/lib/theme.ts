/** Konfigurasi tema storefront — disimpan permanen di localStorage client. */

export const THEME_STORAGE_KEY = "mudahsewa-theme";
export const HERO_STORAGE_KEY = "mudahsewa-hero";

/** Event name yang dipancarkan saat tema berganti (untuk sync antar komponen). */
export const THEME_CHANGE_EVENT = "mudahsewa-theme-change";

export const THEMES = ["y2k", "album", "mono", "coquette"] as const;
export type BgVariant = (typeof THEMES)[number];

export const DEFAULT_THEME: BgVariant = "y2k";

export function isValidTheme(value: string | null | undefined): value is BgVariant {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

export function themeClass(theme: BgVariant): string {
  return `theme-${theme}`;
}

export const ALL_THEME_CLASSES: string[] = THEMES.map(themeClass);

/** Pilih tema background — simpan ke localStorage + umumkan change event. */
export function selectTheme(theme: BgVariant) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* private mode — abaikan */
  }
  window.dispatchEvent(new CustomEvent<BgVariant>(THEME_CHANGE_EVENT, { detail: theme }));
}

/** Script inline anti-FOUC: jalankan saat HTML di-parse (sebelum paint),
 *  terapkan tema tersimpan (atau default dari database) supaya tidak ada
/** Script inline anti-FOUC: jalankan saat HTML di-parse (sebelum paint),
 *  terapkan tema tersimpan (atau default dari database) supaya tidak ada
 *  kedipan tema. Target `documentElement` agar aman dijalankan dari <head>
 *  (document.body belum ada saat itu). */
export function themeInitScript(defaultTheme?: BgVariant): string {
  const fallback = defaultTheme ?? DEFAULT_THEME;
  return (
    `(function(){try{` +
    `if(window.location.pathname.indexOf("/admin")===0)return;` +
    `var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});` +
    `if(${JSON.stringify(THEMES as readonly string[])}.indexOf(t)===-1){t=${JSON.stringify(fallback)};}` +
    `document.documentElement.classList.add("theme-"+t);}}catch(e){}})();`
  );
}
