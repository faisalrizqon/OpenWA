"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, Menu, PackageSearch, UserRound, Wallet, X } from "lucide-react";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { cn } from "@/lib/utils";

/** Menu navigasi mobile storefront: satu tombol hamburger di kanan atas
 *  yang memuat Katalog, Pricelist, Lacak Order, WhatsApp, dan Login Member. */
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

  return (
    <div className="relative md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Tutup menu" : "Buka menu"}
        className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm transition-colors hover:bg-accent"
      >
        {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-40 w-60 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <nav className="flex flex-col p-1.5">
            <Link href="/" className={itemCls(pathname === "/")} onClick={() => setOpen(false)}>
              <Camera className="size-4" aria-hidden />
              Katalog
            </Link>
            <Link href="/pricelist" className={itemCls(pathname.startsWith("/pricelist"))} onClick={() => setOpen(false)}>
              <Wallet className="size-4" aria-hidden />
              Pricelist
            </Link>
            <Link href="/track" className={itemCls(pathname.startsWith("/track"))} onClick={() => setOpen(false)}>
              <PackageSearch className="size-4" aria-hidden />
              Lacak Order
            </Link>

            <div className="my-1.5 border-t border-border/70" />

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={itemCls(false)}
              onClick={() => setOpen(false)}
            >
              <WhatsAppIcon className="size-4" aria-hidden />
              WhatsApp
            </a>
            <Link
              href="/portal/login"
              onClick={() => setOpen(false)}
              className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              <UserRound className="size-4" aria-hidden />
              Login Member
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}
