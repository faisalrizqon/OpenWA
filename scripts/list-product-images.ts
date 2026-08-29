import { prisma } from "../src/lib/db";

const imgs = await prisma.productImage.findMany({ 
  orderBy: [{productId:'asc'},{sortOrder:'asc'}] 
});

console.log('Total ProductImage di DB:', imgs.length);
for (const img of imgs) {
  console.log(img.productId, img.filePath);
}

await prisma.$disconnect();
