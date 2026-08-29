import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import LoginForm from "./LoginForm";

/**
 * Login page admin - redirect otomatis jika user sudah login:
 * - Staff/Admin yang sudah login -> redirect ke /admin
 * - Customer yang sudah login -> redirect ke /portal
 */
export default async function LoginPage() {
  const session = await auth();

  if (session?.user?.role === "admin" || session?.user?.role === "mitra") {
    // User sudah login sebagai staff/admin -> redirect ke admin dashboard
    redirect("/admin");
  }

  if (session?.user?.role === "customer") {
    // User sudah login sebagai customer -> redirect langsung ke portal dashboard
    redirect("/portal");
  }

  // Belum login atau session berbeda -> tampilkan form login normal
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
