"use server";

import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ensureStockAvailable } from "@/lib/availability";
import { generateOrderNumber } from "@/lib/orderNumber";
import { calcSubtotal, getTierPrice } from "@/lib/pricing";
import { ensureOrderReminders } from "@/lib/reminders/scheduler";
import { notifyOrderIncoming } from "@/lib/notify-order-incoming";
import { saveUpload, deleteStoredFile } from "@/lib/storage";
import { requireAdmin, requireMitraOrAdmin } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { processUploadFile } from "@/lib/image";
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
  const tipRaw = Number(formData.get("tip"));
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
  const tip = Number.isFinite(tipRaw) && tipRaw >= 0 ? tipRaw : 0;
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

      // Stock check per product within transaction — satu sumber kebenaran
      // logika stok: ensureStockAvailable (termasuk jeda charge/istirahat).
      const productIds = Array.from(new Set(items.map((it) => it.productId)));
      const maxDuration = Math.max(...items.map((it) => it.durationHours));
      const endDate = new Date(startDate.getTime() + maxDuration * 3600_000);

      for (const pid of productIds) {
        const needed = items
          .filter((it) => it.productId === pid)
          .reduce((s, it) => s + it.quantity, 0);
        await ensureStockAvailable({
          client: tx,
          productId: pid,
          rangeStart: startDate,
          rangeEnd: endDate,
          needed,
        });
      }

      // Nomor order: ambil nomor terbesar yang sudah ada untuk tanggal lokal
      // ini (count-based numbering bisa duplikat bila ada order dihapus).
      const orderNumber = await generateOrderNumber(tx);

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
          tipAmount: tip,
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

  // Slot reminder COD disiapkan SETELAH transaksi commit (hindari nested-tx SQLite)
  await ensureOrderReminders(orderId);

  // Notifikasi order masuk (admin & customer) setelah transaksi commit
  void notifyOrderIncoming(orderId);

  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  revalidatePath("/admin/calendar");
  redirect(`/admin/orders/${orderId}`);
}

const REVALIDATE_PATHS = [
  "/admin/orders",
  "/admin/products",
  "/admin/calendar",
  "/",
  // Portal customer: order/jaminan/review harus ikut terhapus dari cache
  // saat order dihapus/diubah admin — termasuk daftar order di portal.
  "/portal",
  "/portal/orders",
  "/portal/documents",
  "/portal/reviews",
] as const;

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

const VALID_STATUSES = ["pending", "booking", "active", "late", "completed", "cancelled"];

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
/** Hapus order massal — hapus beberapa order sekaligus, release unit, audit log per order. */
export async function bulkDeleteOrder(formData: FormData) {
  const user = await requireAdmin();
  const orderIdsRaw = formData.getAll("orderId").map((v) => String(v)).filter(Boolean);
  if (orderIdsRaw.length === 0) redirect("/admin/orders");

  const errors: string[] = [];
  let deleted = 0;

  for (const orderId of orderIdsRaw) {
    try {
      await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({ where: { id: orderId } });
        if (!order) return;

        await logAudit(tx, {
          entityType: "order",
          entityId: orderId,
          action: "delete",
          summary: `Order ${order.orderNumber} dihapus via bulk`,
          userId: user.id,
        });

        await releaseOrderUnits(tx, orderId);
        await tx.order.delete({ where: { id: orderId } });
      });
      deleted++;
    } catch (e) {
      if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
      const msg = e instanceof Error ? e.message : "gagal";
      errors.push(`${orderId}: ${msg}`);
    }
  }

  for (const p of REVALIDATE_PATHS) revalidatePath(p);
  const qs = new URLSearchParams({ deleted: String(deleted) });
  if (errors.length > 0) qs.set("errors", errors.join(" | "));
  redirect(`/admin/orders?${qs.toString()}`);
}


