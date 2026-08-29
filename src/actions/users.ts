"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/permissions";

const userCreateSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(["admin", "mitra"]),
});

export type UserActionResult = { error?: string } | undefined;

/** Buat user baru (admin/mitra). Admin only. */
export async function createUser(formData: FormData): Promise<UserActionResult> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    redirect("/admin?error=forbidden");
  }

  const parsed = userCreateSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").toLowerCase().trim(),
    password: String(formData.get("password") ?? ""),
    role: (String(formData.get("role") ?? "mitra") as "admin" | "mitra"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  // Cek email unik
  const exists = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (exists) {
    return { error: "Email sudah terdaftar" };
  }

  try {
    const hash = await bcrypt.hash(parsed.data.password, 10);
    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash: hash,
        role: parsed.data.role,
      },
    });
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Gagal membuat user",
    };
  }

  void admin; // audit: admin.id (bisa di-log di masa depan)
}

const userUpdateSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1, "Nama wajib diisi"),
  email: z.string().email("Email tidak valid"),
  password: z.string().optional(),
  role: z.enum(["admin", "mitra"]),
});

/** Update user. Bila password kosong, jangan overwrite. Admin only. */
export async function updateUser(formData: FormData): Promise<UserActionResult> {
  let self;
  try {
    self = await requireAdmin();
  } catch {
    redirect("/admin?error=forbidden");
  }

  const parsed = userUpdateSchema.safeParse({
    userId: String(formData.get("userId") ?? ""),
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").toLowerCase().trim(),
    password: String(formData.get("password") ?? "") || undefined,
    role: (String(formData.get("role") ?? "mitra") as "admin" | "mitra"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  // Email unik (exclude self)
  const dup = await prisma.user.findFirst({
    where: { email: parsed.data.email, NOT: { id: parsed.data.userId } },
  });
  if (dup) return { error: "Email sudah dipakai user lain" };

  // Guard: tidak boleh menurunkan admin terakhir
  const existing = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
  });
  if (!existing) return { error: "User tidak ditemukan" };

  if (existing.role === "admin" && parsed.data.role === "mitra") {
    const adminCount = await prisma.user.count({
      where: { role: "admin", active: true },
    });
    if (adminCount <= 1) {
      return { error: "Tidak bisa menurunkan admin terakhir — minimal 1 admin aktif" };
    }
  }

  try {
    const data: {
      name: string;
      email: string;
      role: string;
      passwordHash?: string;
    } = {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
    };
    if (parsed.data.password && parsed.data.password.length >= 6) {
      data.passwordHash = await bcrypt.hash(parsed.data.password, 10);
    }
    await prisma.user.update({
      where: { id: parsed.data.userId },
      data,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Gagal update user" };
  }

  void self;
}

/** Toggle aktif/nonaktif user. Guard: tidak bisa nonaktifkan diri sendiri / admin terakhir. */
export async function toggleUserActive(formData: FormData): Promise<UserActionResult> {
  let self;
  try {
    self = await requireAdmin();
  } catch {
    redirect("/admin?error=forbidden");
  }

  const userId = String(formData.get("userId") ?? "");
  const active = String(formData.get("active") ?? "true") === "true";

  if (!userId) return { error: "User ID wajib" };
  if (userId === self.id) return { error: "Tidak bisa nonaktifkan diri sendiri" };

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "User tidak ditemukan" };

  // Nonaktifkan admin terakhir ditolak
  if (!active && target.role === "admin") {
    const adminCount = await prisma.user.count({
      where: { role: "admin", active: true },
    });
    if (adminCount <= 1) {
      return { error: "Tidak bisa nonaktifkan admin terakhir" };
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { active },
  });
  return undefined;
}

/** Hapus user permanen. Guard: diri sendiri / admin terakhir / yang punya handledOrders. */
export async function deleteUser(formData: FormData): Promise<UserActionResult> {
  let self;
  try {
    self = await requireAdmin();
  } catch {
    redirect("/admin?error=forbidden");
  }

  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { error: "User ID wajib" };
  if (userId === self.id) return { error: "Tidak bisa hapus diri sendiri" };

  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: { _count: { select: { handledOrders: true } } },
  });
  if (!target) return { error: "User tidak ditemukan" };

  if (target.role === "admin") {
    const adminCount = await prisma.user.count({
      where: { role: "admin", active: true },
    });
    if (adminCount <= 1) {
      return { error: "Tidak bisa hapus admin terakhir" };
    }
  }

  if (target._count.handledOrders > 0) {
    // Soft-disable daripada hapus (preserve audit trail)
    await prisma.user.update({
      where: { id: userId },
      data: { active: false },
    });
    return { error: "User punya riwayat order — dinonaktifkan, tidak dihapus" };
  }

  await prisma.user.delete({ where: { id: userId } });
  return undefined;
}
