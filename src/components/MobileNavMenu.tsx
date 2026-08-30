"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, Menu, PackageSearch, UserRound, Wallet, X } from "lucide-react";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { cn } from "@/lib/utils";

/** Menu navigasi mobile storefront: tombol hamburger di kanan atas membuka
 *  drawer panel penuh (full-height) yang meluncur dari kanan — pola sama
 *  dengan drawer sidebar admin. Item: Katalog, Pricelist, Lacak Order,
 *  WhatsApp, dan Login Member. */
export function MobileNavMenu({ whatsappUrl }: { whatsappUrl: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Tutup menu otomatis saat pindah halaman.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Kunci scroll body + tutup via tombol ESC saat drawer terbuka.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const itemCls = (active: boolean) =>
    cn(
      "flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-medium transition-colors",
      active
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground"
    );

  // Item masuk berurutan saat menu dibuka (delay via CSS var --stagger-delay).
  const delayStyle = (delay: string) =>
    ({ ["--stagger-delay" as string]: delay } as React.CSSProperties);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Tutup menu" : "Buka menu"}
        className="inline-flex size-9 items-center justify-center text-foreground transition-colors"
      >
        <Menu className="size-5" aria-hidden />
      </button>

      {/* Drawer penuh — overlay backdrop + panel meluncur dari kanan */}
      <div
        className={cn("fixed inset-0 z-[100] md:hidden", open ? "pointer-events-auto" : "pointer-events-none")}
        aria-hidden={!open}
      >
        {/* Backdrop */}
        <div
          className={cn(
            "absolute inset-0 bg-black/50 transition-opacity duration-300 ease-out",
            open ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setOpen(false)}
        />

        {/* Panel drawer */}
        <aside
          className={cn(
            "absolute inset-y-0 right-0 flex w-[78vw] max-w-[320px] flex-col overflow-y-auto border-l border-sidebar-border bg-background shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
            open ? "translate-x-0" : "translate-x-full"
          )}
        >
          {/* Header drawer */}
          <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3.5">
            <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Menu
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Tutup menu"
              className="inline-flex size-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          {/* Navigasi */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            <Link
              href="/"
              className={cn(itemCls(pathname === "/"), open && "animate-slide-in-left")}
              onClick={() => setOpen(false)}
              style={delayStyle("0s")}
            >
              <Camera className="size-4.5 shrink-0" aria-hidden />
              Katalog
            </Link>
            <Link
              href="/pricelist"
              className={cn(itemCls(pathname.startsWith("/pricelist")), open && "animate-slide-in-left")}
              onClick={() => setOpen(false)}
              style={delayStyle("0.035s")}
            >
              <Wallet className="size-4.5 shrink-0" aria-hidden />
              Pricelist
            </Link>
            <Link
              href="/track"
              className={cn(itemCls(pathname.startsWith("/track")), open && "animate-slide-in-left")}
              onClick={() => setOpen(false)}
              style={delayStyle("0.07s")}
            >
              <PackageSearch className="size-4.5 shrink-0" aria-hidden />
              Lacak Order
            </Link>

            <div className="my-2 border-t border-border/70" />

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(itemCls(false), open && "animate-slide-in-left")}
              onClick={() => setOpen(false)}
              style={delayStyle("0.105s")}
            >
              <WhatsAppIcon className="size-4.5 shrink-0" aria-hidden />
              WhatsApp
            </a>
          </nav>

          {/* Footer drawer: tombol login menonjol */}
          <div className="border-t border-sidebar-border px-4 py-4">
            <Link
              href="/portal/login"
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 ring-2 ring-primary/40 transition-all hover:bg-primary/90 hover:ring-primary/60",
                open && "animate-slide-in-left"
              )}
              style={delayStyle("0.14s")}
            >
              <UserRound className="size-4.5" aria-hidden />
              Login Member
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