export async function addPayment(formData: FormData) {
  const user = await requireMitraOrAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const amount = Number(formData.get("amount"));
  const paymentType = String(formData.get("paymentType") ?? "");
  const method = String(formData.get("method") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const proofFileRaw = formData.get("proof") as File | undefined;
  const back = `/admin/orders/${String(formData.get("orderId"))}`;

  if (!orderId || !Number.isFinite(amount) || amount <= 0 || !["dp", "pelunasan", "denda"].includes(paymentType)) {
    redirect(`${back}?error=payment`);
  }

  let proofPath: string | null = null;
  if (proofFileRaw && proofFileRaw.size > 0) {
    // Terima semua jenis file ≤ 15 MB; gambar dikompres engine ke ≤ 3 MB.
    const processed = await processUploadFile(proofFileRaw);
    if (!processed) redirect(`${back}?error=file`);
    const filename = `${orderId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${processed.ext}`;
    proofPath = (await saveUpload("proof", filename, processed.buffer)).filePath;
  }

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) redirect(`${back}?error=notfound`);

  await prisma.payment.create({
    data: {
      orderId,
      amount,
      paymentType,
      method: method || null,
      note: note || null,
      ...(proofPath && { proofPath }),
      status: "pending",
      paidAt: new Date(),
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
  const proofFileRaw = formData.get("proof") as File | undefined;
  const back = `/admin/orders/${String(formData.get("orderId"))}`;

  if (!paymentId || !Number.isFinite(amount) || amount <= 0) {
    redirect(`${back}?error=payment`);
  }

  // Get current payment to check existing proof & order ref
  const existingPayment = await prisma.payment.findUnique({
    where: { id: Number(paymentId) },
    select: { proofPath: true, orderId: true },
  });

  // Handle file upload for proof - delete old if replacing
  let newProofPath: string | null = existingPayment?.proofPath ?? null;
  if (proofFileRaw && proofFileRaw.size > 0) {
    // Terima semua jenis file ≤ 15 MB; gambar dikompres engine ke ≤ 3 MB.
    const processed = await processUploadFile(proofFileRaw);
    if (!processed) redirect(`${back}?error=file`);
    const filename = `${existingPayment?.orderId ?? paymentId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${processed.ext}`;
    const result = await saveUpload("proof", filename, processed.buffer);

    // Hapus bukti lama bila ada (idempotent — aman jika file sudah tidak ada)
    if (existingPayment?.proofPath) {
      await deleteStoredFile(existingPayment.proofPath);
    }

    newProofPath = result.filePath;
  }

  await prisma.payment.update({
    where: { id: Number(paymentId) },
    data: { 
      amount, 
      method: method || null, 
      note: note || null,
      ...(newProofPath !== existingPayment?.proofPath && { proofPath: newProofPath }),
    },
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
    // Ambil proofPath dulu supaya file bukti ikut terhapus bersama record
    const payment = await prisma.payment.findUnique({
      where: { id: Number(paymentId) },
      select: { proofPath: true },
    });
    if (payment?.proofPath) {
      if (payment.proofPath.startsWith("/storage/")) {
        await deleteStoredFile(payment.proofPath);
      } else {
        // Legacy: bukti lama tersimpan di public/ — hapus langsung
        try {
          await unlink(path.join(process.cwd(), "public", payment.proofPath));
        } catch {
          /* file sudah tidak ada — abaikan */
        }
      }
    }
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
    // Terima semua jenis file ≤ 15 MB; gambar dikompres engine ke ≤ 3 MB.
    const processed = await processUploadFile(f);
    if (!processed) redirect(`${back}?error=file`);
    photos.push({ bytes: processed.buffer, ext: processed.ext });
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

/** Hapus SEMUA data upload order sekaligus (satu aksi): seluruh dokumen
 *  jaminan (KTP/selfie/kartu pelajar) + seluruh foto kondisi return.
 *  Dipakai dialog terpadu "Hapus Data Order" — menggantikan tombol ✕
 *  per-item yang tadinya tersebar di card Jaminan & Return. */
export async function deleteOrderData(formData: FormData) {
  const user = await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const backParam = String(formData.get("back") ?? "");
  const back = backParam.startsWith("/") ? backParam : `/admin/orders/${orderId}`;
  if (!orderId) redirect("/admin/orders");

  const docs = await prisma.document.findMany({ where: { orderId } });
  const photos = await prisma.returnPhoto.findMany({ where: { orderId } });
  if (docs.length === 0 && photos.length === 0) redirect(`${back}?data=empty`);

  // Hapus file fisik: dukung /storage/... dan path legacy /uploads/...
  for (const filePath of [...docs.map((d) => d.filePath), ...photos.map((p) => p.filePath)]) {
    if (filePath.startsWith("/storage/")) {
      await deleteStoredFile(filePath);
    } else if (filePath.startsWith("/uploads/")) {
      const relative = filePath.slice("/uploads/".length);
      if (!relative.includes("..")) {
        await unlink(path.join(process.cwd(), "public", "uploads", relative)).catch(() => {});
      }
    }
  }

  await prisma.$transaction([
    prisma.document.deleteMany({ where: { orderId } }),
    prisma.returnPhoto.deleteMany({ where: { orderId } }),
  ]);

  await logAudit(prisma, {
    entityType: "order",
    entityId: orderId,
    action: "update",
    summary: `Data order dihapus sekaligus (${docs.length} jaminan, ${photos.length} foto return)`,
    userId: user.id,
  });

  revalidateOrderPaths(orderId);
  redirect(`${back}?data=deleted`);
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

  // Validasi foto: semua jenis file ≤ 15 MB; gambar dikompres engine ke ≤ 3 MB.
  const photos: { bytes: Buffer; ext: string }[] = [];
  for (const entry of formData.getAll("photos")) {
    if (!(entry instanceof File) || entry.size === 0) continue;
    const processed = await processUploadFile(entry);
    if (!processed) redirect(`${back}?error=file`);
    photos.push({ bytes: processed.buffer, ext: processed.ext });
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

      // Cek stok tiap produk untuk jendela tambahan [oldEnd, newEnd) —
      // satu sumber kebenaran logika stok: ensureStockAvailable.
      for (const item of order.items) {
        await ensureStockAvailable({
          client: tx,
          productId: item.productId,
          rangeStart: oldEnd,
          rangeEnd: newEnd,
          needed: item.quantity,
        });
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

/** Anti-spam: admin terima/tolak order online yang masih `pending`.
 *  accept → booking (masuk antrian normal), reject → cancelled. */
export async function confirmPendingOrder(formData: FormData) {
  const user = await requireMitraOrAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const action = String(formData.get("action") ?? "").trim(); // "accept" | "reject"
  if (!orderId || !["accept", "reject"].includes(action)) redirect("/admin/orders");

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, orderNumber: true, status: true },
  });
  if (!order) redirect("/admin/orders");

  const backParam = String(formData.get("back") ?? "");
  const back = backParam.startsWith("/") ? backParam : `/admin/orders/${orderId}`;
  if (order.status !== "pending") redirect(`${back}?error=${encodeURIComponent("Order sudah diproses.")}`);

  const newStatus = action === "accept" ? "booking" : "cancelled";
  await prisma.$transaction(async (tx) => {
    await applyStatusChange(tx, orderId, newStatus, user.id);
  });

  // Order pending diterima → kabari customer & admin bahwa pesanan diproses
  if (action === "accept") {
    await notifyOrderIncoming(orderId);
  }

  revalidateOrderPaths(orderId);
  revalidatePath("/admin/orders");
  redirect(`${back}?pending=${action}`);
}
/** Reschedule existing order to new dates (admin only). Validates stock availability. */
export async function rescheduleOrder(formData: FormData) {
  const _user = await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const startDateRaw = String(formData.get("startDate") ?? "");
  const endDateRaw = String(formData.get("endDate") ?? "");

  if (!orderId || !startDateRaw || !endDateRaw) redirect(`/admin/orders?error=reschedule`);

  const newStartDate = new Date(startDateRaw);
  const newEndDate = new Date(endDateRaw);

  if (newEndDate <= newStartDate) {
    redirect(`/admin/orders/${orderId}?error=reschedule`);
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { select: { productId: true, quantity: true } } },
    });
    if (!order) redirect("/admin/orders?error=payment");

    await prisma.$transaction(async (tx) => {
      // Validate each item's stock availability for new dates (exclude this order)
      for (const item of order.items) {
        await ensureStockAvailable({
          client: tx,
          productId: item.productId,
          rangeStart: newStartDate,
          rangeEnd: newEndDate,
          needed: item.quantity,
          excludeOrderId: orderId,
        });
      }

      await tx.order.update({
        where: { id: orderId },
        data: { startDate: newStartDate, endDate: newEndDate },
      });
    });

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    redirect(`/admin/orders/${orderId}?success=rescheduled`);
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect(`/admin/orders/${orderId}?error=reschedule`);
  }
}


/** Edit data order di halaman detail (form inline per card). Field yang ada di
 *  FormData-lah yang diupdate — tiap card hanya mengirim field miliknya:
 *  - Ringkasan Pembayaran: courierFee, tipAmount
 *  - Pelanggan & Aksi: guaranteeType, guaranteeNumber, deliveryMode, deliveryAddress, noteOrder
 *  Perubahan dicatat di AuditLog. */
export async function updateOrderFees(formData: FormData) {
  const user = await requireMitraOrAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const back = `/admin/orders/${orderId}`;
  if (!orderId) redirect("/admin/orders");

  const before = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      courierFee: true,
      tipAmount: true,
      deliveryMode: true,
      deliveryAddress: true,
      guaranteeType: true,
      guaranteeNumber: true,
      noteOrder: true,
    },
  });
  if (!before) redirect(`${back}?error=edit`);

  const data: Parameters<typeof prisma.order.update>[0]["data"] = {};

  if (formData.has("courierFee")) {
    const v = Number(formData.get("courierFee"));
    if (!Number.isFinite(v) || v < 0) redirect(`${back}?error=edit`);
    data.courierFee = v;
  }
  if (formData.has("tipAmount")) {
    const v = Number(formData.get("tipAmount"));
    if (!Number.isFinite(v) || v < 0) redirect(`${back}?error=edit`);
    data.tipAmount = v;
  }
  if (formData.has("deliveryMode")) {
    const mode = String(formData.get("deliveryMode") ?? "");
    data.deliveryMode = mode === "courier" ? "courier" : "pickup";
    if (data.deliveryMode === "pickup") data.deliveryAddress = null;
  }
  if (formData.has("deliveryAddress")) {
    const addr = String(formData.get("deliveryAddress") ?? "").trim();
    data.deliveryAddress = addr || null;
  }
  if (formData.has("guaranteeType")) {
    const g = String(formData.get("guaranteeType") ?? "").trim();
    data.guaranteeType = ["ktp", "sim", "kartu_pelajar", "lainnya"].includes(g) ? g : null;
  }
  if (formData.has("guaranteeNumber")) {
    data.guaranteeNumber = String(formData.get("guaranteeNumber") ?? "").trim() || null;
  }
  if (formData.has("noteOrder")) {
    data.noteOrder = String(formData.get("noteOrder") ?? "").trim() || null;
  }

  await prisma.order.update({ where: { id: orderId }, data });

  await logAudit(prisma, {
    entityType: "order",
    entityId: orderId,
    action: "update",
    summary: `Data order diperbarui (${Object.keys(data).join(", ")})`,
    userId: user.id,
  });

  revalidateOrderPaths(orderId);
  redirect(`${back}?edited=1`);
}

