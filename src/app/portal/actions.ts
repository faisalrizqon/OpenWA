"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

/** Helper: pastikan session adalah customer, kembalikan customerId. */
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

/** Hapus dokumen milik customer dari portal (dengan validasi kepemilikan). */
export async function deletePortalDocument(formData: FormData) {
  const customerId = await requireCustomer();

  const documentId = Number(formData.get("documentId"));
  const back = String(formData.get("back") ?? "/portal/documents");

  if (!Number.isInteger(documentId) || documentId <= 0) {
    redirect(`${back}?error=invalid`);
  }

  const doc = await prisma.document.findFirst({
    where: { id: documentId, customerId },
  });
  if (!doc) {
    redirect(`${back}?error=invalid`);
  }

  await prisma.document.delete({ where: { id: documentId } });

  revalidatePath(back);
  if (doc.orderId) revalidatePath(`/portal/orders/${doc.orderId}`);
  redirect(`${back}?deleted=1`);
}
