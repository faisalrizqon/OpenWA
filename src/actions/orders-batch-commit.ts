"use server";

import * as crypto from "crypto";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { ensureStockAvailable } from "@/lib/availability";
import { logAudit } from "@/lib/audit";
import { requireMitraOrAdmin } from "@/lib/permissions";
import { applyStatusChange, releaseOrderUnits } from "./orders";
import { processUploadFile } from "@/lib/image";
import { saveUpload, deleteStoredFile, type StoredFile } from "@/lib/storage";
import { calcSubtotal, getTierPrice } from "@/lib/pricing";

const VALID_STATUSES = ["pending", "booking", "active", "late", "completed", "cancelled"];
const PAYMENT_TYPE_VALUES = ["dp", "pelunasan", "denda"];
const RETURN_CONDITION_VALUES = ["Bagus", "Cukup", "Rusak"];
const GUARANTEE_DOC_TYPES = ["ktp", "sim", "kartu_pelajar", "lainnya"];

type OrderUpdateData = Parameters<typeof prisma.order.update>[0]["data"];
type PaymentUpdateData = Parameters<typeof prisma.payment.update>[0]["data"];

/** Hasil commit draft order. Dikembalikan ke client (BUKAN redirect) agar URL
 *  detail order tetap bersih — tanpa `?saved=1&changes=...` yang membuat
 *  notifikasi "berhasil disimpan" muncul ulang setiap kali halaman di-refresh. */
export type BatchCommitResult =
  | { ok: true; changes: string[] }
  | { ok: false; error: string };

