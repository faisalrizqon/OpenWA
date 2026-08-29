#!/usr/bin/env node
/**
 * Updater OpenWA standalone — dijalankan DETACHED oleh server action
 * `installOpenWAUpdate` (src/actions/openwa-update.ts).
 *
 * Kenapa standalone: proses update (npm install + build) bisa 5–15 menit dan
 * harus selamat dari restart/crash dev server Next.js (HMR/Turbopack). Action
 * hanya men-spawn skrip ini lalu pulang; progress ditulis ke file JSON yang
 * di-poll dashboard.
 *
 * Urutan: stop gateway → backup data (retensi 3) → stash lokal → fetch+checkout
 * tag → POP STASH (sebelum install/build, supaya patch lokal ikut terpasang di
 * hasil build) → npm install root+dashboard → build:all → finalisasi.
 *
 * Kontrak argumen:
 *   --tag vX.Y.Z          (wajib, sudah divalidasi pemanggil)
 *   --openwa-dir <path>   (wajib)
 *   --progress <path>     (wajib, file JSON progress)
 *   --log <path>          (wajib, file log teks)
 *   --gateway-port <num>  (default 2785)
 *   --prev-ref <sha|ref>  (opsional, untuk panduan rollback)
 */

"use strict";

const { exec } = require("child_process");
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");

const execAsync = promisify(exec);
const EXEC_OPTS = { maxBuffer: 64 * 1024 * 1024 };

// --- argumen ---------------------------------------------------------------
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, "");
    args[key] = argv[i + 1];
  }
  return args;
}

const ARGS = parseArgs(process.argv);
const TAG = ARGS.tag;
const OPENWA_DIR = ARGS["openwa-dir"];
const PROGRESS_FILE = ARGS.progress;
const LOG_FILE = ARGS.log;
const GATEWAY_PORT = Number(ARGS["gateway-port"] || 2785);
const PREV_REF = ARGS["prev-ref"] || "";

if (!TAG || !OPENWA_DIR || !PROGRESS_FILE || !LOG_FILE) {
  console.error("Argumen tidak lengkap: --tag --openwa-dir --progress --log wajib");
  process.exit(2);
}
if (!/^v\d+\.\d+\.\d+$/.test(TAG)) {
  console.error(`Tag tidak valid: ${TAG}`);
  process.exit(2);
}

// --- util -------------------------------------------------------------------
function log(msg) {
  try {
    fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
  } catch {
    /* abaikan */
  }
}

const STEP_NAMES = [
  ["stop-gateway", "Menghentikan gateway..."],
  ["backup", "Backup folder data..."],
  ["stash", "Menyimpan perubahan lokal..."],
  ["checkout", `Checkout ${TAG}...`],
  ["restore-local", "Mengembalikan perubahan lokal..."],
  ["npm-install", "Install dependencies (root)..."],
  ["npm-install-dashboard", "Install dependencies (dashboard)..."],
  ["build", "Build gateway + dashboard (bisa beberapa menit)..."],
  ["finalize", "Finalisasi..."],
];

function readProgress() {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8"));
  } catch {
    return {
      status: "running",
      targetTag: TAG,
      previousRef: PREV_REF,
      startedAt: new Date().toISOString(),
      steps: STEP_NAMES.map(([step, message]) => ({ step, status: "pending", message })),
    };
  }
}

/** Tulis progress atomik (tulis ke .tmp lalu rename) agar poller tak baca JSON setengah. */
function writeProgress(progress) {
  const tmp = PROGRESS_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(progress, null, 2));
  fs.renameSync(tmp, PROGRESS_FILE);
}

function setStep(progress, stepName, status, message) {
  const s = progress.steps.find((x) => x.step === stepName);
  if (s) {
    s.status = status;
    if (message !== undefined) s.message = message;
  }
  writeProgress(progress);
}

function fail(progress, stepName, message) {
  setStep(progress, stepName, "error", message);
  progress.status = "error";
  progress.finishedAt = new Date().toISOString();
  progress.message = `Update gagal pada tahap "${stepName}" — gateway dalam keadaan berhenti; lihat log ${path.basename(LOG_FILE)}`;
  writeProgress(progress);
  log(`FAILED ${stepName}: ${message}`);
}

