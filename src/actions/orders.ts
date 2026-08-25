"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { countOverlapUnits } from "@/lib/availability";
import { calcSubtotal, getTierPrice } from "@/lib/pricing";
import { saveUpload, deleteStoredFile } from "@/lib/storage";
import { requireAdmin, requireMitraOrAdmin } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
interface ItemInput {
  productId: number;
  quantity: number;
  durationHours: number;
  unitPrice: number;
  discountType?: "amount" | "percent" | null;
  discountValue?: number;
}

export async function createOrder(formData: FormData) {
  const user = await requireMitraOrAdmin();
  const customerIdRaw = String(formData.get("customerId") ?? "");
  const newCustomerName = String(formData.get("newCustomerName") ?? "").trim();
  const newCustomerPhone = String(formData.get("newCustomerPhone") ?? "").trim();
  const startDateRaw = String(formData.get("startDate") ?? "");
  const noteOrder = String(formData.get("noteOrder") ?? "").trim();
  const guaranteeType = String(formData.get("guaranteeType") ?? "").trim();
  const guaranteeNumber = String(formData.get("guaranteeNumber") ?? "").trim();
  const deliveryModeRaw = String(formData.get("deliveryMode") ?? "pickup").trim();
  const deliveryAddress = String(formData.get("deliveryAddress") ?? "").trim();
  const courierFeeRaw = Number(formData.get("courierFee"));
  const rescheduledFromRaw = String(formData.get("rescheduledFrom") ?? "").trim();

  let items: ItemInput[] = [];
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    redirect("/admin/orders/new?error=invalid");
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

  const deliveryMode = deliveryModeRaw === "courier" ? "courier" : "pickup";
  const courierFee =
    deliveryMode === "courier" && Number.isFinite(courierFeeRaw) && courierFeeRaw >= 0
      ? courierFeeRaw
      : 0;
  const rescheduledFrom =
    rescheduledFromRaw !== "" && !isNaN(new Date(`${rescheduledFromRaw}T00:00`).getTime())
      ? new Date(`${rescheduledFromRaw}T00:00`)
      : null;

  if (!itemsValid || isNaN(startDate.getTime()) || (!usingExisting && !newCustomerValid)) {
    redirect("/admin/orders/new?error=invalid");
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
          guaranteeType: guaranteeType || null,
          guaranteeNumber: guaranteeNumber || null,
          deliveryMode,
          deliveryAddress: deliveryMode === "courier" ? deliveryAddress || null : null,
          courierFee,
          rescheduledFrom,
          handledById: user.id,
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

      await logAudit(tx, {
        entityType: "order",
        entityId: order.id,
        action: "create",
        summary: `Order ${order.orderNumber} dibuat (${items.length} item)`,
        userId: user.id,
      });

      return order.id;
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    const msg = e instanceof Error ? e.message : "Gagal membuat order";
    redirect(`/admin/orders/new?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  revalidatePath("/admin/calendar");
  redirect(`/admin/orders/${orderId}`);
}

const REVALIDATE_PATHS = ["/admin/orders", "/admin/products", "/admin/calendar", "/"] as const;

function revalidateOrderPaths(orderId: string) {
  for (const p of REVALIDATE_PATHS) revalidatePath(p);
  revalidatePath(`/admin/orders/${orderId}`);
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function releaseOrderUnits(tx: Tx, orderId: string) {
  const items = await tx.orderItem.findMany({ where: { orderId }, select: { unitId: true } });
  for (const it of items) {
    if (it.unitId != null) {
      const unit = await tx.unit.findUnique({ where: { id: it.unitId }, select: { condition: true } });
      await tx.unit.update({ where: { id: it.unitId }, data: { status: "available" } });
      await tx.unitEvent.create({
        data: { unitId: it.unitId, orderId, event: "returned", conditionAfter: unit?.condition ?? null },
      });
    }
  }
}

const VALID_STATUSES = ["booking", "active", "late", "completed", "cancelled"];

/** Efek samping perubahan status — dipakai update tunggal & bulk.
 *  Masuk "active" assign unit (+ log rented); keluar masa sewa release unit (+ log returned). */
async function applyStatusChange(tx: Tx, orderId: string, newStatus: string, userId: string | null) {
  const order = await tx.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order tidak ditemukan");
  if (order.status === newStatus) return;

  const inRentBefore = order.status === "active" || order.status === "late";
  const inRentAfter = newStatus === "active" || newStatus === "late";

  if (inRentBefore && !inRentAfter) {
    await releaseOrderUnits(tx, orderId);
  }

  // Masuk "active" → assign unit yang belum ter-assign
  if (newStatus === "active" && order.status !== "active") {
    const items = await tx.orderItem.findMany({
      where: { orderId },
      orderBy: { id: "asc" },
      include: { product: true },
    });
    for (const item of items) {
      if (item.unitId != null) continue; // sudah ter-assign sebelumnya
      for (let q = 0; q < item.quantity; q++) {
        const unit = await tx.unit.findFirst({
          where: { productId: item.productId, status: "available" },
        });
        if (!unit) {
          throw new Error(`Stok tidak cukup: ${item.product.name}`);
        }
        await tx.unit.update({ where: { id: unit.id }, data: { status: "rented" } });
        await tx.unitEvent.create({ data: { unitId: unit.id, orderId, event: "rented" } });
        // qty > 1: unitId hanya menyimpan unit pertama; sisanya dilacak via status rented.
        if (q === 0) {
          await tx.orderItem.update({ where: { id: item.id }, data: { unitId: unit.id } });
        }
      }
    }
  }

  await tx.order.update({
    where: { id: orderId },
    data: {
      status: newStatus,
      ...(newStatus === "completed" && order.returnedAt == null
        ? { returnedAt: new Date() }
        : {}),
    },
  });
  await logAudit(tx, {
    entityType: "order",
    entityId: orderId,
    action: "status_change",
    summary: `Status ${order.status} → ${newStatus}`,
    userId,
  });
}

export async function updateOrderStatus(formData: FormData) {
  const user = await requireMitraOrAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const newStatus = String(formData.get("newStatus") ?? "");
  const back = `/admin/orders/${orderId}`;

  if (!orderId) redirect("/admin/orders");
  if (!VALID_STATUSES.includes(newStatus)) redirect(`${back}?error=status`);

  try {
    await prisma.$transaction(async (tx) => {
      await applyStatusChange(tx, orderId, newStatus, user.id);
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    const msg = e instanceof Error ? e.message : "Gagal update status";
    redirect(`${back}?error=${encodeURIComponent(msg)}`);
  }

  revalidateOrderPaths(orderId);
  redirect(back);
}

/** Ubah status massal (bulk action dari daftar orders). Efek samping sama per order. */
export async function bulkUpdateOrderStatus(formData: FormData) {
  const user = await requireMitraOrAdmin();
  const newStatus = String(formData.get("newStatus") ?? "");
  const orderIds = formData.getAll("orderIds").map((v) => String(v));

  if (!VALID_STATUSES.includes(newStatus) || orderIds.length === 0) {
    redirect("/admin/orders?error=bulk");
  }

  const errors: string[] = [];
  let updated = 0;
  for (const orderId of orderIds) {
    if (!orderId) continue;
    try {
      await prisma.$transaction(async (tx) => {
        await applyStatusChange(tx, orderId, newStatus, user.id);
      });
      updated++;
    } catch (e) {
      if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
      errors.push(`${orderId}: ${e instanceof Error ? e.message : "gagal"}`);
    }
  }

  for (const p of REVALIDATE_PATHS) revalidatePath(p);
  const qs = new URLSearchParams({ bulk: String(updated) });
  if (errors.length > 0) qs.set("bulk_errors", errors.join(" | "));
  redirect(`/admin/orders?${qs.toString()}`);
}

/** Hapus order beserta item, pembayaran, dan foto return (cascade). */
export async function deleteOrder(formData: FormData) {
  const user = await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) redirect("/admin/orders");

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) return;
      await logAudit(tx, {
        entityType: "order",
        entityId: orderId,
        action: "delete",
        summary: `Order ${order.orderNumber} dihapus`,
        userId: user.id,
      });
      // Lepas unit yang masih tercatat pada item (aman walau sudah released)
      await releaseOrderUnits(tx, orderId);
      await tx.order.delete({ where: { id: orderId } });
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    const msg = e instanceof Error ? e.message : "Gagal menghapus order";
    redirect(`/admin/orders?error=${encodeURIComponent(msg)}`);
  }

  for (const p of REVALIDATE_PATHS) revalidatePath(p);
  redirect("/admin/orders?deleted=1");
}

export async function addPayment(formData: FormData) {
  const user = await requireMitraOrAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const amount = Number(formData.get("amount"));
  const paymentType = String(formData.get("paymentType") ?? "");
  const method = String(formData.get("method") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const back = `/admin/orders/${orderId}`;

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
  await logAudit(prisma, {
    entityType: "payment",
    entityId: orderId,
    action: "create",
    summary: `Pembayaran ${paymentType} Rp ${amount.toLocaleString("id-ID")} dicatat`,
    userId: user.id,
  });

  revalidatePath(back);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  redirect(back);
}

/** Update pembayaran yang sudah tercatat (edit nominal/cara/keterangan). */
export async function editPayment(formData: FormData) {
  const user = await requireMitraOrAdmin();
  const paymentId = String(formData.get("paymentId") ?? "");
  const amount = Number(formData.get("amount"));
  const method = String(formData.get("method") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const back = `/admin/orders/${String(formData.get("orderId"))}`;

  if (!paymentId || !Number.isFinite(amount) || amount <= 0) {
    redirect(`${back}?error=payment`);
  }

  await prisma.payment.update({
    where: { id: Number(paymentId) },
    data: { amount, method: method || null, note: note || null },
  });
  await logAudit(prisma, {
    entityType: "payment",
    entityId: paymentId,
    action: "update",
    summary: `Pembayaran diedit (nominal Rp ${amount.toLocaleString("id-ID")})`,
    userId: user.id,
  });

  revalidatePath(back);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  redirect(back);
}

/** Hapus pembayaran dari order (misal admin salah input). */
export async function deletePayment(formData: FormData) {
  const user = await requireAdmin();
  const paymentId = String(formData.get("paymentId") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  if (!paymentId || !orderId) redirect(`/admin/orders?error=payment`);

  try {
    await prisma.payment.delete({ where: { id: Number(paymentId) } });
    await logAudit(prisma, {
      entityType: "payment",
      entityId: paymentId,
      action: "delete",
      summary: "Pembayaran dihapus",
      userId: user.id,
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect(`/admin/orders/${orderId}?error=payment`);
  }

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  redirect(`/admin/orders/${orderId}`);
}

const RETURN_MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function submitReturn(formData: FormData) {
  const user = await requireMitraOrAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const back = `/admin/orders/${orderId}`;

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

  const written: { filePath: string; fileSize: number; fileHash: string }[] = [];
  for (let i = 0; i < photos.length; i++) {
    const fileName = `${orderId}-${i}-${Date.now()}.${photos[i].ext}`;
    const stored = await saveUpload("return", fileName, photos[i].bytes);
    written.push(stored);
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const photo of written) {
        await tx.returnPhoto.create({
          data: {
            orderId,
            filePath: photo.filePath,
            fileSize: photo.fileSize,
            fileHash: photo.fileHash,
            note: notes || null,
          },
        });
      }
      for (const c of conditions) {
        const before = await tx.unit.findUnique({ where: { id: c.unitId }, select: { condition: true } });
        await tx.unit.update({ where: { id: c.unitId }, data: { condition: c.condition } });
        if (before && before.condition !== c.condition) {
          await tx.unitEvent.create({
            data: {
              unitId: c.unitId,
              orderId,
              event: "condition",
              conditionBefore: before.condition,
              conditionAfter: c.condition,
              note: notes || null,
            },
          });
        }
      }
      await releaseOrderUnits(tx, orderId);
      await tx.order.update({
        where: { id: orderId },
        data: { status: "completed", returnedAt: new Date() },
      });
      await logAudit(tx, {
        entityType: "order",
        entityId: orderId,
        action: "status_change",
        summary: "Order dikembalikan (completed)",
        userId: user.id,
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect(`${back}?error=return`);
  }

  revalidateOrderPaths(orderId);
  redirect(back);
}

/** Hapus foto kondisi return yang sudah terupload — revisi bila salah upload. */
export async function deleteReturnPhoto(formData: FormData) {
  const returnPhotoId = Number(formData.get("returnPhotoId"));
  const orderId = String(formData.get("orderId") ?? "");
  const _user = await requireAdmin(); // Hanya admin

  const back = `/admin/orders/${orderId}`;

  const photo = await prisma.returnPhoto.findUnique({ where: { id: returnPhotoId } });
  if (!photo || photo.orderId !== orderId) redirect(`${back}?error=invalid`);

  // Hapus file fisik dari storage (idempotent), lalu record DB-nya
  await deleteStoredFile(photo.filePath);
  await prisma.returnPhoto.delete({ where: { id: returnPhotoId } });

  revalidateOrderPaths(orderId);
  redirect(`${back}?return=deleted`);
}

/** Tambah foto kondisi return untuk order yang SUDAH selesai — revisi tanpa
 * mengubah status & unit (unit sudah di-release saat order diselesaikan). */
export async function addReturnPhotos(formData: FormData) {
  const _user = await requireMitraOrAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const back = `/admin/orders/${orderId}`;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) redirect("/admin/orders");

  // Validasi foto: mime gambar & ≤ 5MB per file
  const photos: { bytes: Buffer; ext: string }[] = [];
  for (const entry of formData.getAll("photos")) {
    if (!(entry instanceof File) || entry.size === 0) continue;
    const ext = RETURN_MIME_EXT[entry.type];
    if (!ext || entry.size > 5 * 1024 * 1024) redirect(`${back}?error=file`);
    photos.push({ bytes: Buffer.from(await entry.arrayBuffer()), ext });
  }
  if (photos.length === 0) redirect(`${back}?error=return`);

  for (let i = 0; i < photos.length; i++) {
    const fileName = `${orderId}-add-${i}-${Date.now()}.${photos[i].ext}`;
    const stored = await saveUpload("return", fileName, photos[i].bytes);
    await prisma.returnPhoto.create({
      data: {
        orderId,
        filePath: stored.filePath,
        fileSize: stored.fileSize,
        fileHash: stored.fileHash,
        note: notes || null,
      },
    });
  }

  revalidateOrderPaths(orderId);
  redirect(`${back}?return=photos-added`);
}

/** Perpanjang masa sewa order aktif/terlambat: tambah N hari, harga dihitung ulang
 *  mengikuti tier durasi baru, dan stok periode tambahan dicek dulu. */
export async function extendOrder(formData: FormData) {
  const user = await requireMitraOrAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const extraDays = Number(formData.get("extraDays"));
  const back = `/admin/orders/${orderId}`;

  if (!orderId) redirect("/admin/orders");
  if (!Number.isInteger(extraDays) || extraDays < 1 || extraDays > 365) {
    redirect(`${back}?error=extend`);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: { include: { product: true } } },
      });
      if (!order) throw new Error("Order tidak ditemukan");
      if (order.status !== "active" && order.status !== "late") {
        throw new Error("Hanya order aktif/terlambat yang bisa diperpanjang");
      }

      const oldEnd = new Date(order.endDate);
      const newEnd = new Date(oldEnd.getTime() + extraDays * 24 * 3600_000);

      // Cek stok tiap produk untuk jendela tambahan [oldEnd, newEnd)
      for (const item of order.items) {
        const [totalUnits, busyItems] = await Promise.all([
          tx.unit.count({
            where: { productId: item.productId, status: { notIn: ["maintenance", "lost"] } },
          }),
          tx.orderItem.findMany({
            where: {
              productId: item.productId,
              order: {
                status: { in: ["booking", "active", "late"] },
                startDate: { lt: newEnd },
                endDate: { gt: oldEnd },
              },
            },
            select: {
              quantity: true,
              order: { select: { status: true, startDate: true, endDate: true } },
            },
          }),
        ]);
        const busy = countOverlapUnits(
          item.productId,
          oldEnd,
          newEnd,
          busyItems.map((it) => ({
            status: it.order.status,
            startDate: it.order.startDate,
            endDate: it.order.endDate,
            productId: item.productId,
            quantity: it.quantity,
          }))
        );
        if (item.quantity > totalUnits - busy) {
          throw new Error(`Stok tidak cukup untuk perpanjangan: ${item.product.name}`);
        }
      }

      // Durasi + harga diperbarui mengikuti tier durasi baru (harga flat per durasi)
      for (const item of order.items) {
        const durationHours = item.durationHours + extraDays * 24;
        const unitPrice = getTierPrice(item.product, durationHours);
        await tx.orderItem.update({
          where: { id: item.id },
          data: {
            durationHours,
            unitPrice,
            subtotal: calcSubtotal({
              unitPrice,
              quantity: item.quantity,
              discountType: item.discountType as "amount" | "percent" | null,
              discountValue: item.discountValue,
            }),
          },
        });
      }

      await tx.order.update({ where: { id: orderId }, data: { endDate: newEnd } });
      await logAudit(tx, {
        entityType: "order",
        entityId: orderId,
        action: "update",
        summary: `Sewa diperpanjang +${extraDays} hari (harga mengikuti tier baru)`,
        userId: user.id,
        detail: { oldEnd: oldEnd.toISOString(), newEnd: newEnd.toISOString() },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    const msg = e instanceof Error ? e.message : "Gagal memperpanjang sewa";
    redirect(`${back}?error=${encodeURIComponent(msg)}`);
  }

  revalidateOrderPaths(orderId);
  redirect(back);
}

/** Set/titip deposit jaminan untuk order (status held). */
export async function setDeposit(formData: FormData) {
  const user = await requireMitraOrAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const amount = Number(formData.get("depositAmount"));
  const back = `/admin/orders/${orderId}`;

  if (!orderId || !Number.isFinite(amount) || amount < 0) redirect(`${back}?error=payment`);

  await prisma.order.update({
    where: { id: orderId },
    data: { depositAmount: amount, depositStatus: amount > 0 ? "held" : "none" },
  });
  await logAudit(prisma, {
    entityType: "order",
    entityId: orderId,
    action: "update",
    summary: amount > 0 ? `Deposit dititip Rp ${amount.toLocaleString("id-ID")}` : "Deposit dihapus",
    userId: user.id,
  });

  revalidatePath(back);
  redirect(back);
}

/** Refund deposit: buat pembayaran deposit_refund + tandai refunded. */
export async function refundDeposit(formData: FormData) {
  const user = await requireMitraOrAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const back = `/admin/orders/${orderId}`;
  if (!orderId) redirect("/admin/orders");

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new Error("Order tidak ditemukan");
      if (order.depositStatus !== "held" || order.depositAmount <= 0) {
        throw new Error("Tidak ada deposit yang dititip");
      }
      await tx.payment.create({
        data: {
          orderId,
          amount: order.depositAmount,
          paymentType: "deposit_refund",
          note: "Refund deposit jaminan",
          status: "confirmed",
        },
      });
      await tx.order.update({
        where: { id: orderId },
        data: { depositStatus: "refunded" },
      });
      await logAudit(tx, {
        entityType: "order",
        entityId: orderId,
        action: "update",
        summary: `Deposit Rp ${order.depositAmount.toLocaleString("id-ID")} dikembalikan`,
        userId: user.id,
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    const msg = e instanceof Error ? e.message : "Gagal refund deposit";
    redirect(`${back}?error=${encodeURIComponent(msg)}`);
  }

  revalidateOrderPaths(orderId);
  redirect(back);
}
