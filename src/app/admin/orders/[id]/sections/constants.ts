import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

/** Label jenis pembayaran (form catat pembayaran + riwayat). */
export const PAYMENT_TYPES: Record<string, string> = {
  dp: "DP",
  pelunasan: "Pelunasan",
  denda: "Denda",
};

/** Label jenis jaminan dari kolom Catatan Notion. */
export const GUARANTEE_TYPES: Record<string, string> = {
  ktp: "KTP",
  sim: "SIM",
  kartu_pelajar: "Kartu Pelajar",
  lainnya: "Lainnya",
};

/** Label metode pembayaran (form + riwayat). "" = belum dipilih. */
export const METHODS: Record<string, string> = {
  "": "—",
  cash: "Cash",
  qris: "QRIS",
  midtrans: "Midtrans",
  transfer: "Transfer Bank",
};

/** Format tanggal lengkap (header order, reschedule, pengembalian). */
export const dateFmt = (d: Date) =>
  format(d, "dd MMMM yyyy HH:mm", { locale: localeId });

/** Format tanggal pendek untuk riwayat pembayaran. */
export const dateFmtDay = (d: Date) =>
  format(d, "dd MMMM yyyy", { locale: localeId });
