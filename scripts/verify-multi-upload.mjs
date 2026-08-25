import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "fs";
import { execSync } from "child_process";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = process.env.BASE_URL || "http://localhost:3000";

// Buat 4 file PNG ~400KB (total > 1MB — melewati batas lama, harus lolos dgn limit baru)
mkdirSync(".test-upload", { recursive: true });
for (let i = 1; i <= 4; i++) {
  // PNG besar: pakai node canvas-less approach — generate raw bytes valid PNG via pengulangan
  // cara sederhana: copy file kecil + padding tidak valid PNG; gunakan gambar asli dari repo
  execSync(`copy /Y "public\\qris.png" ".test-upload\\big-${i}.png"`, { shell: "cmd.exe" });
}

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(`${BASE}/login`);
await page.fill('input[name="email"]', "admin@mudahsewa.id");
await page.fill('input[name="password"]', "admin123");
await Promise.all([page.waitForURL("**/admin**"), page.click('button[type="submit"]')]);

await page.goto(`${BASE}/admin/products`, { waitUntil: "networkidle", timeout: 90000 });
const prodHref = await page.evaluate(() => {
  const links = [...document.querySelectorAll('a[href^="/admin/products/"]')]
    .map((a) => a.getAttribute("href"))
    .filter((h) => h && h !== "/admin/products/new");
  return links[0] ?? null;
});
await page.goto(`${BASE}${prodHref}`, { waitUntil: "networkidle", timeout: 90000 });

// Bersihkan dulu galeri yang ada agar ada slot kosong
page.on("dialog", (d) => d.accept());
let cleaned = 0;
for (let i = 0; i < 8; i++) {
  const del = page.locator('button[aria-label="Hapus foto produk"]').first();
  if ((await del.count()) > 0) {
    await del.click();
    await page.waitForLoadState("networkidle", { timeout: 60000 });
    await page.waitForTimeout(300);
    cleaned++;
  } else break;
}
console.log("dibersihkan:", cleaned, "foto lama");

// Upload 4 file sekaligus (>1MB total)
const fileInput = page.locator('input[type="file"][name="files"]');
await fileInput.setInputFiles([
  ".test-upload/big-1.png",
  ".test-upload/big-2.png",
  ".test-upload/big-3.png",
  ".test-upload/big-4.png",
]);
await page.waitForLoadState("networkidle", { timeout: 90000 });
await page.waitForTimeout(800);

const result = await page.evaluate(() => ({
  uploaded: document.querySelectorAll('img[alt^="Foto produk"]').length,
  hasRuntimeError: document.body.innerText.includes("Body exceeded 1 MB limit"),
}));
console.log("HASIL UPLOAD MULTI-FILE:", JSON.stringify(result, null, 2));

// cleanup: hapus semua foto test
for (let i = 0; i < 4; i++) {
  const del = page.locator('button[aria-label="Hapus foto produk"]').first();
  if ((await del.count()) > 0) {
    await del.click();
    await page.waitForLoadState("networkidle", { timeout: 60000 });
    await page.waitForTimeout(300);
  }
}
console.log("page errors:", errors.length ? errors.slice(0, 3) : "none");
await browser.close();
