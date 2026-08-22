import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Empty state konsisten dengan ikon + teks + CTA opsional. */
export function EmptyState({
  icon,
  title,
  description,
  ctaHref,
  ctaLabel,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-12 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
        {icon}
      </span>
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {ctaHref && ctaLabel && (
        <Link
          href={ctaHref}
          className={cn(buttonVariants({ variant: "default" }), "mt-2 gap-1.5")}
        >
          <Plus className="size-4" aria-hidden />
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
