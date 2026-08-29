"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, Menu, PackageSearch, UserRound, Wallet, X } from "lucide-react";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { cn } from "@/lib/utils";

/** Menu navigasi mobile storefront: satu tombol hamburger di kanan atas
 *  yang memuat Katalog, Pricelist, Lacak Order, WhatsApp, dan Login Member.
 *  Dropdown selalu mounted — buka/tutup lewat transisi opacity+scale yang mulus. */
export function MobileNavMenu({ whatsappUrl }: { whatsappUrl: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Tutup menu otomatis saat pindah halaman.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const itemCls = (active: boolean) =>
    cn(
      "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
      active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground"
    );

  // Item masuk berurutan saat menu dibuka (delay via CSS var --stagger-delay).
  const delayStyle = (delay: string) =>
    ({ ["--stagger-delay" as string]: delay } as React.CSSProperties);

  return (
    <div className="relative md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Tutup menu" : "Buka menu"}
        className="inline-flex size-9 items-center justify-center text-foreground transition-colors"
      >
        {open ? (
          <X className="size-5 animate-pop" aria-hidden />
        ) : (
          <Menu className="size-5 animate-pop" aria-hidden />
        )}
      </button>

      {/* Menu dropdown — selalu mounted untuk animasi mulus */}
      <div
        className={`absolute right-0 top-11 z-40 w-60 overflow-hidden rounded-xl border border-border bg-card shadow-lg transition-all duration-300 ease-out origin-top ${open ? "opacity-100 scale-100 translate-y-0" : "pointer-events-none opacity-0 scale-95 -translate-y-2"}`}
      >
        {open && (
          <nav className="flex flex-col p-1.5">
            <Link href="/" className={cn(itemCls(pathname === "/"), "animate-slide-in-left")} onClick={() => setOpen(false)} style={delayStyle("0s")}>
              <Camera className="size-4" aria-hidden />
              Katalog
            </Link>
            <Link href="/pricelist" className={cn(itemCls(pathname.startsWith("/pricelist")), "animate-slide-in-left")} onClick={() => setOpen(false)} style={delayStyle("0.035s")}>
              <Wallet className="size-4" aria-hidden />
              Pricelist
            </Link>
            <Link href="/track" className={cn(itemCls(pathname.startsWith("/track")), "animate-slide-in-left")} onClick={() => setOpen(false)} style={delayStyle("0.07s")}>
              <PackageSearch className="size-4" aria-hidden />
              Lacak Order
            </Link>

            <div className="my-1.5 border-t border-border/70" />

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(itemCls(false), "animate-slide-in-left")}
              onClick={() => setOpen(false)}
              style={delayStyle("0.105s")}
            >
              <WhatsAppIcon className="size-4" aria-hidden />
              WhatsApp
            </a>
            <Link
              href="/portal/login"
              onClick={() => setOpen(false)}
              className="mt-1 animate-slide-in-left inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              style={delayStyle("0.14s")}
            >
              <UserRound className="size-4" aria-hidden />
              Login Member
            </Link>
          </nav>
        )}
      </div>
    </div>
  );
}
