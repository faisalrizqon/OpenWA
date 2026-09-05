"use client";

import { OrderDraftProvider } from "@/components/order-draft/OrderDraftContext";

/**
 * Shell client untuk halaman detail order admin.
 *
 * Membungkus seluruh isi halaman dengan `OrderDraftProvider` sehingga semua card
 * edit bisa menampung perubahan sebagai draft. Tombol Simpan/Batal dirender
 * terpisah lewat `OrderDraftSaveBar` di header, sebelah tombol Hapus Order.
 *
 * Halaman induk tetap server component — shell ini hanya menyediakan context.
 */
export function OrderDetailDraftShell({
  orderId,
  children,
}: {
  orderId: string;
  children: React.ReactNode;
}) {
  return (
    <OrderDraftProvider>
      <div className="space-y-6">{children}</div>
    </OrderDraftProvider>
  );
}
