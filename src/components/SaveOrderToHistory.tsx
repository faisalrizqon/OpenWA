"use client";

import { useEffect } from "react";
import { saveOrderToHistory } from "@/components/order-tracking";

/** Simpan nomor order ke riwayat perangkat secara otomatis saat halaman
 *  payment/status dikunjungi — dipakai untuk tracking tanpa login. */
export function SaveOrderToHistory({ orderNumber }: { orderNumber: string }) {
  useEffect(() => {
    saveOrderToHistory(orderNumber);
  }, [orderNumber]);
  return null;
}
