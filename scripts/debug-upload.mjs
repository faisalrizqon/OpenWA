import { chromium } from "playwright-core";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = process.env.BASE_URL || "http://localhost:3000";

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

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
console.log("produk:", prodHref);
await page.goto(`${BASE}${prodHref}`, { waitUntil: "networkidle", timeout: 90000 });

// Cek input file galeri ada
const inputCount = await page.locator('input[type="file"][name="files"]').count();
console.log("input[name=files] count:", inputCount);

// Upload 4 file
await page.locator('input[type="file"][name="files"]').setInputFiles([
  ".test-upload/big-1.png",
  ".test-upload/big-2.png",
  ".test-upload/big-3.png",
  ".test-upload/big-4.png",
]);
// TUNGGU navigasi explicit
await page.waitForLoadState("domcontentloaded", { timeout: 60000 });
await page.waitForTimeout(2000);

console.log("URL setelah upload:", page.url());
const dbg = await page.evaluate(() => ({
  imgCount: document.querySelectorAll('img[alt^="Foto produk"]').length,
  notification: document.body.innerText.match(/(Maksimal|tidak valid|error|berhasil)[^\n]{0,80}/gi)?.slice(0, 3),
  hasFotoCard: document.body.innerText.includes("Foto Produk"),
  bodyError: document.body.innerText.includes("Body exceeded"),
}));
console.log("DEBUG:", JSON.stringify(dbg, null, 2));
await browser.close();
