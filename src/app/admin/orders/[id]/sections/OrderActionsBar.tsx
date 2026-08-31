"use client";

import { Save, Trash2 } from "lucide-react";
import { StatusChangeForm, DeleteOrderDialog } from "@/components/OrderAdminActions";

/**
 * Bar aksi terpadu di bawah halaman detail order: pengubah status + hapus order.
 * Dipindah dari card Pelanggan & Aksi agar semua aksi utama ada di SATU tempat
 * di bagian paling bawah halaman.
 */
export function OrderActionsBar({
  orderId,
  orderNumber,
  status,
  isAdmin,
}: {
  orderId: string;
  orderNumber: string;
  status: string;
  isAdmin: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-4 shadow-sm">
      <span className="mr-1 text-sm font-medium text-muted-foreground">Aksi order:</span>
      <StatusChangeForm orderId={orderId} status={status} />
      {isAdmin && (
        <DeleteOrderDialog orderId={orderId} orderNumber={orderNumber} />
      )}
    </div>
  );
}
