import Link from "next/link";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/pricing";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  return (
    <div className="p-4 space-y-6 md:p-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <Card>
          <CardHeader>
            <CardDescription>Order Aktif</CardDescription>
            <CardTitle className="text-3xl">{activeCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Terlambat</CardDescription>
            <CardTitle className="text-3xl">{lateCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Booking</CardDescription>
            <CardTitle className="text-3xl">{bookingCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Diterima</CardDescription>
            <CardTitle className="text-2xl">{formatRupiah(totalReceived)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Belum Lunas</CardDescription>
            <CardTitle className="text-2xl">{formatRupiah(unpaid)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Terbaru</CardTitle>
          <CardDescription>8 order terakhir</CardDescription>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500">
              <p>Belum ada order.</p>
              <Link
                href="/orders/new"
                className="mt-2 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Buat order pertama
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nomor</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead>Mulai</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Link href={`/orders/${o.id}`} className="font-medium hover:underline">
                        {o.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{o.customer.name}</TableCell>
                    <TableCell>
                      {o.items.map((it) => `${it.product.name} ×${it.quantity}`).join(", ")}
                    </TableCell>
                    <TableCell>
                      {format(new Date(o.startDate), "dd MMM yyyy", { locale: localeId })}
                    </TableCell>
                    <TableCell>
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
