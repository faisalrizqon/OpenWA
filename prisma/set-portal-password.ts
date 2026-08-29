import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const phone = process.argv[2] ?? "081234567890";
  const password = process.argv[3] ?? "test1234";

  let customer = await prisma.customer.findFirst({ where: { phone } });
  if (!customer) {
    console.log(`Customer ${phone} tidak ditemukan — buat dummy untuk demo.`);
    customer = await prisma.customer.create({
      data: { name: "Demo Customer", phone },
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.customer.update({
    where: { id: customer.id },
    data: { passwordHash },
  });

  console.log(
    `Password portal di-set untuk: ${customer.name} (${customer.phone})`
  );
  console.log(`Login di /portal/login → phone: ${phone}, password: ${password}`);
}

main().finally(() => prisma.$disconnect());
