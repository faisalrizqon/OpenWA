import { prisma } from "@/lib/db";

export interface TodayRental {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  items: string;
  startDate: Date;
  endDate: Date;
  status: string;
  total: number;
  paid: number;
  progress: number; // 0–100, posisi sekarang dalam masa sewa
}

export interface DayPoint {
  key: string; // yyyy-mm-dd
  label: string; // "23/8"
  amount: number;
  orders: number;
}

export interface DashboardData {
  todayRentals: TodayRental[]; // sewa yang berjalan hari ini
  dueToday: TodayRental[]; // harus kembali hari ini
  unpaidToday: number; // piutang dari sewa yang berjalan hari ini
  overdueCount: number;
  overdueOrders: TodayRental[]; // detail order terlambat (untuk Perlu Perhatian)
  periodRentals: TodayRental[]; // sewa pada rentang filter periode (Sewa Berjalan)
  periodUnpaid: number; // piutang sewa pada rentang filter
  periodDueCount: number; // jumlah sewa jatuh tempo pada rentang filter
  periodLateCount: number; // jumlah sewa terlambat pada rentang filter
  pendingBookings: number; // booking belum diproses
  pendingConfirmation: number; // order online baru menunggu konfirmasi admin (anti-spam)
  unpaidTotal: number; // piutang seluruh order belum lunas
  revenueMonth: number; // pendapatan bulan berjalan (dp+pelunasan)
  revenueByDay: DayPoint[]; // 14 hari terakhir (chart)
  statusCounts: Record<string, number>;
  topProducts: { name: string; qty: number; revenue: number }[];
  unitUtilization: { rented: number; available: number; total: number };
}

const PAID_TYPES = ["dp", "pelunasan", "denda"];

export interface RentalRange {
  gte: Date; // awal inklusif
  lt: Date; // akhir eksklusif
}

/** Bentuk minimal order yang dibutuhkan untuk membentuk TodayRental. */
type RentalOrderInput = {
  id: string;
  orderNumber: string;
  status: string;
  startDate: Date;
  endDate: Date;
  customer: { name: string; phone: string };
  items: { quantity: number; subtotal: number; product: { name: string } }[];
  payments: { amount: number; paymentType: string; status: string }[];
};

function toTodayRental(o: RentalOrderInput, now: Date): TodayRental {
  const total = o.items.reduce((s, it) => s + it.subtotal, 0);
  const paid = o.payments
    .filter((p) => PAID_TYPES.includes(p.paymentType) && p.status !== "pending")
    .reduce((s, p) => s + p.amount, 0);
  const span = Math.max(1, o.endDate.getTime() - o.startDate.getTime());
  const elapsed = now.getTime() - o.startDate.getTime();
  const progress = Math.max(0, Math.min(100, Math.round((elapsed / span) * 100)));
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customer.name,
    phone: o.customer.phone,
    items: o.items.map((it) => `${it.product.name} ×${it.quantity}`).join(", "),
    startDate: o.startDate,
    endDate: o.endDate,
    status: o.status,
    total,
    paid,
    progress,
  };
}

/** Sewa (booking/aktif/terlambat) yang bersinggungan dengan rentang periode.
 *  Dipakai dashboard untuk filter "Sewa Berjalan" (hari/minggu/bulan/custom). */
export async function getRentalsForRange(range: RentalRange): Promise<{
  rentals: TodayRental[];
  unpaid: number;
  dueCount: number;
  lateCount: number;
}> {
  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["booking", "active", "late"] },
      startDate: { lt: range.lt },
      endDate: { gte: range.gte },
    },
    include: {
      customer: { select: { name: true, phone: true } },
      items: { include: { product: { select: { name: true } } } },
      payments: { select: { amount: true, paymentType: true, status: true } },
    },
  });
  const now = new Date();
  const rentals = orders
    .map((o) => toTodayRental(o, now))
    .sort((a, b) => a.endDate.getTime() - b.endDate.getTime());
  return {
    rentals,
    unpaid: rentals.reduce((s, r) => s + Math.max(0, r.total - r.paid), 0),
    dueCount: rentals.filter((r) => r.endDate >= range.gte && r.endDate < range.lt).length,
    lateCount: rentals.filter((r) => r.status === "late").length,
  };
}


