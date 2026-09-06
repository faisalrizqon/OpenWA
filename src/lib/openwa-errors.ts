/**
 * Typed Errors untuk integrasi OpenWA.
 *
 * Menggantikan `throw new Error("string")` dan flatten-ke-string di
 * `openwa-api-client.ts` supaya pemanggil bisa membedakan jenis kegagalan
 * (gateway mati vs timeout vs HTTP 4xx/5xx) dan memutuskan retry.
 *
 * Titik masuk klasifikasi: `classifyFetchError` (kegagalan jaringan/timeout dari
 * fetch) dan `httpErrorFromResponse` (response non-2xx). Keduanya dipakai
 * `openwaFetch` — satu-satunya chokepoint HTTP ke gateway.
 */

export type OpenWAErrorCode =
  | "GATEWAY_UNREACHABLE" // koneksi ditolak / DNS gagal — gateway mati
  | "GATEWAY_TIMEOUT" // tidak menjawab dalam batas waktu
  | "GATEWAY_HTTP" // gateway menjawab tapi non-2xx
  | "SESSION_NOT_FOUND" // 404 pada endpoint session
  | "AUTH_INVALID" // 401/403 — API key salah/kurang
  | "RATE_LIMITED" // 429
  | "MESSAGE_SEND_FAILED"; // kegagalan spesifik pengiriman pesan

/** Base class — semua error OpenWA. `retryable` menandai kegagalan transien
 *  yang layak dicoba ulang (gateway mati sementara, 429, 5xx). */
export class OpenWAError extends Error {
  readonly code: OpenWAErrorCode;
  readonly retryable: boolean;
  readonly httpStatus?: number;
  override readonly cause?: unknown;

  constructor(
    message: string,
    code: OpenWAErrorCode,
    options: { retryable?: boolean; httpStatus?: number; cause?: unknown } = {},
  ) {
    super(message);
    this.name = "OpenWAError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.httpStatus = options.httpStatus;
    this.cause = options.cause;
  }
}

/** Petakan kode status HTTP → OpenWAError. `path` dipakai untuk memberi konteks
 *  (mis. 404 di /api/sessions/... = session tidak ada). */
export function httpErrorFromResponse(status: number, bodyText: string, path: string): OpenWAError {
  const detail = bodyText.slice(0, 200).trim();
  const suffix = detail ? `: ${detail}` : "";

  if (status === 401 || status === 403) {
    return new OpenWAError(`OpenWA auth gagal (${status})${suffix}`, "AUTH_INVALID", {
      httpStatus: status,
      retryable: false,
    });
  }
  if (status === 404) {
    const isSession = path.includes("/sessions/");
    return new OpenWAError(
      isSession ? `Session tidak ditemukan${suffix}` : `Endpoint tidak ditemukan (${status})${suffix}`,
      isSession ? "SESSION_NOT_FOUND" : "GATEWAY_HTTP",
      { httpStatus: status, retryable: false },
    );
  }
  if (status === 429) {
    return new OpenWAError(`Rate limit OpenWA tercapai${suffix}`, "RATE_LIMITED", {
      httpStatus: status,
      retryable: true,
    });
  }
  // 5xx = gateway bermasalah tapi mungkin pulih sendiri → retryable.
  return new OpenWAError(`OpenWA HTTP ${status} pada ${path}${suffix}`, "GATEWAY_HTTP", {
    httpStatus: status,
    retryable: status >= 500,
  });
}

/** Ekstrak errno/code dari `Error.cause.code` tanpa inline-cast. Return null bila
 *  struktur tidak cocok — menghindari unchecked cast pada data eksternal
 *  (network errors dari Node fetch). */
function extractErrorCode(err: unknown): string | null {
  if (!(err instanceof Error)) return null;
  const cause = err.cause;
  if (!cause || typeof cause !== "object") return null;
  if ("code" in cause && typeof cause.code === "string") return cause.code;
  return null;
}

/** Klasifikasikan error yang dilempar `fetch` (sebelum ada response).
 *  Node melempar `TypeError: fetch failed` dengan `cause.code` (ECONNREFUSED dll.)
 *  untuk masalah jaringan, dan `DOMException` bernama `TimeoutError` untuk
 *  `AbortSignal.timeout()`. */
export function classifyFetchError(err: unknown, url: string, timeoutMs: number): OpenWAError {
  if (err instanceof Error && err.name === "TimeoutError") {
    return new OpenWAError(
      `Gateway OpenWA tidak menjawab dalam ${timeoutMs}ms (${url})`,
      "GATEWAY_TIMEOUT",
      { retryable: true, cause: err },
    );
  }
  const code = extractErrorCode(err);
  const reason = code ? ` (${code})` : "";
  return new OpenWAError(`Gateway OpenWA tidak terjangkau${reason}: ${url}`, "GATEWAY_UNREACHABLE", {
    retryable: true,
    cause: err,
  });
}

/** True bila error layak dicoba ulang (kegagalan transien). */
export function isRetryable(error: unknown): boolean {
  return error instanceof OpenWAError && error.retryable;
}
