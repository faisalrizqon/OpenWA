/**
 * Integrasi pembayaran.
 *
 * Strategi (sesuai keputusan):
 * - Jika MIDTRANS_SERVER_KEY + MIDTRANS_CLIENT_KEY terisi -> pakai Midtrans Snap
 *   (QRIS dinamis, e-wallet, VA, kartu, dll).
 * - Jika tidak -> fallback QRIS statis toko (upload bukti bayar, verifikasi manual).
 * - Cash/COD selalu tersedia.
 */

export type PaymentMethod = "cash" | "qris" | "transfer" | "midtrans" | "gopay";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash / Bayar di Tempat",
  qris: "QRIS (Scan & Upload Bukti)",
  transfer: "Transfer Bank (Upload Bukti Transfer)",
  midtrans: "Pembayaran Online (QRIS / E-wallet / VA)",
  gopay: "GoPay QRIS Dinamis",
};

/** GoPay Merchant aktif jika enabled + token + static QRIS tersimpan di DB. */
export function gopayEnabled(): boolean {
  return Boolean(process.env.GOPAY_ENABLED === "true");
}
export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "Belum bayar",
  pending: "Menunggu verifikasi",
  paid: "Lunas",
  partial: "Sebagian",
  refunded: "Dikembalikan",
};

/** Midtrans aktif hanya jika kedua key terisi. */
export function midtransConfigured(): boolean {
  return Boolean(process.env.MIDTRANS_SERVER_KEY && process.env.MIDTRANS_CLIENT_KEY);
}

function midtransEnv() {
  return process.env.MIDTRANS_IS_PRODUCTION === "true" ? "production" : "sandbox";
}

function snapBaseUrl(): string {
  return midtransEnv() === "production"
    ? "https://app.midtrans.com/snap/v1"
    : "https://app.sandbox.midtrans.com/snap/v1";
}

function coreApiBaseUrl(): string {
  return midtransEnv() === "production"
    ? "https://api.midtrans.com/v2"
    : "https://api.sandbox.midtrans.com/v2";
}

function authHeader(): string {
  const serverKey = process.env.MIDTRANS_SERVER_KEY ?? "";
  return `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;
}

export interface SnapTransactionInput {
  orderId: string;
  grossAmount: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  itemDetails: { id: string; price: number; quantity: number; name: string }[];
}

export interface SnapTransactionResult {
  token: string;
  redirectUrl: string;
}

/** Buat transaksi Snap -> token + redirect URL. Melempar Error jika gagal. */
export async function createMidtransTransaction(
  input: SnapTransactionInput
): Promise<SnapTransactionResult> {
  const res = await fetch(`${snapBaseUrl()}/transactions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: input.orderId,
        gross_amount: input.grossAmount,
      },
      item_details: input.itemDetails,
      customer_details: {
        first_name: input.customerName,
        phone: input.customerPhone,
        ...(input.customerEmail ? { email: input.customerEmail } : {}),
      },
      expiry: { unit: "hour", duration: 12 },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Midtrans error ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { token?: string; redirect_url?: string };
  if (!data.token || !data.redirect_url) {
    throw new Error("Midtrans mengembalikan respons tidak valid");
  }
  return { token: data.token, redirectUrl: data.redirect_url };
}

/** Cek status transaksi di Midtrans Core API. */
export async function getMidtransStatus(orderId: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${coreApiBaseUrl()}/${orderId}/status`, {
    headers: { Accept: "application/json", Authorization: authHeader() },
  });
  if (!res.ok) return null;
  return (await res.json()) as Record<string, unknown>;
}

/** Petakan transaction_status Midtrans -> status pembayaran internal. */
export function mapMidtransStatus(transactionStatus: string): "paid" | "pending" | "refunded" | "failed" {
  switch (transactionStatus) {
    case "capture":
    case "settlement":
      return "paid";
    case "pending":
      return "pending";
    case "refund":
    case "partial_refund":
    case "chargeback":
      return "refunded";
    default: // deny | cancel | expire | failure
      return "failed";
  }
}
