"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/permissions";

const CODE_RE = /^[A-Z0-9_-]{3,20}$/;

function parseLocalDate(raw: string): Date | null {
  if (!raw) return null;
  const d = new Date(`${raw}T00:00`);
  return isNaN(d.getTime()) ? null : d;
}

/** Buat kode promo baru. */
export async function createPromo(formData: FormData) {
  const _user = await requireAdmin();

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const discountType = String(formData.get("discountType") ?? "amount") === "percent" ? "percent" : "amount";
  const discountValue = Number(formData.get("discountValue"));
  const minOrderAmount = Number(formData.get("minOrderAmount") ?? 0) || 0;
  const maxDiscount = Number(formData.get("maxDiscount") ?? 0) || 0;
  const startDate = parseLocalDate(String(formData.get("startDate") ?? ""));
  const endDate = parseLocalDate(String(formData.get("endDate") ?? ""));
  const usageLimit = Number(formData.get("usageLimit") ?? 0) || 0;

  if (!CODE_RE.test(code)) redirect("/admin/promos?error=code");
  if (
    !Number.isFinite(discountValue) || discountValue <= 0 ||
    (discountType === "percent" && discountValue > 100)
  ) {
    redirect("/admin/promos?error=value");
  }
  if (!startDate || !endDate || endDate < startDate) {
    redirect("/admin/promos?error=date");
  }

  try {
    await prisma.promoCode.create({
      data: {
        code,
        discountType,
        discountValue,
        minOrderAmount: minOrderAmount > 0 ? minOrderAmount : null,
        maxDiscount: discountType === "percent" && maxDiscount > 0 ? maxDiscount : null,
        startDate,
        endDate,
        usageLimit: usageLimit > 0 ? usageLimit : 0,
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    if (e instanceof Error && e.message.includes("UNIQUE")) {
      redirect("/admin/promos?error=code_taken");
    }
    redirect("/admin/promos?error=invalid");
  }

  revalidatePath("/admin/promos");
  redirect("/admin/promos?created=1");
}

/** Aktifkan/nonaktifkan kode promo tanpa menghapus. */
export async function togglePromoActive(formData: FormData) {
  const _user = await requireAdmin();
  const promoId = Number(formData.get("promoId"));
  const active = String(formData.get("active") ?? "true") === "true";
  if (!Number.isInteger(promoId)) redirect("/admin/promos?error=invalid");

  await prisma.promoCode.update({ where: { id: promoId }, data: { active } });

  revalidatePath("/admin/promos");
  redirect("/admin/promos");
}

/** Hapus kode promo (order lama tetap menyimpan nilai diskon yang sudah diterapkan). */
export async function deletePromo(formData: FormData) {
  const _user = await requireAdmin();
  const promoId = Number(formData.get("promoId"));
  if (!Number.isInteger(promoId)) redirect("/admin/promos?error=invalid");

  try {
    await prisma.$transaction(async (tx) => {
      // Putuskan relasi order dulu supaya promo tetap bisa dihapus
      await tx.order.updateMany({
        where: { promoCodeId: promoId },
        data: { promoCodeId: null },
      });
      await tx.promoCode.delete({ where: { id: promoId } });
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/admin/promos?error=invalid");
  }

  revalidatePath("/admin/promos");
  redirect("/admin/promos?deleted=1");
}
