import Link from "next/link";
import { Camera } from "lucide-react";
import { getStoreSettings } from "@/lib/content";
import { PortalLoginForm } from "@/components/PortalLoginForm";

/** Login portal customer — berdiri di luar layout (portal) sehingga tidak
 *  ada top bar; tema mengikuti storefront via script anti-FOUC root layout. */
export default async function PortalLoginPage() {
  const shop = await getStoreSettings();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Logo toko — klik kembali ke landing page */}
      <header className="mx-auto w-full max-w-md px-4 pt-10">
        <Link href="/" className="flex items-center justify-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Camera className="size-5" aria-hidden />
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-extrabold tracking-tight">
              {shop.storeName}
            </span>
            <span className="text-xs text-muted-foreground">{shop.tagline}</span>
          </span>
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <PortalLoginForm />
      </main>

      <footer className="pb-8 text-center text-xs text-muted-foreground">
        {shop.storeName} · {shop.location} · WA {shop.whatsapp}
      </footer>
    </div>
  );
}
