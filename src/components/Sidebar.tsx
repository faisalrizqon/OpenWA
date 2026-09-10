"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { StoreLogo } from "@/components/StoreLogo";
import { ToggleSidebarButton } from "@/components/ToggleSidebarButton";
import {
  Menu,
  X,
  Monitor,
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

/** LocalStorage key untuk preferensi hide/unhide sidebar desktop. */
const SIDEBAR_STORAGE_KEY = "sidebar-collapsed";

// Mutable store — subscribe di-call tiap kali nilai berubah (same-tab).
let listeners: Array<() => void> = [];
const notifyChange = () => {
  const clone = [...listeners];
  clone.forEach((f) => f());
};

// Store helpers — baca/tulis localStorage dengan try/catch (aman private mode).
const writeCollapsed = (value: boolean) => {
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, value ? "1" : "0");
  } catch {
    /* storage penuh / private mode — abaikan */
  }
  notifyChange(); // trigger re-render dalam tab yang sama
};
const readCollapsed = () => window?.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";

/** Subscribe ke perubahan localStorage di tab lain/window lain + notifier lokal. */
const subscribeCollapsed = (onStoreChange: () => void) => {
  if (typeof window === "undefined") return () => {};
  listeners.push(onStoreChange);
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  return () => {
    listeners = listeners.filter((f) => f !== onStoreChange);
    window.removeEventListener("storage", handler);
  };
};

interface NavItem {
  label: string;
  href:
    | "/admin"
    | "/admin/orders"
    | "/admin/products"
    | "/admin/customers"
    | "/admin/calendar"
    | "/admin/payments"
    | "/admin/receivables"
    | "/admin/promos"
    | "/admin/reports"
    | "/admin/content"
    | "/admin/users"
    | "/admin/audit"
    | "/admin/whatsapp";
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
    items: [{ label: "Dashboard", href: "/portal", icon: Monitor }],
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
    items: [{ label: "Katalog Kamera", href: "/portal/catalog", icon: Camera }],
  },
  {
    title: "Feedback",
    items: [{ label: "Review Saya", href: "/portal/reviews", icon: Star }],
  },
];

/** Bentuk item nav gabungan (admin & customer) untuk renderer tunggal. */
interface AnyNavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

