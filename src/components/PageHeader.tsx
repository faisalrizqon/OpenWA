import { BackLink } from "@/components/BackLink";

/** Halaman konsisten: header dengan judul + deskripsi + back-link seragam. */
export function PageHeader({
  title,
  description,
  backHref,
  action,
}: {
  title: string;
  description?: string;
  backHref?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      {backHref && <BackLink href={backHref} />}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
