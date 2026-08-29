/**
 * Server action untuk check & update OpenWA Gateway.
 *
 * OpenWA terpasang sebagai git checkout (openwa-server/, remote
 * github.com/rmyndharis/OpenWA) dengan tag rilis vX.Y.Z — jadi metode
 * updatenya: git fetch tag → checkout → npm install → build.
 *
 * Arsitektur update:
 *   action `installOpenWAUpdate` hanya men-SPAWN `scripts/openwa-updater.cjs`
 *   (detached) lalu pulang. Proses npm+build bisa 5–15 menit dan harus selamat
 *   dari restart/HMR-crash dev server Next.js. Updater menulis progress ke
 *   openwa-update-progress.json; UI mem-poll lewat GET /api/update-progress.
 *
 * Proteksi:
 *   - tag divalidasi ketat /^v\d+\.\d+\.\d+$/ (anti-injection ke shell)
 *   - lock file mencegah dua update berjalan bersamaan
 *   - perubahan lokal dipreservasi via git stash (pop SEBELUM build)
 *   - backup data dengan retensi 3 salinan
 */

"use server";

import { spawn } from "child_process";
import { promisify } from "util";
import { exec } from "child_process";
import path from "path";
import fs from "fs";
import { requireMitraOrAdmin } from "@/lib/permissions";

const execAsync = promisify(exec);

/** Folder checkout OpenWA gateway (berdampingan dengan app Next.js). */
const OPENWA_DIR = path.join(process.cwd(), "openwa-server");
/** File progress JSON — ditulis updater, dibaca GET /api/update-progress. */
const PROGRESS_FILE = path.join(process.cwd(), "openwa-update-progress.json");
/** Lock file — ada = update sedang berjalan. */
const LOCK_FILE = path.join(process.cwd(), "openwa-update.lock");
/** Log teks gabungan proses update. */
const UPDATE_LOG_FILE = path.join(process.cwd(), "openwa-update.log");
/** Port API gateway OpenWA. */
const GATEWAY_PORT = 2785;
const EXEC_OPTS = { maxBuffer: 64 * 1024 * 1024 };

/** Tag rilis wajib format persis vX.Y.Z — satu-satunya bentuk yang lolos ke shell. */
const TAG_REGEX = /^v\d+\.\d+\.\d+$/;

export interface UpdateStep {
  step: string;
  status: "pending" | "success" | "warning" | "error";
  message: string;
}

export interface CheckUpdateResult {
  ok: boolean;
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  /** Tag git terbaru di remote (mis. "v0.24.0"). */
  latestTag: string;
  releaseUrl: string;
  error?: string;
}

/** Progress update — bentuk sama dengan file JSON yang ditulis updater. */
export interface UpdateProgress {
  status: "running" | "success" | "error";
  targetTag?: string;
  previousRef?: string;
  startedAt?: string;
  finishedAt?: string;
  message?: string;
  steps?: UpdateStep[];
}

export interface InstallUpdateResult {
  ok: boolean;
  message: string;
}

function log(msg: string): void {
  try {
    fs.appendFileSync(UPDATE_LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
  } catch {
    /* logging tidak boleh menggagalkan update */
  }
}

/** Versi terpasang = field version package.json checkout openwa-server. */
function readInstalledVersion(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(OPENWA_DIR, "package.json"), "utf-8"));
    return typeof pkg.version === "string" ? pkg.version : "unknown";
  } catch {
    return "unknown";
  }
}

/** Bandingkan versi semver: return 1 bila a > b, -1 bila a < b, 0 bila sama. */
function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x > y ? 1 : -1;
  }
  return 0;
}

/**
 * Ambil tag rilis terbaru dari remote via `git ls-remote` (tanpa mengubah
 * working tree, tanpa API rate-limit GitHub). Return null bila remote tak
 * terjangkau atau tidak ada tag vX.Y.Z.
 */
async function fetchLatestTag(): Promise<string | null> {
  const { stdout } = await execAsync('git ls-remote --tags --refs origin "v*"', {
    cwd: OPENWA_DIR,
    timeout: 30000,
    ...EXEC_OPTS,
  });
  let best: string | null = null;
  for (const line of stdout.split(/\r?\n/)) {
    const m = line.match(/refs\/tags\/(v\d+\.\d+\.\d+)$/);
    if (!m) continue;
    const tag = m[1];
    if (!best || compareVersions(tag.slice(1), best.slice(1)) > 0) best = tag;
  }
  return best;
}

/**
 * Cek apakah ada versi OpenWA yang lebih baru dari yang terpasang.
 */
