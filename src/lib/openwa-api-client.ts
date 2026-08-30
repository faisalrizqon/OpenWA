/**
 * OpenWA REST API Client
 *
 * Berkomunikasi dengan gateway OpenWA (default http://localhost:2785) via
 * HTTP + X-API-Key. MudahSewa TIDAK menjalankan whatsapp-web.js di dalam
 * proses Next.js — gateway adalah proses terpisah (Docker/Node).
 *
 * Endpoint yang dipakai (lihat README OpenWA):
 *   GET  /api/sessions                                  daftar session
 *   GET  /api/health                                    health check gateway
 *   POST /api/sessions/{id}/start                       jalankan session (QR)
 *   POST /api/sessions/{id}/stop                        hentikan session
 *   GET  /api/sessions/{id}/qr                          ambil QR code
 *   POST /api/sessions/{id}/messages/send-text          kirim pesan teks
 *
 * Setiap pesan keluar dicatat ke tabel MessageLog (Prisma) sebagai audit
 * trail. Bila Prisma client belum di-regenerate (model MessageLog baru),
 * logging otomatis no-op — tidak pernah menggagalkan alur utama.
 */

import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";

// --- Tipe data ---

export interface OpenWASession {
  id: string;
  name: string;
  status: string; // connected | disconnected | starting | qr_pending | error
  phoneNumber?: string | null;
  createdAt?: string;
  lastActiveAt?: string;
}

export interface SendMessageInput {
  chatId: string; // contoh: "628123456789@c.us"
  text: string;
}

export interface SendMessageResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

/** Baris log pesan WhatsApp (subset field yang kita butuhkan). */
export interface MessageLogRow {
  id: number;
  sessionId: string;
  orderId: string | null;
  chatId: string;
  type: string;
  body: string;
  direction: string;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
}

/** Subset delegate Prisma untuk model MessageLog — dipakai karena client
 *  bisa saja belum di-regenerate (model baru), jadi aksesnya dijaga. */
interface MessageLogDelegate {
  create(args: {
    data: {
      sessionId: string;
      chatId: string;
      type: string;
      body: string;
      direction: string;
      status: string;
      orderId?: string | null;
      errorMessage?: string | null;
    };
  }): Promise<unknown>;
  findMany(args: { take: number; orderBy: { createdAt: "desc" } }): Promise<MessageLogRow[]>;
  count(args: { where?: Record<string, unknown> }): Promise<number>;
}

// --- Konfigurasi ---

const OPENWA_URL = (process.env.OPENWA_URL ?? "http://localhost:2785").replace(/\/+$/, "");
/** Dashboard UI OpenWA (Vite dev server) — port terpisah dari API gateway. */
export const OPENWA_DASHBOARD_URL = (process.env.OPENWA_DASHBOARD_URL ?? "https://wa.dagdigdugdigicam.store").replace(/\/+$/, "");

/** URL Vite dev server dashboard (hot-reload) — port terpisah dari gateway. */
export const OPENWA_DEV_SERVER_URL = (process.env.OPENWA_DEV_SERVER_URL ?? "http://localhost:2886").replace(/\/+$/, "");

/** File override mode deployment (ditulis server action `setOpenWADashboardMode`) —
 *  memungkinkan ganti mode tanpa restart app Next.js. Tidak di-commit: preferensi mesin. */
const DEPLOYMENT_MODE_FILE = path.join(process.cwd(), "openwa-deployment-mode.json");

export type OpenWADeploymentMode = "bundled" | "split";

function readModeOverride(): OpenWADeploymentMode | null {
  try {
    const raw = fs.readFileSync(DEPLOYMENT_MODE_FILE, "utf8");
    const parsed = JSON.parse(raw) as { mode?: unknown };
    return parsed.mode === "bundled" || parsed.mode === "split" ? parsed.mode : null;
  } catch {
    return null; // file tidak ada / korup → tidak ada override
  }
}

