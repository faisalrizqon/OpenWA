import { Sidebar } from "@/components/Sidebar";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ResetThemePortalAdmin } from "@/components/ResetThemePortalAdmin";
import { getStoreSettings } from "@/lib/content";

/** Layout portal customer: sidebar navigation + content area */
export default async function PortalLayout({ children }: LayoutProps<"/portal">) {
  const session = await auth();

  // Guard lapis kedua (setelah proxy.ts): bila ada session customer yang
  // somehow lolos dari middleware, langsung lempar keluar — jangan render.
  if (!session?.user) {
    redirect("/portal/login");
  }
  if (session.user.role !== "customer") {
    redirect("/portal/login?error=forbidden");
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <ResetThemePortalAdmin />
      <Sidebar
        user={{
          name: session.user.name ?? "User",
          email: session.user.email ?? "",
          role: "customer" as const,
        }}
        shop={await getStoreSettings()}
      />
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
