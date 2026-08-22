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
    <aside className="flex shrink-0 flex-col border-b border-sidebar-border bg-sidebar md:w-60 md:h-screen md:sticky md:top-0 md:border-r md:border-b-0">
      <div className="flex items-center gap-2.5 px-4 py-3.5 md:py-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Camera className="size-5" aria-hidden />
        </span>
        <div className="leading-tight">
          <p className="text-base font-bold tracking-tight">MudahSewa</p>
          <p className="hidden text-xs text-muted-foreground md:block">Manajemen Rental</p>
        </div>
      </div>
      <nav className="flex flex-row gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:px-3 md:pb-4">
        {navItems.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto hidden border-t border-sidebar-border px-4 py-3 text-xs text-muted-foreground md:block">
        Rental digicam · Fase 1
      </div>
    </aside>
  );
}
