import { Sidebar } from "@/components/Sidebar";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { syncLateOrders } from "@/lib/late";
import { ResetThemePortalAdmin } from "@/components/ResetThemePortalAdmin";
export default async function AdminLayout({ children }: LayoutProps<"/">) {
  const session = await auth();

  // Guard lapis kedua (setelah proxy.ts): bila ada session customer yang
  // somehow lolos dari middleware, langsung lempar keluar — jangan render.
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "admin" && session.user.role !== "mitra") {
    redirect("/portal/login?error=forbidden");
  }

  // Auto-transisi active → late untuk order yang lewat tanggal kembali (throttled 1x/menit).
  await syncLateOrders();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <ResetThemePortalAdmin />
      <Sidebar
        user={{
          name: session.user.name ?? "User",
          email: session.user.email ?? "",
          role: session.user.role as "admin" | "mitra",
        }}
      />
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
