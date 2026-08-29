// Inspect portal-related data for debugging
import { prisma } from "../src/lib/db";

async function main() {
  const customers = await prisma.customer.findMany({
    select: { id: true, name: true, phone: true, passwordHash: true },
    take: 10,
  });
  console.log("Customers:", customers.map(c => ({ id: c.id, name: c.name, phone: c.phone, hasPwd: !!c.passwordHash })));

  const orders = await prisma.order.groupBy({ by: ["status"], _count: true });
  console.log("Orders by status:", orders);

  const ordersWithCustomer = await prisma.order.findMany({
    select: { id: true, orderNumber: true, customerId: true, status: true },
    take: 5,
  });
  console.log("Sample orders:", ordersWithCustomer);

  const docs = await prisma.document.count();
  const reviews = await prisma.review.count();
  const payments = await prisma.payment.groupBy({ by: ["status"], _count: true });
  console.log("Documents:", docs, "| Reviews:", reviews);
  console.log("Payments by status:", payments);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
