import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "fs";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = process.env.BASE_URL || "http://localhost:3000";

const png1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);
mkdirSync(".test-upload", { recursive: true });
writeFileSync(".test-upload/gallery-1.png", png1x1);
writeFileSync(".test-upload/gallery-2.png", png1x1);

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(`${BASE}/login`);
await page.fill('input[name="email"]', "admin@mudahsewa.id");
await page.fill('input[name="password"]', "admin123");
await Promise.all([page.waitForURL("**/admin**"), page.click('button[type="submit"]')]);

// Buka produk pertama
await page.goto(`${BASE}/admin/products`, { waitUntil: "networkidle", timeout: 90000 });
const prodHref = await page.evaluate(() => {
  const links = [...document.querySelectorAll('a[href^="/admin/products/"]')]
    .map((a) => a.getAttribute("href"))
    .filter((h) => h && h !== "/admin/products/new");
  return links[0] ?? null;
});
console.log("produk:", prodHref);
await page.goto(`${BASE}${prodHref}`, { waitUntil: "networkidle", timeout: 90000 });

// STEP 1: card Foto Produk ada
const step1 = await page.evaluate(() => ({
  hasFotoCard: document.body.innerText.includes("Foto Produk"),
  uploadBtn: [...document.querySelectorAll("button")].some((b) =>
    b.textContent?.includes("Upload Foto Produk")
  ),
}));
console.log("STEP 1 — card Foto Produk:", JSON.stringify(step1));

// STEP 2: upload 2 foto sekaligus
console.log("STEP 2 — upload 2 foto galeri...");
const fileInput = page.locator('input[type="file"][name="files"]');
await fileInput.setInputFiles([".test-upload/gallery-1.png", ".test-upload/gallery-2.png"]);
await page.waitForLoadState("networkidle", { timeout: 60000 });
await page.waitForTimeout(600);

const step3 = await page.evaluate(() => ({
  thumbImgs: document.querySelectorAll('img[alt^="Foto produk"]').length,
  hapusBtns: document.querySelectorAll('button[aria-label="Hapus foto produk"]').length,
  tambahBtn: [...document.querySelectorAll("button")].some((b) =>
    b.textContent?.includes("Tambah Foto")
  ),
}));
console.log("STEP 3 — setelah upload:", JSON.stringify(step3));
await page.screenshot({ path: ".gallery-admin.png" });

// STEP 4: katalog publik menampilkan galeri interaktif
const productId = prodHref.split("/").pop();
await page.goto(`${BASE}/katalog/${productId}`, { waitUntil: "networkidle", timeout: 90000 });
const step4 = await page.evaluate(() => {
  const thumbs = document.querySelectorAll('button[aria-label^="Lihat Foto"]');
  const counter = document.body.innerText.match(/\d+\/\d+/);
  return { thumbCount: thumbs.length, counter: counter?.[0] ?? null };
});
console.log("STEP 4 — galeri publik:", JSON.stringify(step4));

// STEP 5: klik thumbnail ke-2 → counter berubah
if (step4.thumbCount >= 2) {
  await page.locator('button[aria-label^="Lihat Foto"]').nth(1).click();
  await page.waitForTimeout(200);
  const step5 = await page.evaluate(() => ({
    counter: document.body.innerText.match(/\d+\/\d+/)?.[0] ?? null,
    activeRing: !!document.querySelector("button.border-primary"),
  }));
  console.log("STEP 5 — klik thumbnail:", JSON.stringify(step5));
}
await page.screenshot({ path: ".gallery-public.png" });

// STEP 6: cleanup — hapus kedua foto test via admin
await page.goto(`${BASE}${prodHref}`, { waitUntil: "networkidle", timeout: 90000 });
page.on("dialog", (d) => d.accept());
for (let i = 0; i < 2; i++) {
  const del = page.locator('button[aria-label="Hapus foto produk"]').first();
  if ((await del.count()) > 0) {
    await del.click();
    await page.waitForLoadState("networkidle", { timeout: 60000 });
    await page.waitForTimeout(300);
  }
}
const step6 = await page.evaluate(() => ({
  thumbImgs: document.querySelectorAll('img[alt^="Foto produk"]').length,
}));
console.log("STEP 6 — setelah cleanup:", JSON.stringify(step6));
console.log("page errors:", errors.length ? errors.slice(0, 3) : "none");
await browser.close();
