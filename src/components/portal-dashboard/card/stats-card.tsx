import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
  label: string;
  value: string;
  sub?: string;
  Icon: React.ElementType;
  tone: string;
  children?: React.ReactNode;
}

export function StatsCard({ label, value, sub, Icon, tone, children }: StatsCardProps) {
  return (
    <Card className="shadow-none">
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium leading-snug text-muted-foreground">{label}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <p className="break-words text-xl font-bold tabular-nums tracking-tight md:text-2xl">{value}</p>
            {children}
          </div>
          {sub && <p className="mt-2 truncate text-xs text-muted-foreground">{sub}</p>}
        </div>
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="size-4.5" aria-hidden />
        </span>
      </CardContent>
    </Card>
  );
}
