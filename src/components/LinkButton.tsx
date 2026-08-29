import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE =
  "inline-flex h-9 w-fit items-center gap-2 rounded-full border px-4 text-sm font-medium shadow-md backdrop-blur-md transition-all duration-200";
const HOVER = "hover:-translate-y-0.5 hover:shadow-lg";

const TONES = {
  /** Glass netral — sama persis dengan BackLink. */
  neutral: "border-border/70 bg-card/80 text-foreground hover:bg-card",
  /** Hijau solid — aksi WhatsApp. */
  emerald:
    "border-emerald-600/20 bg-emerald-600 text-white hover:bg-emerald-700",
  /** Kuning solid — pengingat/aksi penting. */
  amber: "border-amber-500/20 bg-amber-500 text-white hover:bg-amber-600",
  /** Biru solid — reminder informatif. */
  blue: "border-blue-600/20 bg-blue-600 text-white hover:bg-blue-700",
  /** Merah solid — peringatan. */
  rose: "border-rose-600/20 bg-rose-600 text-white hover:bg-rose-700",
} as const;

/**
 * Link yang membuka tab baru (WhatsApp, bukti bayar, katalog publik, dll).
 * Bentuk & animasi konsisten dengan BackLink; ikon ↗ menandakan "buka tab baru".
 */
export function ExternalLink({
  href,
  label,
  icon,
  tone = "neutral",
  className,
  hideArrow,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
  tone?: keyof typeof TONES;
  className?: string;
  hideArrow?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(BASE, HOVER, TONES[tone], className)}
    >
      {icon}
      {label}
      {!hideArrow && <ArrowUpRight className="size-3.5 opacity-70" aria-hidden />}
    </a>
  );
}

/**
 * Link internal bergaya pill (BackLink-like) untuk aksi "→ ke halaman lain"
 * dalam aplikasi: Lihat detail →, Kelola →, Lihat Kalender →, dll.
 */
export function ArrowLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        BASE,
        HOVER,
        TONES.neutral,
        "group",
        className
      )}
    >
      <span>{label}</span>
      <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
