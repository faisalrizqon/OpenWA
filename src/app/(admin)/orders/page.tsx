import Link from "next/link";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ClipboardList } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/pricing";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { HeaderLink } from "@/components/HeaderLink";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const STATUS_TABS: Record<string, string> = {
  "": "Semua",
  booking: "Booking",
  active: "Aktif",
  late: "Terlambat",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export default async function OrdersPage({
  searchParams,
}: PageProps<"/orders">) {
  const statusParam = await searchParams;
  const status = Array.isArray(statusParam.status) ? statusParam.status[0] : statusParam.status;
  const validStatuses = ["booking", "active", "late", "completed", "cancelled"];
  const filter = validStatuses.includes(status ?? "") ? (status as string) : undefined;

  const orders = await prisma.order.findMany({
    where: filter ? { status: filter } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      items: { include: { product: true } },
      payments: true,
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Siklus booking → aktif → selesai"
        action={<HeaderLink href="/orders/new" label="Buat Order" />}
      />

      <div className="flex flex-wrap gap-1.5">
        {Object.entries(STATUS_TABS).map(([value, label]) => {
          const active = (filter ?? "") === value;
          const href = value === "" ? "/orders" : `/orders?status=${value}`;
          return (
            <Link
              key={value || "all"}
              href={href}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Order</CardTitle>
          <CardDescription>
            {filter ? `Status: ${STATUS_TABS[filter]}` : "Semua status"} · {orders.length} order
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="size-5" aria-hidden />}
              title={filter ? `Belum ada order ${STATUS_TABS[filter].toLowerCase()}` : "Belum ada order"}
              description="Order baru dibuat dengan status Booking dan aktif saat barang diambil."
              ctaHref="/orders/new"
              ctaLabel="Buat order pertama"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor</TableHead>
                  <TableHead>Mulai</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Dibayar</TableHead>
                  <TableHead className="text-right">Sisa</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => {
                  const total = o.items.reduce((s, it) => s + it.subtotal, 0);
                  const paid = o.payments
                    .filter((p) => ["dp", "pelunasan", "denda"].includes(p.paymentType) && p.status !== "pending")
                    .reduce((s, p) => s + p.amount, 0);
                  const sisa = total - paid;
                  const itemSummary = o.items
                    .map((it) => `${it.product.name} ×${it.quantity}`)
                    .join(", ");
                  return (
                    <TableRow key={o.id}>
                      <TableCell>
                        <Link href={`/orders/${o.id}`} className="flex items-center gap-2 font-medium text-primary hover:underline">
                          {o.orderNumber}
                          {o.source === "online" && (
                            <Badge variant="secondary" className="h-5 text-[10px]">Online</Badge>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {format(new Date(o.startDate), "dd MMM yyyy", { locale: localeId })}
                      </TableCell>
                      <TableCell>{o.customer.name}</TableCell>
                      <TableCell className="max-w-48 truncate text-muted-foreground">
                        {itemSummary}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatRupiah(total)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatRupiah(paid)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums",
                          sisa > 0 ? "font-semibold text-red-600" : "text-muted-foreground"
                        )}
                      >
                        {formatRupiah(sisa)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={o.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
