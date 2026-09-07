import Link from "next/link";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ClipboardList, CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/PageHeader";
import { HeaderLink } from "@/components/HeaderLink";
import { EmptyState } from "@/components/EmptyState";
import { PageNotifier, type PageNotification } from "@/components/PageNotifier";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OrdersPeriodFilter } from "@/components/OrdersPeriodFilter";
import { OrdersBulkTable, type OrderRow } from "@/components/OrdersBulkTable";
import { cn } from "@/lib/utils";

const STATUS_TABS: Record<string, string> = {
  "": "Semua",
  pending: "Perlu Konfirmasi",
  booking: "Booking",
  active: "Aktif",
  late: "Terlambat",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  // Note: 'draft' tidak ditampilkan karena order draft belum valid untuk admin.
};
const PERIOD_TABS: Record<string, string> = {
  "": "Semua Waktu",
  today: "Hari Ini",
  week: "Minggu Ini",
  month: "Bulan Ini",
  year: "Tahun Ini",
  custom: "Rentang",
};

/** Rentang tanggal lokal (00:00 → 23:59:59) untuk preset periode. */
function periodRange(period: string): { gte: Date; lt: Date } | null {
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
    const nextMonday = new Date(monday.getTime() + 7 * 86_400_000);
    return { gte: monday, lt: nextMonday };
  }
  if (period === "month") {
    return { gte: new Date(y, m, 1), lt: new Date(y, m + 1, 1) };
  }
  if (period === "year") {
    return { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) };
  }
  return null;
}

/** Gabungkan param jadi query string tanpa bagian yang kosong. */
function buildHref(parts: Record<string, string>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(parts)) {
    if (v) qs.set(k, v);
  }
  const s = qs.toString();
  return `/admin/orders${s ? `?${s}` : ""}`;
}

