// Helper URL storage yang AMAN untuk client component — tanpa import Node
// (fs/path/crypto). Logika server-side tetap di "@/lib/storage" yang
// me-reexport fungsi di bawah agar konsumen lama tidak berubah.

/** Convert filePath DB ke URL yang bisa dirender client (via protected route). */
export function storageUrl(filePath: string): string {
  if (filePath.startsWith("/storage/")) {
    return `/api${filePath}`;
  }
  // Legacy path /uploads/... tetap serve langsung dari public (belum dimigrasi)
  return filePath;
}

/** Format bytes ke human-readable. */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