export function Sidebar({
  user,
  shop,
}: {
  user: { name: string; role: AdminRole | "customer"; email: string };
  shop: { storeName?: string | null; logoPath?: string | null };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Tutup drawer otomatis saat pindah halaman — pola "adjust state saat render"
  // (idiom resmi React, lint-safe tanpa effect).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }
  // Preferensi hide/unhide sidebar: store eksternal (localStorage) via
  // useSyncExternalStore — aman SSR/hidrasi (server snapshot = false).
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  // Transisi lebar hanya aktif setelah toggle pertama — supaya restore dari
  // localStorage pasca-hidrasi tidak ikut beranimasi (flash).
  const [animate, setAnimate] = useState(false);
  const userIsCustomer = user.role === "customer";

  /** Toggle hide/unhide sidebar desktop + simpan preferensi & trigger re-render. */
  const toggleCollapsed = useCallback(() => {
    setAnimate(true);
    writeCollapsed(!collapsed);
  }, [collapsed]);

  // Kunci scroll body saat drawer terbuka.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const headerTitle = user.role === "customer" ? "Portal Pelanggan" : shop.storeName ?? "MudahSewa";
  const headerSubtitle = user.role === "customer" ? "Kelola Sewaan Anda" : "Manajemen Rental";
  const badgeColor =
    user.role === "admin"
      ? "bg-primary text-primary-foreground"
      : user.role === "customer"
        ? "bg-accent text-accent-foreground"
        : "bg-sky-600 text-white";
  const dotColor = user.role === "admin" ? "bg-red-500" : user.role === "customer" ? "bg-emerald-500" : "bg-blue-500";
  const roleLabel = user.role === "admin" ? "Admin" : user.role === "mitra" ? "Mitra" : "Pelanggan";

  const sections: { title: string; items: AnyNavItem[] }[] = userIsCustomer
    ? CUSTOMER_NAV_SECTIONS
    : ADMIN_NAV_SECTIONS;

  /** Navigasi — dipakai bersama oleh drawer mobile dan sidebar desktop.
   *  `stagger`: item masuk berurutan (dipakai drawer saat dibuka).
   *  `compact`: mode icon-only untuk sidebar ter-collapse — label tampil
   *  sebagai tooltip saat hover. */
  const renderNav = (stagger = false, compact = false) => (
    <nav
      className={`flex-1 overflow-y-auto pb-4 pt-2 ${
        compact ? "space-y-3 px-2 scrollbar-none" : "space-y-4 px-3"
      }`}
    >
      {sections.map((section, sIdx) => (
        <div key={section.title}>
          {!compact && (
            <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
              {section.title}
            </p>
          )}
          <div className={`flex flex-col ${compact ? "items-center gap-1.5" : ""}`}>
            {section.items
              .filter((item) => !item.adminOnly || user.role === "admin")
              .map((item, iIdx) => {
                const active =
                  item.href === "/admin" || item.href === "/portal"
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    title={compact ? item.label : undefined}
                    className={`group relative flex shrink-0 items-center overflow-hidden rounded-xl transition-all duration-200 ${
                      stagger ? "animate-slide-in-left" : ""
                    } ${
                      compact
                        ? "size-11 justify-center"
                        : "gap-3 px-3 py-2.5 text-sm font-medium whitespace-nowrap"
                    } ${
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                    }`}
                    style={stagger ? { ["--stagger-delay" as string]: `${(sIdx * 4 + iIdx) * 0.035}s` } : undefined}
                  >
                    <Icon className="size-4.5 shrink-0" aria-hidden />
                    {!compact && item.label}
                  </Link>
                );
              })}
          </div>
        </div>
      ))}
    </nav>
  );

  /** Konten footer: katalog publik (staff saja) + logout.
   *  `compact`: hanya tombol logout icon-only untuk sidebar ter-collapse. */
  const renderFooter = (compact = false) => (
    <div className="mt-auto space-y-2 px-3 pb-4 pt-2">
      {!userIsCustomer && !compact && (
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-2.5 rounded-xl border border-border/70 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Store className="size-4.5 shrink-0" aria-hidden />
          Lihat Katalog Publik
        </Link>
      )}
      <LogoutButton
        redirectTo={userIsCustomer ? "/portal/login" : "/login"}
        label={compact ? undefined : "Keluar"}
        iconOnly={compact}
      />
    </div>
  );

  /** Badge user (nama + role).
   *  `compact`: hanya icon initials, tanpa teks — posisi & spacing tetap sama. */
  const renderUserBadge = (compact = false) => (
    <div className={`mb-2 ${compact ? "flex justify-center px-2" : "mx-3"}`}>
      {compact ? (
        <div
          className="flex size-11 items-center justify-center rounded-xl border border-border/60 bg-card/50"
          title={user.name}
          aria-label={user.name}
        >
          <span
            className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${badgeColor}`}
          >
            {user.name.charAt(0).toUpperCase()}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/50 px-3 py-2">
          <span
            className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${badgeColor}`}
          >
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
      )}
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
          <p className="truncate text-[11px] text-muted-foreground">
            {user.name} · {roleLabel}
          </p>
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

      {/* ===== Desktop: sidebar tetap — collapse jadi rail icon dengan cross-fade smooth ===== */}
      <aside
        className={`glass sticky top-0 z-30 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-sidebar-border md:flex ${
          animate ? "transition-[width] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]" : ""
        } ${collapsed ? "w-[76px]" : "w-64"}`}
      >
        <div className="relative h-full w-64">
          {/* Layer expanded — fade out lebih dulu saat collapse */}
          <div
            className={`absolute inset-0 flex flex-col transition-opacity ease-in-out ${
              collapsed ? "pointer-events-none opacity-0 duration-100" : "opacity-100 duration-200 delay-150"
            }`}
            aria-hidden={collapsed}
            inert={collapsed}
          >
            <div className="flex items-center gap-3 px-5 py-4 md:py-6">
              <StoreLogo logoPath={shop.logoPath} storeName={headerTitle} className="size-10" rounded="rounded-2xl" />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-[15px] font-extrabold tracking-tight">{headerTitle}</p>
                <p className="hidden text-xs text-muted-foreground md:block">{headerSubtitle}</p>
              </div>
              <ToggleSidebarButton collapsed={collapsed} onClick={toggleCollapsed} />
            </div>
            {renderUserBadge(false)}
            {renderNav(false, false)}
            {renderFooter(false)}
          </div>

          {/* Layer collapsed (rail) — pinned kiri, fade in setelah lebar mulai menyusut */}
          <div
            className={`absolute inset-y-0 left-0 flex w-[76px] flex-col transition-opacity ease-in-out ${
              collapsed ? "opacity-100 duration-200 delay-100" : "pointer-events-none opacity-0 duration-100"
            }`}
            aria-hidden={!collapsed}
            inert={!collapsed}
          >
            <div className="flex flex-col items-center gap-2 px-0 py-4 md:py-6">
              <StoreLogo logoPath={shop.logoPath} storeName={headerTitle} className="size-10" rounded="rounded-2xl" />
              <ToggleSidebarButton collapsed={collapsed} onClick={toggleCollapsed} />
            </div>
            {renderUserBadge(true)}
            {renderNav(false, true)}
            {renderFooter(true)}
          </div>
        </div>
      </aside>
    </>
  );
}
