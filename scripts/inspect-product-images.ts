/** Inspeksi jalur gambar semua produk: seed imagePath vs foto unit vs galeri. */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      sku: true,
      imagePath: true,
      units: { select: { id: true, photoPath: true } },
      images: { select: { filePath: true, sortOrder: true } },
    },
    orderBy: { id: "asc" },
  });

  console.log("=== KONDISI GAMBAR PRODUK ===");
  for (const p of products) {
    const unitPhotos = p.units.map((u) => u.photoPath).filter(Boolean);
    const gallery = p.images.map((i) => i.filePath);
    const hasAdminPhoto = unitPhotos.length > 0 || gallery.length > 0;
    console.log(
      `#${p.id} ${p.name} [${p.sku}]` +
        `\n   seed(imagePath): ${p.imagePath ?? "(null)"}` +
        `\n   unitPhotos     : ${unitPhotos.length ? unitPhotos.join(", ") : "-"}` +
        `\n   gallery        : ${gallery.length ? gallery.join(", ") : "-"}` +
        `\n   => fallback riset AKTIF? ${!hasAdminPhoto && p.imagePath ? "YA ⚠️" : "tidak"}`
    );
  }

  // Nilai unik imagePath yang tersimpan di DB
  const rows = await prisma.$queryRawUnsafe<Array<{ imagePath: string; cnt: number }>>(
    `SELECT imagePath, COUNT(*) as cnt FROM Product WHERE imagePath IS NOT NULL GROUP BY imagePath`
  );
  console.log("\n=== NILAI imagePath UNIK DI DB ===");
  for (const r of rows) console.log(`${r.cnt}x → ${r.imagePath}`);

  await prisma.$disconnect();
}

main();
