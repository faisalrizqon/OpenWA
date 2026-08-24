import Link from "next/link";
import { Camera, Lock } from "lucide-react";
import { getStoreSettings } from "@/lib/content";
import { CustomerLoginForm } from "@/components/CustomerLoginForm";

/** Login portal customer — tampilan sama seperti /login admin (gradient bg,
 *  card centered), tapi field: No. HP + kata sandi vs email + kata sandi. */
export default async function PortalLoginPage() {
  const shop = await getStoreSettings();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-accent/30 px-4">
      <div className="w-full max-w-sm">
        {/* Logo — link ke landing page */}
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Camera className="size-5" aria-hidden />
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-extrabold tracking-tight">
              {shop.storeName}
            </span>
            <span className="hidden text-xs text-muted-foreground sm:block">
              {shop.tagline}
            </span>
          </span>
        </Link>

        {/* Card login — glassmorphism seperti admin login */}
        <div className="glass rounded-2xl border border-border/70 p-6 shadow-sm sm:p-8">
          <div className="mb-6 text-center">
            <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Lock className="size-7" aria-hidden />
            </span>
            <h1 className="mt-3 text-xl font-bold tracking-tight">Portal Pelanggan</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Masuk untuk lihat riwayat sewa dan review pesanan
            </p>
          </div>

          <CustomerLoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground/70">
          Login pelanggan · akses riwayat dan review pesanan
        </p>
      </div>
    </div>
  );
}
