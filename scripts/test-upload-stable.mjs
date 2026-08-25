import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "fs";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = process.env.BASE_URL || "http://localhost:3000";

mkdirSync(".test-upload", { recursive: true });
// Buat file kecil valid (agar tidak terlalu berat tapi cukup untuk test)
writeFileSync(".test-upload/test-small-1.png", Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"));

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(`${BASE}/login`);
await page.fill('input[name="email"]', "admin@mudahsewa.id");
await page.fill('input[name="password"]', "admin123");
await Promise.all([page.waitForURL("**/admin**"), page.click('button[type="submit"]')]);

await page.goto(`${BASE}/admin/products`, { waitUntil: "networkidle" });
const prodHref = await page.evaluate(() => {
  const links = [...document.querySelectorAll('a[href^="/admin/products/"]')]
    .map((a) => a.getAttribute("href"))
    .filter((h) => h && h !== "/admin/products/new");
  return links[0] ?? null;
});

// Clean dulu: hapus semua foto jika ada
if (prodHref) {
  await page.goto(`${BASE}${prodHref}`, { waitUntil: "networkidle" });
  // Clear any existing photos first to avoid full gallery
  page.on("dialog", d => d.accept());
  for (let i = 0; i < 10; i++) {
    const del = page.locator('button[aria-label="Hapus foto produk"]').first();
    if ((await del.count()) > 0) {
      await del.click();
      await page.waitForLoadState("networkidle", { timeout: 60000 });
      await page.waitForTimeout(200);
    } else break;
  }
  
  // Upload 2 files
  console.log("Uploading 2 files...");
  await page.locator('input[type="file"][name="files"]').setInputFiles([
    ".test-upload/test-small-1.png",
    ".test-upload/test-small-1.png",
  ]);
  await page.waitForTimeout(3000); // Wait for redirect
  
  const info = await page.evaluate(() => ({
    imgCount: document.querySelectorAll('img[alt^="Foto produk"]').length,
    notification: document.body.innerText.match(/(berhasil|diproses|error|Maksimal)[^\n]{0,60}/gi)?.slice(0, 3),
    url: window.location.pathname + window.location.search,
  }));
  console.log("UPLOAD RESULT:", JSON.stringify(info, null, 2));
}
console.log("errors:", errors.length ? errors.slice(0, 3) : "none");
await browser.close();
