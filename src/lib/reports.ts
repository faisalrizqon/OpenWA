import { prisma } from "@/lib/db";
import {
  resolveReportRange,
  type ReportRangeInput,
} from "@/lib/reportRange";

// Re-export helper rentang agar pemakai lama (`@/lib/reports`) tetap jalan.
// CATATAN: client component HARUS mengimpor dari `@/lib/reportRange` langsung —
// file ini menarik PrismaClient dan tidak boleh masuk bundle browser.
export {
  REPORT_PRESET_DAYS,
  MAX_REPORT_DAYS,
  DEFAULT_REPORT_DAYS,
  MAX_ORDER_ROWS_ON_PAGE,
  resolveReportRange,
  reportDateValue,
  reportSpanDays,
  validateReportRange,
  buildReportQuery,
} from "@/lib/reportRange";
export type { ReportRangeInput, ResolvedReportRange } from "@/lib/reportRange";

export interface ReportMetrics {
  days: number;
  rangeStart: Date;
  rangeEnd: Date;
  /** true bila rentang dipilih manual (from/to), false bila preset hari. */
  custom: boolean;
  totalReceived: number;
  orderValue: number;
  ordersCompleted: number;
  ordersLate: number;
  newCustomers: number;
  topProducts: { productName: string; totalQty: number; totalRevenue: number }[];
  /** Utilisasi sewa per produk: hari-unit terpakai ÷ kapasitas (unit × hari). */
  utilization: { productName: string; usedUnitDays: number; capacityUnitDays: number; pct: number }[];
  /** Total order dalam rentang (sebelum dipotong batas render halaman). */
  ordersTotal: number;
  orders: {
    id: string;
    orderNumber: string;
    createdAt: Date;
    startDate: Date;
    endDate: Date;
    customerName: string;
    itemSummary: string;
    total: number;
    paid: number;
    sisa: number;
    status: string;
    paymentMethod: string | null;
    promoDiscount: number;
  }[];
}

const PAID_IN_TYPES = ["dp", "pelunasan", "denda"];

/**
 * Kumpulkan metrik laporan untuk satu rentang waktu (server-only — pakai prisma).
 *
 * Menerima preset hari (`days`) atau rentang custom (`from`/`to`).
 * Melempar `RangeError` bila rentang tidak valid — pemanggil (page/route)
 * yang memutuskan menampilkan pesan error ke admin.
 */
export async function getReportMetrics(input: ReportRangeInput = {}): Promise<ReportMetrics> {
  const { rangeStart, rangeEnd, days, custom } = resolveReportRange(input);

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
        _sum: { quantity: true, subtotal: true },
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
      totalRevenue: g._sum.subtotal ?? 0,
    }))
    .sort((a, b) => b.totalQty - a.totalQty)
    .slice(0, 5);

  // --- Utilisasi produk: total hari-unit tersewa dalam rentang ÷ kapasitas ---
  const allProducts = await prisma.product.findMany({
    include: { units: { select: { id: true, status: true } } },
  });
  const busyOrders = await prisma.order.findMany({
    where: {
      status: { in: ["booking", "active", "late", "completed"] },
      startDate: { lt: rangeEnd },
      endDate: { gt: rangeStart },
    },
    select: {
      startDate: true,
      endDate: true,
      items: { select: { productId: true, quantity: true } },
    },
  });
  const usedDaysByProduct = new Map<number, number>();
  for (const o of busyOrders) {
    const s = Math.max(o.startDate.getTime(), rangeStart.getTime());
    const e = Math.min(o.endDate.getTime(), rangeEnd.getTime());
    const overlapDays = Math.max(0, Math.ceil((e - s) / (24 * 3600_000)));
    for (const it of o.items) {
      usedDaysByProduct.set(
        it.productId,
        (usedDaysByProduct.get(it.productId) ?? 0) + overlapDays * it.quantity
      );
    }
  }
  const utilization = allProducts
    .filter((p) => p.units.length > 0)
    .map((p) => {
      const capacity = p.units.filter((u) => !["maintenance", "lost"].includes(u.status)).length * days;
      const used = usedDaysByProduct.get(p.id) ?? 0;
      return {
        productName: p.name,
        usedUnitDays: used,
        capacityUnitDays: capacity,
        pct: capacity > 0 ? Math.min(100, Math.round((used / capacity) * 100)) : 0,
      };
    })
    .sort((a, b) => b.pct - a.pct);

  const orderRows = ordersInRange.map((o) => {
    const total =
      o.items.reduce((s, it) => s + it.subtotal, 0) + (o.courierFee ?? 0) + (o.tipAmount ?? 0);
    const paid = o.payments
      .filter((p) => PAID_IN_TYPES.includes(p.paymentType))
      .reduce((s, p) => s + p.amount, 0);
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      createdAt: o.createdAt,
      startDate: o.startDate,
      endDate: o.endDate,
      customerName: o.customer.name,
      itemSummary: o.items.map((it) => `${it.product.name} ×${it.quantity}`).join(", "),
      total,
      paid,
      sisa: Math.max(0, total - paid),
      status: o.status,
      paymentMethod: o.paymentMethod,
      promoDiscount: o.promoDiscount ?? 0,
    };
  });

  return {
    days,
    rangeStart,
    rangeEnd,
    custom,
    totalReceived: payments._sum.amount ?? 0,
    orderValue: orderRows.reduce((s, o) => s + o.total, 0),
    ordersCompleted: completedCount,
    ordersLate: lateCount,
    newCustomers,
    topProducts,
    utilization,
    ordersTotal: orderRows.length,
    orders: orderRows,
  };
}
