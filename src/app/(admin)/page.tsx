import Link from "next/link";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ClipboardList, Clock3, Wallet, CircleDollarSign, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/pricing";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { HeaderLink } from "@/components/HeaderLink";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function DashboardPage() {
  const [activeCount, lateCount, bookingCount, receivedAgg, openOrders, recentOrders] =
    await Promise.all([
      prisma.order.count({ where: { status: "active" } }),
      prisma.order.count({ where: { status: "late" } }),
      prisma.order.count({ where: { status: "booking" } }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { paymentType: { in: ["dp", "pelunasan"] } },
      }),
      prisma.order.findMany({
        where: { status: { not: "cancelled" } },
        select: { items: { select: { subtotal: true } } },
      }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { customer: true, items: { include: { product: true } } },
      }),
    ]);

  const totalReceived = receivedAgg._sum.amount ?? 0;
  const totalOrderValue = openOrders.reduce(
    (sum, o) => sum + o.items.reduce((s, it) => s + it.subtotal, 0),
    0
  );
  const unpaid = Math.max(0, totalOrderValue - totalReceived);

  const stats = [
    {
      label: "Order Aktif",
      value: String(activeCount),
      icon: ClipboardList,
      tone: "bg-blue-50 text-blue-600",
    },
    {
      label: "Terlambat",
      value: String(lateCount),
      icon: AlertTriangle,
      tone: "bg-red-50 text-red-600",
    },
    {
      label: "Booking",
      value: String(bookingCount),
      icon: Clock3,
      tone: "bg-amber-50 text-amber-600",
    },
    {
      label: "Total Diterima",
      value: formatRupiah(totalReceived),
      icon: CircleDollarSign,
      tone: "bg-emerald-50 text-emerald-600",
      money: true,
    },
    {
      label: "Belum Lunas",
      value: formatRupiah(unpaid),
      icon: Wallet,
      tone: "bg-violet-50 text-violet-600",
      money: true,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Ringkasan operasional rental hari ini"
        action={<HeaderLink href="/orders/new" label="Buat Order" />}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} size="sm">
              <CardContent className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-muted-foreground">{s.label}</p>
                  <p
                    className={`mt-1 font-bold tabular-nums tracking-tight ${
                      s.money ? "text-lg md:text-xl" : "text-2xl md:text-3xl"
                    }`}
                  >
                    {s.value}
                  </p>
                </div>
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${s.tone}`}>
                  <Icon className="size-4.5" aria-hidden />
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Terbaru</CardTitle>
          <CardDescription>8 order terakhir</CardDescription>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="size-5" aria-hidden />}
              title="Belum ada order"
              description="Buat order pertama untuk mulai mengelola penyewaan."
              ctaHref="/orders/new"
              ctaLabel="Buat order pertama"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead>Mulai</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Link href={`/orders/${o.id}`} className="font-medium text-primary hover:underline">
                        {o.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{o.customer.name}</TableCell>
                    <TableCell className="max-w-48 truncate text-muted-foreground">
                      {o.items.map((it) => `${it.product.name} ×${it.quantity}`).join(", ")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {format(new Date(o.startDate), "dd MMM yyyy", { locale: localeId })}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatRupiah(o.items.reduce((s, it) => s + it.subtotal, 0))}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={o.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
