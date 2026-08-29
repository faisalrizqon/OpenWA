import { prisma } from "../src/lib/db";
async function main() {
  const order = await prisma.order.findFirst({
    where: { status: "booking", items: { some: { unitId: { not: null } } } },
    include: { items: true }, take: 1, orderBy: { createdAt: "desc" },
  });
  if (!order) { console.log("No booking order with units"); process.exit(0); }
  await prisma.unit.updateMany({
    where: { id: { in: order.items.filter(i => i.unitId).map(i => i.unitId!) } },
    data: { status: "rented" },
  });
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: "active" },
  });
  console.log("Made order", updated.orderNumber, "active:", updated.status);
}
main().finally(() => prisma.$disconnect());
