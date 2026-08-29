import { stat, readdir } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/permissions";

const UPLOADS_BASE = path.join(process.cwd(), "..", "uploads");

export async function GET(request: Request) {
  // Health check hanya untuk admin
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const refresh = url.searchParams.get("refresh") === "true";

  try {
    const dbPath = path.join(process.cwd(), "data", "mudahsewa.db");
    const dbStats = await stat(dbPath);
    const uploadsSize = await getDirSize(UPLOADS_BASE);
    const lastBackup = process.env.LAST_BACKUP_DATE || null;

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      storage: {
        dbSizeBytes: dbStats.size,
        dbSizeHuman: formatBytes(dbStats.size),
        uploadsSizeBytes: uploadsSize,
        uploadsSizeHuman: formatBytes(uploadsSize),
        totalSizeBytes: dbStats.size + uploadsSize,
        totalSizeHuman: formatBytes(dbStats.size + uploadsSize),
      },
      backup: {
        lastBackupDate: lastBackup ? new Date(lastBackup).toISOString() : null,
        nextRecommended: new Date(Date.now() + 86400000).toISOString(),
      },
      ...(refresh && { refreshTriggered: true }),
    });
  } catch (e) {
    console.error("[health] check error:", e);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to check health",
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    );
  }
}

async function getDirSize(dirPath: string): Promise<number> {
  let total = 0;
  try {
    const items = await readdir(dirPath, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        total += await getDirSize(fullPath);
      } else if (item.isFile()) {
        const stats = await stat(fullPath);
        total += stats.size;
      }
    }
  } catch {
    // Direktori belum ada — size 0
  }
  return total;
}

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + " " + sizes[i];
}
