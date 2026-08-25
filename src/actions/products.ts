"use server";

import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { productSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
export async function createProduct(formData: FormData) {
  const user = await requireAdmin();
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect("/admin/products/new?error=invalid");
  }
  const data = parsed.data;
  const newCategoryName = String(formData.get("newCategoryName") ?? "").trim();

  let categoryId = data.categoryId;

  try {
    await prisma.$transaction(async (tx) => {
      if (newCategoryName) {
        const category = await tx.category.upsert({
          where: { name: newCategoryName },
          update: {},
          create: { name: newCategoryName },
        });
        categoryId = category.id;
      }

      const product = await tx.product.create({
        data: {
          name: data.name,
          sku: data.sku,
          categoryId,
          description: data.description || null,
          price6h: data.price6h,
          price12h: data.price12h,
          price24h: data.price24h,
          price48h: data.price48h,
          stockThreshold: data.stockThreshold,
        },
      });
      await logAudit(tx, {
        entityType: "product",
        entityId: String(product.id),
        action: "create",
        summary: `Produk "${product.name}" dibuat (${data.initialUnits ?? 1} unit)`,
        userId: user.id,
      });

      for (let i = 0; i < (data.initialUnits ?? 1); i++) {
        await tx.unit.create({
          data: {
            productId: product.id,
            condition: "Bagus",
            status: "available",
          },
        });
      }
    });

    revalidatePath("/admin/products");
    redirect("/admin/products");
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique constraint") || msg.includes("UNIQUE")) {
      redirect("/admin/products/new?error=sku");
    }
    redirect("/admin/products/new?error=invalid");
  }
}

const VALID_STATUSES = ["available", "rented", "maintenance", "lost"];

export async function updateProduct(formData: FormData) {
  const user = await requireAdmin();
  const productIdRaw = String(formData.get("productId") ?? "");
  const back = `/admin/products/${productIdRaw}`;

  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !Number.isInteger(Number(productIdRaw))) {
    redirect(`${back}?error=invalid`);
  }
  const data = parsed.data;
  const newCategoryName = String(formData.get("newCategoryName") ?? "").trim();

  try {
    await prisma.$transaction(async (tx) => {
      let categoryId = data.categoryId;
      if (newCategoryName) {
        const category = await tx.category.upsert({
          where: { name: newCategoryName },
          update: {},
          create: { name: newCategoryName },
        });
        categoryId = category.id;
      }

      await tx.product.update({
        where: { id: Number(productIdRaw) },
        data: {
          name: data.name,
          sku: data.sku,
          categoryId,
          description: data.description || null,
          price6h: data.price6h,
          price12h: data.price12h,
          price24h: data.price24h,
          price48h: data.price48h,
          stockThreshold: data.stockThreshold,
        },
      });
      await logAudit(tx, {
        entityType: "product",
        entityId: productIdRaw,
        action: "update",
        summary: `Produk "${data.name}" diperbarui`,
        userId: user.id,
      });

      // Catatan: jumlah unit fisik TIDAK dikelola lewat form edit ini
      // (hindari redundansi & intervensi). Tambah/kurangi unit hanya via
      // card "Unit Fisik" di halaman detail produk (form Tambah Unit &
      // tombol Hapus Unit per baris).
    });

    revalidatePath("/admin/products");
    revalidatePath("/");
    redirect(back);
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique constraint") || msg.includes("UNIQUE")) {
      redirect(`${back}?error=sku`);
    }
    redirect(`${back}?error=invalid`);
  }
}

