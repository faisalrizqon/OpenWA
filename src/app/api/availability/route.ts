import { prisma } from "@/lib/db";
import { countOverlapUnits } from "@/lib/availability";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const productId = Number(url.searchParams.get("productId"));
  const startStr = url.searchParams.get("start");
  const endStr = url.searchParams.get("end");

  const start = startStr ? new Date(startStr) : null;
  const end = endStr ? new Date(endStr) : null;

  if (
    !Number.isInteger(productId) ||
    productId <= 0 ||
    !start ||
    !end ||
    isNaN(start.getTime()) ||
    isNaN(end.getTime()) ||
    start >= end
  ) {
    return Response.json({ available: 0 });
  }

  try {
    const [totalUnits, busyItems] = await Promise.all([
      prisma.unit.count({
        where: { productId, status: { notIn: ["maintenance", "lost"] } },
      }),
      prisma.orderItem.findMany({
        where: {
          productId,
          order: {
            status: { in: ["booking", "active", "late"] },
            startDate: { lt: end },
            endDate: { gt: start },
          },
        },
        select: {
          quantity: true,
          order: { select: { status: true, startDate: true, endDate: true } },
        },
      }),
    ]);

    const busy = countOverlapUnits(
      productId,
      start,
      end,
      busyItems.map((it) => ({
        status: it.order.status,
        startDate: it.order.startDate,
        endDate: it.order.endDate,
        productId,
        quantity: it.quantity,
      }))
    );

    return Response.json({ available: Math.max(0, totalUnits - busy) });
  } catch {
    return Response.json({ available: 0 });
  }
}
