import { formatRupiah, getTierPrice, type TieredProduct } from "@/lib/pricing";

/** Info bisnis untuk storefront customer. */
export const SHOP = {
  name: "MudahSewa",
  tagline: "Sewa Kamera & Digicam Harian",
  /** Nomor WhatsApp admin (format 08xx). Ganti sesuai nomor asli. */
  whatsapp: "081234567890",
  location: "Weleri, Kendal",
  hours: "Setiap hari · 08.00 – 21.00",
} as const;

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

export function waLink(text: string): string {
  return `https://wa.me/62${SHOP.whatsapp.replace(/^0/, "")}?text=${encodeURIComponent(text)}`;
}

/** Pesan WA untuk menanyakan/booking sebuah produk. */
export function inquiryMessage(productName: string, sku: string): string {
  return [
    `Halo ${SHOP.name}! 📷`,
    "",
    `Saya mau tanya ketersediaan & sewa:`,
    `*${productName}* (${sku})`,
    "",
    `Rencana tanggal pakai: `,
    `Durasi: `,
    "",
    `Terima kasih!`,
  ].join("\n");
}

/** Pesan WA umum (tanpa produk spesifik). */
export function generalMessage(): string {
  return `Halo ${SHOP.name}! Saya mau tanya-tanya soal sewa kamera 📷`;
}

export { formatRupiah };
