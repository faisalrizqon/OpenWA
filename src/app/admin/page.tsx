import Link from "next/link";
import { format, addDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDashboardData } from "@/lib/dashboard";
import { formatRupiah } from "@/lib/pricing";
import { DashboardPeriodFilter } from "@/components/DashboardPeriodFilter";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { HeaderLink } from "@/components/HeaderLink";
import { EmptyState } from "@/components/EmptyState";
import { PageNotifier, type PageNotification } from "@/components/PageNotifier";
import { RevenueChart, StatusDonut, TodayRentalCard, TopProductsChart, QuickActionGrid } from "@/components/admin-dashboard";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarClock, AlertTriangle, ArrowRight, Camera, ClipboardList, Clock3, CircleDollarSign, TrendingUp, Wallet } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function DashboardPage({ searchParams }: any) {
  const session = await auth();
  const isAdmin = session?.user?.role === "admin";
  
  const raw = await (searchParams ?? {});
  const get = (key: string) => (Array.isArray(raw[key]) ? raw[key][0] : raw[key]) ?? "";
  const forbidden = get("error");

  const notifications: PageNotification[] = [];
  if (forbidden === "forbidden") {
    notifications.push({ type: "error", message: "Akses ditolak — halaman itu hanya untuk admin." });
  }

  const periodParam = get("period");
  const period = ["today", "week", "month", "custom"].includes(periodParam) ? periodParam : "week";
  const startDateRaw = get("start_date");
  const endDateRaw = get("end_date");

  const resolveDashboardRange = (p: string, s?: string, e?: string) => {
    if (s && e) return { gte: new Date(s), lt: new Date(e) };
    if (p === "today") {
      const start = new Date(); start.setHours(0,0,0,0);
      return { gte: start, lt: addDays(start, 1) };
    }
    if (p === "week") {
      const start = new Date(); start.setDate(start.getDate() - 6); start.setHours(0,0,0,0);
      return { gte: start, lt: addDays(start, 7) };
    }
    if (p === "month") {
      const start = new Date(); start.setDate(1); start.setHours(0,0,0,0);
      return { gte: start, lt: addDays(start, 31) };
    }
    return null;
  };

  const periodRange = resolveDashboardRange(period, startDateRaw, endDateRaw);
  const safePeriod = periodRange ?? (() => {
    const start = new Date(); start.setHours(0,0,0,0);
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
    { label: "Sewa Berjalan Hari Ini", value: String(dash.todayRentals.length), icon: Camera, tone: "bg-blue-50 text-blue-600" },
    { label: "Booking Menunggu", value: String(dash.pendingBookings), icon: Clock3, tone: "bg-amber-50 text-amber-600" },
    { label: "Terlambat", value: String(dash.overdueCount), icon: AlertTriangle, tone: "bg-red-50 text-red-600" },
    ...(isAdmin ? [
      { label: "Piutang (Belum Lunas)", value: formatRupiah(dash.unpaidTotal), icon: Wallet, tone: "bg-violet-50 text-violet-600", money: true },
      { label: `Pendapatan ${format(new Date(), "MMMM", { locale: localeId })}`, value: formatRupiah(dash.revenueMonth), icon: CircleDollarSign, tone: "bg-emerald-50 text-emerald-600", money: true },
    ] : []),
    { label: "Unit Terpakai", value: `${rented}/${total} (${utilizationPct}%)`, icon: ClipboardList, tone: "bg-sky-50 text-sky-600" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Dashboard" description={todayLabel} action={<HeaderLink href="/admin/orders/new" label="Buat Order" />} />
      <PageNotifier notifications={notifications} />
      <DashboardPeriodFilter period={period} startDate={startDateRaw} endDate={endDateRaw} />
      
      {/* Dashboard Stats Cards */}
      <div className="grid grid-cols-2 gap-2 md:gap-3 md:grid-cols-3 md:gap-4">
        {stats.map((s) => (
          <div key={s.label} className="relative overflow-hidden transition-all hover:shadow-md rounded-xl bg-card border-none shadow-sm">
            {/* Solid colored background for top half */}
            <div 
              className={`absolute inset-x-0 top-0 h-[50%] ${s.tone.split(' ')[0]}`}
            />
            
            {/* Line art border around card */}
            <div className="absolute inset-0 rounded-xl ring-1 ring-black/5 pointer-events-none" />
            
            {/* Content section - compact */}
            <div className="relative z-10 px-2 py-2">
              {/* Row 1: Label (left) + Icon Badge (right) */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-gray-700 whitespace-normal leading-tight">{s.label}</span>
                <span className={`flex size-7 items-center justify-center rounded-full ${s.tone}`}>
                  <s.icon className="size-3.5" aria-hidden />
                </span>
              </div>
              
              {/* Row 2: Total label + Value */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-0.5">Total</p>
                <p className="text-2xl font-bold tabular-nums tracking-tight text-gray-900">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {(dash.dueToday.length > 0 || dash.overdueCount > 0) && (
        <Card className={dash.overdueCount > 0 ? "border-red-200" : "border-amber-200"}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className={cn("size-4", dash.overdueCount > 0 ? "text-red-500" : "text-amber-500")} aria-hidden />
              Perlu Perhatian
            </CardTitle>
            <CardDescription>Harus kembali hari ini & order terlambat</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {dash.dueToday.map((r) => (
              <Link key={r.id} href={`/admin/orders/${r.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50/80 px-3 py-2 text-sm shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-amber-100 hover:shadow-md">
                <span className="min-w-0"><span className="font-medium">{r.customerName}</span><span className="block truncate text-xs text-muted-foreground">{r.orderNumber} · {r.items}</span></span>
                <span className="shrink-0 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-800">Kembali {format(r.endDate, "dd MMMM HH:mm", { locale: localeId })}</span>
              </Link>
            ))}
            {dash.overdueOrders.map((r) => (
              <Link key={r.id} href={`/admin/orders/${r.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50/80 px-3 py-2 text-sm shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-red-100 hover:shadow-md">
                <span className="min-w-0"><span className="font-medium text-red-700">{r.customerName}</span><span className="block truncate text-xs text-muted-foreground">{r.orderNumber} · {r.items}</span></span>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-red-200 px-2 py-0.5 text-xs font-semibold text-red-800">
                  Terlambat sejak {format(r.endDate, "dd MMMM", { locale: localeId })}<ArrowRight className="size-3" aria-hidden />
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Card Sewa Berjalan Minggu Ini - Layout Seamless */}
      {/* Card Sewa Berjalan Minggu Ini - Layout with Separator */}
      <Card className="overflow-hidden border-0 shadow-none bg-transparent">
        <div className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-start md:justify-between border-b pb-4">
          <div className="md:w-auto">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              {periodTitle}
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{dash.periodRentals.length}</span>
            </h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-xl truncate">Progres posisi sewa pada periode terpilih</p>
          </div>

          {/* Statistics Horizontal - seamless integration */}
          <div className="flex justify-end items-center gap-8 mt-2 md:mt-0">
            <div className="text-center min-w-[60px]">
              <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest mb-0.5">KEMBALI</p>
              <p className={cn("text-lg font-bold tabular-nums", dash.periodDueCount > 0 ? "text-amber-600" : "text-emerald-600")}>{dash.periodDueCount}</p>
            </div>
            <div className="text-center min-w-[60px]">
              <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest mb-0.5">TERLAMBAT</p>
              <p className={cn("text-lg font-bold tabular-nums", dash.periodLateCount > 0 ? "text-red-600" : "text-emerald-600")}>{dash.periodLateCount}</p>
            </div>
            <div className="text-center min-w-[80px]">
              <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest mb-0.5">PIUTANG</p>
              <p className={cn("text-lg font-bold tabular-nums", dash.periodUnpaid > 0 ? "text-red-600" : "text-emerald-600")}>{formatRupiah(dash.periodUnpaid)}</p>
            </div>
          </div>
        </div>

        <CardContent className="pt-0 pb-4 px-6 md:px-6">
          {dash.periodRentals.length === 0 ? (
            <EmptyState icon={<CalendarClock className="size-5" aria-hidden />} title="Tidak ada sewa berjalan pada periode ini" description={`Periode "${periodTitle}" kosong.`} ctaLabel="Lihat semua sewa" ctaHref="/admin/orders" />
          ) : (
            <div className="grid gap-3 md:gap-4 xl:gap-5 md:grid-cols-2 xl:grid-cols-3">
              {dash.periodRentals.map((r) => (<TodayRentalCard key={r.id} rental={r} />))}
            </div>
          )}
        </CardContent>
      </Card>

      <div><h2 className="mb-2 text-sm font-semibold text-muted-foreground">Aksi Cepat</h2><QuickActionGrid pendingBookings={dash.pendingBookings} pendingConfirmation={dash.pendingConfirmation} /></div>

      {isAdmin && (<>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="size-4 text-muted-foreground" aria-hidden />Pendapatan 14 Hari Terakhir</CardTitle><CardDescription>Pembayaran masuk per hari</CardDescription></CardHeader><CardContent><RevenueChart data={dash.revenueByDay} /></CardContent></Card>
        <div className="grid gap-3 lg:grid-cols-2">
          <Card><CardHeader><CardTitle>Distribusi Status Order</CardTitle><CardDescription>Seluruh order yang belum dibatalkan</CardDescription></CardHeader><CardContent><StatusDonut counts={dash.statusCounts} /></CardContent></Card>
          <Card><CardHeader><CardTitle>Top Produk</CardTitle><CardDescription>30 hari terakhir × pendapatan</CardDescription></CardHeader><CardContent><TopProductsChart products={dash.topProducts} /></CardContent></Card>
        </div>
      </>)}

      <Card>
        <CardHeader><CardTitle>Order Terbaru</CardTitle><CardDescription>8 order terakhir</CardDescription></CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <EmptyState icon={<ClipboardList className="size-5" aria-hidden />} title="Belum ada order" description="Buat order pertama untuk mulai mengelola penyewaan." ctaHref="/admin/orders/new" ctaLabel="Buat order pertama" />
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
                    <TableCell><Link href={`/admin/orders/${o.id}`} className="font-medium text-primary hover:underline">{o.orderNumber}</Link></TableCell>
                    <TableCell>{o.customer.name}</TableCell>
                    <TableCell className="max-w-48 truncate text-muted-foreground">{o.items.map((it) => `${it.product.name} ×${it.quantity}`).join(", ")}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{format(new Date(o.startDate), "dd MMMM yyyy", { locale: localeId })}</TableCell>
                    {isAdmin && <TableCell className="text-right font-medium tabular-nums">{formatRupiah(o.items.reduce((s, it) => s + it.subtotal, 0))}</TableCell>}
                    <TableCell><StatusBadge status={o.status} /></TableCell>
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
