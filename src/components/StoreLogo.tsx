import { Camera } from "lucide-react";

/**
 * Logo toko terpusat — satu sumber kebenaran untuk identitas visual.
 * Semua permukaan (tab browser via metadata, sidebar admin/portal, header &
 * footer storefront, halaman login) merender komponen/field yang sama,
 * sehingga ganti logo sekali di Admin > Konten > Identitas Toko langsung
 * tersinkron ke seluruh aplikasi.
 *
 * Komponen ini murni presentasional (client-safe): data logo di-pass sebagai
 * props dari server component/layout yang membaca `getStoreSettings()`.
 */
export function StoreLogo({
  logoPath,
  storeName,
  className = "size-9",
  rounded = "rounded-xl",
  iconClassName = "size-5",
}: {
  logoPath?: string | null;
  storeName?: string | null;
  /** Kelas ukuran kotak logo, mis. "size-9" / "size-10" */
  className?: string;
  /** Kelas bentuk sudut kotak logo */
  rounded?: string;
  /** Kelas ukuran ikon fallback (kamera) */
  iconClassName?: string;
}) {
  if (logoPath) {
    return (
      <span
        className={`flex ${className} shrink-0 items-center justify-center overflow-hidden ${rounded} border border-border/60 bg-card shadow-sm`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoPath} alt={`Logo ${storeName ?? "toko"}`} className="size-full object-contain" />
      </span>
    );
  }
  return (
    <span
      className={`flex ${className} shrink-0 items-center justify-center ${rounded} bg-primary text-primary-foreground shadow-sm`}
    >
      <Camera className={iconClassName} aria-hidden />
    </span>
  );
}
