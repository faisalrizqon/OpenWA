"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Camera,
  Users,
  CalendarDays,
  BarChart3,
  Store,
  type LucideIcon,
} from "lucide-react";

const navItems: { label: string; href: "/" | "/orders" | "/products" | "/customers" | "/calendar" | "/reports"; icon: LucideIcon }[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Orders", href: "/orders", icon: ClipboardList },
  { label: "Produk", href: "/products", icon: Camera },
  { label: "Pelanggan", href: "/customers", icon: Users },
  { label: "Kalender", href: "/calendar", icon: CalendarDays },
  { label: "Laporan", href: "/reports", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="glass sticky top-0 z-30 flex shrink-0 flex-col border-b border-sidebar-border md:h-screen md:w-64 md:border-r md:border-b-0">
      <div className="flex items-center gap-3 px-5 py-4 md:py-6">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <Camera className="size-5" aria-hidden />
        </span>
        <div className="leading-tight">
          <p className="text-[15px] font-extrabold tracking-tight">MudahSewa</p>
          <p className="hidden text-xs text-muted-foreground md:block">Manajemen Rental</p>
        </div>
      </div>
      <p className="hidden px-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 md:block">
        Menu
      </p>
      <nav className="flex flex-row gap-1 overflow-x-auto px-3 pb-2 md:flex-col md:px-3 md:pb-4">
        {navItems.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-all ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <Icon
                className={`size-4.5 shrink-0 transition-transform group-hover:scale-110 ${
                  active ? "" : "text-muted-foreground/80"
                }`}
                aria-hidden
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto space-y-2 px-3 pb-4 pt-2">
        <Link
          href="/katalog"
          target="_blank"
          className="flex items-center gap-2.5 rounded-xl border border-border/70 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Store className="size-4.5 shrink-0" aria-hidden />
          Lihat Katalog Publik
        </Link>
        <span className="hidden items-center gap-1.5 px-2 text-xs text-muted-foreground/70 md:inline-flex">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Rental digicam · Fase 1
        </span>
      </div>
    </aside>
  );
}
