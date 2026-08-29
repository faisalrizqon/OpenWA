"use server";

import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { PrismaPromise } from "@prisma/client";
import { requireAdmin } from "@/lib/permissions";
import { compressImage } from "@/lib/image";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const CONTENT_PATH = "/admin/content";

function back(tab: string) {
  return `${CONTENT_PATH}?tab=${tab}`;
}

function revalidateStorefront() {
  // Halaman depan + layout (header/footer pakai konten toko) + katalog
  revalidatePath("/", "layout");
}

/* ================= Pengaturan Toko (singleton) ================= */

export async function updateStoreSettings(formData: FormData) {
  const _user = await requireAdmin();
  const fields = [
    "storeName",
    "tagline",
    "whatsapp",
    "location",
    "hours",
    "theme",
    "heroVariant",
    "heroTitleBefore",
    "heroAccent",
    "heroTitleAfter",
    "heroSubtitle",
    "trustBadge1",
    "trustBadge2",
    "trustBadge3",
    "catalogTitle",
    "testimonialTitle",
    "testimonialSubtitle",
    "videoTitle",
    "videoSubtitle",
    "ctaTitle",
    "ctaSubtitle",
    "qrisImagePath",
    "qrisMerchantName",
  ] as const;

  const data: Record<string, string> = {};
  for (const f of fields) {
    data[f] = String(formData.get(f) ?? "").trim();
  }

  if (!data.storeName || !data.whatsapp) {
    redirect(back("settings") + "&error=invalid");
  }

  try {
    await prisma.storeContent.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });
  } catch {
    redirect(back("settings") + "&error=invalid");
  }

  revalidateStorefront();
  redirect(back("settings") + "&saved=1");
}


/* ================= Gambar Hero (dengan upload) ================= */

async function saveImage(file: File): Promise<string> {
  const ext = MIME_EXT[file.type];
  if (!ext || file.size > MAX_UPLOAD_BYTES) {
    throw new Error("file");
  }
  // File > 3 MB dikompres otomatis; ≤ 3 MB disimpan apa adanya.
  const image = await compressImage(Buffer.from(await file.arrayBuffer()), file.type);
  const dir = path.join(process.cwd(), "public", "uploads", "hero");
  await mkdir(dir, { recursive: true });
  const fileName = `hero-${Date.now()}-${Math.floor(Math.random() * 1e6)}.${image.ext}`;
  await writeFile(path.join(dir, fileName), image.buffer);
  return `/uploads/hero/${fileName}`;
}

export async function createHeroImage(formData: FormData) {
  const _user = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const timestamp = String(formData.get("timestamp") ?? "").trim();
  const file = formData.get("image");

  if (!name) redirect(back("hero") + "&error=invalid");

  let imagePath = "";
  if (file instanceof File && file.size > 0) {
    try {
      imagePath = await saveImage(file);
    } catch {
      redirect(back("hero") + "&error=file");
    }
  }

  await prisma.heroImage.create({
    data: { name, timestamp, imagePath: imagePath || null },
  });

  revalidateStorefront();
  redirect(back("hero") + "&saved=1");
}

export async function updateHeroImage(formData: FormData) {
  const _user = await requireAdmin();
  const id = Number(formData.get("heroImageId"));
  if (!Number.isInteger(id)) redirect(back("hero") + "&error=invalid");

  const name = String(formData.get("name") ?? "").trim();
  const timestamp = String(formData.get("timestamp") ?? "").trim();
  const file = formData.get("image");

  let imagePath: string | null | undefined;
  if (file instanceof File && file.size > 0) {
    try {
      const existing = await prisma.heroImage.findUnique({ where: { id } });
      if (existing?.imagePath?.startsWith("/uploads/")) {
        await unlink(path.join(process.cwd(), "public", existing.imagePath)).catch(() => {});
      }
      imagePath = await saveImage(file);
    } catch {
      redirect(back("hero") + "&error=file");
    }
  }

  await prisma.heroImage.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      timestamp,
      ...(imagePath ? { imagePath } : {}),
    },
  });

  revalidateStorefront();
  redirect(back("hero") + "&saved=1");
}

export async function deleteHeroImage(formData: FormData) {
  const _user = await requireAdmin();
  const id = Number(formData.get("heroImageId"));
  if (!Number.isInteger(id)) redirect(back("hero") + "&error=invalid");

  const existing = await prisma.heroImage.findUnique({ where: { id } });
  if (existing?.imagePath?.startsWith("/uploads/")) {
    await unlink(path.join(process.cwd(), "public", existing.imagePath)).catch(() => {});
  }
  await prisma.heroImage.delete({ where: { id } });

  revalidateStorefront();
  redirect(back("hero") + "&deleted=1");
}

/* ================= Keunggulan (Perk) ================= */

export async function createPerk(formData: FormData) {
  const _user = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const icon = String(formData.get("icon") ?? "camera").trim();

  if (!title || !description) redirect(back("perks") + "&error=invalid");

  await prisma.perk.create({ data: { title, description, icon } });

  revalidateStorefront();
  redirect(back("perks") + "&saved=1");
}

export async function updatePerk(formData: FormData) {
  const _user = await requireAdmin();
  const id = Number(formData.get("perkId"));
  if (!Number.isInteger(id)) redirect(back("perks") + "&error=invalid");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const icon = String(formData.get("icon") ?? "camera").trim();

  await prisma.perk.update({
    where: { id },
    data: { title, description, icon },
  });

  revalidateStorefront();
  redirect(back("perks") + "&saved=1");
}

