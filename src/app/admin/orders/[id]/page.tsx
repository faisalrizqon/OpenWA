import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowRight, Printer } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatBookingWA } from "@/lib/wa";
import { StatusBadge } from "@/components/StatusBadge";
import { BackLink } from "@/components/BackLink";
import { PageNotifier, type PageNotification } from "@/components/PageNotifier";
import { FlowInstructions } from "./sections/FlowInstructions";
import { CustomerSection } from "./sections/CustomerSection";
import { FinancialSummary } from "./sections/FinancialSummary";
import { GuaranteeSection } from "./sections/GuaranteeSection";
import { ItemsSection } from "./sections/ItemsSection";
import { PaymentSection } from "./sections/PaymentSection";
import { ReturnSection } from "./sections/ReturnSection";
import { dateFmt } from "./sections/constants";
import { orderDetailInclude } from "./sections/types";

export default async function OrderDetailPage({
  params,
  searchParams,
}: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  const errorParam = await searchParams;
  const error = Array.isArray(errorParam.error) ? errorParam.error[0] : errorParam.error;

  const notifications: PageNotification[] = [];
  if (error === "payment") notifications.push({ type: "error", message: "Pembayaran tidak valid — jumlah harus lebih dari 0." });
  if (error === "file") notifications.push({ type: "error", message: "File tidak valid — hanya JPG/PNG/WebP maksimal 5MB." });
  if (error === "return") notifications.push({ type: "error", message: "Data return tidak valid." });
  if (error && !["payment", "file", "return"].includes(error)) {
    notifications.push({ type: "error", message: decodeURIComponent(error) });
  }

  const session = await auth();
  const isAdmin = session?.user?.role === "admin";

  const order = await prisma.order.findUnique({
    where: { id },
    include: orderDetailInclude,
  });
  if (!order) notFound();

  const total = order.items.reduce((s, it) => s + it.subtotal, 0);
  // Hanya pembayaran confirmed yang dihitung lunas; pending (bukti belum diverifikasi) tidak ikut
  const paid = order.payments
    .filter((p) => ["dp", "pelunasan", "denda"].includes(p.paymentType) && p.status !== "pending")
    .reduce((s, p) => s + p.amount, 0);
  const sisa = total - paid;
  const overdue = order.status === "active" && order.endDate < new Date();
  const active = order.status === "active" || order.status === "late";

  const bookingWA = formatBookingWA({
    orderNumber: order.orderNumber,
    customerName: order.customer.name,
    items: order.items.map((it) => ({
      productName: it.product.name,
      quantity: it.quantity,
      durationHours: it.durationHours,
    })),
    startDate: order.startDate,
    endDate: order.endDate,
    total,
    sisa: Math.max(0, sisa),
  });
  const reminderWA = `Halo ${order.customer.name}, mohon selesaikan pelunasan order *${order.orderNumber}* sebesar Rp ${Math.max(0, sisa).toLocaleString("id-ID")}. Terima kasih! 🙏`;

  const assignedUnits = order.items
    .filter((it) => it.unit != null)
    .map((it) => ({
      unitId: it.unit!.id,
      productName: it.product.name,
      serialNumber: it.unit!.serialNumber,
    }));

  return (
    <div className="space-y-6">
      <PageNotifier notifications={notifications} />

      {/* Navigasi halaman — di luar card */}
      <div className="flex flex-wrap items-center gap-2">
        <BackLink href="/admin/orders" label="Daftar Orders" />
        <Link
          href="/admin/calendar"
          className="group inline-flex w-fit items-center gap-2 rounded-full border border-border/70 bg-card/80 px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-md backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-card hover:text-foreground hover:shadow-lg"
        >
          Lihat Kalender{" "}
          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>

      <FlowInstructions />

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">{order.orderNumber}</h1>
        <StatusBadge status={order.status} />
        <span className="text-sm text-muted-foreground">
          {dateFmt(order.startDate)} → {dateFmt(order.endDate)}
        </span>
        <Link
          href={`/invoice/${order.id}`}
          target="_blank"
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/80 px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:bg-card hover:text-foreground hover:shadow-md"
        >
          <Printer className="size-3.5" aria-hidden />
          Cetak Invoice
        </Link>
      </div>

      {overdue && (
        <p className="flex items-center gap-2 rounded-lg bg-amber-100 px-4 py-3 text-sm font-medium text-amber-900">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          Melewati tanggal kembali ({dateFmt(order.endDate)}) — pertimbangkan tandai terlambat
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <CustomerSection
          order={order}
          sisa={sisa}
          bookingWA={bookingWA}
          reminderWA={reminderWA}
          isAdmin={isAdmin}
        />
        <FinancialSummary order={order} total={total} paid={paid} sisa={sisa} />
      </div>

      {/* Jaminan + Item — satu section, dua card berdampingan */}
      <div className="grid gap-4 lg:grid-cols-2">
        <GuaranteeSection order={order} />
        <ItemsSection items={order.items} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PaymentSection order={order} isAdmin={isAdmin} />
        <ReturnSection order={order} active={active} assignedUnits={assignedUnits} />
      </div>
    </div>
  );
}
