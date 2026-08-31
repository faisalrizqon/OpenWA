import Link from "next/link";
import { Wallet, CalendarClock, AlertTriangle, CheckCircle2, Ban } from "lucide-react";
import { formatRupiah } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "@/components/LinkButton";
import { StatusChangeForm, DeleteOrderDialog } from "@/components/OrderAdminActions";
import { confirmPendingOrder } from "@/actions/orders";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { waLink } from "@/lib/wa";
import { GUARANTEE_TYPES, dateFmt } from "./constants";
import { OrderActionsSection } from "./OrderActionsSection";
import { CustomerDetailsForm } from "./CustomerDetailsForm";
export interface CustomerSectionProps {
  order: {
    id: string;
    customerId: number;
    customer: { name: string; phone: string; isBlacklisted: boolean };
    handledByUser?: { name: string } | null;
    handledBy?: string | null;
    status: string;
    startDate: Date;
    endDate: Date;
    noteOrder?: string | null;
    guaranteeType?: string | null;
    guaranteeNumber?: string | null;
    deliveryMode?: string | null;
    deliveryAddress?: string | null;
    rescheduledFrom?: Date | null;
    returnedAt?: Date | null;
    courierFee: number;
    orderNumber: string;
  };
  sisa: number;
  bookingWA: string;
  reminderWA: string;
  returnReminderWA: string;
  lateWarningWA: string;
  isAdmin: boolean;
}

export function CustomerSection({
  order,
  sisa,
  bookingWA,
  reminderWA,
  returnReminderWA,
  lateWarningWA,
  isAdmin,
}: CustomerSectionProps) {
  return (
    <div className="min-w-0 rounded-xl border bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Pelanggan & Aksi</h2>
        <CustomerDetailsForm
          orderId={order.id}
          initialGuaranteeType={order.guaranteeType ?? null}
          initialGuaranteeNumber={order.guaranteeNumber ?? null}
          initialDeliveryMode={order.deliveryMode ?? null}
          initialDeliveryAddress={order.deliveryAddress ?? null}
          initialNoteOrder={order.noteOrder ?? null}
        />
      </div>

      {/* Anti-spam: order online masih pending — terima/tolak sebelum diproses */}
      {order.status === "pending" && (
        <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-amber-800">
            <AlertTriangle className="size-4" aria-hidden />
            Order Online Baru — Perlu Konfirmasi
          </p>
          <p className="mb-3 text-xs text-amber-700">
            Order dari katalog online belum diproses. Cek data customer & jaminan, lalu
            terima agar masuk antrian booking, atau tolak bila spam.
          </p>
          <div className="flex flex-wrap gap-2">
            <form action={confirmPendingOrder}>
              <input type="hidden" name="orderId" value={order.id} />
              <input type="hidden" name="action" value="accept" />
              <input type="hidden" name="back" value={`/admin/orders/${order.id}`} />
              <Button type="submit" size="sm" className="gap-1.5">
                <CheckCircle2 className="size-4" aria-hidden />
                Terima Order
              </Button>
            </form>
            <form action={confirmPendingOrder}>
              <input type="hidden" name="orderId" value={order.id} />
              <input type="hidden" name="action" value="reject" />
              <input type="hidden" name="back" value={`/admin/orders/${order.id}`} />
              <Button type="submit" variant="outline" size="sm" className="gap-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-700">
                <Ban className="size-4" aria-hidden />
                Tolak (Spam)
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Info pelanggan + petugas */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/admin/customers/${order.customerId}`}
              className="font-semibold text-primary hover:underline"
            >
              {order.customer.name}
            </Link>
            {order.customer.isBlacklisted && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                Blacklist
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{order.customer.phone}</p>
        </div>

        <div className="text-right text-sm">
          <span className="block text-muted-foreground">Ditangani:</span>
          <span className="block font-medium">
            {order.handledByUser?.name ?? order.handledBy ?? "—"}
          </span>
        </div>
      </div>

      {/* Tombol aksi WA */}
      <div className="mt-4 flex flex-wrap gap-2">
        <ExternalLink
          href={waLink(order.customer.phone, bookingWA)}
          label="Konfirmasi Booking"
          tone="emerald"
          icon={<WhatsAppIcon aria-hidden />}
        />
        {sisa > 0 && (
          <ExternalLink
            href={waLink(order.customer.phone, reminderWA)}
            label="Ingatkan Pelunasan"
            tone="amber"
            icon={<Wallet className="size-4" aria-hidden />}
          />
        )}
        {order.status === "active" && (
          <ExternalLink
            href={waLink(order.customer.phone, returnReminderWA)}
            label="Ingatkan Pengembalian"
            tone="blue"
            icon={<CalendarClock className="size-4" aria-hidden />}
          />
        )}
        {order.status === "late" && (
          <ExternalLink
            href={waLink(order.customer.phone, lateWarningWA)}
            label="Peringatkan Keterlambatan"
            tone="rose"
            icon={<AlertTriangle className="size-4" aria-hidden />}
          />
        )}
      </div>
      {/* Catatan order */}
      {order.noteOrder && (
        <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-sm">{order.noteOrder}</p>
      )}

      {/* Quick action ubah tanggal sewa */}
      {isAdmin && (
        <div className="mt-4">
          <OrderActionsSection orderId={order.id} initialStartDate={order.startDate} initialEndDate={order.endDate} />
        </div>
      )}

      {/* Detail tambahan */}
      {(order.guaranteeType || order.deliveryMode === "courier" || order.rescheduledFrom || order.returnedAt) && (
        <dl className="mt-4 grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
          {order.guaranteeType && (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Jaminan</dt>
              <dd className="font-medium">
                {GUARANTEE_TYPES[order.guaranteeType] ?? order.guaranteeType}
                {order.guaranteeNumber ? ` · ${order.guaranteeNumber}` : ""}
              </dd>
            </div>
          )}
          {order.deliveryMode === "courier" && (
            <>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Pengantaran</dt>
                <dd className="font-medium">
                  Diantar kurir{order.deliveryAddress ? ` · ${order.deliveryAddress}` : ""}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Ongkos antar</dt>
                <dd className="font-medium tabular-nums">{formatRupiah(order.courierFee)}</dd>
              </div>
            </>
          )}
          {order.rescheduledFrom && (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Reschedule dari</dt>
              <dd className="font-medium">{dateFmt(order.rescheduledFrom)}</dd>
            </div>
          )}
          {order.returnedAt && (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Dikembalikan</dt>
              <dd className="font-medium">{dateFmt(order.returnedAt)}</dd>
            </div>
          )}
        </dl>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-4">
        <StatusChangeForm orderId={order.id} status={order.status} />
        {isAdmin && <DeleteOrderDialog orderId={order.id} orderNumber={order.orderNumber} />}
      </div>

    </div>
  );
}
