import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";

async function main() {
  const adminPass = await bcrypt.hash(process.env.SEED_ADMIN_PASS ?? "admin123", 10);
  const mitraPass = await bcrypt.hash(process.env.SEED_MITRA_PASS ?? "mitra123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@mudahsewa.id" },
    update: { passwordHash: adminPass, role: "admin", active: true },
    create: {
      name: "Admin Pemilik",
      email: "admin@mudahsewa.id",
      passwordHash: adminPass,
      role: "admin",
    },
  });

  const mitra = await prisma.user.upsert({
    where: { email: "mitra@mudahsewa.id" },
    update: { passwordHash: mitraPass, role: "mitra", active: true },
    create: {
      name: "Mitra Demo",
      email: "mitra@mudahsewa.id",
      passwordHash: mitraPass,
      role: "mitra",
    },
  });

  console.log("Seeded users:");
  console.log(`  admin → ${admin.email} / ${process.env.SEED_ADMIN_PASS ?? "admin123"}`);
  console.log(`  mitra → ${mitra.email} / ${process.env.SEED_MITRA_PASS ?? "mitra123"}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