/** Edit harga satuan item order — subtotal dihitung ulang otomatis (qty & diskon tetap).
 *  Harga item terkunci saat order dibuat; aksi ini adalah revisi admin bila ada salah harga. */
export async function updateItemPrices(formData: FormData) {
  const user = await requireMitraOrAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const back = `/admin/orders/${orderId}`;
  if (!orderId) redirect("/admin/orders");

  const itemIds = formData.getAll("itemId").map((v) => Number(v));
  const prices = formData.getAll("unitPrice").map((v) => Number(v));
  if (itemIds.length === 0 || itemIds.length !== prices.length) redirect(`${back}?error=items`);
  if (prices.some((p) => !Number.isFinite(p) || p < 0)) redirect(`${back}?error=items`);

  let changed = 0;
  await prisma.$transaction(async (tx) => {
    const items = await tx.orderItem.findMany({ where: { orderId } });
    for (let i = 0; i < itemIds.length; i++) {
      const item = items.find((it) => it.id === itemIds[i]);
      if (!item) continue;
      const unitPrice = prices[i];
      if (item.unitPrice === unitPrice) continue; // tanpa perubahan — skip
      const subtotal = calcSubtotal({
        unitPrice,
        quantity: item.quantity,
        discountType:
          item.discountType === "amount" || item.discountType === "percent"
            ? item.discountType
            : null,
        discountValue: item.discountValue,
      });
      await tx.orderItem.update({
        where: { id: item.id },
        data: { unitPrice, subtotal },
      });
      await logAudit(tx, {
        entityType: "order",
        entityId: orderId,
        action: "update",
        summary: `Harga item diubah: Rp ${item.unitPrice.toLocaleString("id-ID")} → Rp ${unitPrice.toLocaleString("id-ID")}`,
        userId: user.id,
        detail: { itemId: item.id },
      });
      changed++;
    }
  });

  revalidateOrderPaths(orderId);
  redirect(`${back}?items=${changed > 0 ? "updated" : "unchanged"}`);
}

