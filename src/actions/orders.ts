"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { countOverlapUnits } from "@/lib/availability";
import { calcSubtotal } from "@/lib/pricing";
import { nextOrderNumber } from "@/lib/orderNumber";

interface ItemInput {
  productId: number;
  quantity: number;
  durationHours: number;
  unitPrice: number;
  discountType?: "amount" | "percent" | null;
  discountValue?: number;
}

export async function createOrder(formData: FormData) {
  const customerIdRaw = String(formData.get("customerId") ?? "");
  const newCustomerName = String(formData.get("newCustomerName") ?? "").trim();
  const newCustomerPhone = String(formData.get("newCustomerPhone") ?? "").trim();
  const startDateRaw = String(formData.get("startDate") ?? "");
  const noteOrder = String(formData.get("noteOrder") ?? "").trim();

  let items: ItemInput[] = [];
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    redirect("/orders/new?error=invalid");
  }

  const startDate = new Date(startDateRaw);

  const itemsValid =
    Array.isArray(items) &&
    items.length > 0 &&
    items.every(
      (it) =>
        Number.isInteger(it.productId) &&
        it.productId > 0 &&
        Number.isInteger(it.quantity) &&
        it.quantity > 0 &&
        Number.isInteger(it.durationHours) &&
        it.durationHours > 0 &&
        Number.isFinite(it.unitPrice) &&
        it.unitPrice >= 0
    );

  const usingExisting = customerIdRaw !== "new" && Number.isInteger(Number(customerIdRaw));
  const newCustomerValid =
    newCustomerName.length > 0 && /^0\d{8,13}$/.test(newCustomerPhone);

  if (!itemsValid || isNaN(startDate.getTime()) || (!usingExisting && !newCustomerValid)) {
    redirect("/orders/new?error=invalid");
  }

  let orderId: string;

  try {
    orderId = await prisma.$transaction(async (tx) => {
      // Resolve customer: existing id or upsert by phone
      let customerId: number;
      if (usingExisting) {
        const existing = await tx.customer.findUnique({ where: { id: Number(customerIdRaw) } });
        if (!existing) throw new Error("Pelanggan tidak ditemukan");
        if (existing.isBlacklisted) throw new Error("Pelanggan dalam blacklist");
        customerId = existing.id;
      } else {
        const upserted = await tx.customer.upsert({
          where: { phone: newCustomerPhone },
          update: { name: newCustomerName },
          create: { name: newCustomerName, phone: newCustomerPhone },
        });
        customerId = upserted.id;
      }

      // Stock check per product within transaction
      const productIds = Array.from(new Set(items.map((it) => it.productId)));
      const maxDuration = Math.max(...items.map((it) => it.durationHours));
      const endDate = new Date(startDate.getTime() + maxDuration * 3600_000);

      for (const pid of productIds) {
        const [totalUnits, busyItems] = await Promise.all([
          tx.unit.count({
            where: { productId: pid, status: { notIn: ["maintenance", "lost"] } },
          }),
          tx.orderItem.findMany({
            where: {
              productId: pid,
              order: {
                status: { in: ["booking", "active", "late"] },
                startDate: { lt: endDate },
                endDate: { gt: startDate },
              },
            },
            select: {
              quantity: true,
              order: { select: { status: true, startDate: true, endDate: true } },
            },
          }),
        ]);
        const busy = countOverlapUnits(
          pid,
          startDate,
          endDate,
          busyItems.map((it) => ({
            status: it.order.status,
            startDate: it.order.startDate,
            endDate: it.order.endDate,
            productId: pid,
            quantity: it.quantity,
          }))
        );
        const needed = items
          .filter((it) => it.productId === pid)
          .reduce((s, it) => s + it.quantity, 0);
        if (needed > totalUnits - busy) {
          const product = await tx.product.findUnique({ where: { id: pid } });
          throw new Error(`Stok tidak cukup: ${product?.name ?? pid}`);
        }
      }

      // Order number: count orders created today (local)
      const now = new Date();
      const localStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const localEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const todayCount = await tx.order.count({
        where: { createdAt: { gte: localStart, lt: localEnd } },
      });
      const orderNumber = nextOrderNumber(todayCount, now);

      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId,
          status: "booking",
          startDate,
          endDate,
          noteOrder: noteOrder || null,
        },
      });

      for (const it of items) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: it.productId,
            quantity: it.quantity,
            durationHours: it.durationHours,
            unitPrice: it.unitPrice,
            discountType: it.discountType ?? null,
            discountValue: it.discountValue ?? 0,
            subtotal: calcSubtotal({
              unitPrice: it.unitPrice,
              quantity: it.quantity,
              discountType: it.discountType ?? null,
              discountValue: it.discountValue ?? 0,
            }),
          },
        });
      }

      return order.id;
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    const msg = e instanceof Error ? e.message : "Gagal membuat order";
    redirect(`/orders/new?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath("/orders");
  revalidatePath("/");
  revalidatePath("/calendar");
  redirect(`/orders/${orderId}`);
}
