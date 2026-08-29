/** Recompress semua gambar lama yang sudah terupload (one-off migration).
 *
 *  Aturan sama dengan upload baru:
 *  - File > 3 MB  -> dikompres sampai <= 3 MB (quality ladder + resize).
 *  - File <= 3 MB -> dibiarkan apa adanya, tidak disentuh.
 *  - PNG besar    -> optimasi lossless saja (format TIDAK dikonversi karena
 *                    nama file dirujuk DB; ekstensi harus tetap valid).
 *
 *  Nama file TIDAK pernah berubah (path dirujuk DB: ProductImage.filePath,
 *  Unit.photoPath, StoreContent, Document.filePath, ReturnPhoto.filePath,
 *  Payment.proofPath).
 *
 *  Sinkronisasi metadata DB (fileSize/fileHash) dilakukan untuk:
 *  - storage/ktp    -> Document
 *  - storage/return -> ReturnPhoto
 *  (Payment.proofPath tidak menyimpan metadata; public uploads tanpa metadata.)
 *
 *  Jalankan: npx tsx scripts/recompress-existing.ts
 *  Mode aman: npx tsx scripts/recompress-existing.ts --dry-run
 */
import { mkdir, readdir, readFile, rename, stat, writeFile, unlink } from "fs/promises";
import type { Dirent } from "fs";
import { createHash } from "crypto";
import path from "path";
import { optimizeStoredImage, COMPRESS_THRESHOLD, MAX_DIMENSION } from "../src/lib/image";
import { prisma } from "../src/lib/db";

const IMAGE_EXT_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const ROOT = process.cwd();
const SCAN_DIRS = [
  path.join(ROOT, "public", "uploads"),
  path.join(ROOT, "storage", "ktp"),
  path.join(ROOT, "storage", "return"),
  path.join(ROOT, "storage", "proof"),
];

const dryRun = process.argv.includes("--dry-run");

const stats = {
  scanned: 0,
  compressed: 0,
  skippedSmall: 0,
  errors: 0,
  originalBytes: 0,
  finalBytes: 0,
  dbRowsUpdated: 0,
};

async function walk(dir: string, visit: (fullPath: string) => Promise<void>) {
  let entries: Dirent<string>[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return; // direktori belum ada
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, visit);
    } else if (entry.isFile() && IMAGE_EXT_MIME[path.extname(entry.name).toLowerCase()]) {
      await visit(full);
    }
  }
}

/** Tulis buffer secara atomik: file sementara + rename. */
async function atomicWrite(target: string, buffer: Buffer) {
  const tmp = `${target}.recompress-tmp`;
  await writeFile(tmp, buffer);
  try {
    await rename(tmp, target);
  } catch (e) {
    await unlink(tmp).catch(() => {});
    throw e;
  }
}

/** Perbarui fileSize/fileHash di DB bila file ada di kategori storage ber-metadata. */
async function syncDbMetadata(fullPath: string, buffer: Buffer) {
  const rel = path.relative(ROOT, fullPath).split(path.sep);
  if (rel[0] !== "storage") return; // public uploads tidak punya metadata DB
  const category = rel[1];
  const dbPath = `/storage/${rel.slice(1).join("/")}`;
  const fileSize = buffer.length;
  const fileHash = createHash("sha256").update(buffer).digest("hex");

  if (category === "ktp") {
    const r = await prisma.document.updateMany({ where: { filePath: dbPath }, data: { fileSize, fileHash } });
    stats.dbRowsUpdated += r.count;
  } else if (category === "return") {
    const r = await prisma.returnPhoto.updateMany({ where: { filePath: dbPath }, data: { fileSize, fileHash } });
    stats.dbRowsUpdated += r.count;
  }
  // storage/proof -> Payment hanya simpan proofPath, tidak ada metadata.
}

async function processFile(fullPath: string) {
  const mime = IMAGE_EXT_MIME[path.extname(fullPath).toLowerCase()];
  const size = (await stat(fullPath)).size;
  stats.scanned++;
  stats.originalBytes += size;
  stats.finalBytes += size;

  const label = path.relative(ROOT, fullPath);
  try {
    const buffer = await readFile(fullPath);
    // optimizeStoredImage menindak file > 3 MB DAN file berdimensi raksasa
    // (foto full-res kamera yang ukurannya kecil tapi resolusinya besar).
    // Nama/ekstensi file tidak pernah berubah (dirujuk DB).
    const result = await optimizeStoredImage(buffer, mime);

    if (!result.compressed) {
      stats.skippedSmall++;
      console.log(`  [SKIP] ${label} — ${(size / 1024).toFixed(0)} KB (<= 3 MB & dimensi wajar, tidak disentuh)`);
      return;
    }

    const pct = Math.round(((size - result.finalSize) / size) * 100);
    console.log(
      `  [OK  ] ${label}: ${(size / 1024).toFixed(0)} KB -> ${(result.finalSize / 1024).toFixed(0)} KB (-${Math.max(pct, 0)}%)`
    );

    if (!dryRun) {
      await atomicWrite(fullPath, result.buffer);
      await syncDbMetadata(fullPath, result.buffer);
    } else {
      console.log(`         (dry-run: file tidak diubah)`);
    }

    stats.compressed++;
    stats.finalBytes = stats.finalBytes - size + result.finalSize;
  } catch (e) {
    stats.errors++;
    console.error(`  [ERR ] ${label}: ${(e as Error).message}`);
  }
}

function fmt(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
  console.log(dryRun ? "🔍 DRY RUN — tidak ada file yang diubah.\n" : "🔧 Recompress gambar lama...\n");
  await mkdir(path.join(ROOT, "storage"), { recursive: true });

  for (const dir of SCAN_DIRS) {
    console.log(`📁 ${path.relative(ROOT, dir) || "."}`);
    await walk(dir, processFile);
  }

  const saved = stats.originalBytes - stats.finalBytes;
  const savedPct = stats.originalBytes > 0 ? Math.round((saved / stats.originalBytes) * 100) : 0;
  console.log("\n" + "=".repeat(60));
  console.log(`File dipindai:        ${stats.scanned}`);
  console.log(`Dikompres (> 3 MB):   ${stats.compressed}`);
  console.log(`Dibiarkan (<= 3 MB):  ${stats.skippedSmall}`);
  console.log(`Error:                ${stats.errors}`);
  console.log(`Baris DB disinkron:   ${stats.dbRowsUpdated}`);
  console.log(`Ukuran sebelum:       ${fmt(stats.originalBytes)}`);
  console.log(`Ukuran sesudah:       ${fmt(stats.finalBytes)}`);
  console.log(`Hemat:                ${fmt(saved)} (${savedPct}%)`);
  console.log("=".repeat(60));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("❌ Fatal:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
