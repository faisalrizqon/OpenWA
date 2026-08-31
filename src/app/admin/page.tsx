import Link from "next/link";
import { format, addDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Camera,
  ClipboardList,
  Clock3,
  CircleDollarSign,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDashboardData, resolveDashboardRange } from "@/lib/dashboard";
import { formatRupiah } from "@/lib/pricing";
import { DashboardPeriodFilter } from "@/components/DashboardPeriodFilter";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { HeaderLink } from "@/components/HeaderLink";
import { EmptyState } from "@/components/EmptyState";
import { PageNotifier, type PageNotification } from "@/components/PageNotifier";
import {
  RevenueChart,
  StatusDonut,
  TodayRentalCard,
  TopProductsChart,
  QuickActionGrid,
} from "@/components/admin-dashboard";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function DashboardPage({
  searchParams,
}: PageProps<"/admin">) {
  const session = await auth();
  const isAdmin = session?.user?.role === "admin";
  const raw = await searchParams;
  const get = (key: string) => (Array.isArray(raw[key]) ? raw[key][0] : raw[key]) ?? "";
  const forbidden = get("error");

  const notifications: PageNotification[] = [];
  if (forbidden === "forbidden") {
    notifications.push({ type: "error", message: "Akses ditolak — halaman itu hanya untuk admin." });
  }

  // Filter periode "Sewa Berjalan": preset (today/week/month) atau custom
  const periodParam = get("period");
  const period = ["today", "week", "month", "custom"].includes(periodParam) ? periodParam : "week";
  const startDateRaw = get("start_date");
  const endDateRaw = get("end_date");
  const periodRange = resolveDashboardRange(period, startDateRaw, endDateRaw);

  // Fallback ke hari ini (mulai tengah malam) jika periodRange null
  const safePeriod = periodRange ?? (() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return { gte: start, lt: addDays(start, 1) };
  })();
  const dash = await getDashboardData(safePeriod);
  const recentOrders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { customer: true, items: { include: { product: true } } },
  });

  const { rented, total } = dash.unitUtilization;
  const utilizationPct = total > 0 ? Math.round((rented / total) * 100) : 0;
  const todayLabel = format(new Date(), "EEEE, dd MMMM yyyy", { locale: localeId });
  const periodTitles: Record<string, string> = {
    today: "Sewa Berjalan Hari Ini",
    week: "Sewa Berjalan Minggu Ini",
    month: "Sewa Berjalan Bulan Ini",
    custom: "Sewa Berjalan (Rentang Custom)",
  };
  const periodTitle = periodTitles[period];

  const stats = [
    {
      label: "Sewa Berjalan Hari Ini",
      value: String(dash.todayRentals.length),
      icon: Camera,
      tone: "bg-blue-50 text-blue-600",
    },
    {
      label: "Booking Menunggu",
      value: String(dash.pendingBookings),
      icon: Clock3,
      tone: "bg-amber-50 text-amber-600",
    },
    {
      label: "Terlambat",
      value: String(dash.overdueCount),
      icon: AlertTriangle,
      tone: "bg-red-50 text-red-600",
    },
    ...(isAdmin
      ? [
          {
            label: "Piutang (Belum Lunas)",
            value: formatRupiah(dash.unpaidTotal),
            icon: Wallet,
            tone: "bg-violet-50 text-violet-600",
            money: true,
          },
          {
            label: `Pendapatan ${format(new Date(), "MMMM", { locale: localeId })}`,
            value: formatRupiah(dash.revenueMonth),
            icon: CircleDollarSign,
            tone: "bg-emerald-50 text-emerald-600",
            money: true,
          },
        ]
      : []),
    {
      label: "Unit Terpakai",
      value: `${rented}/${total} (${utilizationPct}%)`,
      icon: ClipboardList,
      tone: "bg-sky-50 text-sky-600",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={todayLabel}
        action={<HeaderLink href="/admin/orders/new" label="Buat Order" />}
      />
      <PageNotifier notifications={notifications} />
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} size="sm">
              <CardContent className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium leading-snug text-muted-foreground">
                    {s.label}
                  </p>
                  <p className="mt-1.5 break-words text-xl font-bold tabular-nums tracking-tight md:text-2xl">
                    {s.value}
                  </p>
                </div>
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${s.tone}`}
                >
                  <Icon className="size-4.5" aria-hidden />
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sewa berjalan — bisa difilter per periode */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="size-4 text-muted-foreground" aria-hidden />
                {periodTitle}
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {dash.periodRentals.length}
                </span>
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Progres posisi sewa pada periode terpilih — yang kuning/merah perlu perhatian (kembali hari ini / terlambat)
              </p>
            </div>

            {/* Ringkasan statistik periode terpilih */}
            <div className="hidden shrink-0 items-start gap-3 sm:flex">
              <div className="text-right">
                <p className="text-xs font-medium text-muted-foreground">Kembali di Periode</p>
                <p className={cn("font-bold tabular-nums", dash.periodDueCount > 0 ? "text-amber-600" : "text-emerald-600")}>
                  {dash.periodDueCount}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-muted-foreground">Terlambat</p>
                <p className={cn("font-bold tabular-nums", dash.periodLateCount > 0 ? "text-red-600" : "text-emerald-600")}>
                  {dash.periodLateCount}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-muted-foreground">Piutang</p>
                <p className={cn("font-bold tabular-nums", dash.periodUnpaid > 0 ? "text-red-600" : "text-emerald-600")}>
                  {formatRupiah(dash.periodUnpaid)}
                </p>
              </div>
            </div>
          </div>

          {/* Filter periode: Hari Ini / Minggu Ini / Bulan Ini / Rentang custom */}
          <div className="mt-3">
            <DashboardPeriodFilter
              period={period}
              startDate={startDateRaw}
              endDate={endDateRaw}
            />
          </div>
        </CardHeader>
        <CardContent>
          {dash.periodRentals.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Tidak ada sewa yang berjalan pada periode ini.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {dash.periodRentals.map((r) => (
                <TodayRentalCard key={r.id} rental={r} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Aksi cepat — tepat di bawah sewa berjalan */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Aksi Cepat</h2>
        <QuickActionGrid pendingBookings={dash.pendingBookings} pendingConfirmation={dash.pendingConfirmation} />
      </div>

      {/* Perlu perhatian — selalu ditampilkan, kosongkan bila tidak ada */}
      <Card className={dash.overdueCount > 0 ? "border-red-200" : "border-amber-200"}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle
              className={cn(
                "size-4",
                dash.overdueCount > 0 ? "text-red-500" : "text-amber-500"
              )}
              aria-hidden
            />
            Perlu Perhatian
          </CardTitle>
          <CardDescription>Harus kembali hari ini & order terlambat</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {dash.dueToday.length === 0 && dash.overdueCount === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Tidak ada yang perlu perhatian saat ini.</p>
          ) : (
            <>
              {dash.dueToday.map((r) => (
                <Link
                  key={r.id}
                  href={`/admin/orders/${r.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50/80 px-4 py-2.5 text-sm shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-amber-100 hover:shadow-md"
                >
                  <span className="min-w-0">
                    <span className="font-medium">{r.customerName}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {r.orderNumber} · {r.items}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    Kembali {format(r.endDate, "dd MMMM HH:mm", { locale: localeId })}
                  </span>
                </Link>
              ))}
              {dash.overdueOrders.map((r) => (
                <Link
                  key={r.id}
                  href={`/admin/orders/${r.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50/80 px-4 py-2.5 text-sm shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-red-100 hover:shadow-md"
                >
                  <span className="min-w-0">
                    <span className="font-medium text-red-700">{r.customerName}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {r.orderNumber} · {r.items}
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-red-200 px-2 py-0.5 text-xs font-semibold text-red-800">
                    Terlambat sejak {format(r.endDate, "dd MMMM", { locale: localeId })}
                    <ArrowRight className="size-3" aria-hidden />
                  </span>
                </Link>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      {/* Chart pendapatan + top produk — admin only */}
      {isAdmin && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="size-4 text-muted-foreground" aria-hidden />
                Pendapatan 14 Hari Terakhir
              </CardTitle>
              <CardDescription>
                Pembayaran masuk (DP + pelunasan + denda) per hari · arahkan kursor ke bar untuk detail
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RevenueChart data={dash.revenueByDay} />
            </CardContent>
          </Card>

          {/* Distribusi status + top produk — satu section, dua card */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribusi Status Order</CardTitle>
                <CardDescription>Seluruh order yang belum dibatalkan</CardDescription>
              </CardHeader>
              <CardContent>
                <StatusDonut counts={dash.statusCounts} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Produk</CardTitle>
                <CardDescription>30 hari terakhir · jumlah sewa × pendapatan</CardDescription>
              </CardHeader>
              <CardContent>
                <TopProductsChart products={dash.topProducts} />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Order terbaru */}
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
              ctaHref="/admin/orders/new"
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
                  {isAdmin && <TableHead className="text-right">Total</TableHead>}
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Link href={`/admin/orders/${o.id}`} className="font-medium text-primary hover:underline">
                        {o.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{o.customer.name}</TableCell>
                    <TableCell className="max-w-48 truncate text-muted-foreground">
                      {o.items.map((it) => `${it.product.name} ×${it.quantity}`).join(", ")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {format(new Date(o.startDate), "dd MMMM yyyy", { locale: localeId })}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatRupiah(o.items.reduce((s, it) => s + it.subtotal, 0))}
                      </TableCell>
                    )}
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
