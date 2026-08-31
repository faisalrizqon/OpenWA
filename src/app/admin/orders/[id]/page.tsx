import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatBookingWA, formatReturnReminderWA, formatLateWarningWA } from "@/lib/wa";
import { computeLateInfo } from "@/lib/late";
import { StatusBadge } from "@/components/StatusBadge";
import { BackLink } from "@/components/BackLink";
import { PageNotifier, type PageNotification } from "@/components/PageNotifier";
import { CustomerSection } from "./sections/CustomerSection";
import { FinancialSummary } from "./sections/FinancialSummary";
import { GuaranteeSection } from "./sections/GuaranteeSection";
import { ItemsSection } from "./sections/ItemsSection";
import { PaymentSection } from "./sections/PaymentSection";
import { ReturnSection } from "./sections/ReturnSection";
import { dateFmt } from "./sections/constants";
import { orderDetailInclude } from "./sections/types";
import { DeleteOrderDialog } from "@/components/OrderAdminActions";
export default async function OrderDetailPage({
  params,
  searchParams,
}: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  const errorParam = await searchParams;
  const error = Array.isArray(errorParam.error) ? errorParam.error[0] : errorParam.error;
  const success = Array.isArray(errorParam.success) ? errorParam.success[0] : errorParam.success;

  const notifications: PageNotification[] = [];
  if (error === "payment") notifications.push({ type: "error", message: "Pembayaran tidak valid — jumlah harus lebih dari 0." });
  if (error === "file") notifications.push({ type: "error", message: "File tidak valid — maksimal 15MB (file di atas 3MB dikompres otomatis)." });
  if (error === "return") notifications.push({ type: "error", message: "Data return tidak valid." });
  if (error === "reschedule") notifications.push({ type: "error", message: "Gagal mengubah tanggal — pastikan tanggal valid dan stok unit tersedia di rentang baru." });
  if (error === "fees") notifications.push({ type: "error", message: "Ongkir atau tip tidak valid." });
  if (error === "items") notifications.push({ type: "error", message: "Harga item tidak valid — harus angka >= 0." });
  if (error && !["payment", "file", "return", "reschedule", "fees", "items"].includes(error)) {
    notifications.push({ type: "error", message: decodeURIComponent(error) });
  }
  if (success === "rescheduled") notifications.push({ type: "success", message: "Tanggal sewa berhasil diubah." });
  const edited = Array.isArray(errorParam.edited) ? errorParam.edited[0] : errorParam.edited;
  const fees = Array.isArray(errorParam.fees) ? errorParam.fees[0] : errorParam.fees;
  const items = Array.isArray(errorParam.items) ? errorParam.items[0] : errorParam.items;
  if (edited === "1") notifications.push({ type: "success", message: "Data pesanan diperbarui (jaminan, pengantaran, catatan)." });
  if (fees === "updated") notifications.push({ type: "success", message: "Ongkos antar & tip diperbarui." });
  if (items === "updated") notifications.push({ type: "success", message: "Harga item diperbarui." });
  else if (items === "unchanged") notifications.push({ type: "info", message: "Tidak ada perubahan pada harga item." });
  const dataParam = Array.isArray(errorParam.data) ? errorParam.data[0] : errorParam.data;
  if (dataParam === "deleted") notifications.push({ type: "success", message: "Semua data order (jaminan & foto return) berhasil dihapus." });
  else if (dataParam === "empty") notifications.push({ type: "info", message: "Tidak ada data order yang bisa dihapus." });
  const session = await auth();
  const isAdmin = session?.user?.role === "admin";

  const order = await prisma.order.findUnique({
    where: { id },
    include: orderDetailInclude,
  });
  if (!order) notFound();

  const itemsSubtotal = order.items.reduce((s, it) => s + it.subtotal, 0);
  /** Grand total termasuk ongkos antar & tip dari customer. */
  const grandTotal =
    itemsSubtotal + (order.courierFee ?? 0) + (order.tipAmount ?? 0);
  // Hanya pembayaran confirmed yang dihitung lunas; pending (bukti belum diverifikasi) tidak ikut
  const paid = order.payments
    .filter((p) => ["dp", "pelunasan", "denda"].includes(p.paymentType) && p.status !== "pending")
    .reduce((s, p) => s + p.amount, 0);
  const sisa = grandTotal - paid;
  const overdue = order.status === "active" && order.endDate < new Date();
  const active = order.status === "active" || order.status === "late";

  // Saran denda: hanya untuk order yang masih berjalan dan lewat batas (+ tenggang per produk)
  const lateFee =
    order.status === "late"
      ? (() => {
          const info = computeLateInfo(
            order.endDate,
            order.items.map((it) => ({
              productId: it.productId,
              quantity: it.quantity,
              feePerDay: it.product.lateFee?.active ? it.product.lateFee.feePerDay : null,
              graceHours: it.product.lateFee?.graceHours ?? 0,
            })),
            order.returnedAt ?? new Date()
          );
          return info.suggestedFine > 0 ? info : null;
        })()
      : null;

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
    total: grandTotal,
    sisa: Math.max(0, sisa),
  });
  const reminderWA = `Halo ${order.customer.name}, mohon selesaikan pelunasan order *${order.orderNumber}* sebesar Rp ${Math.max(0, sisa).toLocaleString("id-ID")}. Terima kasih! 🙏`;
  const returnReminderWA = formatReturnReminderWA({
    customerName: order.customer.name,
    orderNumber: order.orderNumber,
    endDate: order.endDate,
    productNames: order.items.map((it) => it.product.name),
  });
  const lateWarningWA = formatLateWarningWA({
    customerName: order.customer.name,
    orderNumber: order.orderNumber,
    endDate: order.endDate,
    lateDays: lateFee?.lateDays ?? 0,
    fine: lateFee?.suggestedFine ?? 0,
  });

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
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <BackLink href="/admin/orders" label="Daftar Orders" />
          <Link
            href="/admin/calendar"
            className="group inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Lihat Kalender{" "}
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">{order.orderNumber}</h1>
          <StatusBadge status={order.status} />
          <span className="text-sm text-muted-foreground hidden sm:inline-block">
            {dateFmt(order.startDate)} → {dateFmt(order.endDate)}
          </span>
        </div>
        {/* Aksi order di kanan: hapus */}
        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
          {isAdmin && <DeleteOrderDialog orderId={order.id} orderNumber={order.orderNumber} />}
        </div>
      </div>

      {overdue && (
        <p className="flex items-center gap-2 rounded-lg bg-amber-100 px-4 py-3 text-sm font-medium text-amber-900">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          Melewati tanggal kembali ({dateFmt(order.endDate)}) — pertimbangkan tandai terlambat
        </p>
      )}
      {/* Prioritas info: Pelanggan & Ringkasan bersebelahan, Item full-width,
          lalu Catat Pembayaran — Jaminan & Return tetap paling bawah */}
      <div className="grid gap-4 lg:grid-cols-2">
        <CustomerSection
          order={order}
          sisa={sisa}
          bookingWA={bookingWA}
          reminderWA={reminderWA}
          returnReminderWA={returnReminderWA}
          lateWarningWA={lateWarningWA}
          isAdmin={isAdmin}
        />
        <FinancialSummary order={order} itemsSubtotal={itemsSubtotal} paid={paid} sisa={sisa} />
      </div>

      <ItemsSection orderId={order.id} items={order.items} />

      <PaymentSection order={order} isAdmin={isAdmin} lateFee={lateFee} />

      <div className="grid gap-4 lg:grid-cols-2">
        <GuaranteeSection order={order} />
        <ReturnSection order={order} active={active} assignedUnits={assignedUnits} />
      </div>

    </div>
  );
}
