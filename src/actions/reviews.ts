"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

/** Ambil customerId dari session portal; redirect ke login bila bukan customer. */
async function requireCustomer(): Promise<number> {
  const session = await auth();
  const customerId = Number(session?.user?.customerId);
  if (
    !session?.user ||
    session.user.role !== "customer" ||
    !Number.isInteger(customerId) ||
    customerId <= 0
  ) {
    redirect("/portal/login");
  }
  return customerId;
}

/** Customer memberi review untuk order yang sudah selesai.
 *  Satu review per order; rating >= 4 otomatis masuk testimoni halaman depan. */
export async function submitReview(formData: FormData) {
  const customerId = await requireCustomer();
  const orderId = String(formData.get("orderId") ?? "");
  const rating = Number(formData.get("rating"));
  const text = String(formData.get("text") ?? "").trim();

  if (!orderId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    redirect("/portal?error=invalid");
  }
  if (text.length > 500) {
    redirect("/portal?error=invalid");
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Validasi kepemilikan & status order
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: { include: { product: { select: { name: true } } } }, customer: { select: { name: true } } },
      });
      if (!order || order.customerId !== customerId) {
        throw new Error("Order tidak ditemukan");
      }
      if (order.status !== "completed") {
        throw new Error("Review hanya untuk order yang sudah selesai");
      }
      const existing = await tx.review.findUnique({ where: { orderId } });
      if (existing) {
        throw new Error("Order ini sudah di-review");
      }

      await tx.review.create({
        data: { orderId, customerId, rating, text: text || null },
      });

      // Rating bagus → testimoni otomatis di halaman depan
      if (rating >= 4) {
        const productNames = Array.from(
          new Set(order.items.map((it) => it.product.name))
        ).join(", ");
        await tx.testimonial.create({
          data: {
            name: order.customer?.name ?? "Pelanggan",
            context: `Sewa ${productNames || "kamera"}`,
            text: text || "Pelayanan oke, recommended!",
            rating,
          },
        });
      }

    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    const msg = e instanceof Error ? e.message : "Gagal menyimpan review";
    redirect(`/portal?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath("/portal");
  revalidatePath("/");
  redirect("/portal?reviewed=1");
}
