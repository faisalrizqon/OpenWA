import { prisma } from "@/lib/db";
import { countOverlapUnits, findNextAvailableStart } from "@/lib/availability";

/** Ketersediaan unit untuk rentang waktu — dengan jeda charge/istirahat unit
 *  (Product.chargingRestHours, default 3 jam) dan saran alternatif saat sold out:
 *  tanggal berikutnya yang tersedia + produk lain dalam kategori yang sama. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const productId = Number(url.searchParams.get("productId"));
  const startStr = url.searchParams.get("start");
  const endStr = url.searchParams.get("end");
  const quantity = Math.max(1, Number(url.searchParams.get("quantity")) || 1);

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
    const [product, totalUnits, busyItems] = await Promise.all([
      prisma.product.findUnique({ where: { id: productId } }),
      prisma.unit.count({
        where: { productId, status: { notIn: ["maintenance", "lost"] } },
      }),
      prisma.orderItem.findMany({
        where: {
          productId,
          order: {
            status: { in: ["booking", "active", "late"] },
            // Jeda charge/istirahat (default 3 jam) ikut overlap — ambil order
            // yang berakhir hingga restBuffer setelah `start`
            endDate: { gt: new Date(start.getTime() - 3 * 3600_000) },
            startDate: { lt: end },
          },
        },
        select: {
          quantity: true,
          order: { select: { status: true, startDate: true, endDate: true } },
        },
      }),
    ]);

    if (!product) return Response.json({ available: 0 });

    const restBufferHours = product.chargingRestHours ?? 3;
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
      })),
      restBufferHours
    );
    const available = Math.max(0, totalUnits - busy);

    // Cukup stok → respons sederhana
    if (available >= quantity) {
      return Response.json({ available, restBufferHours });
    }

    // --- Sold out: hitung saran alternatif ---
    const durationHours = Math.max(1, Math.round((end.getTime() - start.getTime()) / 3600_000));

    // 1) Tanggal berikutnya untuk produk yang sama (maju hari demi hari, maks 30 hari)
    const horizonOrders = await prisma.orderItem.findMany({
      where: {
        productId,
        order: {
          status: { in: ["booking", "active", "late"] },
          startDate: { lt: new Date(end.getTime() + 31 * 86400_000) },
        },
      },
      select: {
        quantity: true,
        order: { select: { status: true, startDate: true, endDate: true } },
      },
    });
    const nextStart = findNextAvailableStart(
      productId,
      start,
      durationHours,
      quantity,
      totalUnits,
      horizonOrders.map((it) => ({
        status: it.order.status,
        startDate: it.order.startDate,
        endDate: it.order.endDate,
        productId,
        quantity: it.quantity,
      })),
      restBufferHours
    );

    // 2) Produk lain dalam kategori yang sama yang tersedia di tanggal & jam yang sama
    const siblings = await prisma.product.findMany({
      where: { categoryId: product.categoryId, active: true, id: { not: productId } },
      select: { id: true, name: true, sku: true },
    });
    const otherProducts: { id: number; name: string }[] = [];
    for (const sib of siblings) {
      const [sibTotal, sibBusyItems] = await Promise.all([
        prisma.unit.count({
          where: { productId: sib.id, status: { notIn: ["maintenance", "lost"] } },
        }),
        prisma.orderItem.findMany({
          where: {
            productId: sib.id,
            order: {
              status: { in: ["booking", "active", "late"] },
              endDate: { gt: new Date(start.getTime() - 3 * 3600_000) },
              startDate: { lt: end },
            },
          },
          select: {
            quantity: true,
            order: { select: { status: true, startDate: true, endDate: true } },
          },
        }),
      ]);
      const sibBusy = countOverlapUnits(
        sib.id,
        start,
        end,
        sibBusyItems.map((it) => ({
          status: it.order.status,
          startDate: it.order.startDate,
          endDate: it.order.endDate,
          productId: sib.id,
          quantity: it.quantity,
        })),
        restBufferHours
      );
      if (sibTotal - sibBusy >= quantity) otherProducts.push({ id: sib.id, name: sib.name });
    }

    return Response.json({
      available,
      restBufferHours,
      soldOut: true,
      alternatives: {
        nextAvailableStart: nextStart ? nextStart.toISOString() : null,
        otherProducts,
      },
    });
  } catch {
    return Response.json({ available: 0 });
  }
}
