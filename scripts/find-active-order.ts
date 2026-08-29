import { prisma } from "../src/lib/db";
async function main() {
  const orders = await prisma.order.findMany({
    select: { id: true, orderNumber: true, status: true, items: { select: { unitId: true, quantity: true } } },
    orderBy: { createdAt: "desc" }, take: 10,
  });
  console.log(JSON.stringify(orders.map(o => ({ id: o.id, n: o.orderNumber, s: o.status, unitAssigned: o.items.some(i => i.unitId != null) })), null, 2));
}
main().finally(() => prisma.$disconnect());