/** Hapus produk: tolak jika masih ada order berjalan, lepas unit jika tidak. */
export async function deleteProduct(formData: FormData) {
  const user = await requireAdmin();
  const productIdRaw = String(formData.get("productId") ?? "");
  const productId = Number(productIdRaw);

  try {
    await prisma.$transaction(async (tx) => {
      const activeOrders = await tx.orderItem.count({
        where: {
          productId,
          order: { status: { in: ["booking", "active", "late"] } },
        },
      });
      if (activeOrders > 0) {
        throw new Error("Produk masih punya order berjalan — selesaikan dulu");
      }
      const units = await tx.unit.findMany({ where: { productId } });
      if (units.length > 0) {
        await tx.unit.deleteMany({ where: { productId } });
      }
      await tx.product.delete({ where: { id: productId } });
      await logAudit(tx, {
        entityType: "product",
        entityId: productIdRaw,
        action: "delete",
        summary: "Produk dihapus",
        userId: user.id,
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    const msg = e instanceof Error ? e.message : "Gagal menghapus produk";
    redirect(`/admin/products?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath("/admin/products");
  revalidatePath("/");
  redirect("/admin/products?deleted=1");
}

/** Aktifkan / nonaktifkan produk (sembunyikan dari katalog tanpa menghapus). */
export async function toggleProductActive(formData: FormData) {
  const _user = await requireAdmin();
  const productIdRaw = String(formData.get("productId") ?? "");
  const activeRaw = String(formData.get("active") ?? "true");
  const productId = Number(productIdRaw);

  try {
    await prisma.product.update({
      where: { id: productId },
      data: { active: activeRaw === "true" },
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/products?error=invalid");
  }

  revalidatePath("/admin/products");
  revalidatePath("/");
  redirect("/admin/products");
}

/** Tambah unit fisik ke produk yang sudah ada. */
export async function addUnit(formData: FormData) {
  const _user = await requireAdmin();
  const productIdRaw = String(formData.get("productId") ?? "");
  const serialNumber = String(formData.get("serialNumber") ?? "").trim();
  const condition = String(formData.get("condition") ?? "Bagus").trim();
  const back = `/admin/products/${productIdRaw}`;

  if (!VALID_STATUSES.includes(condition)) redirect(`${back}?error=invalid`);

  try {
    await prisma.unit.create({
      data: {
        productId: Number(productIdRaw),
        serialNumber: serialNumber || null,
        condition,
        status: "available",
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("UNIQUE")) {
      redirect(`${back}?error=serial`);
    }
    redirect(`${back}?error=invalid`);
  }

  revalidatePath(back);
  revalidatePath("/admin/products");
  redirect(back);
}

/** Update kondisi/status unit (mis. rusak/maintenance/hilang). */
export async function updateUnit(formData: FormData) {
  const _user = await requireAdmin();
  const unitIdRaw = String(formData.get("unitId") ?? "");
  const productIdRaw = String(formData.get("productId") ?? "");
  const condition = String(formData.get("condition") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const back = `/admin/products/${productIdRaw}`;

  if (
    !VALID_STATUSES.includes(status) ||
    !["Bagus", "Cukup", "Rusak"].includes(condition)
  ) {
    redirect(`${back}?error=invalid`);
  }

  const unitId = Number(unitIdRaw);
  const before = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { condition: true, status: true },
  });

  await prisma.unit.update({
    where: { id: unitId },
    data: { condition, status },
  });

  // Log riwayat unit: perubahan kondisi manual & maintenance/available
  if (before) {
    if (before.condition !== condition) {
      await prisma.unitEvent.create({
        data: {
          unitId,
          event: "condition",
          conditionBefore: before.condition,
          conditionAfter: condition,
        },
      });
    }
    if (before.status !== status && (status === "maintenance" || status === "available" || status === "lost")) {
      await prisma.unitEvent.create({
        data: {
          unitId,
          event: status === "maintenance" ? "maintenance" : status === "lost" ? "lost" : "available",
        },
      });
    }
  }

  revalidatePath(back);
  revalidatePath("/admin/products");
  redirect(back);
}

/** Hapus unit fisik (hanya jika tidak sedang dirental). */
export async function deleteUnit(formData: FormData) {
  const _user = await requireAdmin();
  const unitIdRaw = String(formData.get("unitId") ?? "");
  const productIdRaw = String(formData.get("productId") ?? "");
  const back = `/admin/products/${productIdRaw}`;

  try {
    await prisma.$transaction(async (tx) => {
      const unit = await tx.unit.findUnique({ where: { id: Number(unitIdRaw) } });
      if (!unit) return;
      if (unit.status === "rented") {
        throw new Error("Unit sedang dirental — tidak bisa dihapus");
      }
      // Lepaskan referensi orderItem (unit sudah completed/cancelled aman)
      await tx.orderItem.updateMany({
        where: { unitId: unit.id },
        data: { unitId: null },
      });
      await tx.unit.delete({ where: { id: unit.id } });
      // UnitEvent ikut terhapus via cascade — riwayat unit hilang bersama unitnya.
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    const msg = e instanceof Error ? e.message : "Gagal menghapus unit";
    redirect(`${back}?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath(back);
  revalidatePath("/admin/products");
}

/** Simpan aturan denda keterlambatan per produk. */
export async function saveLateFee(formData: FormData) {
  const user = await requireAdmin();
  const productIdRaw = String(formData.get("productId") ?? "");
  const feePerDayRaw = Number(formData.get("feePerDay"));
  const graceHoursRaw = Number(formData.get("graceHours"));
  const active = String(formData.get("active") ?? "true") === "true";
  const back = `/admin/products/${productIdRaw}`;

  const productId = Number(productIdRaw);
  if (
    !Number.isInteger(productId) ||
    !Number.isFinite(feePerDayRaw) || feePerDayRaw < 0 ||
    !Number.isInteger(graceHoursRaw) || graceHoursRaw < 0
  ) {
    redirect(`${back}?error=invalid`);
  }

  try {
    await prisma.lateFee.upsert({
      where: { productId },
      update: { feePerDay: feePerDayRaw, graceHours: graceHoursRaw, active },
      create: { productId, feePerDay: feePerDayRaw, graceHours: graceHoursRaw, active },
    });
    await logAudit(prisma, {
      entityType: "product",
      entityId: productIdRaw,
      action: "update",
      summary: active
        ? `Denda keterlambatan diatur: Rp ${feePerDayRaw.toLocaleString("id-ID")}/hari, tenggang ${graceHoursRaw} jam`
        : "Denda keterlambatan dinonaktifkan",
      userId: user.id,
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect(`${back}?error=invalid`);
  }

  revalidatePath(back);
  revalidatePath("/admin/products");
  redirect(back);
}

const UNIT_PHOTO_MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Upload foto fisik unit (admin-only). Mengganti foto lama bila ada. */
export async function uploadUnitPhoto(formData: FormData) {
  const user = await requireAdmin();
  const unitIdRaw = String(formData.get("unitId") ?? "");
  const productIdRaw = String(formData.get("productId") ?? "");
  const back = `/admin/products/${productIdRaw}`;

  const unitId = Number(unitIdRaw);
  const productId = Number(productIdRaw);
  if (!Number.isInteger(unitId) || !Number.isInteger(productId)) {
    redirect(`${back}?error=invalid`);
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) redirect(`${back}?error=file`);
  const ext = UNIT_PHOTO_MIME_EXT[file.type];
  if (!ext || file.size > 5 * 1024 * 1024) redirect(`${back}?error=file`);

  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit || unit.productId !== productId) redirect(`${back}?error=invalid`);

  // Simpan di public/uploads/units/<productId>/<unitId>-<ts>.<ext>
  const dir = path.join(process.cwd(), "public", "uploads", "units");
  await mkdir(dir, { recursive: true });
  const fileName = `${productId}-${unitId}-${Date.now()}.${ext}`;
  await writeFile(path.join(dir, fileName), Buffer.from(await file.arrayBuffer()));
  const newPath = `/uploads/units/${fileName}`;

  // Ganti foto lama (hapus file fisik) lalu simpan path baru
  if (unit.photoPath?.startsWith("/uploads/")) {
    await unlink(path.join(process.cwd(), "public", unit.photoPath)).catch(() => {});
  }

  try {
    await prisma.unit.update({ where: { id: unitId }, data: { photoPath: newPath } });
    await logAudit(prisma, {
      entityType: "unit",
      entityId: String(unitId),
      action: "update",
      summary: `Foto unit ${unit.serialNumber ?? `#${unitId}`} diupload`,
      userId: user.id,
    });
  } catch (e) {
    await unlink(path.join(dir, fileName)).catch(() => {});
    redirect(`${back}?error=invalid`);
  }

  revalidatePath(back);
  revalidatePath(`/katalog/${productId}`);
  redirect(back);
}

/** Hapus foto fisik unit (admin-only). */
export async function deleteUnitPhoto(formData: FormData) {
  const user = await requireAdmin();
  const unitIdRaw = String(formData.get("unitId") ?? "");
  const productIdRaw = String(formData.get("productId") ?? "");
  const back = `/admin/products/${productIdRaw}`;

  const unitId = Number(unitIdRaw);
  const productId = Number(productIdRaw);
  if (!Number.isInteger(unitId) || !Number.isInteger(productId)) {
    redirect(`${back}?error=invalid`);
  }

  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit || unit.productId !== productId) redirect(`${back}?error=invalid`);

  if (unit.photoPath?.startsWith("/uploads/")) {
    await unlink(path.join(process.cwd(), "public", unit.photoPath)).catch(() => {});
  }

  await prisma.unit.update({ where: { id: unitId }, data: { photoPath: null } });
  await logAudit(prisma, {
    entityType: "unit",
    entityId: String(unitId),
    action: "update",
    summary: `Foto unit ${unit.serialNumber ?? `#${unitId}`} dihapus`,
    userId: user.id,
  });

  revalidatePath(back);
  revalidatePath(`/katalog/${productId}`);
  redirect(back);
}

const MAX_PRODUCT_IMAGES = 8;

/** Upload foto galeri produk (admin-only, bisa banyak sekaligus, max 8 per produk). */
export async function uploadProductImages(formData: FormData) {
  const user = await requireAdmin();
  const productIdRaw = String(formData.get("productId") ?? "");
  const back = `/admin/products/${productIdRaw}`;

  const productId = Number(productIdRaw);
  if (!Number.isInteger(productId)) redirect(`${back}?error=invalid`);

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { images: true },
  });
  if (!product) redirect(`${back}?error=invalid`);

  const files = formData.getAll("files").filter(
    (f): f is File => f instanceof File && f.size > 0
  );
  if (files.length === 0) redirect(`${back}?error=file`);
  if (product.images.length + files.length > MAX_PRODUCT_IMAGES) {
    redirect(`${back}?error=maximages`);
  }

  const dir = path.join(process.cwd(), "public", "uploads", "products", productIdRaw);
  await mkdir(dir, { recursive: true });

  const written: { filePath: string; sortOrder: number }[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const ext = UNIT_PHOTO_MIME_EXT[file.type];
    if (!ext || file.size > 5 * 1024 * 1024) redirect(`${back}?error=file`);
    const fileName = `gallery-${Date.now()}-${i}.${ext}`;
    await writeFile(path.join(dir, fileName), Buffer.from(await file.arrayBuffer()));
    written.push({
      filePath: `/uploads/products/${productIdRaw}/${fileName}`,
      sortOrder: product.images.length + i,
    });
  }

  try {
    await prisma.productImage.createMany({
      data: written.map((w) => ({ productId, filePath: w.filePath, sortOrder: w.sortOrder })),
    });
    await logAudit(prisma, {
      entityType: "product",
      entityId: productIdRaw,
      action: "update",
      summary: `${written.length} foto galeri produk "${product.name}" diupload`,
      userId: user.id,
    });
  } catch (e) {
    for (const w of written) {
      await unlink(path.join(process.cwd(), "public", w.filePath)).catch(() => {});
    }
    redirect(`${back}?error=invalid`);
  }

  revalidatePath(back);
  revalidatePath(`/katalog/${productId}`);
  revalidatePath("/katalog");
  revalidatePath("/");
  redirect(back);
}

/** Hapus satu foto galeri produk (admin-only). */
export async function deleteProductImage(formData: FormData) {
  const user = await requireAdmin();
  const imageIdRaw = Number(formData.get("imageId"));
  const productIdRaw = String(formData.get("productId") ?? "");
  const back = `/admin/products/${productIdRaw}`;

  const productId = Number(productIdRaw);
  if (!Number.isInteger(imageIdRaw) || !Number.isInteger(productId)) {
    redirect(`${back}?error=invalid`);
  }

  const image = await prisma.productImage.findUnique({
    where: { id: imageIdRaw },
    include: { product: { select: { name: true } } },
  });
  if (!image || image.productId !== productId) redirect(`${back}?error=invalid`);

  if (image.filePath.startsWith("/uploads/")) {
    await unlink(path.join(process.cwd(), "public", image.filePath)).catch(() => {});
  }
  await prisma.productImage.delete({ where: { id: image.id } });

  await logAudit(prisma, {
    entityType: "product",
    entityId: productIdRaw,
    action: "update",
    summary: `Foto galeri produk "${image.product.name}" dihapus`,
    userId: user.id,
  });

  revalidatePath(back);
  revalidatePath(`/katalog/${productId}`);
  revalidatePath("/katalog");
  revalidatePath("/");
  redirect(back);
}
