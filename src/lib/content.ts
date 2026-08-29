import { prisma } from "@/lib/db";

/** Nilai default — dipakai bila baris StoreContent belum dibuat. */
export const DEFAULT_SETTINGS = {
  storeName: "MudahSewa",
  tagline: "Sewa Kamera & Digicam Harian",
  whatsapp: "081234567890",
  location: "Weleri, Kendal",
  hours: "Setiap hari · 08.00 – 21.00",
  theme: "y2k",
  heroVariant: "polaroid",
  heroTitleBefore: "Sewa kamera",
  heroAccent: "impianmu",
  heroTitleAfter: ", tanpa ribet.",
  heroSubtitle:
    "Digicam & kamera pilihan siap dipakai untuk liburan, konten, atau acara spesial. Booking cukup lewat WhatsApp — cepat dan gampang.",
  trustBadge1: "Jaminan KTP / kartu pelajar",
  trustBadge2: "Setiap hari · 08.00 – 21.00",
  trustBadge3: "Dipercaya pelajar Weleri",
  catalogTitle: "Pilih kameramu",
  testimonialTitle: "Kata mereka yang sudah sewa",
  testimonialSubtitle: "Review asli dari pelanggan kami",
  videoTitle: "Video & tutorial",
  videoSubtitle: "Tips, review, dan cara booking di MudahSewa",
  ctaTitle: "Tidak menemukan yang kamu cari?",
  ctaSubtitle:
    "Chat admin kami — kami bantu carikan kamera yang pas dengan kebutuhan & budgetmu.",
  qrisImagePath: "/qris.png",
  qrisMerchantName: "MudahSewa",
  cashEnabled: "true",
  qrisEnabled: "true",
  transferEnabled: "false",
  gopayEnabled: "false",
  transferBankName: "",
  transferAccountNumber: "",
  transferAccountHolder: "",
} as const;
export type StoreSettings = { [K in keyof typeof DEFAULT_SETTINGS]: string };

/** Ambil pengaturan toko (baris id=1). Selalu mengembalikan objek penuh.
 *  Field boolean Prisma dikonversi ke string "true"/"false" agar semua
 *  konsumen (form defaultValue, hidden input, dll.) bertipe seragam. */
export async function getStoreSettings(): Promise<StoreSettings> {
  const row = await prisma.storeContent.findUnique({ where: { id: 1 } });
  if (!row) return { ...DEFAULT_SETTINGS };
  const normalized: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === "boolean") normalized[k] = v ? "true" : "false";
    else if (v != null) normalized[k] = String(v);
  }
  return { ...DEFAULT_SETTINGS, ...normalized };
}

/** Ambil konten yang tampil di halaman depan storefront. */
export async function getStorefrontContent() {
  const [heroImages, perks, testimonials, videos] = await Promise.all([
    prisma.heroImage.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.perk.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.testimonial.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.videoContent.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);
  return { heroImages, perks, testimonials, videos };
}

/** Daftar varian hero yang valid. */
export const HERO_VARIANTS = [
  "polaroid",
  "exif",
  "filmstrip",
  "stamp",
  "flip",
  "grid",
  "sticker",
] as const;

/** Daftar tema background yang valid. */
export const THEMES = ["y2k", "album", "mono", "coquette"] as const;

/** Ikon yang didukung untuk kartu keunggulan (Perk). */
export const PERK_ICONS = [
  "wallet",
  "shield",
  "clock",
  "star",
  "camera",
  "truck",
  "heart",
  "zap",
  "package",
  "badge",
] as const;
