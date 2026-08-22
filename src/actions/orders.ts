"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
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

const REVALIDATE_PATHS = ["/orders", "/products", "/calendar", "/"] as const;

function revalidateOrderPaths(orderId: string) {
  for (const p of REVALIDATE_PATHS) revalidatePath(p);
  revalidatePath(`/orders/${orderId}`);
}

async function releaseOrderUnits(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  orderId: string
) {
  const items = await tx.orderItem.findMany({ where: { orderId }, select: { unitId: true } });
  for (const it of items) {
    if (it.unitId != null) {
      await tx.unit.update({ where: { id: it.unitId }, data: { status: "available" } });
    }
  }
}

export async function updateOrderStatus(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");
  const newStatus = String(formData.get("newStatus") ?? "");
  const back = `/orders/${orderId}`;

  if (!orderId) redirect("/orders");

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new Error("Order tidak ditemukan");

      const from = order.status;

      // booking → active: assign units
      if (from === "booking" && newStatus === "active") {
        const items = await tx.orderItem.findMany({
          where: { orderId },
          orderBy: { id: "asc" },
          include: { product: true },
        });
        for (const item of items) {
          for (let q = 0; q < item.quantity; q++) {
            const unit = await tx.unit.findFirst({
              where: { productId: item.productId, status: "available" },
            });
            if (!unit) {
              throw new Error(`Stok tidak cukup: ${item.product.name}`);
            }
            await tx.unit.update({ where: { id: unit.id }, data: { status: "rented" } });
            // qty > 1: unitId hanya bisa menyimpan satu — pakai kolom unitId pada item
            // pertama; unit tambahan dilacak via status rented + kalender per unit.
            if (q === 0) {
              await tx.orderItem.update({ where: { id: item.id }, data: { unitId: unit.id } });
            }
          }
        }
        await tx.order.update({ where: { id: orderId }, data: { status: "active" } });
      } else if (from === "active" && newStatus === "late") {
        await tx.order.update({ where: { id: orderId }, data: { status: "late" } });
      } else if (
        (from === "active" || from === "late") &&
        newStatus === "completed"
      ) {
        await releaseOrderUnits(tx, orderId);
        await tx.order.update({ where: { id: orderId }, data: { status: "completed" } });
      } else if (newStatus === "cancelled") {
        await releaseOrderUnits(tx, orderId);
        await tx.order.update({ where: { id: orderId }, data: { status: "cancelled" } });
      }
      // Transisi tidak valid → abaikan tanpa error
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    const msg = e instanceof Error ? e.message : "Gagal update status";
    redirect(`${back}?error=${encodeURIComponent(msg)}`);
  }

  revalidateOrderPaths(orderId);
  redirect(back);
}

export async function addPayment(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");
  const amount = Number(formData.get("amount"));
  const paymentType = String(formData.get("paymentType") ?? "");
  const method = String(formData.get("method") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const back = `/orders/${orderId}`;

  if (!orderId || !Number.isFinite(amount) || amount <= 0) {
    redirect(`${back}?error=payment`);
  }
  if (!["dp", "pelunasan", "denda", "deposit_refund"].includes(paymentType)) {
    redirect(`${back}?error=payment`);
  }

  await prisma.payment.create({
    data: {
      orderId,
      amount,
      paymentType,
      method: method || null,
      note: note || null,
    },
  });

  revalidatePath(back);
  revalidatePath("/orders");
  revalidatePath("/");
  redirect(back);
}

const RETURN_MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function submitReturn(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const back = `/orders/${orderId}`;

  let conditions: { unitId: number; condition: string }[] = [];
  try {
    conditions = JSON.parse(String(formData.get("conditions") ?? "[]"));
  } catch {
    redirect(`${back}?error=return`);
  }

  const validConditions = conditions.every(
    (c) =>
      Number.isInteger(c.unitId) &&
      ["Bagus", "Cukup", "Rusak"].includes(c.condition)
  );
  if (!orderId || !validConditions) {
    redirect(`${back}?error=return`);
  }

  // Validate photos first (outside tx): image mime & ≤ 5MB
  const photos: { bytes: Buffer; ext: string }[] = [];
  for (const key of formData.getAll("photos")) {
    const f = key;
    if (!(f instanceof File) || f.size === 0) continue;
    const ext = RETURN_MIME_EXT[f.type];
    if (!ext || f.size > 5 * 1024 * 1024) {
      redirect(`${back}?error=file`);
    }
    photos.push({ bytes: Buffer.from(await f.arrayBuffer()), ext });
  }

  const dir = path.join(process.cwd(), "public", "uploads", "return");
  await mkdir(dir, { recursive: true });
  const written: string[] = [];
  for (let i = 0; i < photos.length; i++) {
    const fileName = `${orderId}-${i}-${Date.now()}.${photos[i].ext}`;
    await writeFile(path.join(dir, fileName), photos[i].bytes);
    written.push(`/uploads/return/${fileName}`);
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const filePath of written) {
        await tx.returnPhoto.create({ data: { orderId, filePath, note: notes || null } });
      }
      for (const c of conditions) {
        await tx.unit.update({ where: { id: c.unitId }, data: { condition: c.condition } });
      }
      await releaseOrderUnits(tx, orderId);
      await tx.order.update({ where: { id: orderId }, data: { status: "completed" } });
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect(`${back}?error=return`);
  }

  revalidateOrderPaths(orderId);
  redirect(back);
}
