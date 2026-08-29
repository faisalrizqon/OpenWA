/** Tes cepat utility kompresi gambar (src/lib/image.ts).
 *  Jalankan: npx tsx scripts/test-compress.ts */
import sharp from "sharp";
import { compressImage, COMPRESS_THRESHOLD } from "../src/lib/image";

async function makeNoiseJpeg(width: number, height: number, quality: number) {
  // Noise acak = kasus terburuk kompresi (paling susah dipadatkan)
  const channels = 3;
  const buf = Buffer.alloc(width * height * channels);
  for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(Math.random() * 256);
  return sharp(buf, { raw: { width, height, channels } })
    .jpeg({ quality })
    .toBuffer();
}

const MB = (n: number) => (n / 1024 / 1024).toFixed(2) + " MB";

async function main() {
  console.log("Threshold kompresi:", MB(COMPRESS_THRESHOLD));

  // Kasus 1: JPEG besar (>3MB) → harus terkompres ≤ 3MB
  const big = await makeNoiseJpeg(4000, 3000, 95);
  console.log("\n[Kasus 1] JPEG besar:", MB(big.length));
  const r1 = await compressImage(big, "image/jpeg");
  console.log("  hasil:", MB(r1.finalSize), "| ext:", r1.ext, "| compressed:", r1.compressed);
  if (r1.finalSize > COMPRESS_THRESHOLD) throw new Error("GAGAL: hasil masih > 3MB");
  if (!r1.compressed) throw new Error("GAGAL: file besar tidak dikompres");

  // Kasus 2: JPEG kecil (≤3MB) → harus untouched
  const small = await makeNoiseJpeg(800, 600, 80);
  console.log("\n[Kasus 2] JPEG kecil:", MB(small.length));
  const r2 = await compressImage(small, "image/jpeg");
  console.log("  hasil:", MB(r2.finalSize), "| compressed:", r2.compressed);
  if (r2.compressed) throw new Error("GAGAL: file kecil ikut dikompres");
  if (!r2.buffer.equals(small)) throw new Error("GAGAL: bytes berubah");

  // Kasus 3: PNG besar (>3MB) tanpa keepPng → konversi ke JPEG
  const bigPng = await sharp(await makeNoiseJpeg(3000, 2500, 95)).png().toBuffer();
  console.log("\n[Kasus 3] PNG besar:", MB(bigPng.length));
  const r3 = await compressImage(bigPng, "image/png");
  console.log("  hasil:", MB(r3.finalSize), "| ext:", r3.ext, "| compressed:", r3.compressed);
  if (r3.finalSize > COMPRESS_THRESHOLD) throw new Error("GAGAL: hasil masih > 3MB");

  // Kasus 4: PNG besar dengan keepPng (QRIS) → tetap PNG
  const r4 = await compressImage(bigPng, "image/png", { keepPng: true });
  console.log("\n[Kasus 4] PNG besar keepPng:", MB(r4.finalSize), "| ext:", r4.ext);
  if (r4.ext !== "png") throw new Error("GAGAL: keepPng tidak dipertahankan");

  // Kasus 5: WebP besar → tetap WebP
  const bigWebp = await sharp(await makeNoiseJpeg(3500, 2600, 95)).webp({ quality: 98 }).toBuffer();
  console.log("\n[Kasus 5] WebP besar:", MB(bigWebp.length));
  const r5 = await compressImage(bigWebp, "image/webp");
  console.log("  hasil:", MB(r5.finalSize), "| ext:", r5.ext);
  if (r5.finalSize > COMPRESS_THRESHOLD) throw new Error("GAGAL: hasil masih > 3MB");
  if (r5.ext !== "webp") throw new Error("GAGAL: webp berubah format");

  console.log("\n✅ SEMUA TES LULUS");
}

main().catch((e) => {
  console.error("\n❌", e.message);
  process.exit(1);
});
