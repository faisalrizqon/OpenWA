"use server";

import { unlink } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { customerSchema } from "@/lib/validation";
import { saveUpload, deleteStoredFile, resolveStoragePath } from "@/lib/storage";
import { requireAdmin, requireMitraOrAdmin } from "@/lib/permissions";
import bcrypt from "bcryptjs";
import { compressImage } from "@/lib/image";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function createCustomer(formData: FormData) {
  const _user = await requireMitraOrAdmin();
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect("/admin/customers/new?error=invalid");
  }
  const data = parsed.data;
  try {
    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        address: data.address || null,
        notes: data.notes || null,
      },
    });
    revalidatePath("/admin/customers");
    redirect(`/admin/customers/${customer.id}`);
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/customers/new?error=phone");
  }
}

export async function updateCustomer(formData: FormData) {
  const _user = await requireMitraOrAdmin();
  const customerIdRaw = String(formData.get("customerId") ?? "");
  const back = `/admin/customers/${customerIdRaw}`;

  if (!Number.isInteger(Number(customerIdRaw))) {
    redirect("/admin/customers?error=invalid");
  }

  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`${back}?error=invalid`);
  }
  const data = parsed.data;
  const isBlacklisted = formData.get("isBlacklisted") === "true";
  const blacklistReason = isBlacklisted ? String(formData.get("blacklistReason") ?? "").trim() : "";

  if (isBlacklisted && blacklistReason.length < 3) {
    redirect(`${back}?error=reason`);
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.customer.findUnique({
        where: { id: Number(customerIdRaw) },
      });
      if (!existing) {
        throw new Error("Pelanggan tidak ditemukan");
      }

      // Cek duplikat nomor WA jika berubah
      const phoneChanged = data.phone !== existing.phone;
      if (phoneChanged) {
        const alreadyExists = await tx.customer.findFirst({
          where: {
            phone: data.phone,
            AND: { NOT: { id: Number(customerIdRaw) } },
          },
        });
        if (alreadyExists) {
          throw new Error("Nomor WA sudah dipakai pelanggan lain");
        }
      }

      await tx.customer.update({
        where: { id: Number(customerIdRaw) },
        data: {
          name: data.name,
          phone: data.phone,
          email: data.email || null,
          address: data.address || null,
          notes: data.notes || null,
          isBlacklisted,
          blacklistReason: isBlacklisted ? blacklistReason : null,
        },
      });
    });

    revalidatePath(back);
    revalidatePath("/admin/customers");
    redirect(back);
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    const msg = e instanceof Error ? e.message : "Gagal update pelanggan";
    if (msg.includes("nomor WA sudah dipakai") || msg.includes("Unique constraint")) {
      redirect(`${back}?error=phone_taken`);
    }
    redirect(`${back}?error=${encodeURIComponent(msg)}`);
  }
}

/** Toggle blacklist on/off */
export async function setBlacklist(formData: FormData) {
  const _user = await requireAdmin();
  const id = Number(formData.get("id"));
  const isBlacklisted = formData.get("isBlacklisted") === "true";
  const reason = String(formData.get("reason") ?? "").trim();

  if (!Number.isInteger(id) || id <= 0) {
    redirect("/admin/customers");
  }

  if (isBlacklisted && reason.length < 3) {
    redirect(`/admin/customers/${id}?error=reason`);
  }

  await prisma.customer.update({
    where: { id },
    data: {
      isBlacklisted,
      blacklistReason: isBlacklisted ? reason : null,
    },
  });

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${id}`);
  redirect(`/admin/customers/${id}`);
}
export async function uploadDocument(formData: FormData) {
  const _user = await requireMitraOrAdmin();
  const customerId = Number(formData.get("customerId"));
  const docType = String(formData.get("docType") ?? "other");
  const file = formData.get("file");

  if (!Number.isInteger(customerId) || customerId <= 0) {
    redirect("/admin/customers");
  }

  const back = `/admin/customers/${customerId}`;

  if (!(file instanceof File) || file.size === 0) {
    redirect(`${back}?error=file`);
  }
  const f = file as File;
  const ext = MIME_EXT[f.type];
  if (!ext || f.size > MAX_UPLOAD_BYTES) {
    redirect(`${back}?error=file`);
  }

  // File > 3 MB dikompres otomatis; ≤ 3 MB disimpan apa adanya.
  const image = await compressImage(Buffer.from(await f.arrayBuffer()), f.type);
  const fileName = `${customerId}-${Date.now()}.${image.ext}`;
  const stored = await saveUpload("ktp", fileName, image.buffer);

  await prisma.document.create({
    data: {
      customerId,
      docType,
      filePath: stored.filePath,
      fileSize: stored.fileSize,
      fileHash: stored.fileHash,
    },
  });

  revalidatePath(back);
  redirect(back);
}

/** Hapus dokumen pelanggan */
export async function deleteDocument(formData: FormData) {
  const _user = await requireAdmin();
  const documentId = Number(formData.get("documentId"));
  const customerId = Number(formData.get("customerId"));
  const back = `/admin/customers/${customerId}`;

  if (!Number.isInteger(documentId) || !Number.isInteger(customerId)) {
    redirect("/admin/customers?error=invalid");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const doc = await tx.document.findUnique({
        where: { id: documentId },
      });
      if (!doc || doc.customerId !== customerId) {
        throw new Error("Dokumen tidak ditemukan");
      }

      // Hapus file fisik — coba path baru, fallback ke public/uploads jika legacy
      let deleted = false;
      if (doc.filePath.startsWith("/storage/")) {
        await deleteStoredFile(doc.filePath);
        deleted = true;
      } else {
        // Legacy /uploads/... path
        const fullPath = path.join(process.cwd(), "public", doc.filePath);
        try {
          await unlink(fullPath);
          deleted = true;
        } catch {}
      }

      await tx.document.delete({
        where: { id: documentId },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    const msg = e instanceof Error ? e.message : "Gagal hapus dokumen";
    redirect(`${back}?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath(back);
  revalidatePath("/admin/customers");
  redirect(back);
}

