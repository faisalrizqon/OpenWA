import Link from "next/link";
import { Camera, MessageCircle, MapPin, Clock } from "lucide-react";
import { SHOP, waLink, generalMessage } from "@/lib/shop";

export default function ShopLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="glass sticky top-0 z-30 border-b border-border/70">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-8">
          <Link href="/katalog" className="flex items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Camera className="size-5" aria-hidden />
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-extrabold tracking-tight">{SHOP.name}</span>
              <span className="hidden text-xs text-muted-foreground sm:block">{SHOP.tagline}</span>
            </span>
          </Link>

          <nav className="flex items-center gap-1.5">
            <Link
              href="/katalog"
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Katalog
            </Link>
            <a
              href={waLink(generalMessage())}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              <MessageCircle className="size-4" aria-hidden />
              <span className="hidden sm:inline">Hubungi</span> WhatsApp
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-16 border-t border-border/70 bg-card">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 md:grid-cols-3 md:px-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Camera className="size-4" aria-hidden />
              </span>
              <span className="font-bold">{SHOP.name}</span>
            </div>
            <p className="text-sm text-muted-foreground">{SHOP.tagline}</p>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-semibold">Kontak & Jam</p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="size-4 shrink-0" aria-hidden />
              {SHOP.location}
            </p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <Clock className="size-4 shrink-0" aria-hidden />
              {SHOP.hours}
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-semibold">Pesan Sekarang</p>
            <a
              href={waLink(generalMessage())}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-emerald-600 hover:underline"
            >
              <MessageCircle className="size-4" aria-hidden />
              {SHOP.whatsapp}
            </a>
            <p className="text-muted-foreground">
              Booking cepat & tanya stok langsung via WhatsApp.
            </p>
          </div>
        </div>
        <div className="border-t border-border/70 py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {SHOP.name}. Semua harga dalam Rupiah.
        </div>
      </footer>
    </div>
  );
}