/** Mode deployment OpenWA (lihat docs OpenWA — Docker/bundled vs local dev):
 *
 *  - `"bundled"`: SATU proses — gateway (default :2785) menyajikan API sekaligus UI
 *    dashboard dari build `dashboard/dist` (layout Docker/production). Hemat resource.
 *  - `"split"`: DUA proses — gateway API + Vite dev server (:2886); UI dibaca dari dev
 *    server untuk hot-reload saat mengembangkan dashboard.
 *
 *  Urusan resource: menjalankan keduanya sekaligus di mode bundled membuang RAM untuk
 *  Vite yang tidak dipakai. Urutan deteksi: (1) override file yang ditulis switcher UI,
 *  (2) env `OPENWA_DASHBOARD_MODE`, (3) `OPENWA_DASHBOARD_URL` yang menunjuk port
 *  localhost berbeda dari gateway → split. Default: bundled. */
export function openwaDeploymentMode(): OpenWADeploymentMode {
  const fileOverride = readModeOverride();
  if (fileOverride) return fileOverride;
  const forced = process.env.OPENWA_DASHBOARD_MODE;
  if (forced === "bundled" || forced === "split") return forced;
  const dashUrl = process.env.OPENWA_DASHBOARD_URL;
  const gatewayUrl = process.env.OPENWA_URL;
  if (dashUrl && gatewayUrl) {
    try {
      const dash = new URL(dashUrl);
      const gateway = new URL(gatewayUrl);
      if (dash.hostname === gateway.hostname && dash.port !== gateway.port && dash.port !== "") return "split";
    } catch {
      /* URL tidak valid — jatuh ke default bundled */
    }
  }
  return "bundled";
}

/** Tulis override mode (dipakai server action switcher). Validasi input di caller. */
export function writeDeploymentModeOverride(mode: OpenWADeploymentMode): void {
  fs.writeFileSync(DEPLOYMENT_MODE_FILE, JSON.stringify({ mode }, null, 2), "utf8");
}

/** Base URL UI dashboard OpenWA MENGIKUTI mode deployment aktif. Dipakai semua tempat
 *  yang membuka/meng-embed UI (iframe admin, shortcut, ping) — JANGAN hardcode
 *  `OPENWA_DASHBOARD_URL`, karena di mode bundled env itu bisa menunjuk port dev yang
 *  mati (:2886) dan browser menampilkan "refused to connect".
 *
 *  - split   → UI disajikan Vite dev server (`OPENWA_DASHBOARD_URL`, fallback :2886).
 *  - bundled → UI disajikan gateway itu sendiri di port 2785; `OPENWA_DASHBOARD_URL`
 *    hanya dipakai bila memang menjawab (mis. subdomain produksi yang di-proxy nginx ke
 *    gateway), selain itu fallback ke origin gateway. */
export async function resolveDashboardUrl(): Promise<string> {
  if (openwaDeploymentMode() === "split") {
    return (process.env.OPENWA_DASHBOARD_URL ?? OPENWA_DEV_SERVER_URL).replace(/\/+$/, "");
  }
  const configured = (process.env.OPENWA_DASHBOARD_URL ?? "").replace(/\/+$/, "");
  if (configured && configured !== OPENWA_URL && (await pingDashboard(configured))) {
    return configured;
  }
  return OPENWA_URL;
}

export function openwaConfigured(): boolean {
  return Boolean(process.env.OPENWA_API_KEY && process.env.OPENWA_SESSION_ID);
}

/** Delegate messageLog — null bila Prisma client belum di-regenerate.
 *  Cast tunggal beralasan: client lama tidak punya properti `messageLog`,
 *  validasi bentuk dilakukan via `typeof` sebelum dipakai. */
function messageLogDelegate(): MessageLogDelegate | null {
  const prismaRecord = prisma as unknown as Record<string, unknown>;
  const delegate = prismaRecord.messageLog;
  if (!delegate || typeof delegate !== "object") return null;
  if (!("create" in delegate) || typeof delegate.create !== "function") return null;
  if (!("findMany" in delegate) || typeof delegate.findMany !== "function") return null;
  if (!("count" in delegate) || typeof delegate.count !== "function") return null;
  // Bentuk delegate Prisma sudah diverifikasi di atas; cast akhir disengaja.
  return delegate as MessageLogDelegate;
}

export function messageLogAvailable(): boolean {
  return messageLogDelegate() !== null;
}

// --- HTTP helper ---

