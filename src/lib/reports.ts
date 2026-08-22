import { prisma } from "@/lib/db";

export interface ReportMetrics {
  days: number;
  rangeStart: Date;
  rangeEnd: Date;
  totalReceived: number;
  orderValue: number;
  ordersCompleted: number;
  ordersLate: number;
  newCustomers: number;
  topProducts: { productName: string; totalQty: number }[];
  orders: {
    id: string;
    orderNumber: string;
    createdAt: Date;
    customerName: string;
    itemSummary: string;
    total: number;
    paid: number;
    sisa: number;
    status: string;
  }[];
}

const PAID_IN_TYPES = ["dp", "pelunasan", "denda"];

export async function getReportMetrics(daysRaw: number): Promise<ReportMetrics> {
  const days = [7, 30, 90].includes(daysRaw) ? daysRaw : 30;
  const rangeEnd = new Date();
  const rangeStart = new Date(rangeEnd.getTime() - days * 24 * 3600_000);

  const [payments, ordersInRange, completedCount, lateCount, newCustomers, topGroups] =
    await Promise.all([
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          paymentType: { in: ["dp", "pelunasan"] },
          paidAt: { gte: rangeStart, lte: rangeEnd },
        },
      }),
      prisma.order.findMany({
        where: {
          createdAt: { gte: rangeStart, lte: rangeEnd },
          status: { not: "cancelled" },
        },
        include: {
          customer: true,
          items: { include: { product: true } },
          payments: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.count({
        where: { status: "completed", updatedAt: { gte: rangeStart, lte: rangeEnd } },
      }),
      prisma.order.count({
        where: { status: "late", updatedAt: { gte: rangeStart, lte: rangeEnd } },
      }),
      prisma.customer.count({
        where: { createdAt: { gte: rangeStart, lte: rangeEnd } },
      }),
      prisma.orderItem.groupBy({
        by: ["productId"],
        _sum: { quantity: true },
        where: {
          order: {
            createdAt: { gte: rangeStart, lte: rangeEnd },
            status: { not: "cancelled" },
          },
        },
      }),
    ]);

  const productIds = topGroups.map((g) => g.productId);
  const products = productIds.length
    ? await prisma.product.findMany({ where: { id: { in: productIds } } })
    : [];

  const topProducts = topGroups
    .map((g) => ({
      productName: products.find((p) => p.id === g.productId)?.name ?? `#${g.productId}`,
      totalQty: g._sum.quantity ?? 0,
    }))
    .sort((a, b) => b.totalQty - a.totalQty)
    .slice(0, 5);

  const orderRows = ordersInRange.map((o) => {
    const total = o.items.reduce((s, it) => s + it.subtotal, 0);
    const paid = o.payments
      .filter((p) => PAID_IN_TYPES.includes(p.paymentType))
      .reduce((s, p) => s + p.amount, 0);
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      createdAt: o.createdAt,
      customerName: o.customer.name,
      itemSummary: o.items.map((it) => `${it.product.name} ×${it.quantity}`).join(", "),
      total,
      paid,
      sisa: total - paid,
      status: o.status,
    };
  });

  return {
    days,
    rangeStart,
    rangeEnd,
    totalReceived: payments._sum.amount ?? 0,
    orderValue: orderRows.reduce((s, o) => s + o.total, 0),
    ordersCompleted: completedCount,
    ordersLate: lateCount,
    newCustomers,
    topProducts,
    orders: orderRows,
  };
}
