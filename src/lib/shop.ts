import { formatRupiah, getTierPrice, type TieredProduct } from "@/lib/pricing";
import { getStoreSettings, getStorefrontContent, type StoreSettings } from "@/lib/content";

export { getStoreSettings };
export type { StoreSettings };

/** Semua data yang dibutuhkan halaman storefront, sekali ambil dari database. */
export async function getStorefrontData() {
  const [settings, content] = await Promise.all([getStoreSettings(), getStorefrontContent()]);
  return { settings, ...content };
}

/** Info bisnis untuk storefront customer — statis agar tetap dipakai layout/payment page */
export const SHOP = {
  name: "MudahSewa",
  tagline: "Sewa Kamera & Digicam Harian",
  whatsapp: "081234567890",
  location: "Weleri, Kendal",
  hours: "Setiap hari · 08.00 – 21.00",
} as const;

/** Konfigurasi QRIS statis (fallback bila Midtrans tidak dikonfigurasi).
 *  Ganti file public/qris.png dengan QRIS toko yang asli. */
export const QRIS = {
  imagePath: process.env.QRIS_IMAGE || "/qris.png",
  merchantName: process.env.QRIS_MERCHANT_NAME || "MudahSewa",
};

/** Testimoni pelanggan (default statis; versi DB ada di model Testimonial). */
export const TESTIMONIALS = [
  {
    name: "Salsa",
    context: "Sewa digicam untuk liburan ke Dieng",
    text: "Prosesnya cepet banget! Chat WA langsung dibales, kameranya bersih dan hasilnya aesthetic. Next time sewa lagi 🥹",
    rating: 5,
  },
  {
    name: "Dimas",
    context: "Konten TikTok untuk acara sekolah",
    text: "Harga pelajar banget, adminnya ramah. Kameranya oke buat konten, baterai awet seharian.",
    rating: 5,
  },
  {
    name: "Alya & teman-teman",
    context: "Sewa tripod + kamera buat foto wisuda",
    text: "Booking online gampang, tinggal pilih tanggal. Pas ambil unit langsung dicek bareng. Recommended!",
    rating: 5,
  },
];

/** Konten video/galeri sosial media (default statis; versi DB ada di model VideoContent). */
export const VIDEO_CONTENT = [
  {
    title: "Review Kodak Pixpro FZ55",
    desc: "Hasil foto digicam viral ini — worth it buat liburan?",
    href: "#",
  },
  {
    title: "Cara Booking di MudahSewa",
    desc: "Tutorial singkat booking online, bayar, sampai ambil unit.",
    href: "#",
  },
  {
    title: "Tips Foto Aesthetic Pakai Digicam",
    desc: "Setting sederhana biar hasil fotomu makin vintage.",
    href: "#",
  },
];

/** Tier harga yang ditampilkan di katalog. */
export const PRICE_TIERS: { key: keyof TieredProduct; label: string; hours: number }[] = [
  { key: "price6h", label: "6 jam", hours: 6 },
  { key: "price12h", label: "12 jam", hours: 12 },
  { key: "price24h", label: "24 jam", hours: 24 },
  { key: "price48h", label: "48 jam", hours: 48 },
];

/** Harga termurah yang tersedia (untuk label "mulai dari"). */
export function lowestPrice(p: TieredProduct): number {
  const candidates = [p.price6h, p.price12h, p.price24h, p.price48h].filter((v) => v > 0);
  if (candidates.length === 0) return 0;
  return Math.min(...candidates);
}

/** Harga per hari untuk perbandingan (24 jam). */
export function dailyPrice(p: TieredProduct): number {
  try {
    return getTierPrice(p, 24);
  } catch {
    return 0;
  }
}

export { waLink } from "@/lib/wa";

/** Pesan WA untuk menanyakan/booking sebuah produk.
 *  Signature lama inquiryMessage(productName, sku) tetap bekerja. */
export function inquiryMessage(storeNameOrProduct: string, productNameOrSku: string, sku?: string): string {
  if (sku !== undefined) {
    return [
      `Halo ${storeNameOrProduct}! 📷`,
      "",
      `Saya mau tanya ketersediaan & sewa:`,
      `*${productNameOrSku}* (${sku})`,
      "",
      `Rencana tanggal pakai: `,
      `Durasi: `,
      "",
      `Terima kasih!`,
    ].join("\n");
  }
  return [
    `Halo ${SHOP.name}! 📷`,
    "",
    `Saya mau tanya ketersediaan & sewa:`,
    `*${storeNameOrProduct}* (${productNameOrSku})`,
    "",
    `Rencana tanggal pakai: `,
    `Durasi: `,
    "",
    `Terima kasih!`,
  ].join("\n");
}

/** Pesan WA umum (tanpa produk spesifik).
 *  Signature lama generalMessage() tetap bekerja. */
export function generalMessage(storeName?: string): string {
  return `Halo ${storeName ?? SHOP.name}! Saya mau tanya-tanya soal sewa kamera 📷`;
}

export { formatRupiah };
