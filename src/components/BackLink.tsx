import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Tombol kembali seragam: pill mengambang dengan overlay glass (blur + transparan)
 * dan hover micro-interaction (panah geser kiri).
 * Dipakai di semua halaman sub/detail (admin & shop).
 */
export function BackLink({
  href,
  label = "Kembali",
  className,
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex h-9 w-fit items-center gap-2 rounded-full border border-border/70 bg-card/80 px-4 text-sm font-medium shadow-md backdrop-blur-md transition-all hover:-translate-x-0.5 hover:bg-card hover:shadow-lg",
        className
      )}
    >
      <ArrowLeft
        className="size-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5 group-hover:text-foreground"
        aria-hidden
      />
      {label}
    </Link>
  );
}
