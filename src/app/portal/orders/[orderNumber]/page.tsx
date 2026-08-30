import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getStoreSettings } from "@/lib/content";
import { OrderStatusView } from "@/components/OrderStatusView";
import type { PageNotification } from "@/components/PageNotifier";

export const dynamic = "force-dynamic";

/** Detail pesanan di portal customer — merender view yang SAMA PERSIS dengan
 *  halaman publik `/order-status/[orderNumber]` lewat komponen bersama
 *  OrderStatusView (termasuk UnifiedPaymentPanel & tombol Selesaikan Orderan).
 *  Bedanya: orderNumber dicek milik customer yang login. */
export default async function PortalOrderDetailPage({ params, searchParams }: PageProps<"/portal/orders/[orderNumber]">) {
  const session = await auth();
  const customerId = Number(session?.user?.customerId);
  if (!session?.user || session.user.role !== "customer" || !Number.isInteger(customerId) || customerId <= 0) {
    redirect("/portal/login");
  }

  const { orderNumber } = await params;
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      customer: true,
      items: { include: { product: { select: { name: true } } } },
      payments: { orderBy: { paidAt: "desc" } },
      documents: { orderBy: { uploadedAt: "desc" } },
    },
  });
  // Order harus milik customer yang sedang login
  if (!order || order.customerId !== customerId) notFound();

  const shop = await getStoreSettings();

  // Notifikasi hasil aksi (unified payment submit, upload/hapus jaminan) —
  // aturan sama persis dengan halaman publik.
  const sp = await searchParams;
  const successParam = Array.isArray(sp.success) ? sp.success[0] : sp.success;
  const errorParam = Array.isArray(sp.error) ? sp.error[0] : sp.error;
  const guaranteeParam = Array.isArray(sp.guarantee) ? sp.guarantee[0] : sp.guarantee;
  const notifications: PageNotification[] = [];
  if (successParam === "completed") {
    notifications.push({
      type: "success",
      message: "Pembayaran berhasil dikirim! Admin akan memverifikasi pesanan Anda.",
    });
  }
  if (guaranteeParam === "uploaded") {
    notifications.push({ type: "success", message: "Dokumen jaminan berhasil diupload." });
  } else if (guaranteeParam === "deleted") {
    notifications.push({ type: "info", message: "Dokumen jaminan dihapus. Silakan upload ulang bila perlu." });
  }
  if (errorParam) {
    const errorMessages: Record<string, string> = {
      "missing-guarantee": "Jaminan belum lengkap — wajib upload foto identitas (KTP / kartu pelajar) DAN foto selfie untuk metode cash.",
      "missing-proof": "Pilih file bukti terlebih dahulu (foto/screenshot).",
      nofile: "Pilih file terlebih dahulu.",
      file: "File tidak valid — maksimal 15MB (file di atas 3MB dikompres otomatis).",
      "file-type-invalid": "Format file tidak didukung.",
      "file-size-exceeded": "Ukuran file terlalu besar. Maksimal 15MB (auto-kompresi aktif).",
      "invalid-method": "Metode pembayaran tidak valid.",
    };
    notifications.push({ type: "error", message: errorMessages[errorParam] ?? "Terjadi kesalahan. Silakan coba lagi." });
  }

  return (
    <OrderStatusView
      order={order}
      shop={shop}
      notifications={notifications}
      statusPath={(on) => `/portal/orders/${on}`}
    />
  );
}
