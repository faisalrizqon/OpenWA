import sharp from "sharp";

/**
 * Ambang kompresi: file di atas 3 MB akan dikompres sampai ≤ 3 MB;
 * file ≤ 3 MB dibiarkan apa adanya (bytes tidak berubah sama sekali).
 */
export const COMPRESS_THRESHOLD = 3 * 1024 * 1024; // 3 MB

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export interface CompressedImage {
  /** Bytes akhir yang siap ditulis ke disk. */
  buffer: Buffer;
  /** Ekstensi file yang harus dipakai (bisa berubah: png -> jpg). */
  ext: string;
  /** MIME type hasil akhir. */
  mime: string;
  /** true jika file melewati pipeline kompresi. */
  compressed: boolean;
  originalSize: number;
  finalSize: number;
}

/** Tangga kualitas encoding — dicoba berurutan sampai hasil ≤ 3 MB. */
const QUALITY_LADDER = [82, 74, 66, 58];

/** Dimensi maksimum sisi terpanjang sebelum di-resize bertahap. */
export const MAX_DIMENSION = 2560;

/** Langkah penyusutan dimensi jika quality ladder belum cukup. */
const RESIZE_FACTOR = 0.85;

/**
 * Kompresi otomatis untuk semua gambar yang diupload ke server:
 *
 * - File ≤ 3 MB  -> dikembalikan apa adanya, tanpa disentuh.
 * - File  > 3 MB -> di-encode ulang dengan sharp (turunkan kualitas
 *   bertahap, lalu resize bertahap) sampai hasilnya ≤ 3 MB.
 *
 * PNG di atas 3 MB: dicoba optimasi lossless dulu; kalau masih besar
 * dikonversi ke JPEG (PNG besar hampir selalu foto/screenshot kamera).
 * Untuk gambar yang wajib tetap PNG dan tajam (mis. QRIS), gunakan
 * opsi `keepPng: true` — hasil lossless tetap dikembalikan walau > 3 MB.
 *
 * Metadata EXIF dibuang (privasi: GPS/kamera pengupload tidak tersimpan).
 */
export async function compressImage(
  buffer: Buffer,
  mime: string,
  opts?: { keepPng?: boolean }
): Promise<CompressedImage> {
  const originalSize = buffer.length;
  const ext = MIME_TO_EXT[mime];

  // File kecil / tidak dikenal: lolos tanpa disentuh.
  if (!ext || originalSize <= COMPRESS_THRESHOLD) {
    return {
      buffer,
      ext: ext ?? "bin",
      mime,
      compressed: false,
      originalSize,
      finalSize: originalSize,
    };
  }

  // ---------- PNG besar ----------
  if (mime === "image/png") {
    const lossless = await sharp(buffer)
      .png({ compressionLevel: 9 })
      .toBuffer();

    if (lossless.length <= COMPRESS_THRESHOLD) {
      return done(lossless, "png", "image/png", originalSize);
    }
    // QRIS dsb. harus tetap PNG tajam — terima hasil lossless walau > 3 MB.
    if (opts?.keepPng) {
      return done(lossless, "png", "image/png", originalSize);
    }
    // Jatuh ke pipeline JPEG (foto berformat PNG biasanya screenshot HP).
    return compressLossy(buffer, "jpeg", originalSize);
  }

  // ---------- JPEG / WebP besar ----------
  const target = mime === "image/webp" ? "webp" : "jpeg";
  return compressLossy(buffer, target, originalSize);
}

/** Encode lossy bertahap: tangga kualitas x tangga resize. */
async function compressLossy(
  buffer: Buffer,
  format: "jpeg" | "webp",
  originalSize: number
): Promise<CompressedImage> {
  const meta = await sharp(buffer).metadata();
  const baseWidth = meta.width ?? MAX_DIMENSION;

  let width: number | undefined =
    baseWidth > MAX_DIMENSION ? MAX_DIMENSION : undefined;
  let best: Buffer | null = null;

  for (const quality of QUALITY_LADDER) {
    // Maks 4 tingkat resize per kualitas (asli, 2560, ~2176, ~1850, ~1572).
    for (let step = 0; step < 4; step++) {
      let pipeline = sharp(buffer).rotate(); // auto-orient EXIF, lalu buang
      if (width) pipeline = pipeline.resize(width);

      const out =
        format === "webp"
          ? await pipeline.webp({ quality }).toBuffer()
          : await pipeline
              .jpeg({ quality, mozjpeg: true, progressive: true })
              .toBuffer();

      if (out.length <= COMPRESS_THRESHOLD) {
        return done(out, format === "webp" ? "webp" : "jpg",
          format === "webp" ? "image/webp" : "image/jpeg", originalSize);
      }
      if (!best || out.length < best.length) best = out;

      width = Math.round((width ?? baseWidth) * RESIZE_FACTOR);
      if (width < 1024) break; // terlalu kecil untuk diperkecil lagi
    }
  }

  // Kasus ekstrem: tetap kembalikan hasil terbaik (lebih kecil dari asli).
  return done(
    best ?? buffer,
    format === "webp" ? "webp" : "jpg",
    format === "webp" ? "image/webp" : "image/jpeg",
    originalSize
  );
}

function done(
  buffer: Buffer,
  ext: string,
  mime: string,
  originalSize: number
): CompressedImage {
  return {
    buffer,
    ext,
    mime,
    compressed: true,
    originalSize,
    finalSize: buffer.length,
  };
}

/**
 * Optimasi untuk file lama yang sudah tersimpan (migration script):
 *
 * - Ukuran > 3 MB ATAU dimensi sisi terpanjang > MAX_DIMENSION
 *   -> di-encode ulang (turun dimensi + kualitas) sampai ≤ 3 MB.
 * - Selain itu -> dikembalikan apa adanya.
 *
 * Berbeda dengan compressImage (upload baru) yang hanya menindak file
 * > 3 MB, fungsi ini juga menormalisasi foto full-res kamera yang
 * ukurannya kecil tapi dimensinya raksasa (mis. 4608x3456, 2.9 MB).
 */
export async function optimizeStoredImage(
  buffer: Buffer,
  mime: string
): Promise<CompressedImage> {
  const originalSize = buffer.length;
  const ext = MIME_TO_EXT[mime];
  if (!ext) {
    return {
      buffer,
      ext: "bin",
      mime,
      compressed: false,
      originalSize,
      finalSize: originalSize,
    };
  }

  const meta = await sharp(buffer).metadata();
  const longestSide = Math.max(meta.width ?? 0, meta.height ?? 0);

  // File kecil tapi dimensi raksasa — tetap proses normalisasi.
  if (originalSize <= COMPRESS_THRESHOLD && longestSide <= MAX_DIMENSION) {
    return {
      buffer,
      ext,
      mime,
      compressed: false,
      originalSize,
      finalSize: originalSize,
    };
  }

  // PNG: lossless + batas dimensi; tidak dikonversi formatnya karena
  // nama/ekstensi file lama sudah dirujuk dari database.
  if (mime === "image/png") {
    let pipeline = sharp(buffer);
    if (longestSide > MAX_DIMENSION) {
      pipeline = pipeline.resize({
        width: meta.width ?? undefined,
        height: meta.height ?? undefined,
        fit: "inside",
        withoutEnlargement: true,
      });
    }
    const out = await pipeline.png({ compressionLevel: 9 }).toBuffer();
    return done(out, "png", "image/png", originalSize);
  }

  return compressLossy(buffer, mime === "image/webp" ? "webp" : "jpeg", originalSize);
}
