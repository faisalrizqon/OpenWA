import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
// Guard semua /admin/* dan /portal/* (kecuali /portal/login) — redirect bila belum auth.
// Admin-only routes: /admin/reports, /admin/content, /admin/users
const ADMIN_ONLY_PREFIXES = ["/admin/reports", "/admin/content", "/admin/users"];

export const config = {
  // Jalankan proxy hanya untuk path admin & portal (skip shop, api publik, static).
  matcher: ["/admin/:path*", "/portal/:path*"],
};

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // --- /portal/* (customer) ---
  if (pathname.startsWith("/portal/login")) return NextResponse.next();

  if (pathname.startsWith("/portal")) {
    if (!req.auth) {
      return NextResponse.redirect(new URL("/portal/login", req.nextUrl.origin));
    }
    if (req.auth.user.role !== "customer") {
      return NextResponse.redirect(new URL("/admin", req.nextUrl.origin));
    }
    return NextResponse.next();
  }

  // --- /admin/* ---
  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isStaff = req.auth.user.role === "mitra" || req.auth.user.role === "admin";
  if (!isStaff) {
    return NextResponse.redirect(
      new URL("/portal/login?error=forbidden", req.nextUrl.origin)
    );
  }

  if (ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (req.auth.user.role !== "admin") {
      return NextResponse.redirect(new URL("/admin?error=forbidden", req.nextUrl.origin));
    }
  }

  return NextResponse.next();
});
