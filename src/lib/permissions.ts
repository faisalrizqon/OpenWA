import { auth } from "@/lib/auth";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "mitra";
};

/** Wajib login. Throw bila tidak ada session. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");
  return session.user as SessionUser;
}

/** Wajib login + role admin. Throw bila bukan admin. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("FORBIDDEN");
  return user;
}

/** Wajib login + role admin atau mitra (semua staf). */
export async function requireMitraOrAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin" && user.role !== "mitra") throw new Error("FORBIDDEN");
  return user;
}

export function isAdmin(role: string | undefined): role is "admin" {
  return role === "admin";
}
