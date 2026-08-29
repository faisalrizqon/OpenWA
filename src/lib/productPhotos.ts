/**
 * JALUR FOTO PRODUK — SATU aturan untuk semua halaman (landing & katalog detail).
 *
 * FOTO UTAMA diambil dengan prioritas:
 *   1. Foto unit fisik (Unit.photoPath)      → "foto produk" = foto asli barang
 *   2. Galeri upload (ProductImage.filePath) → "preview" = foto sampel/jepretan
 *
 * TIDAK ADA fallback ke gambar riset/seed. Bila belum ada satu pun foto dari
 * admin panel, konsumen menampilkan placeholder ikon kamera.
 *
 * PREVIEW = foto upload admin panel selain foto utama (galeri + unit lain),
 * tampil sebagai kotak-kotak kecil / thumbnail.
 */

export interface PhotoItem {
  src: string;
  alt: string;
  kind: "unit" | "gallery" | "seed";
}

export interface ProductWithPhotos {
  imagePath?: string | null;
  images: { filePath: string }[];
  units: { id: number; photoPath: string | null; serialNumber?: string | null }[];
}

/** Foto utama + preview. Jalur: unit → galeri. Tanpa fallback seed. */
export function productPhotosOf(p: ProductWithPhotos): {
  main: PhotoItem | null;
  previews: PhotoItem[];
} {
  const units: PhotoItem[] = p.units
    .filter((u) => u.photoPath)
    .map((u) => ({
      src: u.photoPath as string,
      alt: `Foto produk ${u.serialNumber ?? `unit #${u.id}`}`,
      kind: "unit",
    }));
  const gallery: PhotoItem[] = p.images.map((img, i) => ({
    src: img.filePath,
    alt: `Preview ${i + 1}`,
    kind: "gallery",
  }));

  const uploaded = [...units, ...gallery];
  if (uploaded.length > 0) {
    return { main: uploaded[0], previews: uploaded.slice(1) };
  }

  // Tidak ada foto dari admin panel → null (konsumen menampilkan placeholder ikon).
  return { main: null, previews: [] };
}
