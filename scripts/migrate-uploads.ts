// Migrasi file legacy dari public/uploads/ ke storage/ (external, protected).
// Update juga filePath di database agar menunjuk path baru.
//
// Jalankan: npx tsx scripts/migrate-uploads.ts [--dry-run]
//
// Mapping kategori:
//   public/uploads/ktp/       -> storage/ktp/    (Document.filePath)
//   public/uploads/return/    -> storage/return/ (ReturnPhoto.filePath)
//   public/uploads/payment/   -> storage/proof/  (Payment.proofPath)
//   public/uploads/guarantee/ -> storage/ktp/    (Document.filePath, jaminan order)
import { readdir, stat, rename, copyFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";

const DRY_RUN = process.argv.includes("--dry-run");
const prisma = new PrismaClient();

const PUBLIC_UPLOADS = path.join(process.cwd(), "public", "uploads");
const STORAGE_BASE = path.join(process.cwd(), "storage");

interface Migration {
  from: string;
  to: string;
  table: "document" | "returnPhoto" | "payment";
  oldPath: string;
  newPath: string;
}

const CATEGORY_MAP: {
  legacyDir: string;
  storageDir: string;
  table: "document" | "returnPhoto" | "payment";
}[] = [
  { legacyDir: "ktp", storageDir: "ktp", table: "document" },
  { legacyDir: "return", storageDir: "return", table: "returnPhoto" },
  { legacyDir: "payment", storageDir: "proof", table: "payment" },
  { legacyDir: "guarantee", storageDir: "ktp", table: "document" },
];

async function main() {
  console.log(DRY_RUN ? "=== DRY RUN (tidak ada perubahan) ===\n" : "=== MIGRASI DIMULAI ===\n");

  const migrations: Migration[] = [];

  for (const map of CATEGORY_MAP) {
    const legacyPath = path.join(PUBLIC_UPLOADS, map.legacyDir);
    let files: string[] = [];
    try {
      files = await readdir(legacyPath);
    } catch {
      console.log(`[skip] ${legacyPath} tidak ada`);
      continue;
    }

    for (const file of files) {
      const from = path.join(legacyPath, file);
      const s = await stat(from);
      if (!s.isFile()) continue;

      const to = path.join(STORAGE_BASE, map.storageDir, file);
      const oldDbPath = `/uploads/${map.legacyDir}/${file}`;
      const newDbPath = `/storage/${map.storageDir}/${file}`;

      migrations.push({
        from,
        to,
        table: map.table,
        oldPath: oldDbPath,
        newPath: newDbPath,
      });
    }
  }

  if (migrations.length === 0) {
    console.log("Tidak ada file legacy untuk dimigrasikan.");
    return;
  }

  console.log(`Ditemukan ${migrations.length} file untuk dimigrasikan:\n`);

  let moved = 0;
  let updated = 0;
  let errors = 0;

  for (const m of migrations) {
    console.log(`  ${m.oldPath} -> ${m.newPath}`);
    if (DRY_RUN) continue;

    try {
      await mkdir(path.dirname(m.to), { recursive: true });
      // copy lalu unlink agar aman bila rename gagal lintas device
      await copyFile(m.from, m.to);
      await unlink(m.from);
      moved++;
    } catch (e) {
      console.error(`    ✗ gagal pindahkan file: ${(e as Error).message}`);
      errors++;
      continue;
    }

    try {
      if (m.table === "document") {
        await prisma.document.updateMany({
          where: { filePath: m.oldPath },
          data: { filePath: m.newPath },
        });
      } else if (m.table === "returnPhoto") {
        await prisma.returnPhoto.updateMany({
          where: { filePath: m.oldPath },
          data: { filePath: m.newPath },
        });
      } else if (m.table === "payment") {
        await prisma.payment.updateMany({
          where: { proofPath: m.oldPath },
          data: { proofPath: m.newPath },
        });
      }
      updated++;
    } catch (e) {
      console.error(`    ✗ gagal update DB: ${(e as Error).message}`);
      errors++;
    }
  }

  console.log(
    `\nSelesai: ${moved} file dipindahkan, ${updated} record DB diupdate, ${errors} error.`
  );
  if (DRY_RUN) {
    console.log("\nJalankan tanpa --dry-run untuk apply.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
