import { PrintButton } from "./PrintButton";
import { BackLink } from "@/components/BackLink";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatRupiah } from "@/lib/pricing";
import { getStoreSettings } from "@/lib/content";

const PAYMENT_TYPES_LABELS: Record<string, string> = {
  dp: "DP",
  pelunasan: "Pelunasan",
  denda: "Denda",
  deposit_refund: "Refund Deposit",
};

export const dynamic = "force-dynamic";

const GUARANTEE_LABELS: Record<string, string> = {
  ktp: "KTP",
  sim: "SIM",
  kartu_pelajar: "Kartu Pelajar",
  lainnya: "Lainnya",
};

const STATUS_LABELS: Record<string, string> = {
  booking: "Booking",
  active: "Aktif",
  late: "Terlambat",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const dateFmt = (d: Date) => format(d, "dd MMM yyyy HH:mm", { locale: localeId });

/** Invoice print-friendly: route mandiri (di luar layout admin) supaya
 *  sidebar/chrome tidak ikut tercetak. */
export default async function InvoicePage({
  params,
}: PageProps<"/invoice/[orderId]">) {
  const { orderId } = await params;

  // Guard: hanya staff (admin/mitra) yang boleh lihat invoice.
  // Route ini di luar /admin/* sehingga TIDAK dilindungi proxy.ts —
  // wajib cek role di sini.
  const session = await auth();
  if (!session?.user || (session.user.role !== "admin" && session.user.role !== "mitra")) {
    notFound();
  }

  const [order, shop] = await Promise.all([
    prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        items: { include: { product: true, unit: true } },
        payments: { orderBy: { paidAt: "asc" } },
        promoCode: { select: { code: true } },
      },
    }),
    getStoreSettings(),
  ]);
  if (!order) notFound();

  const itemsTotal = order.items.reduce((s, it) => s + it.subtotal, 0);
  const promoDiscount = order.promoDiscount ?? 0;
  const grandTotal =
    itemsTotal - promoDiscount + order.courierFee + order.tipAmount;
  const paid = order.payments
    .filter(
      (p) => ["dp", "pelunasan", "denda"].includes(p.paymentType) && p.status !== "pending"
    )
    .reduce((s, p) => s + p.amount, 0);
  const remaining = grandTotal - paid;

  return (
    <div className="invoice-page mx-auto max-w-2xl bg-white px-8 py-10 text-neutral-900 print:px-0 print:py-0">
      {/* Tombol cetak — hilang saat print */}
      <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
        <BackLink href={`/admin/orders/${order.id}`} label="Kembali ke order" />
        <PrintButton />
      </div>

      {/* Kop invoice */}
      <header className="flex items-start justify-between border-b-2 border-neutral-900 pb-4">
        <div>
          <p className="text-xl font-extrabold tracking-tight">{shop.storeName}</p>
          <p className="mt-0.5 text-xs text-neutral-600">{shop.tagline}</p>
          <p className="mt-2 text-xs text-neutral-600">
            {shop.location} · WA {shop.whatsapp}
            <br />
            {shop.hours}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-extrabold uppercase tracking-widest">Invoice</p>
          <p className="mt-1 text-sm font-semibold">{order.orderNumber}</p>
          <p className="mt-1 text-xs text-neutral-600">
            Dicetak: {format(new Date(), "dd MMM yyyy", { locale: localeId })}
          </p>
        </div>
      </header>

      {/* Info pelanggan & sewa */}
      <section className="mt-5 grid grid-cols-2 gap-6 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Pelanggan
          </p>
          <p className="mt-1 font-semibold">{order.customer.name}</p>
          <p className="text-neutral-600">{order.customer.phone}</p>
          {order.customer.address && (
            <p className="text-neutral-600">{order.customer.address}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Detail Sewa
          </p>
          <p className="mt-1">
            Mulai: <span className="font-semibold">{dateFmt(order.startDate)}</span>
          </p>
          <p>
            Kembali: <span className="font-semibold">{dateFmt(order.endDate)}</span>
          </p>
          <p className="text-neutral-600">
            Status: {STATUS_LABELS[order.status] ?? order.status}
            {order.returnedAt ? ` · Dikembalikan ${dateFmt(order.returnedAt)}` : ""}
          </p>
        </div>
      </section>

      {/* Tabel item */}
      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-300 text-left text-xs uppercase tracking-wide text-neutral-500">
            <th className="py-2 pr-2 font-semibold">Barang</th>
            <th className="py-2 pr-2 text-center font-semibold">Qty</th>
            <th className="py-2 pr-2 text-center font-semibold">Durasi</th>
            <th className="py-2 pr-2 text-right font-semibold">Harga</th>
            <th className="py-2 text-right font-semibold">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((it) => (
            <tr key={it.id} className="border-b border-neutral-100">
              <td className="py-2.5 pr-2">
                <p className="font-medium">{it.product.name}</p>
                {it.unit?.serialNumber && (
                  <p className="text-xs text-neutral-500">SN: {it.unit.serialNumber}</p>
                )}
              </td>
              <td className="py-2.5 pr-2 text-center">{it.quantity}</td>
              <td className="py-2.5 pr-2 text-center">{it.durationHours} jam</td>
              <td className="py-2.5 pr-2 text-right tabular-nums">
                {formatRupiah(it.unitPrice)}
              </td>
              <td className="py-2.5 text-right font-medium tabular-nums">
                {formatRupiah(it.subtotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Total */}
      <section className="mt-4 ml-auto w-64 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-neutral-600">Subtotal</span>
          <span className="tabular-nums">{formatRupiah(itemsTotal)}</span>
        </div>
        {promoDiscount > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>
              Diskon{order.promoCode?.code ? ` (${order.promoCode.code})` : ""}
            </span>
            <span className="tabular-nums">−{formatRupiah(promoDiscount)}</span>
          </div>
        )}
        {order.courierFee > 0 && (
          <div className="flex justify-between">
            <span className="text-neutral-600">Ongkos antar</span>
            <span className="tabular-nums">{formatRupiah(order.courierFee)}</span>
          </div>
        )}
        {order.tipAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-neutral-600">Tip</span>
            <span className="tabular-nums">{formatRupiah(order.tipAmount)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-neutral-900 pt-2 text-base font-bold">
          <span>Total</span>
          <span className="tabular-nums">{formatRupiah(grandTotal)}</span>
        </div>
      </section>

      {/* Pembayaran */}
      <section className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Riwayat Pembayaran
        </p>
        {order.payments.length === 0 ? (
          <p className="mt-1 text-sm text-neutral-600">Belum ada pembayaran.</p>
        ) : (
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-300 text-left text-xs text-neutral-500">
                <th className="py-1.5 font-medium">Tanggal</th>
                <th className="py-1.5 font-medium">Jenis</th>
                <th className="py-1.5 font-medium">Metode</th>
                <th className="py-1.5 font-medium">Status</th>
                <th className="py-1.5 text-right font-medium">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {order.payments.map((p) => (
                <tr key={p.id} className="border-b border-neutral-100">
                  <td className="py-1.5">{format(p.paidAt, "dd/MM/yyyy HH:mm")}</td>
                  <td className="py-1.5">{PAYMENT_TYPES_LABELS[p.paymentType] ?? p.paymentType}</td>
                  <td className="py-1.5">{p.method ?? "—"}</td>
                  <td className="py-1.5">
                    {p.status === "pending" ? "Menunggu" : p.status === "confirmed" ? "Dikonfirmasi" : p.status}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{formatRupiah(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="mt-2 flex justify-between border-t border-neutral-300 pt-2 text-sm font-semibold">
          <span>{remaining > 0 ? "Sisa Pembayaran" : "Status"}</span>
          <span className="tabular-nums">
            {remaining > 0 ? formatRupiah(remaining) : "LUNAS"}
          </span>
        </div>
      </section>

      {/* Info tambahan */}
      {(order.guaranteeType || order.noteOrder || order.deliveryMode === "courier") && (
        <section className="mt-6 space-y-1 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Keterangan
          </p>
          {order.guaranteeType && (
            <p>
              Jaminan: {GUARANTEE_LABELS[order.guaranteeType] ?? order.guaranteeType}
              {order.guaranteeNumber ? ` (${order.guaranteeNumber})` : ""}
            </p>
          )}
          {order.deliveryMode === "courier" && order.deliveryAddress && (
            <p>Antar ke: {order.deliveryAddress}</p>
          )}
          {order.noteOrder && <p>Catatan: {order.noteOrder}</p>}
        </section>
      )}

      {/* Footer */}
      <footer className="mt-10 border-t border-neutral-200 pt-4 text-center text-xs text-neutral-500">
        Terima kasih sudah menyewa di {shop.storeName}! 📸 · {shop.tagline}
      </footer>
    </div>
  );
}