/** Hapus pelanggan beserta dokumen & order */
export async function deleteCustomer(formData: FormData) {
  const _user = await requireAdmin();
  const customerId = Number(formData.get("customerId"));

  if (!Number.isInteger(customerId) || customerId <= 0) {
    redirect("/admin/customers?error=invalid");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id: customerId },
        include: { documents: true },
      });
      if (!customer) {
        throw new Error("Pelanggan tidak ditemukan");
      }

      // Hapus dokumen fisik — coba path baru, fallback ke public/uploads jika legacy
      for (const doc of customer.documents) {
        if (doc.filePath.startsWith("/storage/")) {
          try {
            await deleteStoredFile(doc.filePath);
          } catch {}
        } else {
          // Legacy /uploads/... path
          const fullPath = path.join(process.cwd(), "public", doc.filePath);
          try {
            await unlink(fullPath);
          } catch {}
        }
      }
      // Hapus dokumen dari DB
      await tx.document.deleteMany({
        where: { customerId },
      });

      // Hapus order (cascade ke items, payments, returnPhotos)
      await tx.order.deleteMany({
        where: { customerId },
      });

      // Hapus unit yang hanya punya referensi ke order pelanggan ini (jika ada)
      // Catatan: unit masih di-link ke product, jadi kita tidak hapus unit di sini

      await tx.customer.delete({
        where: { id: customerId },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    const msg = e instanceof Error ? e.message : "Gagal hapus pelanggan";
    redirect(`/admin/customers?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath("/admin/customers");
  revalidatePath("/admin/orders");
  redirect("/admin/customers?deleted=1");
}

/** Admin: set/reset password customer untuk login portal.
 *  Bila kolom dikosongkan, generate password acak 8 karakter.
 *  Password plaintext dikembalikan sekali via query param `pwd` untuk diberikan ke customer. */
export async function setCustomerPassword(formData: FormData) {
  const _user = await requireAdmin();
  const customerIdRaw = String(formData.get("customerId") ?? "");
  const rawPassword = String(formData.get("password") ?? "").trim();
  const back = `/admin/customers/${customerIdRaw}`;

  if (!Number.isInteger(Number(customerIdRaw))) redirect(`${back}?error=pwd`);

  // Kosong → generate acak (huruf kecil + angka, tanpa karakter ambigu)
  let newPassword = rawPassword;
  if (!newPassword) {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    newPassword = Array.from(
      { length: 8 },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  } else if (newPassword.length < 6) {
    redirect(`${back}?error=pwd`);
  }

  try {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.customer.update({
      where: { id: Number(customerIdRaw) },
      data: { passwordHash },
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    const msg = e instanceof Error ? e.message : "Gagal set password";
    redirect(`${back}?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath(back);
  redirect(`${back}?pwd_set=1&pwd=${encodeURIComponent(newPassword)}`);
}
