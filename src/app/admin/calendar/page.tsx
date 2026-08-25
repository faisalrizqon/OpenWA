import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isSameMonth,
  isWeekend,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { format } from "date-fns";
import { CalendarDays, CheckCircle2, Clock3, PackageCheck, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/db";
import { rangesOverlap } from "@/lib/availability";
import { PageHeader } from "@/components/PageHeader";
import { HeaderLink } from "@/components/HeaderLink";
import { EmptyState } from "@/components/EmptyState";
import { MonthNav } from "@/components/MonthNav";
import { CalendarProductFilter } from "@/components/CalendarProductFilter";
import { type DayData } from "@/components/DayCell";
import { CalendarMonth } from "@/components/CalendarMonth";
import { buildSpans, type CalendarOrder } from "@/lib/calendarSpans";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const LEGEND: { label: string; className: string }[] = [
  { label: "Semua tersedia", className: "bg-emerald-50/60 ring-emerald-200" },
  { label: "Sebagian terpakai", className: "bg-amber-50 ring-amber-200" },
  { label: "Hampir penuh", className: "bg-orange-100/70 ring-orange-200" },
  { label: "Penuh", className: "bg-rose-100 ring-rose-200" },
];

export default async function CalendarPage({ searchParams }: PageProps<"/admin/calendar">) {
  const sp = await searchParams;
  const monthParam = Array.isArray(sp.month) ? sp.month[0] : sp.month;
  const productParam = Array.isArray(sp.product) ? sp.product[0] : sp.product;
  const productIdRaw = Number(productParam);
  const productId = Number.isInteger(productIdRaw) && productIdRaw > 0 ? productIdRaw : null;

  const anchor = monthParam ? new Date(`${monthParam}-01T00:00`) : new Date();
  if (isNaN(anchor.getTime())) anchor.setTime(Date.now());

  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthKey = format(monthStart, "yyyy-MM");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalUnits, orders, products] = await Promise.all([
    prisma.unit.count({
      where: productId
        ? { productId, status: { notIn: ["maintenance", "lost"] } }
        : { status: { notIn: ["maintenance", "lost"] } },
    }),
    prisma.order.findMany({
      where: {
        status: { in: ["booking", "active", "late"] },
        startDate: { lt: addDays(gridEnd, 1) },
        endDate: { gt: gridStart },
        ...(productId ? { items: { some: { productId } } } : {}),
      },
      include: {
        customer: { select: { name: true } },
        items: {
          select: { productId: true, quantity: true, product: { select: { name: true, id: true } } },
        },
      },
    }),
    prisma.product.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  // Data per hari: ketersediaan unit saja (tanpa daftar order per sel;
  // order ditampilkan sebagai batang overlay lintas tanggal via CalendarMonth).
  const dayData: DayData[] = days.map((d) => {
    const dayStart = d;
    const dayEnd = addDays(d, 1);
    const dayOrders = orders.filter((o) =>
      rangesOverlap(dayStart, dayEnd, o.startDate, o.endDate)
    );
    const busy = dayOrders.reduce(
      (sum, o) =>
        sum +
        o.items
          .filter((it) => (productId ? it.productId === productId : true))
          .reduce((s, it) => s + it.quantity, 0),
      0
    );
    return {
      iso: d.toISOString(),
      day: d.getDate(),
      inMonth: isSameMonth(d, monthStart),
      isToday: isSameDay(d, today),
      isWeekend: isWeekend(d),
      busy: Math.min(busy, totalUnits),
      total: totalUnits,
    };
  });

  // Susun order untuk overlay batang multi-hari (satu batang per order per minggu).
  const calendarOrders: CalendarOrder[] = orders.map((o) => {
    const relevantItems = o.items.filter((it) => (productId ? it.productId === productId : true));
    return {
      orderId: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customer.name,
      status: o.status,
      units: relevantItems.reduce((s, it) => s + it.quantity, 0),
      products: relevantItems.map((it) => it.product.name).join(", "),
      productsWithLinks: relevantItems.map((it) => ({
        id: it.product.id,
        name: it.product.name,
      })),
      startDate: o.startDate,
      endDate: o.endDate,
    };
  });
  const weeks = days.length / 7;
  const spans = buildSpans(calendarOrders, gridStart, weeks);

  // Ringkasan bulan (order yang overlap dengan bulan berjalan)
  const monthOrders = orders.filter((o) =>
    rangesOverlap(monthStart, addDays(monthEnd, 1), o.startDate, o.endDate)
  );
  const stats = {
    booking: monthOrders.filter((o) => o.status === "booking").length,
    active: monthOrders.filter((o) => o.status === "active").length,
    late: monthOrders.filter((o) => o.status === "late").length,
  };

  // Status hari ini
  const todayData = dayData.find((d) => d.isToday);
  const freeToday = todayData ? Math.max(0, todayData.total - todayData.busy) : totalUnits;

  const summaryCards = [
    {
      label: "Unit bebas hari ini",
      value: `${freeToday}/${totalUnits}`,
      icon: PackageCheck,
      tone: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Booking bulan ini",
      value: String(stats.booking),
      icon: Clock3,
      tone: "bg-amber-50 text-amber-600",
    },
    {
      label: "Sedang disewa",
      value: String(stats.active),
      icon: CheckCircle2,
      tone: "bg-blue-50 text-blue-600",
    },
    {
      label: "Terlambat",
      value: String(stats.late),
      icon: AlertTriangle,
      tone: "bg-rose-50 text-rose-600",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kalender Ketersediaan"
        description="Pantau ketersediaan unit & jadwal order per hari. Klik tanggal untuk lihat detail."
        action={<HeaderLink href="/admin/orders/new" label="Buat Order" />}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {summaryCards.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} size="sm">
              <CardContent className="flex items-center gap-3">
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", s.tone)}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold tabular-nums tracking-tight">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <MonthNav month={monthKey} />
              <CalendarProductFilter products={products} selected={productId} month={monthKey} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              {LEGEND.map((l) => (
                <span key={l.label} className="flex items-center gap-1.5">
                  <span className={cn("inline-block size-3 rounded ring-1", l.className)} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>

          {totalUnits === 0 ? (
            <EmptyState
              icon={<CalendarDays className="size-5" aria-hidden />}
              title="Belum ada unit"
              description="Tambahkan produk beserta unit untuk melihat jadwal ketersediaan."
              ctaHref="/admin/products/new"
              ctaLabel="Tambah produk"
            />
          ) : (
            <div>
              <div className="mb-2 grid grid-cols-7 gap-1.5">
                {WEEKDAYS.map((w, i) => (
                  <div
                    key={w}
                    className={cn(
                      "py-1 text-center text-[11px] font-semibold uppercase tracking-wide",
                      i >= 5 ? "text-rose-500/70" : "text-muted-foreground/70"
                    )}
                  >
                    {w}
                  </div>
                ))}
              </div>
              <CalendarMonth
                data={{ days: dayData, spans, weeks }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
