"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { History, Trash2 } from "lucide-react";
import { readOrderHistory, removeOrderFromHistory } from "@/components/order-tracking";

/** Daftar riwayat order tersimpan di perangkat ini — customer tanpa login
 *  tetap bisa melihat & membuka kembali pesanannya. */
export function OrderHistoryList() {
  const [orders, setOrders] = useState<string[] | null>(null);

  useEffect(() => {
    setOrders(readOrderHistory());
  }, []);

  const remove = (orderNumber: string) => {
    removeOrderFromHistory(orderNumber);
    setOrders(readOrderHistory());
  };

  if (orders === null) {
    return (
      <div className="animate-pulse rounded-2xl border border-dashed py-10 text-center text-sm text-muted-foreground">
        Memuat riwayat…
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed py-10 text-center">
        <History className="mx-auto size-8 text-muted-foreground/40" aria-hidden />
        <p className="mt-2 text-sm font-medium">Belum ada riwayat order di perangkat ini</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Order yang kamu buat dari perangkat ini otomatis tersimpan di sini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {orders.map((n) => (
        <div
          key={n}
          className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3"
        >
          <Link
            href={`/order-status/${encodeURIComponent(n)}`}
            className="flex min-w-0 flex-1 flex-col hover:text-primary"
          >
            <span className="truncate font-mono text-sm font-semibold">{n}</span>
            <span className="text-xs text-muted-foreground">Klik untuk lihat status</span>
          </Link>
          <button
            type="button"
            onClick={() => remove(n)}
            title="Hapus dari riwayat perangkat"
            aria-label={`Hapus ${n} dari riwayat`}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      ))}
      <p className="pt-1 text-xs text-muted-foreground">
        Riwayat tersimpan hanya di browser perangkat ini (tanpa login).
      </p>
    </div>
  );
}
