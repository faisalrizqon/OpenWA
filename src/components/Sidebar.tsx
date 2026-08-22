"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/", icon: "📊" },
  { label: "Orders", href: "/orders", icon: "🧾" },
  { label: "Produk", href: "/products", icon: "📷" },
  { label: "Pelanggan", href: "/customers", icon: "👤" },
  { label: "Kalender", href: "/calendar", icon: "🗓️" },
  { label: "Laporan", href: "/reports", icon: "📈" },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col border-b bg-white md:w-56 md:h-screen md:sticky md:top-0 md:border-r md:border-b-0">
      <div className="flex items-center gap-2 px-4 py-3 text-lg font-bold whitespace-nowrap">
        📷 <span>MudahSewa</span>
      </div>
      <nav className="flex flex-row gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:pb-4">
        {navItems.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                active
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
