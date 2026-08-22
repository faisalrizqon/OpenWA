import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Harga dalam rupiah (pricelist pemilik, angka asli × 1000)
const PRODUCTS = [
  { sku: "CAM-001", name: "Kodak Pixpro FZ55", price6h: 30000, price12h: 50000, price24h: 75000, price48h: 115000 },
  { sku: "CAM-002", name: "Canon Ixus", price6h: 25000, price12h: 40000, price24h: 55000, price48h: 100000 },
  { sku: "CAM-003", name: "Sony Cybershot DSC W810", price6h: 30000, price12h: 45000, price24h: 65000, price48h: 110000 },
  { sku: "CAM-004", name: "Canon PowerShot A4000 IS", price6h: 30000, price12h: 50000, price24h: 75000, price48h: 115000 },
];

async function main() {
  // Kategori Digicam
  const digicam = await prisma.category.upsert({
    where: { name: "Digicam" },
    update: {},
    create: { name: "Digicam", description: "Kamera digital compact retro untuk disewa" },
  });

  for (const p of PRODUCTS) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name,
        price6h: p.price6h,
        price12h: p.price12h,
        price24h: p.price24h,
        price48h: p.price48h,
      },
      create: {
        sku: p.sku,
        name: p.name,
        categoryId: digicam.id,
        price6h: p.price6h,
        price12h: p.price12h,
        price24h: p.price24h,
        price48h: p.price48h,
        stockThreshold: 1,
      },
    });

    // 1 unit fisik per produk (cek dulu biar seed ulang tidak duplikat)
    const existingUnit = await prisma.unit.findFirst({ where: { productId: product.id } });
    if (!existingUnit) {
      await prisma.unit.create({
        data: { productId: product.id, condition: "Bagus", status: "available" },
      });
    }
  }

  // Customer demo
  await prisma.customer.upsert({
    where: { phone: "081234567890" },
    update: {},
    create: {
      name: "Budi Demo",
      phone: "081234567890",
      address: "Jl. Contoh No. 1, Yogyakarta",
      notes: "Customer demo dari seed",
    },
  });

  const counts = {
    kategori: await prisma.category.count(),
    produk: await prisma.product.count(),
    unit: await prisma.unit.count(),
    customer: await prisma.customer.count(),
  };
  console.log("Seed selesai:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
