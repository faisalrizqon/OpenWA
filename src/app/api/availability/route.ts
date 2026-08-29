import { prisma } from "@/lib/db";
import { findNextAvailableStart, getStockSnapshot } from "@/lib/availability";

/** Ketersediaan unit untuk rentang waktu — dengan jeda charge/istirahat unit
 *  (Product.chargingRestHours, default 3 jam) dan saran alternatif saat sold out:
 *  tanggal berikutnya yang tersedia + produk lain dalam kategori yang sama.
 *
 *  Logika stok inti ada di getStockSnapshot (satu sumber kebenaran). */
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
    const snap = await getStockSnapshot({
      client: prisma,
      productId,
      rangeStart: start,
      rangeEnd: end,
    });

    if (!snap.product) return Response.json({ available: 0 });

    // Cukup stok → respons sederhana
    if (snap.available >= quantity) {
      return Response.json({ available: snap.available, restBufferHours: snap.restBufferHours });
    }

    // --- Sold out: hitung saran alternatif ---
    const durationHours = Math.max(1, Math.round((end.getTime() - start.getTime()) / 3600_000));
    const restBufferHours = snap.restBufferHours;

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
      snap.totalUnits,
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
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { categoryId: true },
    });
    const siblings = product
      ? await prisma.product.findMany({
          where: { categoryId: product.categoryId, active: true, id: { not: productId } },
          select: { id: true, name: true },
        })
      : [];
    const otherProducts: { id: number; name: string }[] = [];
    for (const sib of siblings) {
      const sibSnap = await getStockSnapshot({
        client: prisma,
        productId: sib.id,
        rangeStart: start,
        rangeEnd: end,
      });
      if (sibSnap.available >= quantity) otherProducts.push({ id: sib.id, name: sib.name });
    }

    return Response.json({
      available: snap.available,
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