// --- helper gateway ---------------------------------------------------------
async function findGatewayPid() {
  try {
    const { stdout } = await execAsync(
      `netstat -ano | findstr LISTENING | findstr :${GATEWAY_PORT}`,
      { timeout: 10000, ...EXEC_OPTS },
    );
    const portRegex = new RegExp(`:${GATEWAY_PORT}\\s`);
    for (const line of stdout.split(/\r?\n/)) {
      if (!portRegex.test(line)) continue;
      const pid = Number(line.trim().split(/\s+/).pop());
      if (Number.isFinite(pid) && pid > 0) return pid;
    }
    return null;
  } catch {
    return null;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- langkah-langkah ---------------------------------------------------------
async function stopGateway(progress) {
  const pid = await findGatewayPid();
  if (pid) {
    await execAsync(`taskkill /F /T /PID ${pid}`, { timeout: 15000, ...EXEC_OPTS });
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline && (await findGatewayPid())) await sleep(300);
  }
  setStep(
    progress,
    "stop-gateway",
    "success",
    pid ? `Gateway dihentikan (PID ${pid})` : "Gateway memang tidak running",
  );
}

async function backupData(progress) {
  const srcData = path.join(OPENWA_DIR, "data");
  if (!fs.existsSync(srcData)) {
    setStep(progress, "backup", "success", "Tidak ada folder data");
    return;
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(OPENWA_DIR, `data-backup-${stamp}`);
  fs.cpSync(srcData, backupDir, { recursive: true });

  // Retensi: simpan 3 backup terbaru (nama ber-timestamp ISO → urut leksikal = urut waktu).
  const backups = fs
    .readdirSync(OPENWA_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith("data-backup-"))
    .map((d) => d.name)
    .sort()
    .reverse();
  for (const old of backups.slice(3)) {
    fs.rmSync(path.join(OPENWA_DIR, old), { recursive: true, force: true });
  }
  setStep(
    progress,
    "backup",
    "success",
    `Backup di ${path.basename(backupDir)} (${backups.length} backup tersimpan, maks 3)`,
  );
}

async function git(cmd, timeout = 60000) {
  return execAsync(`git ${cmd}`, { cwd: OPENWA_DIR, timeout, ...EXEC_OPTS });
}

async function stashLocal(progress) {
  const { stdout } = await git("status --porcelain", 15000);
  if (stdout.trim()) {
    await git(`stash push --include-untracked -m mudahsewa-pre-update-${Date.now()}`);
    setStep(progress, "stash", "success", "Perubahan lokal di-stash");
    return true;
  }
  setStep(progress, "stash", "success", "Tidak ada perubahan lokal");
  return false;
}

async function checkoutTag(progress) {
  await git("fetch origin --tags", 180000);
  await git(`checkout --detach ${TAG}`, 60000);
  setStep(progress, "checkout", "success", `Checkout ${TAG} selesai`);
}

/**
 * POP STASH SEBELUM install/build: patch lokal (auto-login dashboard, dll.)
 * harus ada di working tree saat `npm install` (lockfile lokal ikut dipakai)
 * dan saat build (hasil build memuat patch). Konflik = gagal cepat dengan
 * panduan resolusi — meneruskan build dengan conflict markers pasti rusak.
 */
async function restoreLocal(progress, stashed) {
  if (!stashed) {
    setStep(progress, "restore-local", "success", "Tidak ada perubahan lokal");
    return;
  }
  try {
    await git("stash pop");
    setStep(progress, "restore-local", "success", "Perubahan lokal dikembalikan");
  } catch (err) {
    // Pop konflik: entri stash TIDAK di-drop oleh git saat konflik, jadi aman.
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Perubahan lokal KONFLIK dengan ${TAG}. Entri stash masih utuh — resolve manual di openwa-server ` +
        `(\`git status\` → edit file konflik → \`npm install\` → \`npm run build:all\`), ` +
        `atau batalkan merge: \`git reset --hard ${TAG}\`. Detail: ${detail.split("\n")[0]}`,
    );
  }
}

async function npmInstall(progress, stepName, cwd, label) {
  // `npm install` (bukan ci): toleran terhadap drift lockfile lokal yang
  // dipop dari stash; ci akan gagal keras "lockfile out of sync".
  await execAsync("npm install --no-audit --no-fund", { cwd, timeout: 900000, ...EXEC_OPTS });
  setStep(progress, stepName, "success", `Dependencies ${label} terpasang`);
}

async function buildAll(progress) {
  await execAsync("npm run build:all", { cwd: OPENWA_DIR, timeout: 1800000, ...EXEC_OPTS });
  setStep(progress, "build", "success", "Build gateway + dashboard selesai");
}

async function finalize(progress) {
  let version = TAG.replace(/^v/, "");
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(OPENWA_DIR, "package.json"), "utf-8"));
    if (typeof pkg.version === "string") version = pkg.version;
  } catch {
    /* pakai versi dari tag */
  }
  setStep(progress, "finalize", "success", `Versi terpasang: v${version}`);
  progress.status = "success";
  progress.finishedAt = new Date().toISOString();
  progress.message = `Update ke v${version} selesai — tekan Start Gateway untuk menjalankan versi baru`;
  writeProgress(progress);
}

// --- main --------------------------------------------------------------------
async function main() {
  const progress = readProgress();
  progress.status = "running";
  writeProgress(progress);
  log(`updater start → ${TAG}`);

  const steps = [
    ["stop-gateway", () => stopGateway(progress)],
    ["backup", () => backupData(progress)],
    ["stash", null], // dijalankan khusus (return nilai stashed)
    ["checkout", () => checkoutTag(progress)],
    ["restore-local", null], // khusus (butuh flag stashed)
    ["npm-install", () => npmInstall(progress, "npm-install", OPENWA_DIR, "root")],
    [
      "npm-install-dashboard",
      () => {
        const dashDir = path.join(OPENWA_DIR, "dashboard");
        if (fs.existsSync(path.join(dashDir, "package.json"))) {
          return npmInstall(progress, "npm-install-dashboard", dashDir, "dashboard");
        }
        setStep(progress, "npm-install-dashboard", "success", "Tidak ada subproyek dashboard");
      },
    ],
    ["build", () => buildAll(progress)],
    ["finalize", () => finalize(progress)],
  ];

  let stashed = false;
  for (const [name, run] of steps) {
    try {
      if (name === "stash") {
        stashed = await stashLocal(progress);
      } else if (name === "restore-local") {
        await restoreLocal(progress, stashed);
      } else {
        await run();
      }
      log(`step ok: ${name}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      fail(progress, name, msg);
      process.exit(1);
    }
  }

  log(`updater finished → ${TAG}`);
}

process.on("uncaughtException", (err) => {
  log(`uncaught: ${err.stack || err}`);
  try {
    const progress = readProgress();
    fail(progress, "finalize", `Crash tak terduga: ${err.message}`);
  } catch {
    /* abaikan */
  }
  process.exit(1);
});
process.on("unhandledRejection", (err) => {
  log(`unhandled rejection: ${err}`);
  process.exit(1);
});

main();
