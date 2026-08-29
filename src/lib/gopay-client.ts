/**
 * HTTP Client untuk GoPay Merchant Gateway (`gopay-gateway/`, fork dari
 * ahmadzakiyox/gopay-api-gateaway).
 *
 * Login OTP dilakukan SEKALI via terminal di sisi gateway (`node login.js`);
 * gateway menyimpan sesi di `.GOPAY_SESI_JANGAN_DIHAPUS.json` dan
 * me-refresh token otomatis tiap 6 jam. MudahSewa hanya berbicara HTTP:
 *
 *   GET  /token-status        — validitas sesi (butuh API key)
 *   POST /create-qris         — buat QRIS dinamis (butuh API key)
 *   POST /check-payment       — verifikasi pembayaran by nominal unik (butuh API key)
 *   GET  /api/logs            — log aktivitas gateway (butuh API key)
 *
 * Catatan anti double-claim: gateway memegang klaim per scope `trx_id`
 * (in-memory). Kita kirim `reference` (order:<orderId>) sebagai trx_id agar
 * satu transaksi mutasi hanya bisa melunasi satu order.
 */

const GATEWAY_URL = (process.env.GOPAY_GATEWAY_URL || "http://localhost:3000").replace(/\/+$/, "");
const API_KEY = process.env.GOPAY_API_KEY || "";
const TIMEOUT_MS = 10_000;

interface ApiOptions {
  method?: "GET" | "POST";
  body?: unknown;
  query?: Record<string, string | undefined>;
}

async function fetchJson<T>(url: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, query } = options;

  const searchParams = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) searchParams.set(key, value);
    }
  }

  const qs = searchParams.toString();
  const fullUrl = qs ? `${url}?${qs}` : url;

  const headers: Record<string, string> = {};
  if (API_KEY) headers["X-API-Key"] = API_KEY;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(fullUrl, {
    method,
    headers,
    ...(body !== undefined && { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Gateway error ${response.status}: ${errorText.slice(0, 200)}`);
  }

  return response.json() as Promise<T>;
}

/** Status sesi gateway: valid bila login terminal aktif dan token hidup. */
export async function checkSessionStatus(): Promise<{ valid: boolean; message: string }> {
  try {
    const result = await fetchJson<{
      success: boolean;
      data?: { token_status: string; message: string };
    }>(`${GATEWAY_URL}/token-status`);

    if (result.data?.token_status === "valid") {
      return { valid: true, message: result.data.message || "Sesi aktif" };
    }
    return { valid: false, message: result.data?.message || "Sesi gateway tidak valid" };
  } catch {
    return {
      valid: false,
      message: "Gateway tidak merespons — pastikan gopay-gateway berjalan (GOPAY_GATEWAY_URL).",
    };
  }
}

export interface CreateQrisInput {
  /** Nominal bulat rupiah yang harus dibayar customer. */
  amount: number;
}

/** Bentuk data QRIS dari POST /create-qris (field sesuai server.js gateway). */
export interface CreateQrisResult {
  qris_id: string;
  trx_id: string;
  qris_url: string;
  qris_code: string;
  amount: number;
  expires_at: string; // ISO timestamp
  expires_in: string;
}

export async function createDynamicQris(input: CreateQrisInput): Promise<CreateQrisResult> {
  const result = await fetchJson<{ success: boolean; message?: string; data: CreateQrisResult }>(
    `${GATEWAY_URL}/create-qris`,
    {
      method: "POST",
      body: { amount: input.amount },
    }
  );

  if (!result.success) {
    throw new Error(result.message || "Gagal membuat QRIS dinamis");
  }

  return result.data;
}

export interface PaymentVerificationResult {
  transaction_id: string;
  order_id: string;
  amount: number;
  payer_issuer: string;
  payment_type: string;
  transaction_time: string;
}

/**
 * Cari transaksi mutasi yang cocok dengan nominal unik.
 * `scopeId` (kita pakai order reference) menjadi scope klaim gateway agar
 * satu transaksi tidak diklaim dua payment berbeda.
 */
export async function verifyPayment(
  amount: number,
  startTime: Date,
  scopeId: string
): Promise<PaymentVerificationResult | null> {
  try {
    const result = await fetchJson<{
      success: boolean;
      paid?: boolean;
      transaction?: PaymentVerificationResult;
      message?: string;
    }>(`${GATEWAY_URL}/check-payment`, {
      method: "POST",
      body: {
        amount,
        startTime: startTime.toISOString(),
        trx_id: scopeId,
      },
    });

    if (result.success && result.paid && result.transaction) {
      return result.transaction;
    }
    return null;
  } catch (err) {
    console.error("[GoPayClient] verifyPayment gagal:", err);
    return null;
  }
}

/** Log aktivitas gateway (untuk diagnostik admin). */
export async function fetchGatewayLogs(limit = 20): Promise<
  Array<{ type: string; message: string; timestamp: string }>
> {
  try {
    const result = await fetchJson<{
      success: boolean;
      logs: Array<{ type: string; message: string; timestamp: string }>;
    }>(`${GATEWAY_URL}/api/logs`);
    return (result.logs ?? []).slice(0, limit);
  } catch {
    return [];
  }
}