export default async function OrdersPage({
  searchParams,
}: PageProps<"/admin/orders">) {
  const raw = await searchParams;
  const get = (key: string) => (Array.isArray(raw[key]) ? raw[key][0] : raw[key]) ?? "";

  const statusParam = get("status");
  const periodParam = get("period");
  const startDateRaw = get("start_date");
  const endDateRaw = get("end_date");

  // 'draft' sengaja tidak termasuk: order yang belum ditekan "Selesaikan Orderan"
  // oleh customer belum resmi masuk, jadi tidak boleh terlihat di admin.
  const validStatuses = ["pending", "booking", "active", "late", "completed", "cancelled"];
  const status = validStatuses.includes(statusParam) ? statusParam : "";
  const period = Object.keys(PERIOD_TABS).includes(periodParam) ? periodParam : "";

  // Rentang efektif: preset periode, atau custom (start_date/end_date)
  const preset = periodRange(period);
  let rangeStart: Date | null = null;
  let rangeEnd: Date | null = null; // eksklusif
  if (period === "custom") {
    const sd = startDateRaw ? new Date(`${startDateRaw}T00:00`) : null;
    const ed = endDateRaw ? new Date(`${endDateRaw}T00:00`) : null;
    if (sd && !isNaN(sd.getTime())) rangeStart = sd;
    if (ed && !isNaN(ed.getTime())) rangeEnd = new Date(ed.getTime() + 86_400_000);
  } else if (preset) {
    rangeStart = preset.gte;
    rangeEnd = preset.lt;
  }
  // Hasil bulk action (redirect balik dari bulkUpdateOrderStatus)
  const notifications: PageNotification[] = [];
  const bulkUpdated = Number(get("bulk")) || 0;
  const bulkErrors = get("bulk_errors");
  if (bulkUpdated > 0) notifications.push({ type: "success", message: `Berhasil mengubah status ${bulkUpdated} order.` });
  if (bulkErrors) {
    notifications.push({ type: "error", message: decodeURIComponent(bulkErrors) });
  }
  const pendingAction = get("pending");
  if (pendingAction === "accept") notifications.push({ type: "success", message: "Order diterima — masuk antrian booking." });
  if (pendingAction === "reject") notifications.push({ type: "info", message: "Order ditolak dan dibatalkan." });

  const orders = await prisma.order.findMany({
    where: {
      // Order draft belum difinalisasi customer → tidak boleh muncul di daftar admin.
      ...(status ? { status } : { status: { notIn: ["draft"] } }),
      // Filter khusus antrian "siap diproses": customer sudah submit semua data
      // pembayaran dan order sudah resmi masuk (status booking).
      ...(get("ready") === "1" ? { paymentCompleted: true, status: "booking" } : {}),
      ...(rangeStart || rangeEnd
        ? {
            startDate: {
              ...(rangeStart ? { gte: rangeStart } : {}),
              ...(rangeEnd ? { lt: rangeEnd } : {}),
            },
          }
        : {}),
    },
    orderBy: { startDate: "desc" },
    include: {
      customer: true,
      items: { include: { product: true } },
      payments: true,
    },
  });

  // Map ke row data untuk tabel client (checkbox + bulk action)
  const rows: OrderRow[] = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    source: o.source,
    status: o.status,
    startDate: o.startDate.toISOString(),
    customerName: o.customer.name,
    itemSummary: o.items.map((it) => `${it.product.name} ×${it.quantity}`).join(", "),
    total:
      o.items.reduce((s, it) => s + it.subtotal, 0) + o.courierFee + o.tipAmount,
    paid: o.payments
      .filter(
        (p) => ["dp", "pelunasan", "denda"].includes(p.paymentType) && p.status !== "pending"
      )
      .reduce((s, p) => s + p.amount, 0),
    paymentCompleted: o.paymentCompleted,
  }));

  const rangeLabel =
    rangeStart || rangeEnd
      ? ` ${rangeStart ? format(rangeStart, "dd MMMM yyyy", { locale: localeId }) : "…"} – ${
          rangeEnd
            ? format(new Date(rangeEnd.getTime() - 86_400_000), "dd MMMM yyyy", { locale: localeId })
            : "…"
        }`
      : "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Kelola penyewaan kamera mulai dari booking aktif hingga selesai — tracking stok & pembayaran real-time"
        action={<HeaderLink href="/admin/orders/new" label="Buat Order" />}
      />
      <PageNotifier notifications={notifications} />

      {/* Filter status */}
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(STATUS_TABS).map(([value, label]) => (
          <Link
            key={value || "all"}
            href={buildHref({
              status: value,
              period: periodParam,
              start_date: startDateRaw,
              end_date: endDateRaw,
            })}
            className={cn(
              "inline-flex h-8 items-center rounded-full border px-3 text-sm font-medium transition-colors",
              status === value
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Shortcut antrian unified payment: order yang customer-nya sudah submit semua data */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Link
          href={buildHref({
            ready: get("ready") === "1" ? "" : "1",
            period: periodParam,
            start_date: startDateRaw,
            end_date: endDateRaw,
          })}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
            get("ready") === "1"
              ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
              : "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
          )}
        >
          <CheckCircle2 className="size-4" aria-hidden />
          Siap Diproses
        </Link>
      </div>

      {/* Filter periode — pakai DatePicker kalender proper */}
      <Card>
        <CardContent className="py-4">
          <OrdersPeriodFilter
            status={status}
            period={period}
            startDate={startDateRaw}
            endDate={endDateRaw}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Order</CardTitle>
          <CardDescription>
            {status ? `Status: ${STATUS_TABS[status]}` : "Semua status"}
            {rangeLabel && ` · Periode:${rangeLabel}`} · {orders.length} order
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="size-5" aria-hidden />}
              title="Tidak ada order di filter ini"
              description="Ubah status atau rentang periode, atau buat order baru."
              ctaHref="/admin/orders/new"
              ctaLabel="Buat Order"
            />
          ) : (
            <OrdersBulkTable rows={rows} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
