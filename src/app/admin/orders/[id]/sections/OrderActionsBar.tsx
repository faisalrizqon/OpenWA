"use client";

import { StatusChangeForm } from "@/components/OrderAdminActions";
import { OrderUnifiedDeleteDialog } from "@/components/OrderUnifiedDeleteDialog";

/**
 * Bar aksi terpadu di PALING BAWAH halaman detail order:
 * satu tombol Simpan (ubah status) + satu tombol hapus data terpadu.
 * Semua aksi simpan order ada di SATU tempat di sini.
 */
export function OrderActionsBar({
  orderId,
  status,
  isAdmin,
}: {
  orderId: string;
  status: string;
  isAdmin: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-4 shadow-sm">
      <span className="mr-1 text-sm font-medium text-muted-foreground">Aksi order:</span>
      <StatusChangeForm orderId={orderId} status={status} />
      {isAdmin && (
        <OrderUnifiedDeleteDialog orderId={orderId} back={`/admin/orders/${orderId}`} />
      )}
    </div>
  );
}
