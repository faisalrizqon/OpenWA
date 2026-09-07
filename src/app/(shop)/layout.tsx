import Link from "next/link";
import { Camera, MapPin, Clock, UserRound } from "lucide-react";
import { getStoreSettings } from "@/lib/content";
import { waLink, generalMessage } from "@/lib/shop";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { ShopTheme } from "@/components/ShopTheme";
import { OpenClosedSign } from "@/components/OpenClosedSign";
import { MobileNavMenu } from "@/components/MobileNavMenu";
import { StoreLogo } from "@/components/StoreLogo";

export default async function ShopLayout({ children }: LayoutProps<"/">) {
  const shop = await getStoreSettings();

  return (
    <div className="flex min-h-screen flex-col">
      <ShopTheme />
      <header className="glass sticky top-0 z-30 border-b border-border/70">
        {/* Top bar: logo kiri, papan OPEN/CLOSED, nav kanan */}
        <div className="relative mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-2 px-3 py-1.5 sm:gap-x-4 sm:px-4 sm:py-2 md:px-8">
          {/* Kiri: logo */}
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <StoreLogo logoPath={shop.logoPath} storeName={shop.storeName} className="size-9" />
            <span className="leading-tight">
              <span className="block text-[15px] font-extrabold tracking-tight">{shop.storeName}</span>
              <span className="hidden text-xs text-muted-foreground sm:block">{shop.tagline}</span>
            </span>
          </Link>

          {/* Kanan mobile: tombol menu hamburger saja (papan kayu digantung terpisah sebagai overlay) */}
          <div className="flex items-center gap-2 sm:hidden">
            <MobileNavMenu whatsappUrl={waLink(shop.whatsapp, generalMessage(shop.storeName))} />
          </div>

          {/* Papan kayu OPEN/CLOSED mobile — menggantung melewati (overlay) bawah top bar */}
          <div className="pointer-events-none absolute right-24 top-5 z-40 sm:hidden">
            <div className="pointer-events-auto scale-[0.68]" style={{ transformOrigin: "top right" }}>
              <OpenClosedSign hours={shop.hours} />
            </div>
          </div>

          {/* Tengah: papan gantung OPEN/CLOSED.
              <lg: jadi baris kedua rata tengah supaya tidak menabrak logo/nav;
              ≥lg: inline di antara logo dan nav. */}
          <div className="relative order-3 hidden basis-full justify-center sm:flex lg:order-none lg:h-10 lg:basis-auto lg:shrink-0">
            <div className="lg:absolute lg:left-1/2 lg:top-[14px] lg:-translate-x-1/2">
              <OpenClosedSign hours={shop.hours} />
            </div>
          </div>

          {/* Kanan: nav */}
          <nav className="hidden items-center gap-2 sm:flex sm:gap-4">
            <Link
              href="/"
              className="inline-flex h-9 items-center rounded-lg px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:text-sm"
            >
              Katalog
            </Link>
            <Link
              href="/pricelist"
              className="inline-flex h-9 items-center rounded-lg px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:text-sm"
            >
              Pricelist
            </Link>
            <Link
              href="/track"
              className="hidden h-9 items-center rounded-lg px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:inline-flex sm:text-sm"
            >
              Lacak Order
            </Link>
            <Link
              href="/portal/login"
              className="relative inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:text-sm"
            >
              <UserRound className="size-4" aria-hidden />
              <span className="hidden sm:inline">Login Member</span>
              {/* Titik notifikasi */}
              <span className="absolute -right-1 -top-1 flex size-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500"></span>
              </span>
            </Link>
            <a
              href={waLink(shop.whatsapp, generalMessage(shop.storeName))}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700 sm:inline-flex sm:text-sm"
            >
              <WhatsAppIcon aria-hidden />
              <span className="hidden md:inline">WhatsApp</span>
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 border-t border-border/70 bg-card">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 md:grid-cols-3 md:px-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <StoreLogo logoPath={shop.logoPath} storeName={shop.storeName} className="size-8" rounded="rounded-lg" iconClassName="size-4" />
              <span className="font-bold">{shop.storeName}</span>
            </div>
            <p className="text-sm text-muted-foreground">{shop.tagline}</p>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-semibold">Kontak & Jam</p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="size-4 shrink-0" aria-hidden />
              {shop.location}
            </p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <Clock className="size-4 shrink-0" aria-hidden />
              {shop.hours}
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-semibold">Pesan Sekarang</p>
            <a
              href={waLink(shop.whatsapp, generalMessage(shop.storeName))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-emerald-600 hover:underline"
            >
              <WhatsAppIcon className="text-emerald-500" aria-hidden />
              {shop.whatsapp}
            </a>
            <p className="text-muted-foreground">
              Booking cepat & tanya stok langsung via WhatsApp.
            </p>
          </div>
        </div>
        <div className="border-t border-border/70 py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {shop.storeName}. Semua harga dalam Rupiah.
        </div>
      </footer>
    </div>
  );
}