/** Rentang tanggal lokal untuk preset periode (today | week | month). */
function periodRange(period: string): RentalRange | null {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  if (period === "today") {
    return { gte: new Date(y, m, d), lt: new Date(y, m, d + 1) };
  }
  if (period === "week") {
    // Senin–Minggu (ISO week, hari 1 = Senin)
    const day = now.getDay() === 0 ? 7 : now.getDay();
    const monday = new Date(y, m, d - (day - 1));
    return { gte: monday, lt: new Date(monday.getTime() + 7 * 86_400_000) };
  }
  if (period === "month") {
    return { gte: new Date(y, m, 1), lt: new Date(y, m + 1, 1) };
  }
  return null;
}

/** Rentang filter dashboard: preset periode atau custom (start/end YYYY-MM-DD). */
export function resolveDashboardRange(
  period: string,
  startDate: string,
  endDate: string
): RentalRange {
  if (period === "custom") {
    const sd = startDate ? new Date(`${startDate}T00:00`) : null;
    const ed = endDate ? new Date(`${endDate}T00:00`) : null;
    if (sd && ed && !isNaN(sd.getTime()) && !isNaN(ed.getTime()) && sd <= ed) {
      return { gte: sd, lt: new Date(ed.getTime() + 86_400_000) };
    }
  }
  return periodRange(period) ?? periodRange("today")!;
}
/** Order dianggap "berjalan hari ini" jika startDate <= akhir hari & endDate >= awal hari. */
function coversToday(o: { startDate: Date; endDate: Date }, dayStart: Date, dayEnd: Date) {
  return o.startDate <= dayEnd && o.endDate >= dayStart;
}

