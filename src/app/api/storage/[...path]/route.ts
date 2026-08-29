import { readFile } from "fs/promises";
import path from "path";
import { requireUser } from "@/lib/permissions";
import { resolveStoragePath, auditLogStorageAccess } from "@/lib/storage";

// File sensitif disimpan di <projectRoot>/storage/ (bukan public/).
// Route ini satu-satunya pintu akses: wajib login admin/mitra.

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: rawPath } = await params;

  // Parse path: [ktp, "customer-123-abc.jpg"] atau [return, "order-x-img.png"]
  if (!Array.isArray(rawPath) || rawPath.length < 2) {
    return new Response("Invalid path", { status: 400 });
  }

  const relativePath = path.posix.join(...rawPath);
  if (relativePath.includes("..") || path.isAbsolute(relativePath)) {
    return new Response("Invalid path", { status: 400 });
  }

  // Resolve via helper — sudah include traversal protection
  const dbPath = `/storage/${relativePath}`;
  const fullPath = resolveStoragePath(dbPath);
  if (!fullPath) {
    return new Response("Invalid path", { status: 403 });
  }

  // Auth check wajib — file sensitif tidak boleh diakses tanpa login
  let user;
  try {
    user = await requireUser();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  // Audit log: catat siapa akses file apa (append-only, tidak pernah gagal)
  void auditLogStorageAccess({
    userId: user.id,
    userEmail: user.email,
    filePath: dbPath,
    action: "read",
  });

  try {
    const data = await readFile(fullPath);
    const ext = path.extname(relativePath).toLowerCase();
    const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

    return new Response(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600, must-revalidate",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return new Response("File not found", { status: 404 });
    }
    console.error("[storage] read error:", e);
    return new Response("Internal server error", { status: 500 });
  }
}
