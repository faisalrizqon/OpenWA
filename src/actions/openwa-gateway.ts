/**
 * Server action untuk mengontrol proses OpenWA (gateway API + dashboard UI).
 * Tombol Start/Stop di /admin/whatsapp?tab=setup menjalankan/menghentikan proses
 * SESUAI MODE DEPLOYMENT (lihat openwa-api-client.ts: openwaDeploymentMode):
 *
 *  - Bundled (Docker/production): SATU proses — gateway API menyajikan dashboard
 *    UI sendiri dari build `dashboard/dist` (port 2785). Hemat resource.
 *  - Split (local development): DUA proses — gateway API (port 2785) + Vite dev
 *    server (port 2886) untuk hot-reload UI dashboard.
 *
 * Start hanya menjalankan proses yang BELUM ada sesuai mode; Stop membersihkan
 * proses di KEDUA port apa pun mode aktifnya (supaya proses sisa dari mode
 * sebelumnya tidak buang resource). Mode bisa diganti tanpa restart app Next.js
 * lewat setOpenWADashboardMode (file override).
 *
 * Hasil diumumkan via query param (success/error) → PageNotifier.
 */

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { spawn, exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { requireMitraOrAdmin } from "@/lib/permissions";
import { openwaDeploymentMode, writeDeploymentModeOverride, type OpenWADeploymentMode } from "@/lib/openwa-api-client";

const execAsync = promisify(exec);
const PAGE = "/admin/whatsapp?tab=setup";

/** Folder sumber OpenWA (berdampingan dengan app Next.js). */
const OPENWA_DIR = path.join(process.cwd(), "openwa-server");
/** Folder dashboard UI OpenWA (Vite dev server). */
const DASHBOARD_DIR = path.join(OPENWA_DIR, "dashboard");
/** File log gabungan stdout/stderr gateway. */
const GATEWAY_LOG_FILE = path.join(process.cwd(), "openwa.log");
/** File log gabungan stdout/stderr dashboard. */
const DASHBOARD_LOG_FILE = path.join(process.cwd(), "openwa-dashboard.log");
/** Port API gateway OpenWA. */
const GATEWAY_PORT = 2785;
/** Port dashboard UI OpenWA — hanya dipakai spawn dev (Vite). Di production
 *  dashboard bundled di NestJS :2785 dan diakses via wa.dagdigdugdigicam.store. */
const DASHBOARD_PORT = 2886;

function sleep(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

/**
 * Cari PID yang sedang listen di port target (via `netstat -ano`, Windows).
 * Return null bila tidak ada proses yang listen.
 *
 * `findstr :2785` juga cocok port seperti :27850 — kita filter dengan regex
 * yang memastikan port diakhiri whitespace (pemisah kolom netstat). netstat
 * mengembalikan dua baris (IPv4 0.0.0.0:PORT dan IPv6 [::]:PORT) dengan PID
 * yang sama; kita ambil PID unik pertama yang valid.
 */
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

/**
 * Tunggu proses benar-benar listen dan menjawab HTTP di URL target. Spawn
 * adalah fire-and-forget — NestJS/Vite butuh beberapa detik untuk boot —
 * jadi poll URL sampai merespons atau timeout. Return true bila hidup.
 */
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

/**
 * Tunggu port benar-benar bebas setelah taskkill. Tanpa ini, Start cepat
 * setelah Stop bisa kena EADDRINUSE karena OS belum melepas socket.
 */
async function waitPortFree(port: number, maxWaitMs = 5000): Promise<void> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    if (!(await findPidOnPort(port))) return;
    await sleep(300);
  }
}

/**
 * Jalankan proses node sebagai detached (bertahan setelah request selesai),
 * dengan stdout/stderr dialihkan ke file log.
 */
function spawnDetached(
  entry: string,
  cwd: string,
  logFile: string,
  extraEnv: Record<string, string> = {},
): void {
  const out = fs.openSync(logFile, "a");
  const child = spawn(process.execPath, [entry], {
    cwd,
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV ?? "development",
      ...extraEnv,
    },
    detached: true,
    stdio: ["ignore", out, out],
  });
  child.on("error", () => {
    /* spawn gagal — surfaced via health check yang tetap offline */
  });
  child.unref();
}

/**
 * Jalankan proses OpenWA sesuai mode deployment yang terdeteksi — tidak spawn otomatis kedua proses.
 *
 *  - Mode bundled (default Docker/production): gateway API menyajikan UI dashboard sendiri;
 *    hanya jalankan gateway (`npm run start:prod` / `node dist/main.js`). Hemat resource.
 *  - Mode split (local development): gateway API + Vite dev server (:2886) untuk hot-reload.
 *
 *  Validasi prasyarat sebelum spawn, tunggu setiap proses boot sebelum lanjut.
 */