/** Parse array JSON kiriman client; kosong/rusak dianggap tidak ada perubahan. */
function parseJsonArray<T>(raw: FormDataEntryValue | null): T[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(String(raw));
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/** Parse object JSON kiriman client; null berarti section tidak disentuh. */
function parseJsonObject(raw: FormDataEntryValue | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(String(raw));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function toPositiveNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toNonNegativeNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Commit SEMUA draft perubahan halaman detail order dalam satu transaksi.
 *
 * Cakupan: data pelanggan (jaminan/pengantaran/catatan), link Google Drive foto
 * hasil, ongkos antar & tip, ubah tanggal, status, item (tambah/ubah/hapus/harga),
 * pembayaran (tambah/edit/hapus + bukti), dokumen jaminan, dan return
 * (kondisi unit + foto + selesaikan order).
 *
 * File diproses DI LUAR transaksi (I/O lambat tidak boleh menahan lock DB); bila
 * transaksi gagal, file yang sudah terlanjur ditulis dibersihkan kembali.
 */
export async function batchCommitAllChanges(
  formData: FormData
): Promise<BatchCommitResult> {
  const user = await requireMitraOrAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) redirect("/admin/orders");
  const back = `/admin/orders/${orderId}`;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  });
  if (!order) redirect("/admin/orders?error=notfound");

  // ---- Draft dari client ----
  const details = parseJsonObject(formData.get("orderDetails"));
  const fees = parseJsonObject(formData.get("orderFees"));
  const statusRaw = String(formData.get("status") ?? "").trim();

  const itemsToAdd = parseJsonArray<{
    productId: number;
    quantity: number;
    durationHours: number;
  }>(formData.get("itemsToAdd"));
  const itemsToUpdate = parseJsonArray<{
    itemId: number;
    quantity: number;
    durationHours: number;
  }>(formData.get("itemsToUpdate"));
  const itemPrices = parseJsonArray<{ itemId: number; unitPrice: number }>(
    formData.get("itemPrices")
  );
  const itemsToDelete = parseJsonArray<number>(formData.get("itemsToDelete")).map(Number);

  const paymentsToAdd = parseJsonArray<{
    amount: number;
    paymentType: string;
    method?: string;
    note?: string;
  }>(formData.get("paymentsToAdd"));
  const paymentsToEdit = parseJsonArray<{
    paymentId: number;
    amount: number;
    paymentType?: string;
    method?: string;
    note?: string;
  }>(formData.get("paymentsToEdit"));
  const paymentsToDelete = parseJsonArray<number>(formData.get("paymentsToDelete")).map(Number);

  const guaranteeDocsToDelete = parseJsonArray<number>(
    formData.get("guaranteeDocsToDelete")
  ).map(Number);
  const guaranteeDocType = String(formData.get("guaranteeDocType") ?? "ktp");

  const returnComplete = formData.get("returnComplete") === "1";
  const returnConditions = parseJsonArray<{ unitId: number; condition: string }>(
    formData.get("returnConditions")
  );
  const returnNotes = String(formData.get("returnNotes") ?? "").trim();
  const returnPhotosToDelete = parseJsonArray<number>(
    formData.get("returnPhotosToDelete")
  ).map(Number);

  // ---- Upload file DI LUAR transaksi ----
  const proofFiles = formData
    .getAll("paymentProofs")
    .filter((f): f is File => f instanceof File && f.size > 0);
  const returnPhotoFiles = formData
    .getAll("returnPhotos")
    .filter((f): f is File => f instanceof File && f.size > 0);
  const guaranteeFile = formData.get("guaranteeFile");
  const guaranteeSelfie = formData.get("guaranteeSelfie");

  const proofStored: string[] = [];
  for (const f of proofFiles) {
    const processed = await processUploadFile(f);
    if (!processed) return { ok: false, error: "file" };
    const filename = `${orderId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${processed.ext}`;
    proofStored.push((await saveUpload("proof", filename, processed.buffer)).filePath);
  }

  const returnStored: StoredFile[] = [];
  for (let i = 0; i < returnPhotoFiles.length; i++) {
    const processed = await processUploadFile(returnPhotoFiles[i]);
    if (!processed) return { ok: false, error: "file" };
    const filename = `${orderId}-${i}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${processed.ext}`;
    returnStored.push(await saveUpload("return", filename, processed.buffer));
  }

  const guaranteeStored: { docType: string; filePath: string; absPath: string }[] = [];
  const guaranteeEntries: { type: string; file: FormDataEntryValue | null }[] = [
    {
      type: GUARANTEE_DOC_TYPES.includes(guaranteeDocType) ? guaranteeDocType : "ktp",
      file: guaranteeFile,
    },
    { type: "selfie_ktp", file: guaranteeSelfie },
  ];
  for (const entry of guaranteeEntries) {
    if (!(entry.file instanceof File) || entry.file.size === 0) continue;
    const processed = await processUploadFile(entry.file);
    if (!processed) return { ok: false, error: "file" };
    const dir = path.join(process.cwd(), "public", "uploads", "guarantee");
    await mkdir(dir, { recursive: true });
    const fileName = `${order.orderNumber}-${entry.type}-${Date.now()}-${crypto
      .randomUUID()
      .slice(0, 8)}.${processed.ext}`;
    const absPath = path.join(dir, fileName);
    await writeFile(absPath, processed.buffer);
    guaranteeStored.push({
      docType: entry.type,
      filePath: `/uploads/guarantee/${fileName}`,
      absPath,
    });
  }

  const summary: string[] = [];

  try {
    await prisma.$transaction(async (tx) => {
      // ---- 1) Data order: pelanggan, link Drive, ongkos, tanggal ----
      const data: OrderUpdateData = {};

      if (details) {
        if ("guaranteeType" in details) {
          const g = String(details.guaranteeType ?? "").trim();
          data.guaranteeType = GUARANTEE_DOC_TYPES.includes(g) ? g : null;
        }
        if ("guaranteeNumber" in details) {
          data.guaranteeNumber = String(details.guaranteeNumber ?? "").trim() || null;
        }
        if ("deliveryMode" in details) {
          data.deliveryMode = String(details.deliveryMode ?? "") === "courier" ? "courier" : "pickup";
          if (data.deliveryMode === "pickup") data.deliveryAddress = null;
        }
        if ("deliveryAddress" in details) {
          data.deliveryAddress = String(details.deliveryAddress ?? "").trim() || null;
        }
        if ("noteOrder" in details) {
          data.noteOrder = String(details.noteOrder ?? "").trim() || null;
        }
        if ("photoLink" in details) {
          const raw = String(details.photoLink ?? "").trim();
          if (raw) {
            // Validasi URL agar link rusak tidak tersimpan.
            try {
              const parsed = new URL(raw);
              if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
                throw new Error("bad protocol");
              }
              data.photoLink = raw;
            } catch {
              throw new Error("Link Google Drive tidak valid");
            }
          } else {
            data.photoLink = null;
          }
        }
      }

      if (fees) {
        if ("courierFee" in fees) {
          const v = toNonNegativeNumber(fees.courierFee);
          if (v == null) throw new Error("Ongkos antar tidak valid");
          data.courierFee = v;
        }
        if ("tipAmount" in fees) {
          const v = toNonNegativeNumber(fees.tipAmount);
          if (v == null) throw new Error("Tip tidak valid");
          data.tipAmount = v;
        }
      }

      // ---- 2) Ubah tanggal — validasi stok untuk rentang baru ----
      let rangeStart = order.startDate;
      let rangeEnd = order.endDate;
      const startRaw = String(formData.get("rescheduleStart") ?? "");
      const endRaw = String(formData.get("rescheduleEnd") ?? "");
      if (startRaw && endRaw) {
        const start = new Date(startRaw);
        const end = new Date(endRaw);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
          throw new Error("Rentang tanggal tidak valid");
        }
        for (const item of order.items) {
          await ensureStockAvailable({
            client: tx,
            productId: item.productId,
            rangeStart: start,
            rangeEnd: end,
            needed: item.quantity,
            excludeOrderId: orderId,
          });
        }
        data.startDate = start;
        data.endDate = end;
        rangeStart = start;
        rangeEnd = end;
      }

      if (Object.keys(data).length > 0) {
        await tx.order.update({ where: { id: orderId }, data });
        await logAudit(tx, {
          entityType: "order",
          entityId: orderId,
          action: "update",
          summary: `Batch simpan: ${Object.keys(data).join(", ")}`,
          userId: user.id,
        });
        summary.push(...Object.keys(data));
      }

      // ---- 3) Item: hapus → harga → qty/durasi → tambah ----
      const itemsLocked = ["completed", "cancelled"].includes(order.status);
      if (!itemsLocked) {
        for (const rid of itemsToDelete) {
          const item = order.items.find((it) => it.id === rid);
          if (!item) continue;
          if (item.unitId != null) {
            const unit = await tx.unit.findUnique({
              where: { id: item.unitId },
              select: { condition: true },
            });
            await tx.unit.update({ where: { id: item.unitId }, data: { status: "available" } });
            await tx.unitEvent.create({
              data: {
                unitId: item.unitId,
                orderId,
                event: "returned",
                conditionAfter: unit?.condition ?? null,
              },
            });
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
          summary.push("item dihapus");
        }

        for (const p of itemPrices) {
          const item = order.items.find((it) => it.id === Number(p.itemId));
          if (!item) continue;
          const price = toPositiveNumber(p.unitPrice);
          if (price == null || item.unitPrice === price) continue;
          await tx.orderItem.update({
            where: { id: item.id },
            data: {
              unitPrice: price,
              subtotal: calcSubtotal({
                unitPrice: price,
                quantity: item.quantity,
                discountType:
                  item.discountType === "amount" || item.discountType === "percent"
                    ? item.discountType
                    : null,
                discountValue: item.discountValue,
              }),
            },
          });
          await logAudit(tx, {
            entityType: "order",
            entityId: orderId,
            action: "update",
            summary: `Harga item diubah: ${item.product.name} Rp ${item.unitPrice.toLocaleString(
              "id-ID"
            )} → Rp ${price.toLocaleString("id-ID")}`,
            userId: user.id,
            detail: { itemId: item.id },
          });
          summary.push("harga item");
        }

        for (const u of itemsToUpdate) {
          const item = order.items.find((it) => it.id === Number(u.itemId));
          if (!item) continue;
          const qty = Number(u.quantity);
          const dur = Number(u.durationHours);
          if (!Number.isInteger(qty) || qty <= 0) continue;
          if (!Number.isInteger(dur) || dur <= 0) continue;
          if (item.quantity === qty && item.durationHours === dur) continue;

          if (qty > item.quantity) {
            await ensureStockAvailable({
              client: tx,
              productId: item.productId,
              rangeStart,
              rangeEnd,
              needed: qty - item.quantity,
              excludeOrderId: orderId,
            });
          }

          const unitPrice = getTierPrice(item.product, dur);
          await tx.orderItem.update({
            where: { id: item.id },
            data: {
              quantity: qty,
              durationHours: dur,
              unitPrice,
              subtotal: calcSubtotal({
                unitPrice,
                quantity: qty,
                discountType:
                  item.discountType === "amount" || item.discountType === "percent"
                    ? item.discountType
                    : null,
                discountValue: item.discountValue,
              }),
            },
          });
          await logAudit(tx, {
            entityType: "order",
            entityId: orderId,
            action: "update",
            summary: `Item diubah: ${item.product.name} ×${item.quantity}/${item.durationHours}j → ×${qty}/${dur}j`,
            userId: user.id,
            detail: { itemId: item.id },
          });
          summary.push("item diubah");
        }

        for (const a of itemsToAdd) {
          const product = await tx.product.findUnique({ where: { id: Number(a.productId) } });
          if (!product) continue;
          const qty = Number(a.quantity);
          const dur = Number(a.durationHours);
          if (!Number.isInteger(qty) || qty <= 0) continue;
          if (!Number.isInteger(dur) || dur <= 0) continue;

          await ensureStockAvailable({
            client: tx,
            productId: product.id,
            rangeStart,
            rangeEnd,
            needed: qty,
            excludeOrderId: orderId,
          });

          const unitPrice = getTierPrice(product, dur);
          await tx.orderItem.create({
            data: {
              orderId,
              productId: product.id,
              quantity: qty,
              durationHours: dur,
              unitPrice,
              subtotal: calcSubtotal({ unitPrice, quantity: qty }),
            },
          });
          await logAudit(tx, {
            entityType: "order",
            entityId: orderId,
            action: "update",
            summary: `Item ditambah: ${product.name} ×${qty} (${dur}j)`,
            userId: user.id,
          });
          summary.push("item ditambah");
        }
      }

      // ---- 4) Pembayaran: hapus → edit → tambah ----
      for (const pid of paymentsToDelete) {
        const payment = await tx.payment.findUnique({ where: { id: pid } });
        if (!payment || payment.orderId !== orderId) continue;
        if (payment.proofPath) await deleteStoredFile(payment.proofPath).catch(() => {});
        await tx.payment.delete({ where: { id: pid } });
        await logAudit(tx, {
          entityType: "payment",
          entityId: String(pid),
          action: "delete",
          summary: "Pembayaran dihapus",
          userId: user.id,
        });
        summary.push("pembayaran dihapus");
      }

      for (const e of paymentsToEdit) {
        const amount = toPositiveNumber(e.amount);
        if (amount == null) continue;
        const patch: PaymentUpdateData = {
          amount,
          method: e.method ? String(e.method) : null,
          note: e.note ? String(e.note) : null,
        };
        if (e.paymentType && PAYMENT_TYPE_VALUES.includes(e.paymentType)) {
          patch.paymentType = e.paymentType;
        }
        await tx.payment.update({ where: { id: Number(e.paymentId) }, data: patch });
        await logAudit(tx, {
          entityType: "payment",
          entityId: String(e.paymentId),
          action: "update",
          summary: `Pembayaran diedit (nominal Rp ${amount.toLocaleString("id-ID")})`,
          userId: user.id,
        });
        summary.push("pembayaran diedit");
      }

      const proofSlots = parseJsonArray<number>(formData.get("paymentProofSlots"));
      for (let i = 0; i < paymentsToAdd.length; i++) {
        const amount = toPositiveNumber(paymentsToAdd[i].amount);
        const paymentType = String(paymentsToAdd[i].paymentType ?? "");
        if (amount == null || !PAYMENT_TYPE_VALUES.includes(paymentType)) continue;

        const slotIdx = proofSlots.indexOf(i);
        const proofPath = slotIdx >= 0 && slotIdx < proofStored.length ? proofStored[slotIdx] : null;

        await tx.payment.create({
          data: {
            orderId,
            amount,
            paymentType,
            method: paymentsToAdd[i].method ? String(paymentsToAdd[i].method) : null,
            note: paymentsToAdd[i].note ? String(paymentsToAdd[i].note) : null,
            status: "confirmed",
            paidAt: new Date(),
            ...(proofPath ? { proofPath } : {}),
          },
        });
        await logAudit(tx, {
          entityType: "payment",
          entityId: orderId,
          action: "create",
          summary: `Pembayaran ${paymentType} Rp ${amount.toLocaleString("id-ID")} dicatat`,
          userId: user.id,
        });
        summary.push("pembayaran ditambah");
      }

      // ---- 5) Dokumen jaminan: hapus → simpan baru ----
      for (const docId of guaranteeDocsToDelete) {
        const doc = await tx.document.findUnique({ where: { id: docId } });
        if (!doc || doc.orderId !== orderId) continue;
        await tx.document.delete({ where: { id: docId } });
        summary.push("jaminan dihapus");
      }
      for (const g of guaranteeStored) {
        await tx.document.create({
          data: {
            customerId: order.customerId,
            orderId,
            docType: g.docType,
            filePath: g.filePath,
          },
        });
        summary.push("jaminan ditambah");
      }
      if (guaranteeDocsToDelete.length > 0 || guaranteeStored.length > 0) {
        await logAudit(tx, {
          entityType: "order",
          entityId: orderId,
          action: "update",
          summary: `Dokumen jaminan diperbarui (+${guaranteeStored.length}/-${guaranteeDocsToDelete.length})`,
          userId: user.id,
        });
      }

      // ---- 6) Return: hapus foto → tambah foto → kondisi unit → selesaikan ----
      for (const photoId of returnPhotosToDelete) {
        const photo = await tx.returnPhoto.findUnique({ where: { id: photoId } });
        if (!photo || photo.orderId !== orderId) continue;
        await deleteStoredFile(photo.filePath).catch(() => {});
        await tx.returnPhoto.delete({ where: { id: photoId } });
        summary.push("foto return dihapus");
      }
      for (const photo of returnStored) {
        await tx.returnPhoto.create({
          data: {
            orderId,
            filePath: photo.filePath,
            fileSize: photo.fileSize,
            fileHash: photo.fileHash,
            note: returnNotes || null,
          },
        });
        summary.push("foto return ditambah");
      }
      for (const c of returnConditions) {
        const unitId = Number(c.unitId);
        if (!RETURN_CONDITION_VALUES.includes(c.condition)) continue;
        const before = await tx.unit.findUnique({
          where: { id: unitId },
          select: { condition: true },
        });
        if (!before) continue;
        await tx.unit.update({ where: { id: unitId }, data: { condition: c.condition } });
        if (before.condition !== c.condition) {
          await tx.unitEvent.create({
            data: {
              unitId,
              orderId,
              event: "condition",
              conditionBefore: before.condition,
              conditionAfter: c.condition,
              note: returnNotes || null,
            },
          });
        }
        summary.push("kondisi unit");
      }
      if (returnComplete) {
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
        summary.push("order selesai");
      }

      // ---- 7) Status paling akhir: efek sampingnya melihat item & tanggal final ----
      if (
        statusRaw &&
        VALID_STATUSES.includes(statusRaw) &&
        statusRaw !== order.status &&
        !returnComplete
      ) {
        await applyStatusChange(tx, orderId, statusRaw, user.id);
        summary.push(`status=${statusRaw}`);
      }
    });
  } catch (e) {
    // Bersihkan file yang sudah terlanjur ditulis agar tidak jadi file yatim.
    for (const p of proofStored) await deleteStoredFile(p).catch(() => {});
    for (const r of returnStored) await deleteStoredFile(r.filePath).catch(() => {});
    for (const g of guaranteeStored) await unlink(g.absPath).catch(() => {});

    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    const msg = e instanceof Error ? e.message : "Gagal menyimpan perubahan";
    return { ok: false, error: msg };
  }

  revalidatePath(back);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true, changes: summary };
}
