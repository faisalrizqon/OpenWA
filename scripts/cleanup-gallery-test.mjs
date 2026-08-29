import { chromium } from "playwright-core";
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("dialog", (d) => d.accept());
await page.goto(`${BASE}/login`);
await page.fill('input[name="email"]', "admin@mudahsewa.id");
await page.fill('input[name="password"]', "admin123");
await Promise.all([page.waitForURL("**/admin**"), page.click('button[type="submit"]')]);
await page.goto(`${BASE}/admin/products/1`, { waitUntil: "networkidle", timeout: 90000 });
// Hapus via JS: klik tombol pertama berulang kali (bypass hover)
let removed = 0;
for (let i = 0; i < 12; i++) {
  const clicked = await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Hapus foto produk"]');
    if (!btn) return false;
    btn.click();
    return true;
  });
  if (!clicked) break;
  await page.waitForLoadState("networkidle", { timeout: 60000 });
  await page.waitForTimeout(500);
  removed++;
}
const left = await page.evaluate(() => document.querySelectorAll('img[alt^="Foto produk"]').length);
console.log("dihapus:", removed, "| sisa:", left);
await browser.close();
