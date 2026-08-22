"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { customerSchema } from "@/lib/validation";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function createCustomer(formData: FormData) {
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect("/customers/new?error=invalid");
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
    revalidatePath("/customers");
    redirect(`/customers/${customer.id}`);
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    redirect("/customers/new?error=phone");
  }
}

export async function setBlacklist(formData: FormData) {
  const id = Number(formData.get("id"));
  const isBlacklisted = formData.get("isBlacklisted") === "true";
  const reason = String(formData.get("reason") ?? "").trim();

  if (!Number.isInteger(id) || id <= 0) {
    redirect("/customers");
  }

  if (isBlacklisted && reason.length < 3) {
    redirect(`/customers/${id}?error=reason`);
  }

  await prisma.customer.update({
    where: { id },
    data: {
      isBlacklisted,
      blacklistReason: isBlacklisted ? reason : null,
    },
  });

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}`);
}

export async function uploadDocument(formData: FormData) {
  const customerId = Number(formData.get("customerId"));
  const docType = String(formData.get("docType") ?? "other");
  const file = formData.get("file");

  if (!Number.isInteger(customerId) || customerId <= 0) {
    redirect("/customers");
  }

  const back = `/customers/${customerId}`;

  if (!(file instanceof File) || file.size === 0) {
    redirect(`${back}?error=file`);
  }
  const f = file as File;
  const ext = MIME_EXT[f.type];
  if (!ext || f.size > MAX_UPLOAD_BYTES) {
    redirect(`${back}?error=file`);
  }

  const bytes = Buffer.from(await f.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads", "ktp");
  await mkdir(dir, { recursive: true });
  const fileName = `${customerId}-${Date.now()}.${ext}`;
  await writeFile(path.join(dir, fileName), bytes);

  await prisma.document.create({
    data: {
      customerId,
      docType,
      filePath: `/uploads/ktp/${fileName}`,
    },
  });

  revalidatePath(back);
  redirect(back);
}
