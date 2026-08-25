import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "fs";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = process.env.BASE_URL || "http://localhost:3000";
const ORDER_ID = process.argv[2] ?? "";

if (!ORDER_ID) {
  console.error("usage: node scripts/verify-guarantee.mjs <orderId>");
  process.exit(1);
}

// buat file gambar test kecil (PNG 1x1 valid)
const png1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);
mkdirSync(".test-upload", { recursive: true });
writeFileSync(".test-upload/ktp-test.png", png1x1);

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(`${BASE}/login`);
await page.fill('input[name="email"]', "admin@mudahsewa.id");
await page.fill('input[name="password"]', "admin123");
await Promise.all([page.waitForURL("**/admin**"), page.click('button[type="submit"]')]);
await page.goto(`${BASE}/admin/orders/${ORDER_ID}`, { waitUntil: "networkidle" });

console.log("STEP 1 — kondisi awal (belum ada dokumen):");
console.log("  pesan kosong:", await page.evaluate(() => document.body.innerText.includes("opsional")));

console.log("STEP 2 — upload dokumen jaminan test...");
await page.setInputFiles('input[name="file"]', ".test-upload/ktp-test.png");
await page.click('button:has-text("Upload Jaminan")');
await page.waitForLoadState("networkidle");
await page.waitForTimeout(500);

console.log("STEP 3 — cek tombol X muncul:");
const xButtons = await page.evaluate(() =>
  [...document.querySelectorAll('button[aria-label^="Hapus"]')].map((b) => b.getAttribute("aria-label"))
);
console.log("  tombol hapus:", JSON.stringify(xButtons));

console.log("STEP 4 — klik X jaminan, cek dialog konfirmasi:");
const target = page.locator('button[aria-label^="Hapus"]:not([aria-label="Hapus pembayaran"])').first();
await target.click();
await page.waitForTimeout(500);
const dialogText = await page.evaluate(() =>
  document.querySelector('[role="dialog"]')?.textContent?.slice(0, 250) ?? null
);
console.log("  dialog:", JSON.stringify(dialogText));
await page.screenshot({ path: ".guarantee-dialog.png" });

console.log("STEP 5 — klik 'Ya, Hapus' (hapus beneran untuk test):");
await page.getByRole("button", { name: "Ya, Hapus" }).click();
await page.waitForLoadState("networkidle");
await page.waitForTimeout(500);
const url = page.url();
const docCount = await page.evaluate(() =>
  document.querySelectorAll('button[aria-label^="Hapus"]:not([aria-label="Hapus pembayaran"])').length
);
console.log("  url setelah hapus:", url);
console.log("  sisa tombol X jaminan:", docCount);

console.log("STEP 6 — halaman customer (order-status):");
const orderNumber = await page.evaluate(() => document.querySelector("h1")?.textContent?.trim());
await page.goto(`${BASE}/order-status/${orderNumber}`, { waitUntil: "networkidle" });
const customerOk = await page.evaluate(() => document.body.innerText.includes("opsional — pelengkap data"));
console.log("  label opsional tampil:", customerOk);

console.log("page errors:", errors.length ? errors.slice(0, 3) : "none");
await browser.close();
