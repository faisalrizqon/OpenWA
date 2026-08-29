import Link from "next/link";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Search, ArrowLeft, ScrollText, UserRound } from "lucide-react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BackLink } from "@/components/BackLink";
import { cn } from "@/lib/utils";

const ENTITY_COLORS: Record<string, string> = {
  order: "bg-blue-100 text-blue-700 ring-blue-300",
  product: "bg-emerald-100 text-emerald-700 ring-emerald-300",
  customer: "bg-amber-100 text-amber-700 ring-amber-300",
  unit: "bg-violet-100 text-violet-700 ring-violet-300",
  payment: "bg-cyan-100 text-cyan-700 ring-cyan-300",
  user: "bg-rose-100 text-rose-700 ring-rose-300",
  settings: "bg-gray-100 text-gray-700 ring-gray-300",
};

const ACTION_LABELS: Record<string, string> = {
  create: "Dibuat",
  update: "Diedit",
  delete: "Dihapus",
  status_change: "Status diganti",
};

export default async function AuditLogPage({ searchParams }: PageProps<"/admin/audit">) {
  const sp = await searchParams;
  const qRaw = Array.isArray(sp.q) ? sp.q[0] : sp.q ?? "";
  const q = decodeURIComponent(qRaw);

  const logs = await prisma.auditLog.findMany({
    where: q ? { summary: { contains: q }, entityType: { notIn: ["settings"] } } : {},
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Jejak perubahan data sistem oleh admin/mitra."
      />

      <Card>
        <CardContent className="space-y-4">
          <form action="/admin/audit">
            <div className="flex gap-2">
              <Input
                name="q"
                placeholder="Cari catatan (order/pelanggan/dll)..."
                defaultValue={q}
                className="max-w-sm"
              />
              <button type="submit" className="inline-flex items-center rounded-lg bg-primary px-3 text-sm font-medium text-white shadow transition-colors hover:bg-primary/90">
                <Search className="mr-2 size-4" aria-hidden />
                Cari
              </button>
            </div>
          </form>

          {logs.length === 0 ? (
            <EmptyState
              icon={<ScrollText className="size-5" aria-hidden />}
              title="Tidak ada data"
              description="Coba kata kunci pencarian lain atau perluas filter."
              ctaHref="/admin/orders/new"
              ctaLabel="Buat Order Pertama"
            />
          ) : (
            <ul className="space-y-3">
              {logs.map((log) => (
                <li key={log.id}>
                  <Card className="group overflow-hidden border-border/60">
                    <CardContent className="p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={cn("ring-1", ENTITY_COLORS[log.entityType])}>
                              {log.entityType.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">{ACTION_LABELS[log.action]}</Badge>
                            {log.user && (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <UserRound className="size-3.5" aria-hidden />
                                {log.user.name}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              {format(log.createdAt, "dd MMMM yyyy HH:mm", { locale: localeId })}
                            </span>
                          </div>
                          <p className="truncate text-sm font-medium text-foreground">{log.summary}</p>
                        </div>
                        <Link
                          href={
                            log.entityType === "order"
                              ? `/admin/orders/${log.entityId}`
                              : log.entityType === "product"
                                ? `/admin/products/${log.entityId}`
                                : log.entityType === "customer"
                                  ? `/admin/customers/${log.entityId}`
                                  : log.entityType === "payment"
                                    ? `/admin/payments`
                                    : log.entityType === "user"
                                      ? `/admin/users/${log.entityId}`
                                      : "#"
                          }
                          className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-md bg-accent px-2 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent-hover group-hover:-translate-y-0.5"
                        >
                          Detail
                        </Link>
                      </div>
                      {log.detail && (
                        <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                          {log.detail}
                        </pre>
                      )}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
