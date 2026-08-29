/**
 * Server action untuk mengontrol proses GoPay Gateway (`gopay-gateway/`).
 *
 * Pola mengikuti openwa-gateway.ts: spawn detached + health poll, kill via
 * PID dari netstat. Gateway default port 3100 (3000 dipakai Next.js).
 */

"use server";

import { exec, spawn } from "child_process";
import * as fs from "fs";
import path from "path";
import { promisify } from "util";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/permissions";

const execAsync = promisify(exec);

const GATEWAY_DIR = path.join(process.cwd(), "gopay-gateway");
const GATEWAY_LOG_FILE = path.join(process.cwd(), "gopay-gateway.log");
const TAB_CONFIG = "/admin/payments?tab=config";

/** URL dasar gateway dari env (default localhost:3100). */
function gatewayBaseUrl(): string {
  return (process.env.GOPAY_GATEWAY_URL || "http://localhost:3100").replace(/\/+$/, "");
}

function gatewayPort(): number {
  try {
    return Number(new URL(gatewayBaseUrl()).port) || 3100;
  } catch {
    return 3100;
  }
}

function sleep(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

/** Cari PID yang sedang listen di port target (netstat, Windows). */
async function findPidOnPort(port: number): Promise<number | null> {
  try {
    const { stdout } = await execAsync(
      `netstat -ano | findstr LISTENING | findstr :${port}`,
    );
    const pidRegex = new RegExp(`:${port}\\s`);
    for (const line of stdout.split(/\r?\n/)) {
      if (!pidRegex.test(line)) continue;
      const pid = Number(line.trim().split(/\s+/).pop());
      if (Number.isFinite(pid) && pid > 0) return pid;
    }
    return null;
  } catch {
    return null;
  }
}

/** Poll URL sampai proses menjawab atau timeout (spawn fire-and-forget). */
async function waitForBoot(url: string, maxWaitMs = 15000): Promise<boolean> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) return true;
    } catch {
      /* belum up — coba lagi */
    }
    await sleep(500);
  }
  return false;
}

/** Tunggu port benar-benar bebas setelah taskkill. */
async function waitPortFree(port: number, maxWaitMs = 5000): Promise<void> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    if (!(await findPidOnPort(port))) return;
    await sleep(300);
  }
}

/** Jalankan gateway detached (bertahan setelah request selesai), log ke file. */
function spawnDetached(entry: string, cwd: string, logFile: string): void {
  const PORT = Number(new URL(gatewayBaseUrl()).port) || 3100;
  const out = fs.openSync(logFile, "a");
  const child = spawn(process.execPath, [entry], {
    cwd,
    env: {
      // PORT eksplisit HARUS setelah ...process.env: Next.js mewariskan
      // PORT=3000, dan dotenv gateway tidak menimpa env yang sudah ada —
      // tanpa ini gateway mencoba listen di 3000 dan kena EADDRINUSE.
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: process.env.NODE_ENV ?? "development",
    },
    detached: true,
    stdio: ["ignore", out, out],
  });
  child.on("error", () => {
    /* spawn gagal — surfaced via health check yang tetap offline */
  });
  child.unref();
}

/** Cek gateway hidup (dipakai halaman admin untuk status tombol). */
export async function isGopayGatewayRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${gatewayBaseUrl()}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Start gateway bila belum running. Hasil via query param `gw`. */
export async function startGopayGateway(): Promise<void> {
  await requireAdmin();
  const port = gatewayPort();

  if (await isGopayGatewayRunning()) {
    redirect(`${TAB_CONFIG}&gw=already-running`);
  }

  if (!fs.existsSync(path.join(GATEWAY_DIR, ".env"))) {
    redirect(`${TAB_CONFIG}&gw=no-env`);
  }

  // Bebaskan port bila ada proses lama yang nyangkut.
  const stalePid = await findPidOnPort(port);
  if (stalePid) {
    try {
      await execAsync(`taskkill /PID ${stalePid} /T /F`, { timeout: 5000 });
      await waitPortFree(port);
    } catch {
      /* lanjut saja — health check yang memastikan */
    }
  }

  spawnDetached("server.js", GATEWAY_DIR, GATEWAY_LOG_FILE);

  const up = await waitForBoot(`${gatewayBaseUrl()}/health`);
  revalidatePath("/admin/payments");
  redirect(up ? `${TAB_CONFIG}&gw=started` : `${TAB_CONFIG}&gw=start-failed`);
}

/** Stop gateway (kill process tree di port gateway). */
export async function stopGopayGateway(): Promise<void> {
  await requireAdmin();
  const port = gatewayPort();

  const pid = await findPidOnPort(port);
  if (!pid) {
    redirect(`${TAB_CONFIG}&gw=already-stopped`);
  }

  try {
    await execAsync(`taskkill /PID ${pid} /T /F`, { timeout: 5000 });
    await waitPortFree(port);
    revalidatePath("/admin/payments");
    redirect(`${TAB_CONFIG}&gw=stopped`);
  } catch {
    redirect(`${TAB_CONFIG}&gw=stop-failed`);
  }
}