/** Kelola item order dari card Item (ikon edit): tambah item baru, hapus item,
 *  dan ubah qty/durasi. Harga dihitung ulang dari tier produk (harga terkunci
 *  per durasi). Stok dicek untuk penambahan qty/item baru. Hanya untuk order
 *  yang belum selesai/dibatalkan. */
export async function manageOrderItems(formData: FormData) {
  const user = await requireMitraOrAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const back = `/admin/orders/${orderId}`;
  if (!orderId) redirect("/admin/orders");

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) redirect("/admin/orders");
  if (["completed", "cancelled"].includes(order.status)) {
    redirect(`${back}?error=items-locked`);
  }

  // --- Parse payload ---
  let adds: Array<{ productId: number; quantity: number; durationHours: number }> = [];
  let updates: Array<{ itemId: number; quantity: number; durationHours: number }> = [];
  const removeIds = formData.getAll("removeItemId").map((v) => Number(v));
  try {
    adds = JSON.parse(String(formData.get("adds") ?? "[]"));
    updates = JSON.parse(String(formData.get("updates") ?? "[]"));
  } catch {
    redirect(`${back}?error=items`);
  }

  const addsValid = adds.every(
    (a) => Number.isInteger(a.productId) && a.productId > 0 && Number.isInteger(a.quantity) && a.quantity > 0 && Number.isInteger(a.durationHours) && a.durationHours > 0
  );
  const updatesValid = updates.every(
    (u) => Number.isInteger(u.itemId) && u.itemId > 0 && Number.isInteger(u.quantity) && u.quantity > 0 && Number.isInteger(u.durationHours) && u.durationHours > 0
  );
  if (!addsValid || !updatesValid) redirect(`${back}?error=items`);

  await prisma.$transaction(async (tx) => {
    const existing = await tx.orderItem.findMany({ where: { orderId }, include: { product: true } });

    // --- Hapus item ---
    for (const rid of removeIds) {
      const item = existing.find((it) => it.id === rid);
      if (!item) continue;
      // Lepas unit yang ter-assign pada item ini
      if (item.unitId != null) {
        const unit = await tx.unit.findUnique({ where: { id: item.unitId }, select: { condition: true } });
        await tx.unit.update({ where: { id: item.unitId }, data: { status: "available" } });
        await tx.unitEvent.create({ data: { unitId: item.unitId, orderId, event: "returned", conditionAfter: unit?.condition ?? null } });
      }
      await tx.orderItem.delete({ where: { id: item.id } });
      await logAudit(tx, {
        entityType: "order",
        entityId: orderId,
        action: "update",
        summary: `Item dihapus: ${item.product.name} ×${item.quantity}`,
        userId: user.id,
        detail: { itemId: item.id },
      });
    }

    // --- Ubah qty/durasi (harga ikut tier baru) ---
    for (const u of updates) {
      const item = existing.find((it) => it.id === u.itemId);
      if (!item) continue;
      if (item.quantity === u.quantity && item.durationHours === u.durationHours) continue;

      // Stok untuk qty tambahan (jika bertambah)
      if (u.quantity > item.quantity) {
        await ensureStockAvailable({
          client: tx,
          productId: item.productId,
          rangeStart: order.startDate,
          rangeEnd: order.endDate,
          needed: u.quantity - item.quantity,
          excludeOrderId: orderId,
        });
      }

      const unitPrice = getTierPrice(item.product, u.durationHours);
      const subtotal = calcSubtotal({
        unitPrice,
        quantity: u.quantity,
        discountType:
          item.discountType === "amount" || item.discountType === "percent"
            ? item.discountType
            : null,
        discountValue: item.discountValue,
      });
      await tx.orderItem.update({
        where: { id: item.id },
        data: { quantity: u.quantity, durationHours: u.durationHours, unitPrice, subtotal },
      });
      await logAudit(tx, {
        entityType: "order",
        entityId: orderId,
        action: "update",
        summary: `Item diubah: ${item.product.name} ×${item.quantity}/${item.durationHours}j → ×${u.quantity}/${u.durationHours}j`,
        userId: user.id,
        detail: { itemId: item.id },
      });
    }

    // --- Tambah item baru ---
    for (const a of adds) {
      const product = await tx.product.findUnique({ where: { id: a.productId } });
      if (!product) continue;
      await ensureStockAvailable({
        client: tx,
        productId: a.productId,
        rangeStart: order.startDate,
        rangeEnd: order.endDate,
        needed: a.quantity,
        excludeOrderId: orderId,
      });
      const unitPrice = getTierPrice(product, a.durationHours);
      const subtotal = calcSubtotal({ unitPrice, quantity: a.quantity });
      await tx.orderItem.create({
        data: {
          orderId,
          productId: a.productId,
          quantity: a.quantity,
          durationHours: a.durationHours,
          unitPrice,
          subtotal,
        },
      });
      await logAudit(tx, {
        entityType: "order",
        entityId: orderId,
        action: "update",
        summary: `Item ditambah: ${product.name} ×${a.quantity} (${a.durationHours}j)`,
        userId: user.id,
      });
    }
  });

  revalidateOrderPaths(orderId);
  redirect(`${back}?items=updated`);
}
