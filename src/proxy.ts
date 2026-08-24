import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Guard semua /admin/* — redirect ke /login bila belum auth.
// Admin-only routes: /admin/reports, /admin/content, /admin/users
const ADMIN_ONLY_PREFIXES = ["/admin/reports", "/admin/content", "/admin/users"];

export const config = {
  // Jalankan proxy hanya untuk path admin (skip shop, api publik, static).
  matcher: ["/admin/:path*"],
};

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Tidak ada session → ke login
  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Semua user wajib role 'mitra' atau 'admin' untuk masuk /admin/* —
  // customer (portal) tidak boleh menyentuh area admin sama sekali.
  const isStaff = req.auth.user.role === "mitra" || req.auth.user.role === "admin";
  if (!isStaff) {
    return NextResponse.redirect(
      new URL("/portal/login?error=forbidden", req.nextUrl.origin)
    );
  }

  // Route admin-only → mitra ditolak
  if (ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (req.auth.user.role !== "admin") {
      return NextResponse.redirect(
        new URL("/admin?error=forbidden", req.nextUrl.origin)
      );
    }
  }

  return NextResponse.next();
});
