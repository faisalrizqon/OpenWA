/** Konfigurasi tema storefront — disimpan permanen di localStorage client. */

export const THEME_STORAGE_KEY = "mudahsewa-theme";
export const HERO_STORAGE_KEY = "mudahsewa-hero";

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

/** Script inline anti-FOUC: jalankan saat HTML di-parse (sebelum paint),
 *  terapkan tema tersimpan (atau default dari database) supaya tidak ada
 *  kedipan tema. */
export function themeInitScript(defaultTheme?: BgVariant): string {
  const fallback = defaultTheme ?? DEFAULT_THEME;
  return (
    `(function(){try{` +
    `if(window.location.pathname.indexOf("/admin")===0)return;` +
    `var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});` +
    `if(${JSON.stringify(THEMES as readonly string[])}.indexOf(t)===-1){t=${JSON.stringify(fallback)};}` +
    `document.body.classList.add("theme-"+t);}}catch(e){}})();`
  );
}
