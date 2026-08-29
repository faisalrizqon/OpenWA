import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  PlayCircle,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Grid aksi cepat — shortcut operasional, termasuk antrian anti-spam.
 */
export function QuickActionGrid({
  pendingBookings,
  pendingConfirmation,
}: {
  pendingBookings: number;
  pendingConfirmation: number;
}) {
  const actions = [
    {
      href: "/admin/orders?status=pending",
      icon: ShieldAlert,
      label:
        pendingConfirmation > 0
          ? `Perlu Konfirmasi (${pendingConfirmation})`
          : "Perlu Konfirmasi",
      desc: "Order online baru — terima atau tolak",
      tone: "bg-orange-50 text-orange-600",
    },
    {
      href: "/admin/orders?period=today",
      icon: PlayCircle,
      label: "Order Hari Ini",
      desc: "Sewa yang berjalan hari ini",
      tone: "bg-blue-50 text-blue-600",
    },
    {
      href: "/admin/orders?status=booking",
      icon: Clock3,
      label: pendingBookings > 0 ? `Booking Menunggu (${pendingBookings})` : "Booking Menunggu",
      desc: "Konfirmasi & aktifkan order",
      tone: "bg-amber-50 text-amber-600",
    },
    {
      href: "/admin/reports",
      icon: TrendingUp,
      label: "Laporan Lengkap",
      desc: "Pendapatan & statistik rental",
      tone: "bg-emerald-50 text-emerald-600",
    },
    {
      href: "/admin/calendar",
      icon: CalendarDays,
      label: "Kalender Sewa",
      desc: "Jadwal ketersediaan unit",
      tone: "bg-violet-50 text-violet-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <Link
            key={a.href}
            href={a.href}
            className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                a.tone
              )}
            >
              <Icon className="size-4.5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1 text-sm font-semibold">
                <span className="truncate">{a.label}</span>
                <ArrowRight
                  className="size-3.5 shrink-0 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                  aria-hidden
                />
              </span>
              <span className="block truncate text-xs text-muted-foreground">{a.desc}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
