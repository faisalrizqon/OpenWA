import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ArrowLeft, ClipboardList, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { PageNotifier, type PageNotification } from "@/components/PageNotifier";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/pricing";
import { PAYMENT_STATUS_LABELS } from "@/lib/payment";

export const dynamic = "force-dynamic";

export default async function PortalOrdersPage({ searchParams }: PageProps<"/portal/orders">) {
  const session = await auth();
  const customerId = Number(session?.user?.customerId);

  if (!session?.user || session.user.role !== "customer" || !Number.isInteger(customerId) || customerId <= 0) {
    redirect("/portal/login");
  }

  const sp = await searchParams;
  const statusParam = Array.isArray(sp.status) ? sp.status[0] : sp.status;

  const validStatuses = ["pending", "booking", "active", "late", "completed", "cancelled", "draft"];

  // Notifications (bulk actions)
  const notifications: PageNotification[] = [];
  if ("bulk" in sp && typeof sp.bulk === "string") {
    const bulk = Number(sp.bulk) || 0;
    if (bulk > 0) {
      notifications.push({ type: "success", message: `Berhasil mengubah status ${bulk} order.` });
    }
  }

  // Ambil SEMUA order customer (tanpa filter status di DB) supaya jumlah
  // di tiap menu filter selalu akurat, termasuk saat filter sedang aktif.
  const [customer, allOrders] = await Promise.all([
    prisma.customer.findUnique({ where: { id: customerId } }),
    prisma.order.findMany({
      where: { customerId },
      include: {
        items: { include: { product: { select: { name: true } } } },
        payments: true,
      },
      orderBy: { startDate: "desc" },
    }),
  ]);

  if (!customer) redirect("/portal/login");

  // "Berjalan" adalah gabungan status active + late.
  const isOngoing = (s: string) => s === "active" || s === "late";

  const orderFilters = [
    { value: "", label: "Semua", count: allOrders.length },
    { value: "draft", label: "Belum Dikirim", count: allOrders.filter((o) => o.status === "draft").length },
    { value: "pending", label: "Menunggu Konfirmasi", count: allOrders.filter((o) => o.status === "pending").length },
    { value: "booking", label: "Booking", count: allOrders.filter((o) => o.status === "booking").length },
    { value: "active", label: "Berjalan", count: allOrders.filter((o) => isOngoing(o.status)).length },
    { value: "completed", label: "Selesai", count: allOrders.filter((o) => o.status === "completed").length },
    { value: "cancelled", label: "Dibatalkan", count: allOrders.filter((o) => o.status === "cancelled").length },
  ];

  // Order yang ditampilkan sesuai filter terpilih.
  const orders =
    status === ""
      ? allOrders
      : status === "active"
        ? allOrders.filter((o) => isOngoing(o.status))
        : allOrders.filter((o) => o.status === status);

  const activeFilter = orderFilters.find((f) => f.value === status) ?? orderFilters[0];

  /** Link absolut ke /portal/orders dengan query ?status= opsional. */
  const buildHref = (value: string) =>
    value ? `/portal/orders?status=${value}` : "/portal/orders";

  return (
    <div className="space-y-6">
      <PageNotifier notifications={notifications} />

      {/* Header */}
      <Card>
        <CardHeader className="space-y-3 pb-4">
          <div>
            <h1 className="text-2xl font-bold">Pesanan saya</h1>
            <p className="mt-1 text-sm text-muted-foreground">Riwayat dan status pesanan sewa kamera</p>
          </div>
          <Link href="/portal">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="size-4" aria-hidden /> Kembali ke Dashboard
            </Button>
          </Link>
        </CardHeader>
      </Card>

      {/* Filter tabs */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-2">
            {orderFilters.map((filter) => (
              <Link
                key={filter.value || "all"}
                href={buildHref(filter.value)}
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  filter.value === status
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                <span>{filter.label}</span>
                <span className={`ml-1.5 rounded-full px-2 text-xs ${filter.value === status ? "bg-primary-foreground/20 text-primary-foreground" : "bg-foreground/10 text-muted-foreground"}`}>
                  {filter.count}
                </span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Orders list */}
      <Card>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="size-5" aria-hidden />}
              title="Tidak ada pesanan"
              description={
                status === "cancelled"
                  ? "Anda tidak memiliki pesanan yang dibatalkan."
                  : status === "active"
                  ? "Anda tidak memiliki pesanan yang sedang berjalan."
                  : status === "completed"
                  ? "Anda belum memiliki pesanan yang selesai."
                  : status === "pending"
                  ? "Menunggu konfirmasi admin untuk pesanan online Anda."
                  : "Belum ada pesanan dalam daftar."
              }
            />
          ) : (
            <div className="space-y-3 p-4">
              {orders.map((o) => {
                const itemNames = o.items.map((it) => it.product.name).join(", ");
                const paidAmount = o.payments
                  .filter((p) => p.paymentType !== "denda")
                  .reduce((sum, p) => sum + p.amount, 0);
                  
                const orderTotal = o.items.reduce((s, it) => s + it.subtotal, 0);

                const nextAction =
                  o.status === "draft"
                    ? "Selesaikan Orderan"
                    : o.status === "pending"
                      ? "Menunggu Konfirmasi Admin"
                      : o.status === "booking"
                        ? "Bayar deposit"
                        : o.status === "active" || o.status === "late"
                          ? (paidAmount >= orderTotal ? "Kembalikan barang" : "Pelunasan")
                          : o.status === "completed"
                            ? "Review"
                            : "Dibatalkan";

                return (
                  <Link
                    key={o.id}
                    href={`/portal/orders/${o.orderNumber}`}
                    className="group block"
                  >
                    <Card className="transition-shadow hover:shadow-md">
                      <CardHeader className="pb-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-muted-foreground"># {o.orderNumber}</p>
                            <p className="mt-1 line-clamp-2 font-medium">{itemNames}</p>
                          </div>
                          <StatusBadge status={o.status} />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                          <dt className="text-muted-foreground">Status pembayaran</dt>
                          <dd className="min-w-0 truncate font-medium">{PAYMENT_STATUS_LABELS[o.paymentStatus] ?? o.paymentStatus}</dd>

                          <dt className="text-muted-foreground">Tanggal mulai</dt>
                          <dd className="whitespace-nowrap font-medium">{format(o.startDate, "dd MMM yyyy", { locale: localeId })}</dd>

                          <dt className="text-muted-foreground">Tanggal kembali</dt>
                          <dd className="whitespace-nowrap font-medium">{format(o.endDate, "dd MMM yyyy", { locale: localeId })}</dd>

                          <dt className="text-muted-foreground">Total</dt>
                          <dd className="font-medium tabular-nums">{formatRupiah(orderTotal)}</dd>
                        </dl>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm text-muted-foreground">{nextAction}</span>
                          <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
