import { stat, readdir } from "fs/promises";
import path from "path";
import Link from "next/link";
import {
  ArrowLeft,
  Database,
  HardDrive,
  CalendarClock,
  ShieldCheck,
} from "lucide-react";
import { requireAdmin } from "@/lib/permissions";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_BASE = path.join(process.cwd(), "storage");
const DB_PATH = path.join(process.cwd(), "data", "mudahsewa.db");
const SOFT_LIMIT_BYTES = 5 * 1024 * 1024 * 1024; // target 5GB per kategori

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
    // Direktori belum ada
  }
  return total;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default async function HealthPage() {
  await requireAdmin();

  const [dbStats, uploadsSize] = await Promise.all([
    stat(DB_PATH).catch(() => ({ size: 0 } as { size: number })),
    getDirSize(STORAGE_BASE),
  ]);

  const storageCategories = await Promise.all(
    ["ktp", "return", "proof"].map(async (cat) => ({
      category: cat,
      size: await getDirSize(path.join(STORAGE_BASE, cat)),
    }))
  );

  const totalBytes = dbStats.size + uploadsSize;
  const utilizationPct = (totalBytes / SOFT_LIMIT_BYTES) * 100;
  const healthPct = Math.min(100, utilizationPct);
  const barColor =
    utilizationPct >= 90 ? "bg-red-500" : utilizationPct >= 70 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Status Sistem"
        description="Database, storage file sensitif, dan status backup"
      />
      <Link
        href="/admin"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5 -mt-3")}
      >
        <ArrowLeft className="size-4" aria-hidden />
        Kembali ke Dashboard
      </Link>

      {/* Overview total */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="size-5 text-muted-foreground" aria-hidden />
            Total Pemakaian Disk
          </CardTitle>
          <CardDescription>
            Database + file unggahan · target ≤ {formatBytes(SOFT_LIMIT_BYTES)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold tabular-nums">{formatBytes(totalBytes)}</p>
            <p className="text-sm text-muted-foreground">{utilizationPct.toFixed(1)}% dari target</p>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn("h-full rounded-full transition-all", barColor)}
              style={{ width: `${healthPct}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Database */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="size-5 text-muted-foreground" aria-hidden />
              Database SQLite
            </CardTitle>
            <CardDescription>data/mudahsewa.db (WAL mode aktif)</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{formatBytes(dbStats.size)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              30 indexes · WAL journal · foreign_keys ON
            </p>
          </CardContent>
        </Card>

        {/* Storage per kategori */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-muted-foreground" aria-hidden />
              Storage File Sensitif
            </CardTitle>
            <CardDescription>Dilindungi /api/storage (perlu login admin/mitra)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {storageCategories.map(({ category, size }) => (
              <div key={category} className="flex items-center justify-between text-sm">
                <span className="font-mono text-muted-foreground">/storage/{category}/</span>
                <span className="font-medium tabular-nums">{formatBytes(size)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatBytes(uploadsSize)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backup info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="size-5 text-muted-foreground" aria-hidden />
            Backup
          </CardTitle>
          <CardDescription>Script backup harian via cron job</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Script: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">scripts/backup-db.sh</code>
          </p>
          <p>
            Jadwal disarankan: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">0 2 * * *</code> (setiap hari pukul 02:00)
          </p>
          <p className="text-muted-foreground">
            Output: DB snapshot + tar.gz uploads dengan retensi 7 hari (DB) / 30 hari (uploads).
          </p>
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/users" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Kelola Pengguna
        </Link>
        <Link href="/admin/reports" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Laporan
        </Link>
      </div>
    </div>
  );
}
