import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

interface QuickActionProps {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string;
  tone?: string;
}

export function QuickAction({ href, icon: Icon, label, description, tone = "bg-blue-50 text-blue-600" }: QuickActionProps) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-all hover:-translate-y-0.5 hover:border-primary/40">
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="size-4.5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{description}</span>
      </span>
    </Link>
  );
}

interface ExternalQuickActionProps {
  href: string;
  icon: React.ElementType;
  label: string;
  description: string;
  tone?: string;
  targetBlank?: boolean;
}

export function ExternalQuickAction({ href, icon: Icon, label, description, tone = "bg-blue-50 text-blue-600", targetBlank = false }: ExternalQuickActionProps) {
  return (
    <a 
      href={href} 
      target={targetBlank ? "_blank" : undefined}
      rel={targetBlank ? "noopener noreferrer" : undefined}
      className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-all hover:-translate-y-0.5 hover:border-emerald-400/60"
    >
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="size-4.5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{label}</span>
        <span className="block truncate text-xs text-muted-foreground">{description}</span>
      </span>
    </a>
  );
}

export function QuickActionsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-5">
        <h3 className="mb-4 text-base font-semibold tracking-tight">{title}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
