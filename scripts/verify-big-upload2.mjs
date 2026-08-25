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

// Cari produk dengan slot galeri kosong (atau buat kondisi test)
await page.goto(`${BASE}/admin/products`, { waitUntil: "networkidle", timeout: 90000 });
const products = await page.evaluate(() => {
  return [...document.querySelectorAll('a[href^="/admin/products/"]')]
    .map((a) => a.getAttribute("href"))
    .filter((h) => h && h !== "/admin/products/new");
});

// Cari produk yang punya slot kosong: cek satu per satu
let target = null;
for (const href of products.slice(0, 6)) {
  await page.goto(`${BASE}${href}`, { waitUntil: "networkidle", timeout: 90000 });
  const inputExists = await page.locator('input[type="file"][name="files"]').count();
  if (inputExists > 0) { target = href; break; }
}

if (!target) {
  console.log("TIDAK ADA PRODUK DENGAN SLOT KOSONG");
  await browser.close();
  process.exit(0);
}

console.log("produk target:", target);

// Upload 4 file besar (~1.5 MB total — melewati batas lama 1 MB)
console.log("Upload 4 file besar (~1.5 MB total)...");
await page.locator('input[type="file"][name="files"]').setInputFiles([
  ".test-upload/big-1.png",
  ".test-upload/big-2.png",
  ".test-upload/big-3.png",
  ".test-upload/big-4.png",
]);
await page.waitForLoadState("networkidle", { timeout: 120000 });
await page.waitForTimeout(1500);

const result = await page.evaluate(() => ({
  uploaded: document.querySelectorAll('img[alt^="Foto produk"]').length,
  bodyError: document.body.innerText.includes("Body exceeded"),
  formError: document.body.innerText.includes("Unexpected end of form"),
  url: location.pathname + location.search,
}));
console.log("HASIL:", JSON.stringify(result, null, 2));
console.log("page errors:", errors.length ? errors.slice(0, 3) : "none");
await browser.close();
