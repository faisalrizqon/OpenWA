"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { StoreLogo } from "@/components/StoreLogo";
import {
  Menu,
  X,
  Monitor,
  LayoutDashboard,
  ClipboardList,
  Camera,
  Users,
  CalendarDays,
  BarChart3,
  Megaphone,
  BadgePercent,
  Wallet,
  Landmark,
  ShieldCheck,
  ScrollText,
  Store,
  PackageCheck,
  FileCheck,
  Star,
  type LucideIcon,
} from "lucide-react";

type AdminRole = "admin" | "mitra";

interface NavItem {
  label: string;
  href: "/admin" | "/admin/orders" | "/admin/products" | "/admin/customers" | "/admin/calendar" | "/admin/payments" | "/admin/receivables" | "/admin/promos" | "/admin/reports" | "/admin/content" | "/admin/users" | "/admin/audit" | "/admin/whatsapp";
  icon: React.ElementType;
  adminOnly?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const ADMIN_NAV_SECTIONS: NavSection[] = [
  {
    title: "Operasional",
    items: [
      { label: "Dashboard", href: "/admin", icon: Monitor },
      { label: "Orders", href: "/admin/orders", icon: ClipboardList },
      { label: "Kalender", href: "/admin/calendar", icon: CalendarDays },
      { label: "Pembayaran", href: "/admin/payments", icon: Wallet },
      { label: "Piutang", href: "/admin/receivables", icon: Landmark },
    ],
  },
  {
    title: "Manajemen Toko",
    items: [
      { label: "Produk", href: "/admin/products", icon: Camera },
      { label: "Pelanggan", href: "/admin/customers", icon: Users },
      { label: "Promo & Kupon", href: "/admin/promos", icon: BadgePercent },
    ],
  },
  {
    title: "Administrasi",
    items: [
      { label: "Laporan", href: "/admin/reports", icon: BarChart3, adminOnly: true },
      { label: "Konten Toko", href: "/admin/content", icon: Megaphone, adminOnly: true },
      { label: "Pengguna", href: "/admin/users", icon: ShieldCheck, adminOnly: true },
      { label: "Audit Log", href: "/admin/audit", icon: ScrollText, adminOnly: true },
      { label: "WhatsApp", href: "/admin/whatsapp", icon: WhatsAppIcon },
    ],
  },
];

// Customer Portal Navigation
type CustomerHref = "/portal" | "/portal/documents" | "/portal/reviews" | "/portal/orders" | "/portal/catalog";

interface CustomerNavItem {
  label: string;
  href: CustomerHref;
  icon: LucideIcon;
}

interface CustomerNavSection {
  title: string;
  items: CustomerNavItem[];
}

const CUSTOMER_NAV_SECTIONS: CustomerNavSection[] = [
  {
    title: "Dashboard",
    items: [
      { label: "Dashboard", href: "/portal", icon: Monitor },
    ],
  },
  {
    title: "Pesanan",
    items: [
      { label: "Riwayat Pesanan", href: "/portal/orders", icon: PackageCheck },
      { label: "Dokumen Upload", href: "/portal/documents", icon: FileCheck },
    ],
  },
  {
    title: "Belanja",
    items: [
      { label: "Katalog Kamera", href: "/portal/catalog", icon: Camera },
    ],
  },
  {
    title: "Feedback",
    items: [
      { label: "Review Saya", href: "/portal/reviews", icon: Star },
    ],
  },
];

/** Bentuk item nav gabungan (admin & customer) untuk renderer tunggal. */
interface AnyNavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

export function Sidebar({ user, shop }: { user: { name: string; role: AdminRole | "customer"; email: string }; shop: { storeName?: string | null; logoPath?: string | null } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const userIsCustomer = user.role === "customer";

  // Tutup drawer otomatis saat pindah halaman.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Kunci scroll body saat drawer terbuka.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const headerTitle = user.role === "customer" ? "Portal Pelanggan" : shop.storeName ?? "MudahSewa";
  const headerSubtitle = user.role === "customer" ? "Kelola Sewaan Anda" : "Manajemen Rental";
  const badgeColor = user.role === "admin" ? "bg-primary text-primary-foreground" : user.role === "customer" ? "bg-accent text-accent-foreground" : "bg-sky-600 text-white";
  const dotColor = user.role === "admin" ? "bg-red-500" : user.role === "customer" ? "bg-emerald-500" : "bg-blue-500";
  const roleLabel = user.role === "admin" ? "Admin" : user.role === "mitra" ? "Mitra" : "Pelanggan";

  const sections: { title: string; items: AnyNavItem[] }[] = userIsCustomer ? CUSTOMER_NAV_SECTIONS : ADMIN_NAV_SECTIONS;

  /** Navigasi — dipakai bersama oleh drawer mobile dan sidebar desktop.
   *  `stagger`: item masuk berurutan (dipakai drawer saat dibuka). */
  const renderNav = (stagger = false) => (
    <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4 pt-2">
      {sections.map((section, sIdx) => (
        <div key={section.title}>
          <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
            {section.title}
          </p>
          <div className="flex flex-col">
            {section.items.filter((item) => !item.adminOnly || user.role === "admin").map((item, iIdx) => {
              const active = item.href === "/admin" || item.href === "/portal" ? pathname === item.href : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex shrink-0 items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200 ${stagger ? "animate-slide-in-left" : ""} ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                  }`}
                  style={stagger ? { ["--stagger-delay" as string]: `${(sIdx * 4 + iIdx) * 0.035}s` } : undefined}
                >
                  <Icon
                    className={`size-4.5 shrink-0 transition-transform duration-200 ease-out ${
                      active ? "scale-110" : "group-hover:scale-110"
                    }`}
                    aria-hidden
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  /** Konten footer: katalog publik (staff saja) + logout. */
  const renderFooter = () => (
    <div className="mt-auto space-y-2 px-3 pb-4 pt-2">
      {!userIsCustomer && (
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2.5 rounded-xl border border-border/70 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Store className="size-4.5 shrink-0" aria-hidden />
          Lihat Katalog Publik
        </Link>
      )}
      <LogoutButton redirectTo={userIsCustomer ? "/portal/login" : "/login"} />
    </div>
  );

  /** Badge user (nama + role). */
  const renderUserBadge = () => (
    <div className="mx-3 mb-2 flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/50 px-3 py-2">
      <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${badgeColor}`}>
        {user.name.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-sm font-semibold">{user.name}</p>
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <span className={`inline-block size-1.5 rounded-full ${dotColor}`} />
          {roleLabel}
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* ===== Mobile: top bar + hamburger ===== */}
      <div className="sticky top-0 z-30 flex items-center gap-2.5 border-b border-sidebar-border bg-background px-4 py-2.5 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka menu navigasi"
          aria-expanded={open}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent"
        >
          <Menu className="size-5 transition-transform duration-200 ease-out active:scale-90" aria-hidden />
        </button>
        <StoreLogo logoPath={shop.logoPath} storeName={headerTitle} className="size-9" />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[15px] font-extrabold tracking-tight">{headerTitle}</p>
          <p className="truncate text-[11px] text-muted-foreground">{user.name} · {roleLabel}</p>
        </div>
      </div>

      {/* ===== Mobile: drawer overlay — selalu mounted agar animasi buka/tutup mulus ===== */}
      <div
        className={`fixed inset-0 z-50 md:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!open}
        inert={!open}
      >
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ease-out ${open ? "opacity-100" : "opacity-0"}`}
          onClick={() => setOpen(false)}
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-sidebar-border bg-background shadow-xl transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${open ? "translate-x-0" : "-translate-x-full"}`}
        >
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-2.5">
                <StoreLogo logoPath={shop.logoPath} storeName={headerTitle} className="size-9" />
                <div className="leading-tight">
                  <p className="text-[15px] font-extrabold tracking-tight">{headerTitle}</p>
                  <p className="text-xs text-muted-foreground">{headerSubtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup menu navigasi"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div key={String(open)} className="contents">
              {renderUserBadge()}
              {renderNav(true)}
              {renderFooter()}
            </div>
          </aside>
        </div>

      {/* ===== Desktop: sidebar tetap ===== */}
      <aside className="glass sticky top-0 z-30 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border md:flex">
        <div className="flex items-center gap-3 px-5 py-4 md:py-6">
          <StoreLogo logoPath={shop.logoPath} storeName={headerTitle} className="size-10" rounded="rounded-2xl" />
          <div className="leading-tight">
            <p className="text-[15px] font-extrabold tracking-tight">{headerTitle}</p>
            <p className="hidden text-xs text-muted-foreground md:block">{headerSubtitle}</p>
          </div>
        </div>
        {renderUserBadge()}
        {renderNav()}
        {renderFooter()}
      </aside>
    </>
  );
}
