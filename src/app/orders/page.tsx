import Link from "next/link";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { prisma } from "@/lib/db";
import { formatRupiah } from "@/lib/pricing";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <div className="p-4 space-y-6 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Orders</h1>
        <Link
          href="/orders/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          + Buat Order
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS_TABS).map(([value, label]) => {
          const active = (filter ?? "") === value;
          const href = value === "" ? "/orders" : `/orders?status=${value}`;
          return (
            <Link
              key={value || "all"}
              href={href}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
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
            {filter ? `Filter: ${STATUS_TABS[filter]}` : "Semua status"} — {orders.length} order
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500">
              <p>Belum ada order{filter ? ` dengan status ${STATUS_TABS[filter]}` : ""}.</p>
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
                  <TableHead>Tanggal Mulai</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Dibayar</TableHead>
                  <TableHead>Sisa</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => {
                  const total = o.items.reduce((s, it) => s + it.subtotal, 0);
                  const paid = o.payments
                    .filter((p) => ["dp", "pelunasan", "denda"].includes(p.paymentType))
                    .reduce((s, p) => s + p.amount, 0);
                  const sisa = total - paid;
                  const itemSummary = o.items
                    .map((it) => `${it.product.name} ×${it.quantity}`)
                    .join(", ");
                  return (
                    <TableRow key={o.id}>
                      <TableCell>
                        <Link href={`/orders/${o.id}`} className="font-medium hover:underline">
                          {o.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {format(new Date(o.startDate), "dd MMM yyyy", { locale: localeId })}
                      </TableCell>
                      <TableCell>{o.customer.name}</TableCell>
                      <TableCell className="max-w-64 truncate">{itemSummary}</TableCell>
                      <TableCell>{formatRupiah(total)}</TableCell>
                      <TableCell>{formatRupiah(paid)}</TableCell>
                      <TableCell className={sisa > 0 ? "font-medium text-red-600" : ""}>
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
