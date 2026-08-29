"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import {
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
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
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
      { label: "Beranda", href: "/portal", icon: LayoutDashboard },
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

export function Sidebar({ user }: { user: { name: string; role: AdminRole | "customer"; email: string } }) {
  const pathname = usePathname();
  const userIsCustomer = user.role === "customer";

  const headerTitle = user.role === "customer" ? "Portal Pelanggan" : "MudahSewa";
  const headerSubtitle = user.role === "customer" ? "Kelola Sewaan Anda" : "Manajemen Rental";
  const iconColor = user.role === "admin" ? "bg-primary text-primary-foreground" : user.role === "customer" ? "bg-accent text-accent-foreground" : "bg-sky-600 text-white";
  const badgeColor = user.role === "admin" ? "bg-primary text-primary-foreground" : user.role === "customer" ? "bg-accent text-accent-foreground" : "bg-sky-600 text-white";
  const dotColor = user.role === "admin" ? "bg-red-500" : user.role === "customer" ? "bg-emerald-500" : "bg-blue-500";

  return (
    <aside className="glass sticky top-0 z-30 flex shrink-0 flex-col border-b border-sidebar-border md:h-screen md:w-64 md:border-r md:border-b-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 md:py-6">
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-2xl shadow-sm ${iconColor}`}>
          {user.role === "customer" ? (
            <Users className="size-5" aria-hidden />
          ) : (
            <Camera className="size-5" aria-hidden />
          )}
        </span>
        <div className="leading-tight">
          <p className="text-[15px] font-extrabold tracking-tight">{headerTitle}</p>
          <p className="hidden text-xs text-muted-foreground md:block">{headerSubtitle}</p>
        </div>
      </div>

      {/* User Badge */}
      <div className="mx-3 mb-2 flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/50 px-3 py-2">
        <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${badgeColor}`}>
          {user.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className={`inline-block size-1.5 rounded-full ${dotColor}`} />
            {user.role === "admin" && "Admin"}
            {user.role === "mitra" && "Mitra"}
            {user.role === "customer" && "Pelanggan"}
          </p>
        </div>
      </div>

      {/* Navigation - Conditional berdasarkan role */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4 pt-2">
        {userIsCustomer ? (
          CUSTOMER_NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {section.title}
              </p>
              <div className="flex flex-row gap-2 overflow-x-auto md:flex-col md:overflow-x-visible">
                {section.items.map((item) => {
                  const active = item.href === "/portal" ? pathname === "/portal" : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex shrink-0 items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-all ${
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                      }`}
                    >
                      <Icon
                        className={`size-4.5 shrink-0 transition-transform duration-150 ${
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
          ))
        ) : (
          ADMIN_NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {section.title}
              </p>
              <div className="flex flex-row gap-2 overflow-x-auto md:flex-col md:overflow-x-visible">
                {section.items.filter((item) => !item.adminOnly || user.role === "admin").map((item) => {
                  const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex shrink-0 items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-all ${
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                      }`}
                    >
                      <Icon
                        className={`size-4.5 shrink-0 transition-transform duration-150 ${
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
          ))
        )}
      </nav>

      {/* Footer - Catalog & Logout */}
      <div className="mt-auto space-y-2 px-3 pb-4 pt-2">
        {/* Catalog Link - only for admin/mitra, not customer */}
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

        {/* Logout Button */}
        <LogoutButton redirectTo={userIsCustomer ? "/portal/login" : "/login"} />
      </div>
    </aside>
  );
}
