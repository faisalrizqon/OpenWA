/** Set Product.imagePath = NULL untuk semua produk.
 *
 *  imagePath dulunya diisi seed "gambar riset" (/images/products/*.jpg).
 *  Kini gambar produk sepenuhnya dari foto unit (Unit.photoPath) dan galeri
 *  (ProductImage.filePath) yang diupload lewat admin panel.
 *
 *  Jalankan: npx tsx prisma/clear-seed-images.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.product.updateMany({
    where: { NOT: { imagePath: null } },
    data: { imagePath: null },
  });
  console.log(`Mengosongkan imagePath pada ${result.count} produk.`);

  const remaining = await prisma.product.count({
    where: { NOT: { imagePath: null } },
  });
  console.log(`Sisa produk dengan imagePath: ${remaining}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
