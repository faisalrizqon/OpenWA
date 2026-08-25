import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "fs";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = process.env.BASE_URL || "http://localhost:3000";

const png1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);
mkdirSync(".test-upload", { recursive: true });
writeFileSync(".test-upload/unit-test.png", png1x1);

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(`${BASE}/login`);
await page.fill('input[name="email"]', "admin@mudahsewa.id");
await page.fill('input[name="password"]', "admin123");
await Promise.all([page.waitForURL("**/admin**"), page.click('button[type="submit"]')]);

// Buka produk pertama
await page.goto(`${BASE}/admin/products`, { waitUntil: "networkidle" });
const prodHref = await page.evaluate(() => {
  const links = [...document.querySelectorAll('a[href^="/admin/products/"]')]
    .map((a) => a.getAttribute("href"))
    .filter((h) => h && h !== "/admin/products/new");
  return links[0] ?? null;
});
console.log("produk:", prodHref);
await page.goto(`${BASE}${prodHref}`, { waitUntil: "networkidle" });

const before = await page.evaluate(() => ({
  hasFotoCol: [...document.querySelectorAll("th")].some((th) => th.textContent?.includes("Foto")),
  fotoButtons: document.querySelectorAll('button:has-text("Foto"), button:has-text("Ganti")').length,
}));
console.log("STEP 1 — kolom Foto di tabel unit:", JSON.stringify(before));

// Upload foto unit pertama
console.log("STEP 2 — upload foto unit...");
await page.locator('form input[type="file"][name="file"]').first().setInputFiles(".test-upload/unit-test.png");
await page.waitForLoadState("networkidle");
await page.waitForTimeout(500);

const afterUpload = await page.evaluate(() => ({
  thumbs: document.querySelectorAll('img[alt^="Foto unit"]').length,
  gantiButtons: document.querySelectorAll('button:has-text("Ganti")').length,
  trashButtons: document.querySelectorAll('button[aria-label="Hapus foto unit"]').length,
}));
console.log("STEP 3 — setelah upload:", JSON.stringify(afterUpload));

// Cek galeri di katalog publik
const productId = prodHref.split("/").pop();
await page.goto(`${BASE}/katalog/${productId}`, { waitUntil: "networkidle" });
const gallery = await page.evaluate(() => ({
  unitImgs: document.querySelectorAll('img[alt^="Unit"]').length,
}));
console.log("STEP 4 — galeri katalog publik:", JSON.stringify(gallery));
await page.screenshot({ path: ".katalog-gallery.png" });

// Hapus foto lagi (cleanup) via admin
await page.goto(`${BASE}${prodHref}`, { waitUntil: "networkidle" });
page.on("dialog", (d) => d.accept());
const trash = page.locator('button[aria-label="Hapus foto unit"]').first();
if (await trash.count() > 0) {
  await trash.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
}
const finalCheck = await page.evaluate(() => ({
  thumbs: document.querySelectorAll('img[alt^="Foto unit"]').length,
}));
console.log("STEP 5 — setelah hapus (cleanup):", JSON.stringify(finalCheck));
console.log("page errors:", errors.length ? errors.slice(0, 3) : "none");
await browser.close();
