import { mkdir, writeFile, unlink, readdir, stat, appendFile } from "fs/promises";
import path from "path";
import { createHash } from "crypto";

// Storage file sensitif (KTP, return photo, bukti bayar) ditempatkan DI LUAR
// public/ agar tidak bisa diakses langsung via static serving. Akses hanya
// lewat /api/storage/[...path] route handler yang punya auth + role check.
//
// Layout: <projectRoot>/storage/{ktp,return,proof}/<filename>
// filePath di DB disimpan sebagai "/storage/{category}/{filename}" yang
// dirender client via <img src="/api/storage/{category}/{filename}">.
const STORAGE_BASE = path.join(process.cwd(), "storage");
const AUDIT_LOG_PATH = path.join(process.cwd(), "storage", "access.log");

export type StorageCategory = "ktp" | "return" | "proof";

export interface StoredFile {
  /** Path relatif yang disimpan di DB, format /storage/<category>/<file> */
  filePath: string;
  fileSize: number;
  fileHash: string;
}

/** Kuota total storage (default 5GB, override via env STORAGE_QUOTA_GB). */
export const QUOTA_LIMIT_BYTES =
  Number(process.env.STORAGE_QUOTA_GB ?? "5") * 1024 * 1024 * 1024;

/** Hitung total ukuran direktori storage (rekursif). */
export async function getStorageUsage(dir: string = STORAGE_BASE): Promise<number> {
  let total = 0;
  try {
    const items = await readdir(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        total += await getStorageUsage(fullPath);
      } else if (item.isFile()) {
        const stats = await stat(fullPath);
        total += stats.size;
      }
    }
  } catch {
    // Direktori belum ada
  }
  return total;
}

/** Cek apakah masih ada ruang untuk file sebesar incomingBytes. */
export async function checkQuota(incomingBytes: number): Promise<
  { ok: true } | { ok: false; current: number; limit: number }
> {
  const current = await getStorageUsage();
  if (current + incomingBytes > QUOTA_LIMIT_BYTES) {
    return { ok: false, current, limit: QUOTA_LIMIT_BYTES };
  }
  return { ok: true };
}

/** Simpan file ke storage external, return metadata untuk disimpan di DB.
 *  Throw bila kuota penuh. */
export async function saveUpload(
  category: StorageCategory,
  fileName: string,
  bytes: Buffer
): Promise<StoredFile> {
  // Enforce kuota sebelum menulis
  const quota = await checkQuota(bytes.length);
  if (!quota.ok) {
    throw new Error(
      `Storage penuh (${formatBytes(quota.current)} dari ${formatBytes(quota.limit)}). Hubungi admin untuk menambah kapasitas.`
    );
  }

  const dir = path.join(STORAGE_BASE, category);
  await mkdir(dir, { recursive: true });

  // Sanitize filename — hanya boleh karakter aman, hindari path traversal
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fullPath = path.join(dir, safeName);

  await writeFile(fullPath, bytes);

  return {
    filePath: `/storage/${category}/${safeName}`,
    fileSize: bytes.length,
    fileHash: createHash("sha256").update(bytes).digest("hex"),
  };
}

/** Resolve path fisik dari filePath yang tersimpan di DB. Return null bila di luar storage base. */
export function resolveStoragePath(filePath: string): string | null {
  if (!filePath.startsWith("/storage/")) return null;
  const relative = filePath.slice("/storage/".length);
  if (relative.includes("..")) return null;

  const resolved = path.resolve(path.join(STORAGE_BASE, relative));
  if (!resolved.startsWith(path.resolve(STORAGE_BASE))) return null;
  return resolved;
}

/** Hapus file fisik dari storage. Diam bila tidak ada (idempotent). */
export async function deleteStoredFile(filePath: string): Promise<void> {
  const fullPath = resolveStoragePath(filePath);
  if (!fullPath) return;
  try {
    await unlink(fullPath);
  } catch {
    // File sudah hilang — tidak apa-apa
  }
}

/** Convert filePath DB ke URL yang bisa dirender client (via protected route). */
export function storageUrl(filePath: string): string {
  if (filePath.startsWith("/storage/")) {
    return `/api${filePath}`;
  }
  // Legacy path /uploads/... tetap serve langsung dari public (belum dimigrasi)
  return filePath;
}

/** Catat akses file sensitif ke audit log (append-only).
 *  Tidak pernah throw — kegagalan log tidak boleh memblokir akses. */
export async function auditLogStorageAccess(opts: {
  userId: string;
  userEmail: string;
  filePath: string;
  action: "read" | "write" | "delete";
}): Promise<void> {
  const line = `${new Date().toISOString()}\t${opts.action}\tuser=${opts.userId}\t<${opts.userEmail}>\tfile=${opts.filePath}\n`;
  try {
    await mkdir(path.dirname(AUDIT_LOG_PATH), { recursive: true });
    await appendFile(AUDIT_LOG_PATH, line);
  } catch (e) {
    // Log failure tidak boleh mengganggu akses — fallback ke console
    console.warn("[storage-audit] gagal menulis log:", e);
    console.log("[STORAGE ACCESS]", line.trim());
  }
}

/** Format bytes ke human-readable. */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
