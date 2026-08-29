import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ArrowRight, Banknote, CalendarDays, ChevronRight, Clock3, FileCheck, PackageOpen, Star, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatRupiah } from "@/lib/pricing";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/payment";
import { getStoreSettings } from "@/lib/content";
import { waLink, generalMessage } from "@/lib/shop";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { ReviewForm } from "./ReviewForm";
import { PageNotifier, type PageNotification } from "@/components/PageNotifier";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import { productPhotosOf } from "@/lib/productPhotos";
import { StatsCard, QuickAction, QuickActionsCard, ExternalQuickAction } from "@/components/portal-dashboard/index";
import { Card, CardContent } from "@/components/ui/card";
export const dynamic = "force-dynamic";

/** Progress bar sewa berjalan */
function OrderProgress({ startDate, endDate, status }: { startDate: Date; endDate: Date; status: string }) {
  const now = new Date();
  const total = endDate.getTime() - startDate.getTime();
  const elapsed = now.getTime() - startDate.getTime();
  const pct = Math.min(100, Math.max(0, total > 0 ? (elapsed / total) * 100 : 100));
  const isLate = status === "late" || now > endDate;
  const sisaHari = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / 86_400_000));

  return (
    <div className="mt-4 rounded-lg bg-muted/40 p-3">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 font-medium text-muted-foreground">
          <Clock3 className="size-3.5" aria-hidden />
          {isLate ? "Lewat jatuh tempo" : "Progres sewa"}
        </span>
        <span className={cn("font-semibold tabular-nums", isLate ? "text-red-600" : "text-emerald-600")}>
          {isLate ? `+${Math.ceil((now.getTime() - endDate.getTime()) / 86_400_000)} hari` : `${sisaHari} hari lagi`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", isLate ? "bg-red-500" : "bg-emerald-500")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function PortalHomePage({ searchParams }: PageProps<"/portal">) {
  const session = await auth();
  const customerId = Number(session?.user?.customerId);
  if (!session?.user || session.user.role !== "customer" || !Number.isInteger(customerId) || customerId <= 0) {
    redirect("/portal/login");
  }

  const sp = await searchParams;
  const filterParam = Array.isArray(sp.filter) ? sp.filter[0] : sp.filter;
  const filter = filterParam === "active" || filterParam === "completed" ? filterParam : "all";
  const reviewed = Array.isArray(sp.reviewed) ? sp.reviewed[0] : sp.reviewed;
  const errorParam = Array.isArray(sp.error) ? sp.error[0] : sp.error;

  const notifications: PageNotification[] = [];
  if (reviewed === "1") {
    notifications.push({ type: "success", message: "Terima kasih atas reviewnya!" });
  }
  if (errorParam === "invalid") {
    notifications.push({ type: "error", message: "Data review tidak valid." });
  } else if (errorParam) {
    notifications.push({ type: "error", message: decodeURIComponent(errorParam) });
  }

  const [customer, orders, shop] = await Promise.all([
    prisma.customer.findUnique({ where: { id: customerId } }),
    prisma.order.findMany({
      where: { customerId },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                units: { select: { id: true, photoPath: true } },
                images: { select: { filePath: true, sortOrder: true } },
              },
            },
          },
        },
        payments: true,
        documents: true,
        review: true,
      },
      orderBy: { startDate: "desc" },
    }),
    getStoreSettings(),
  ]);

  if (!customer) redirect("/portal/login");

  const ongoingOrders = orders.filter((o) => o.status === "active" || o.status === "booking" || o.status === "late");
  const completedOrders = orders.filter((o) => o.status === "completed");
  const totalSpent = completedOrders.reduce((s, o) => s + o.items.reduce((t, i) => t + i.subtotal, 0) - o.promoDiscount, 0);
  const reviews = orders.filter((o) => o.review);
  const avgRating = reviews.length > 0 ? reviews.reduce((sum, o) => sum + (o.review?.rating ?? 0), 0) / reviews.length : 0;
  const nextReturn = ongoingOrders.filter((o) => o.status === "active").sort((a, b) => a.endDate.getTime() - b.endDate.getTime())[0];
  const pendingCount = orders.filter((o) => o.paymentStatus === "pending").length;
  const unreviewedCompleted = completedOrders.filter((o) => !o.review).length;
  const filteredOrders = filter === "all" ? orders : filter === "active" ? ongoingOrders : completedOrders;

  // Stats matching admin dashboard exactly - no link wrapper, simple layout
  const stats = [
    {
      label: "Sewa Berjalan",
      value: String(ongoingOrders.length),
      icon: CalendarDays,
      tone: "bg-blue-50 text-blue-600",
      sub: ongoingOrders.length > 0 && nextReturn ? format(nextReturn.endDate, "dd MMM yyyy", { locale: localeId }) : "",
    },
    {
      label: "Total Pengeluaran",
      value: formatRupiah(totalSpent),
      icon: Banknote,
      tone: "bg-emerald-50 text-emerald-600",
      sub: `${completedOrders.length} order selesai`,
    },
    {
      label: "Rating Kamu",
      value: avgRating.toFixed(1),
      icon: TrendingUp,
      tone: "bg-amber-50 text-amber-600",
      sub: `${reviews.length} review terkirim`,
    },
    {
      label: "Pembayaran Pending",
      value: String(pendingCount),
      icon: Clock3,
      tone: "bg-violet-50 text-violet-600",
      sub: pendingCount > 0 ? "Menunggu konfirmasi" : "",
    },
  ];

  const FILTERS = [
    { value: "all" as const, label: "Semua", count: orders.length },
    { value: "active" as const, label: "Berjalan", count: ongoingOrders.length },
    { value: "completed" as const, label: "Selesai", count: completedOrders.length },
  ];

  return (
    <div className="space-y-6">
      <PageNotifier notifications={notifications} />

      {/* Header matching admin */}
      <PageHeader title="Dashboard Pelanggan" description={`Selamat datang, ${customer.name}`} />

      {/* Stats Cards — EXACT admin pattern */}
      {orders.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label} size="sm" className="shadow-none">
                <CardContent className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium leading-snug text-muted-foreground">{s.label}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <p className="break-words text-xl font-bold tabular-nums tracking-tight md:text-2xl">{s.value}</p>
                      {s.label.includes("Rating") && (
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, j) => (
                            <Star key={j} className={`size-3.5 ${j < avgRating ? "fill-amber-400 text-amber-400" : "text-neutral-300"}`} aria-hidden />
                          ))}
                        </div>
                      )}
                    </div>
                    {s.sub && <p className="mt-2 truncate text-xs text-muted-foreground">{s.sub}</p>}
                  </div>
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${s.tone}`}>
                    <Icon className="size-4.5" aria-hidden />
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick Actions — same pattern as admin */}
      {orders.length > 0 && (
        <QuickActionsCard title="Aksi Cepat">
          <QuickAction href="/katalog" icon={PackageOpen} label="Katalog Baru" description="Cari & booking kamera" />
          <QuickAction href="/portal/orders" icon={CalendarDays} label="Semua Pesanan" description={`${orders.length} tercatat`} tone="bg-violet-50 text-violet-600" />
          <QuickAction href="/portal/documents" icon={FileCheck} label="Dokumen Jaminan" description="Upload & kelola dokumen" tone="bg-emerald-50 text-emerald-600" />
          <ExternalQuickAction href={waLink(shop.whatsapp, generalMessage(shop.storeName))} icon={WhatsAppIcon} label="WhatsApp" description="Chat admin langsung" tone="bg-emerald-50 text-emerald-600" targetBlank />
        </QuickActionsCard>
      )}

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "all" ? "/portal" : `/portal?filter=${f.value}`}
            aria-current={filter === f.value ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50",
              filter === f.value ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            {f.label}
            <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums", filter === f.value ? "bg-primary-foreground/20" : "bg-muted")}>{f.count}</span>
          </Link>
        ))}
      </div>

      {/* Order List */}
      {orders.length === 0 ? (
        <Card className="shadow-none">
          <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-4 p-10 text-center">
            <PackageOpen className="size-8 text-muted-foreground" aria-hidden />
            <div>
              <p className="font-semibold">Belum ada pesanan</p>
              <p className="mt-1 text-sm text-muted-foreground">Mulai sewa dari katalog!</p>
            </div>
            <Link href="/katalog" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              Jelajahi Katalog
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </CardContent>
        </Card>
      ) : filteredOrders.length === 0 ? (
        <Card className="shadow-none">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">Tidak ada pesanan pada filter ini.</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((orderItem) => {
            const total = orderItem.items.reduce((s, it) => s + it.subtotal, 0) - orderItem.promoDiscount;
            const isActiveLike = orderItem.status === "active" || orderItem.status === "late";

            return (
              <Card key={orderItem.id} className="overflow-hidden shadow-none">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/30 p-5">
                  <div className="min-w-0 flex-1">
                    <Link href={`/portal/orders/${orderItem.orderNumber}`} className="block truncate text-lg font-semibold underline-offset-2 hover:underline">{orderItem.orderNumber}</Link>
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock3 className="size-3.5" aria-hidden />
                      {format(orderItem.startDate, "dd MMM yyyy", { locale: localeId })} - {format(orderItem.endDate, "dd MMM yyyy", { locale: localeId })}
                    </p>
                    {orderItem.paymentMethod && <p className="mt-1 text-xs text-muted-foreground">{PAYMENT_METHOD_LABELS[orderItem.paymentMethod as PaymentMethod]}</p>}
                  </div>
                  <StatusBadge status={orderItem.status} />
                </div>

                <div className="p-5">
                  <ul className="space-y-2">
                    {orderItem.items.map((it) => {
                      const { main } = productPhotosOf(it.product);
                      return (
                        <li key={it.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                          {main ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={main.src} alt="" className="size-12 shrink-0 rounded-lg border object-cover" />
                          ) : (
                            <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground" aria-hidden>
                              <PackageOpen className="size-6" />
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{it.product.name}</p>
                            <p className="text-xs text-muted-foreground">×{it.quantity} · {it.durationHours} jam</p>
                          </div>
                          <span className="font-semibold tabular-nums">{formatRupiah(it.subtotal)}</span>
                        </li>
                      );
                    })}
                  </ul>

                  {isActiveLike && <OrderProgress startDate={orderItem.startDate} endDate={orderItem.endDate} status={orderItem.status} />}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-sm">
                    <div className="flex flex-wrap items-center gap-3">
                      <span>Total: <span className="font-bold tabular-nums">{formatRupiah(total)}</span></span>
                      {orderItem.documents.length > 0 && <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Dokumen terupload</span>}
                    </div>
                    <Link href={`/portal/orders/${orderItem.orderNumber}`} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                      Detail
                      <ChevronRight className="size-4" aria-hidden />
                    </Link>
                  </div>

                  {orderItem.status === "completed" && (
                    orderItem.review ? (
                      <div className="mt-4 rounded-xl bg-accent/50 px-4 py-3 text-sm">
                        <p className="flex items-center gap-1 font-medium">
                          {[...Array(5)].map((_, i) => <Star key={i} className={`size-4 ${i < orderItem.review!.rating ? "fill-amber-400 text-amber-400" : "text-neutral-300"}`} aria-hidden />)}
                          <span className="ml-1 text-xs text-muted-foreground">Review kamu</span>
                        </p>
                        {orderItem.review.text && <p className="mt-2 text-sm text-muted-foreground">"{orderItem.review.text}"</p>}
                      </div>
                    ) : (
                      <ReviewForm orderId={orderItem.id} />
                    )
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {unreviewedCompleted > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm">
          <p className="flex items-center gap-2 font-medium text-amber-800">
            <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />
            {unreviewedCompleted} order selesai belum di-review
          </p>
          <Link href="/portal?filter=completed" className="inline-flex items-center gap-1 font-semibold text-amber-800 underline-offset-2 hover:underline">
            Beri review sekarang
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      )}
    </div>
  );
}