export async function checkOpenWAUpdate(): Promise<CheckUpdateResult> {
  await requireMitraOrAdmin();

  const currentVersion = readInstalledVersion();
  const base = {
    ok: false,
    hasUpdate: false,
    currentVersion,
    latestVersion: currentVersion,
    latestTag: "",
    releaseUrl: "",
  };

  try {
    const latestTag = await fetchLatestTag();
    if (!latestTag) {
      return { ...base, error: "Tidak menemukan tag rilis di remote OpenWA" };
    }
    const latestVersion = latestTag.replace(/^v/, "");
    return {
      ok: true,
      hasUpdate: compareVersions(latestVersion, currentVersion) > 0,
      currentVersion,
      latestVersion,
      latestTag,
      releaseUrl: `https://github.com/rmyndharis/OpenWA/releases/tag/${latestTag}`,
    };
  } catch (err) {
    return {
      ...base,
      error: `Gagal cek remote: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/** Baca progress update terakhir (dari file JSON updater). Null bila tidak ada. */
export async function getUpdateProgress(): Promise<UpdateProgress | null> {
  await requireMitraOrAdmin();
  try {
    const raw = fs.readFileSync(PROGRESS_FILE, "utf-8");
    return JSON.parse(raw) as UpdateProgress;
  } catch {
    return null;
  }
}

/** Lock masih aktif bila file lock ada DAN progress file masih berstatus running.
 *  Bila progress berakhir tapi lock tersisa (crash), lock dianggap usang. */
function isUpdateRunning(): boolean {
  if (!fs.existsSync(LOCK_FILE)) return false;
  try {
    const progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8")) as UpdateProgress;
    return progress.status === "running";
  } catch {
    // File progress korup/hilang tapi lock ada → anggap masih berjalan (aman).
    return true;
  }
}

/**
 * Mulai update OpenWA. Men-spawn scripts/openwa-updater.cjs secara detached
 * (selamat dari restart dev server), lalu langsung pulang. Poll progress via
 * GET /api/update-progress atau hook useUpdateProgress.
 */
export async function installOpenWAUpdate(targetTag?: string): Promise<InstallUpdateResult> {
  await requireMitraOrAdmin();

  // Validasi tag SEBELUM menyentuh shell — anti command-injection.
  if (targetTag !== undefined && !TAG_REGEX.test(targetTag)) {
    return { ok: false, message: `Format tag tidak valid: "${targetTag}" (harus vX.Y.Z)` };
  }

  if (!fs.existsSync(path.join(OPENWA_DIR, ".git"))) {
    return { ok: false, message: "openwa-server bukan git checkout — update manual diperlukan" };
  }
  if (!fs.existsSync(path.join(OPENWA_DIR, "dist", "main.js"))) {
    return {
      ok: false,
      message: "Build gateway belum ada — jalankan `npm run build` di openwa-server dulu",
    };
  }
  if (isUpdateRunning()) {
    return { ok: false, message: "Update lain sedang berjalan — tunggu selesai dulu" };
  }

  const tag = targetTag ?? (await fetchLatestTag().catch(() => null));
  if (!tag || !TAG_REGEX.test(tag)) {
    return { ok: false, message: "Tidak menemukan tag rilis vX.Y.Z di remote" };
  }

  // Skip bila target sama/lebih lama dari versi terpasang (kecuali user memaksa tag spesifik).
  if (!targetTag && compareVersions(tag.replace(/^v/, ""), readInstalledVersion()) <= 0) {
    return { ok: true, message: `Tidak ada update — sudah versi terbaru (v${readInstalledVersion()})` };
  }

  // Ref saat ini untuk panduan rollback bila update gagal.
  let prevRef = "";
  try {
    const { stdout } = await execAsync("git rev-parse HEAD", {
      cwd: OPENWA_DIR,
      timeout: 10000,
      ...EXEC_OPTS,
    });
    prevRef = stdout.trim();
  } catch {
    /* non-fatal */
  }

  // Lock sebelum spawn — menutup jendela balapan dua admin klik bersamaan.
  fs.writeFileSync(LOCK_FILE, JSON.stringify({ startedAt: new Date().toISOString(), tag }));

  // Seed file progress agar poll pertama langsung dapat "running".
  const seedSteps = [
    ["stop-gateway", "Menghentikan gateway..."],
    ["backup", "Backup folder data..."],
    ["stash", "Menyimpan perubahan lokal..."],
    ["checkout", `Checkout ${tag}...`],
    ["restore-local", "Mengembalikan perubahan lokal..."],
    ["npm-install", "Install dependencies (root)..."],
    ["npm-install-dashboard", "Install dependencies (dashboard)..."],
    ["build", "Build gateway + dashboard (bisa beberapa menit)..."],
    ["finalize", "Finalisasi..."],
  ];
  fs.writeFileSync(
    PROGRESS_FILE,
    JSON.stringify(
      {
        status: "running",
        targetTag: tag,
        previousRef: prevRef,
        startedAt: new Date().toISOString(),
        steps: seedSteps.map(([step, message]) => ({ step, status: "pending", message })),
      },
      null,
      2,
    ),
  );

  const updaterScript = path.join(process.cwd(), "scripts", "openwa-updater.cjs");
  if (!fs.existsSync(updaterScript)) {
    fs.rmSync(LOCK_FILE, { force: true });
    return { ok: false, message: "Skrip updater hilang (scripts/openwa-updater.cjs)" };
  }

  log(`spawning updater → ${tag}`);
  const child = spawn(
    process.execPath,
    [
      updaterScript,
      "--tag", tag,
      "--openwa-dir", OPENWA_DIR,
      "--progress", PROGRESS_FILE,
      "--log", UPDATE_LOG_FILE,
      "--gateway-port", String(GATEWAY_PORT),
      ...(prevRef ? ["--prev-ref", prevRef] : []),
    ],
    {
      cwd: process.cwd(),
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    },
  );
  child.on("error", (err) => log(`updater spawn error: ${err.message}`));
  child.unref();

  return {
    ok: true,
    message: `Update ke ${tag} dimulai — pantau progress di halaman ini`,
  };
}