export async function startOpenWA(): Promise<void> {
  await requireMitraOrAdmin();

  const mode = openwaDeploymentMode();
  const gatewayPid = await findPidOnPort(GATEWAY_PORT);

  // SPLIT mode berarti dua proses (gateway + Vite dev server); keduanya harus up
  // sebelum tombol Start dianggap selesai.
  const dashboardPid = mode === "split" ? await findPidOnPort(DASHBOARD_PORT) : null;
  if (gatewayPid && mode === "split" && dashboardPid) {
    redirect(`${PAGE}&error=${encodeURIComponent("Gateway & dashboard sudah running — stop dulu sebelum start ulang")}`);
  }
  if (gatewayPid && mode === "bundled") {
    redirect(`${PAGE}&error=${encodeURIComponent("Gateway sudah running (mode bundled — dashboard ikut disajikan gateway) — stop dulu sebelum start ulang")}`);
  }

  // Validasi prasyarat SEBELUM spawn agar kegagalan tidak meninggalkan state setengah jalan.
  const gatewayEntry = path.join(OPENWA_DIR, "dist", "main.js");
  if (!gatewayPid && !fs.existsSync(gatewayEntry)) {
    redirect(`${PAGE}&error=${encodeURIComponent("Build gateway belum ada — jalankan `npm run build` di folder openwa-server dulu")}`);
  }
  const viteEntry = path.join(DASHBOARD_DIR, "node_modules", "vite", "bin", "vite.js");
  if (mode === "split" && !dashboardPid && !fs.existsSync(viteEntry)) {
    redirect(`${PAGE}&error=${encodeURIComponent("Dependensi dashboard belum terpasang — jalankan `npm install` di folder openwa-server/dashboard dulu")}`);
  }

  // Jalankan proses yang belum ada sesuai mode
  if (!gatewayPid) {
    try {
      spawnDetached(gatewayEntry, OPENWA_DIR, GATEWAY_LOG_FILE, { PORT: String(GATEWAY_PORT) });
    } catch (err) {
      redirect(`${PAGE}&error=${encodeURIComponent(`Gagal start gateway: ${err instanceof Error ? err.message : String(err)}`)}`);
    }
    // Tunggu gateway boot sebelum lanjut
    if (!(await waitForBoot(`http://localhost:${GATEWAY_PORT}/api/health`))) {
      redirect(`${PAGE}&error=${encodeURIComponent("Gateway tidak merespons dalam 15 detik — cek openwa.log")}`);
    }
  }

  if (mode === "split" && !dashboardPid) {
    try {
      spawnDetached(viteEntry, DASHBOARD_DIR, DASHBOARD_LOG_FILE);
    } catch (err) {
      redirect(`${PAGE}&error=${encodeURIComponent(`Gagal start dashboard Vite: ${err instanceof Error ? err.message : String(err)}`)}`);
    }
    // Ping root `/` — JANGAN /api/health karena diproksi ke gateway
    if (!(await waitForBoot(`http://localhost:${DASHBOARD_PORT}/`))) {
      redirect(`${PAGE}&error=${encodeURIComponent("Dashboard Vite tidak merespons dalam 15 detik — cek openwa-dashboard.log")}`);
    }
  }

  revalidatePath("/admin/whatsapp");
  redirect(`${PAGE}&success=start-openwa&mode=${mode}`);
}

/** Hentikan semua proses OpenWA. Selalu periksa KEDUA port (gateway + Vite dev) apa pun
 *  mode aktifnya: proses sisa dari mode sebelumnya (mis. Vite yang hidup dari sesi split
 *  padahal mode kini bundled) tetap harus dibersihkan supaya tidak buang resource. */
export async function stopOpenWA(): Promise<void> {
  await requireMitraOrAdmin();

  const targets = [
    { name: "gateway", port: GATEWAY_PORT, pid: await findPidOnPort(GATEWAY_PORT) },
    { name: "dashboard", port: DASHBOARD_PORT, pid: await findPidOnPort(DASHBOARD_PORT) },
  ];
  if (!targets.some((t) => t.pid)) {
    redirect(
      `${PAGE}&error=${encodeURIComponent(
        "Tidak ada service OpenWA yang running (port 2785 & 2886 kosong)",
      )}`,
    );
  }

  const failures: string[] = [];
  for (const target of targets) {
    if (!target.pid) continue;
    try {
      // /T = bunuh seluruh process tree (node + child chromium/esbuild), /F = force
      await execAsync(`taskkill /F /T /PID ${target.pid}`);
      await waitPortFree(target.port);
    } catch (err) {
      failures.push(
        `${target.name} (PID ${target.pid}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  if (failures.length > 0) {
    redirect(
      `${PAGE}&error=${encodeURIComponent(
        `Gagal stop OpenWA — ${failures.join("; ")}`,
      )}`,
    );
  }

  revalidatePath("/admin/whatsapp");
  redirect(`${PAGE}&success=stop-openwa`);
}

/**
 * Ganti mode deployment OpenWA (switcher di halaman setup) — TIDAK butuh restart app
 * Next.js: pilihan ditulis ke file override (`openwa-deployment-mode.json`) yang dibaca
 * `openwaDeploymentMode()` di setiap request. Proses yang berjalan TIDAK diubah otomatis —
 *  jika mode baru butuh proses berbeda, gunakan Stop lalu Start. Ini disengaja: mematikan
 *  proses diam-diam bisa memutus sesi WhatsApp aktif tanpa konfirmasi.
 */
export async function setOpenWADashboardMode(formData: FormData): Promise<void> {
  await requireMitraOrAdmin();
  const raw = String(formData.get("mode") ?? "");
  if (raw !== "bundled" && raw !== "split") {
    redirect(`${PAGE}&error=${encodeURIComponent("Mode tidak valid — pilih 'bundled' atau 'split'")}`);
  }
  writeDeploymentModeOverride(raw);
  revalidatePath("/admin/whatsapp");
  redirect(`${PAGE}&success=set-mode&mode=${raw}`);
}
