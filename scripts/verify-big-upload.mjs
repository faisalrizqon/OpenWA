import { chromium } from "playwright-core";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = process.env.BASE_URL || "http://localhost:3000";

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
console.log("produk:", prodHref);
await page.goto(`${BASE}${prodHref}`, { waitUntil: "networkidle", timeout: 90000 });

// Bersihkan galeri dulu agar ada slot kosong
page.on("dialog", (d) => d.accept());
for (let i = 0; i < 10; i++) {
  const del = page.locator('button[aria-label="Hapus foto produk"]').first();
  if ((await del.count()) > 0) {
    await del.click();
    await page.waitForLoadState("networkidle", { timeout: 60000 });
    await page.waitForTimeout(300);
  } else break;
}

// Upload 4 file besar (total ~1.5 MB — melewati batas lama 1 MB)
console.log("STEP 1 — upload 4 file besar (~1.5 MB total)...");
await page.locator('input[type="file"][name="files"]').setInputFiles([
  ".test-upload/big-1.png",
  ".test-upload/big-2.png",
  ".test-upload/big-3.png",
  ".test-upload/big-4.png",
]);
await page.waitForLoadState("networkidle", { timeout: 120000 });
await page.waitForTimeout(1000);

const result = await page.evaluate(() => ({
  uploaded: document.querySelectorAll('img[alt^="Foto produk"]').length,
  bodyError: document.body.innerText.includes("Body exceeded"),
  formError: document.body.innerText.includes("Unexpected end of form"),
}));
console.log("HASIL UPLOAD 4 FILE BESAR:", JSON.stringify(result, null, 2));

// Upload 4 file lagi (total 8) — test batas 10 foto
console.log("STEP 2 — tambah 4 file lagi...");
await page.locator('input[type="file"][name="files"]').setInputFiles([
  ".test-upload/big-1.png",
  ".test-upload/big-2.png",
  ".test-upload/big-3.png",
  ".test-upload/big-4.png",
]);
await page.waitForLoadState("networkidle", { timeout: 120000 });
await page.waitForTimeout(1000);

const result2 = await page.evaluate(() => ({
  uploaded: document.querySelectorAll('img[alt^="Foto produk"]').length,
  bodyError: document.body.innerText.includes("Body exceeded"),
  formError: document.body.innerText.includes("Unexpected end of form"),
}));
console.log("HASIL UPLOAD KE-2 (8 foto total):", JSON.stringify(result2, null, 2));

// Bersihkan test
for (let i = 0; i < 10; i++) {
  const del = page.locator('button[aria-label="Hapus foto produk"]').first();
  if ((await del.count()) > 0) {
    await del.click();
    await page.waitForLoadState("networkidle", { timeout: 60000 });
    await page.waitForTimeout(300);
  } else break;
}
console.log("cleanup selesai");
console.log("page errors:", errors.length ? errors.slice(0, 3) : "none");
await browser.close();