async function openwaFetch(pathname: string, init?: RequestInit, timeoutMs = 10_000): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  const apiKey = process.env.OPENWA_API_KEY;
  if (apiKey) headers["X-API-Key"] = apiKey;

  return fetch(`${OPENWA_URL}${pathname}`, {
    ...init,
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
}

/** Ambil daftar session dari gateway. Gagal (gateway mati) → lempar error. */
export async function listSessions(): Promise<OpenWASession[]> {
  const res = await openwaFetch("/api/sessions");
  if (!res.ok) {
    throw new Error(`OpenWA ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
  }
  const json: unknown = await res.json();
  if (Array.isArray(json)) return json as OpenWASession[];
  if (json && typeof json === "object") {
    const candidate = json as { data?: unknown; sessions?: unknown };
    if (Array.isArray(candidate.data)) return candidate.data as OpenWASession[];
    if (Array.isArray(candidate.sessions)) return candidate.sessions as OpenWASession[];
  }
  return [];
}

/** Cek apakah gateway OpenWA hidup (GET /api/health). */
export async function pingGateway(url?: string): Promise<boolean> {
  try {
    const baseURL = url ?? process.env.OPENWA_URL ?? "http://localhost:2785";
    const res = await fetch(`${baseURL}/api/health`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

/** Cek apakah dashboard UI berjalan (subdomain wa.dagdigdugdigicam.store atau custom).
 *  Ping root `/` — Vite selalu menjawab 200 dengan index.html untuk SPA.
 *  JANGAN pakai `/api/health`: rute itu diproksi Vite ke gateway 2785, jadi
 *  dashboard yang hidup tapi gateway mati akan terbaca "Offline" padahal UI-nya up. */
export async function pingDashboard(url?: string): Promise<boolean> {
  try {
    const baseURL = url ?? process.env.OPENWA_DASHBOARD_URL ?? "https://wa.dagdigdugdigicam.store";
    const res = await fetch(baseURL, { cache: "no-store", redirect: "follow" });
    return res.ok;
  } catch {
    return false;
  }
}

// --- Kontrol session (start / stop) ---

export interface SessionActionResult {
  ok: boolean;
  status?: string;
  error?: string;
}

/** Jalankan session WhatsApp: POST /api/sessions/{id}/start.
 *  Setelah start, session menunggu QR di-scan (status "qr_ready"). */
export async function startSession(sessionId: string): Promise<SessionActionResult> {
  try {
    const res = await openwaFetch(`/api/sessions/${encodeURIComponent(sessionId)}/start`, {
      method: "POST",
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { ok: false, error: `HTTP ${res.status}: ${errText.slice(0, 200)}` };
    }
    const json: unknown = await res.json().catch(() => ({}));
    let status: string | undefined;
    if (json && typeof json === "object" && "status" in json && typeof json.status === "string") {
      status = json.status;
    }
    return { ok: true, status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Hentikan session WhatsApp: POST /api/sessions/{id}/stop. */
export async function stopSession(sessionId: string): Promise<SessionActionResult> {
  try {
    const res = await openwaFetch(`/api/sessions/${encodeURIComponent(sessionId)}/stop`, {
      method: "POST",
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { ok: false, error: `HTTP ${res.status}: ${errText.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Ambil QR code session: GET /api/sessions/{id}/qr (data URL PNG base64). */
export async function getSessionQr(sessionId: string): Promise<string | null> {
  try {
    const res = await openwaFetch(`/api/sessions/${encodeURIComponent(sessionId)}/qr`);
    if (!res.ok) return null;
    const json: unknown = await res.json().catch(() => ({}));
    if (json && typeof json === "object" && "qrCode" in json && typeof json.qrCode === "string") {
      return json.qrCode;
    }
    return null;
  } catch {
    return null;
  }
}

// --- Pengiriman pesan ---

/** Kirim pesan teks ke satu chatId. Gagal → SendMessageResult { ok:false }. */
export async function sendMessage(sessionId: string, input: SendMessageInput): Promise<SendMessageResult> {
  try {
    const res = await openwaFetch(`/api/sessions/${encodeURIComponent(sessionId)}/messages/send-text`, {
      method: "POST",
      body: JSON.stringify(input),
    }, 30_000);
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[openwa] send gagal (${res.status}):`, errText.slice(0, 300));
      return { ok: false, error: `HTTP ${res.status}: ${errText.slice(0, 200)}` };
    }
    const json: unknown = await res.json().catch(() => ({}));
    let messageId: string | undefined;
    if (json && typeof json === "object") {
      const candidate = json as { id?: unknown; messageId?: unknown };
      if (typeof candidate.id === "string") messageId = candidate.id;
      else if (typeof candidate.messageId === "string") messageId = candidate.messageId;
    }
    return { ok: true, messageId };
  } catch (e) {
    console.error("[openwa] send error:", e instanceof Error ? e.message : e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// --- Format nomor telepon ---

/** Normalisasi nomor Indonesia ke digit dengan kode negara: 0812… → 62812… */
export function formatWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

/** Nomor HP → chatId WhatsApp: "0812…" → "62812…@c.us" */
export function phoneToChatId(phone: string): string {
  return `${formatWhatsAppPhone(phone)}@c.us`;
}

// --- Audit log (MessageLog) — tidak pernah melempar ---

/** Catat pesan keluar ke tabel MessageLog. No-op bila model belum tersedia. */
export async function logMessage(params: {
  sessionId: string;
  chatId: string;
  body: string;
  status: "pending" | "delivered" | "read" | "failed";
  orderId?: string | null;
  errorMessage?: string | null;
}): Promise<void> {
  const delegate = messageLogDelegate();
  if (!delegate) return; // Prisma client belum di-regenerate — skip logging

  try {
    await delegate.create({
      data: {
        sessionId: params.sessionId,
        chatId: params.chatId,
        type: "text",
        body: params.body.slice(0, 1000),
        direction: "sent",
        status: params.status,
        orderId: params.orderId ?? null,
        errorMessage: params.errorMessage ?? null,
      },
    });
  } catch (e) {
    console.warn("[openwa] gagal mencatat MessageLog:", e instanceof Error ? e.message : e);
  }
}

/** Riwayat pesan terbaru (untuk dashboard). [] bila model belum tersedia. */
export async function getRecentMessageLogs(limit = 10): Promise<MessageLogRow[]> {
  const delegate = messageLogDelegate();
  if (!delegate) return [];
  try {
    return await delegate.findMany({ take: limit, orderBy: { createdAt: "desc" } });
  } catch (e) {
    console.warn("[openwa] gagal membaca MessageLog:", e instanceof Error ? e.message : e);
    return [];
  }
}

/** Statistik agregat MessageLog: terkirim hari ini + total sukses. */
export async function getMessageLogStats(): Promise<{
  sentToday: number;
  deliveredTotal: number;
  sentTotal: number;
}> {
  const delegate = messageLogDelegate();
  if (!delegate) return { sentToday: 0, deliveredTotal: 0, sentTotal: 0 };

  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);

  try {
    const [sentToday, deliveredTotal, sentTotal] = await Promise.all([
      delegate.count({ where: { direction: "sent", createdAt: { gte: startToday } } }),
      delegate.count({ where: { direction: "sent", status: { in: ["delivered", "read"] } } }),
      delegate.count({ where: { direction: "sent" } }),
    ]);
    return { sentToday, deliveredTotal, sentTotal };
  } catch (e) {
    console.warn("[openwa] gagal menghitung MessageLog:", e instanceof Error ? e.message : e);
    return { sentToday: 0, deliveredTotal: 0, sentTotal: 0 };
  }
}

/** Resolve session id dari env OPENWA_SESSION_ID.
 *  Nilai boleh UUID langsung atau nama session — nama di-resolve via list. */
export async function resolveSessionId(): Promise<string | null> {
  const envValue = (process.env.OPENWA_SESSION_ID ?? "").trim();
  if (!envValue) return null;
  // UUID v4 → pakai langsung
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(envValue)) {
    return envValue;
  }
  // Bukan UUID → cari session dengan nama tersebut
  try {
    const sessions = await listSessions();
    const byName = sessions.find((s) => s.name === envValue);
    return byName ? byName.id : (sessions[0]?.id ?? null);
  } catch {
    return null;
  }
}