export async function deletePerk(formData: FormData) {
  const _user = await requireAdmin();
  const id = Number(formData.get("perkId"));
  if (!Number.isInteger(id)) redirect(back("perks") + "&error=invalid");
  await prisma.perk.delete({ where: { id } });
  revalidateStorefront();
  redirect(back("perks") + "&deleted=1");
}

/* ================= Testimoni ================= */

export async function createTestimonial(formData: FormData) {
  const _user = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const context = String(formData.get("context") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  const rating = Math.min(5, Math.max(1, Number(formData.get("rating")) || 5));

  if (!name || !text) redirect(back("testimonials") + "&error=invalid");

  await prisma.testimonial.create({ data: { name, context, text, rating } });

  revalidateStorefront();
  redirect(back("testimonials") + "&saved=1");
}

export async function updateTestimonial(formData: FormData) {
  const _user = await requireAdmin();
  const id = Number(formData.get("testimonialId"));
  if (!Number.isInteger(id)) redirect(back("testimonials") + "&error=invalid");

  const name = String(formData.get("name") ?? "").trim();
  const context = String(formData.get("context") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  const rating = Math.min(5, Math.max(1, Number(formData.get("rating")) || 5));

  await prisma.testimonial.update({
    where: { id },
    data: { name, context, text, rating },
  });

  revalidateStorefront();
  redirect(back("testimonials") + "&saved=1");
}

export async function deleteTestimonial(formData: FormData) {
  const _user = await requireAdmin();
  const id = Number(formData.get("testimonialId"));
  if (!Number.isInteger(id)) redirect(back("testimonials") + "&error=invalid");
  await prisma.testimonial.delete({ where: { id } });
  revalidateStorefront();
  redirect(back("testimonials") + "&deleted=1");
}

/* ================= Video / Tutorial ================= */

export async function createVideo(formData: FormData) {
  const _user = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const href = String(formData.get("href") ?? "#").trim() || "#";

  if (!title) redirect(back("videos") + "&error=invalid");

  await prisma.videoContent.create({ data: { title, description, href } });

  revalidateStorefront();
  redirect(back("videos") + "&saved=1");
}

export async function updateVideo(formData: FormData) {
  const _user = await requireAdmin();
  const id = Number(formData.get("videoId"));
  if (!Number.isInteger(id)) redirect(back("videos") + "&error=invalid");

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const href = String(formData.get("href") ?? "#").trim() || "#";

  await prisma.videoContent.update({
    where: { id },
    data: { title, description, href },
  });

  revalidateStorefront();
  redirect(back("videos") + "&saved=1");
}

export async function deleteVideo(formData: FormData) {
  const _user = await requireAdmin();
  const id = Number(formData.get("videoId"));
  if (!Number.isInteger(id)) redirect(back("videos") + "&error=invalid");
  await prisma.videoContent.delete({ where: { id } });
  revalidateStorefront();
  redirect(back("videos") + "&deleted=1");
}

/* ================= Urutan & Aktif/Nonaktif (semua koleksi) ================= */

const COLLECTIONS = ["heroImage", "perk", "testimonial", "videoContent"] as const;
type Collection = (typeof COLLECTIONS)[number];

/** Antarmuka operasi yang dipakai bersama oleh semua model koleksi. */
type SortableModel = {
  findMany(args: unknown): Promise<{ id: number; sortOrder: number }[]>;
  update(args: unknown): PrismaPromise<unknown>;
};

function modelFor(collection: Collection): SortableModel {
  switch (collection) {
    case "heroImage":
      return prisma.heroImage;
    case "perk":
      return prisma.perk;
    case "testimonial":
      return prisma.testimonial;
    case "videoContent":
      return prisma.videoContent;
  }
}

function tabFor(collection: Collection) {
  return collection === "heroImage" ? "hero" : collection + "s";
}

export async function moveItem(formData: FormData) {
  const _user = await requireAdmin();
  const collection = String(formData.get("collection") ?? "");
  const id = Number(formData.get("itemId"));
  const direction = String(formData.get("direction") ?? "");

  if (!COLLECTIONS.includes(collection as Collection) || !Number.isInteger(id) || !["up", "down"].includes(direction)) {
    redirect(back(tabFor(collection as Collection) || "hero") + "&error=invalid");
  }

  const model = modelFor(collection as Collection);
  const items = await model.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
  const idx = items.findIndex((it) => it.id === id);
  if (idx === -1) redirect(back(tabFor(collection as Collection)) + "&error=invalid");

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= items.length) redirect(back(tabFor(collection as Collection)));

  const a = items[idx];
  const b = items[swapIdx];
  await prisma.$transaction([
    model.update({ where: { id: a.id }, data: { sortOrder: b.sortOrder } }),
    model.update({ where: { id: b.id }, data: { sortOrder: a.sortOrder } }),
  ]);

  revalidateStorefront();
  redirect(back(tabFor(collection as Collection)));
}

export async function toggleItemActive(formData: FormData) {
  const _user = await requireAdmin();
  const collection = String(formData.get("collection") ?? "");
  const id = Number(formData.get("itemId"));
  const active = String(formData.get("active") ?? "true") === "true";

  if (!COLLECTIONS.includes(collection as Collection) || !Number.isInteger(id)) {
    redirect(back(tabFor(collection as Collection) || "hero") + "&error=invalid");
  }

  const model = modelFor(collection as Collection);
  await model.update({ where: { id }, data: { active } });

  revalidateStorefront();
  redirect(back(tabFor(collection as Collection)));
}
