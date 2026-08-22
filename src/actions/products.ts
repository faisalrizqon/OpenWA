"use server";

import { prisma } from "@/lib/db";
import { productSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProduct(formData: FormData) {
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect("/products/new?error=invalid");
  }
  const data = parsed.data;
  const newCategoryName = String(formData.get("newCategoryName") ?? "").trim();

  let categoryId = data.categoryId;

  try {
    const productId = await prisma.$transaction(async (tx) => {
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

      for (let i = 0; i < data.initialUnits; i++) {
        await tx.unit.create({
          data: {
            productId: product.id,
            condition: "Bagus",
            status: "available",
          },
        });
      }
      return product.id;
    });

    revalidatePath("/products");
    redirect("/products");
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique constraint") || msg.includes("UNIQUE")) {
      redirect("/products/new?error=sku");
    }
    redirect("/products/new?error=invalid");
  }
}