export async function getDashboardData(range: RentalRange): Promise<DashboardData> {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(dayStart.getTime() + 86_400_000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const chartStart = new Date(dayStart.getTime() - 13 * 86_400_000);

  const [orders, revenueMonthAgg, units] = await Promise.all([
    prisma.order.findMany({
      where: { status: { notIn: ["cancelled", "draft"] } }, // exclude pending/draft yang belum valid order
      include: {
        customer: { select: { name: true, phone: true } },
        items: { include: { product: { select: { name: true } } } },
        payments: { select: { amount: true, paymentType: true, status: true, paidAt: true } },
      },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        paymentType: { in: ["dp", "pelunasan"] },
        status: { not: "pending" },
        paidAt: { gte: monthStart, lt: dayEnd },
      },
    }),
    prisma.unit.findMany({ select: { status: true } }),
  ]);

  // ---- Sewa berjalan hari ini + harus kembali hari ini ----
  const mapRental = (o: (typeof orders)[number]) => toTodayRental(o, now);
  const inFlight = orders.filter(
    (o) =>
      ["booking", "active", "late"].includes(o.status) && coversToday(o, dayStart, dayEnd)
  );
  const todayRentals = inFlight.map(mapRental);
  const dueToday = inFlight
    .filter((o) => o.endDate >= dayStart && o.endDate < dayEnd)
    .map(mapRental);
  const unpaidToday = todayRentals.reduce(
    (s, r) => s + Math.max(0, r.total - r.paid),
    0
  );

  // ---- Sewa pada rentang filter periode (Sewa Berjalan) ----
  const periodRentals = orders
    .filter(
      (o) =>
        ["booking", "active", "late"].includes(o.status) &&
        o.startDate < range.lt &&
        o.endDate >= range.gte
    )
    .map(mapRental)
    .sort((a, b) => a.endDate.getTime() - b.endDate.getTime());
  const periodUnpaid = periodRentals.reduce((s, r) => s + Math.max(0, r.total - r.paid), 0);
  const periodDueCount = periodRentals.filter((r) => r.endDate >= range.gte && r.endDate < range.lt).length;
  const periodLateCount = periodRentals.filter((r) => r.status === "late").length;

  // ---- Order terlambat (untuk Perlu Perhatian) ----
  const overdueOrders = orders
    .filter((o) => o.status === "late")
    .map(mapRental)
    .sort((a, b) => a.endDate.getTime() - b.endDate.getTime());
  // ---- Piutang & jumlah status ----
  let unpaidTotal = 0;
  const statusCounts: Record<string, number> = {
    pending: 0,
    booking: 0,
    active: 0,
    late: 0,
    completed: 0,
  };
  for (const o of orders) {
    const total = o.items.reduce((s, it) => s + it.subtotal, 0);
    const paid = o.payments
      .filter((p) => PAID_TYPES.includes(p.paymentType) && p.status !== "pending")
      .reduce((s, p) => s + p.amount, 0);
    if (total - paid > 0 && o.status !== "completed") unpaidTotal += total - paid;
    statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
  }
  const overdueCount = statusCounts.late ?? 0;
  const pendingBookings = statusCounts.booking ?? 0;
  const pendingConfirmation = statusCounts.pending ?? 0;

  // ---- Chart: pendapatan & jumlah order per hari (14 hari terakhir) ----
  const revenueByDay: DayPoint[] = [];
  for (let i = 0; i < 14; i++) {
    const dStart = new Date(chartStart.getTime() + i * 86_400_000);
    const dEnd = new Date(dStart.getTime() + 86_400_000);
    let amount = 0;
    for (const o of orders) {
      for (const p of o.payments) {
        if (
          PAID_TYPES.includes(p.paymentType) &&
          p.status !== "pending" &&
          p.paidAt >= dStart &&
          p.paidAt < dEnd
        ) {
          amount += p.amount;
        }
      }
    }
    const ordersCount = orders.filter(
      (o) => o.createdAt >= dStart && o.createdAt < dEnd
    ).length;
    revenueByDay.push({
      key: `${dStart.getFullYear()}-${dStart.getMonth() + 1}-${dStart.getDate()}`,
      label: `${dStart.getDate()}/${dStart.getMonth() + 1}`,
      amount,
      orders: ordersCount,
    });
  }

  // ---- Top produk (order yang bersinggungan dengan 30 hari terakhir) ----
  const cutoff = new Date(dayStart.getTime() - 30 * 86_400_000);
  const productAgg = new Map<string, { qty: number; revenue: number }>();
  for (const o of orders) {
    if (o.endDate < cutoff || o.startDate > dayEnd) continue;
    for (const it of o.items) {
      const cur = productAgg.get(it.product.name) ?? { qty: 0, revenue: 0 };
      cur.qty += it.quantity;
      cur.revenue += it.subtotal;
      productAgg.set(it.product.name, cur);
    }
  }
  const topProducts = [...productAgg.entries()]
    .map(([name, v]) => ({ name, qty: v.qty, revenue: v.revenue }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // ---- Utilisasi unit ----
  const rented = units.filter((u) => u.status === "rented").length;
  const available = units.filter((u) => u.status === "available").length;

  return {
    todayRentals: todayRentals.sort((a, b) => a.endDate.getTime() - b.endDate.getTime()),
    dueToday: dueToday.sort((a, b) => a.endDate.getTime() - b.endDate.getTime()),
    unpaidToday,
    overdueCount,
    overdueOrders,
    pendingBookings,
    pendingConfirmation,
    unpaidTotal,
    revenueMonth: revenueMonthAgg._sum.amount ?? 0,
    revenueByDay,
    statusCounts,
    topProducts,
    unitUtilization: { rented, available, total: units.length },
    periodRentals,
    periodUnpaid,
    periodDueCount,
    periodLateCount,
  };
}
