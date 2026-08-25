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

// Cari bulan yang ada order-nya: navigasi kalender
await page.goto(`${BASE}/admin/calendar`, { waitUntil: "networkidle", timeout: 90000 });

// Klik batang order pertama yang muncul (popover trigger)
let found = null;
for (let attempt = 0; attempt < 12; attempt++) {
  const bar = page.locator('button[style*="grid-column"]').first();
  if ((await bar.count()) > 0) {
    found = true;
    await bar.click();
    await page.waitForTimeout(400);
    break;
  }
  // navigasi bulan sebelumnya
  const prev = page.locator('button[aria-label="Bulan sebelumnya"]');
  if ((await prev.count()) === 0) break;
  await prev.click();
  await page.waitForLoadState("networkidle", { timeout: 60000 });
  await page.waitForTimeout(300);
}

if (!found) {
  console.log("TIDAK ADA BATANG ORDER DI KALENDER (semua bulan kosong)");
} else {
  const info = await page.evaluate(() => {
    const pop = document.querySelector('[data-slot="popover-content"]');
    if (!pop) return { popoverOpen: false };
    const links = [...pop.querySelectorAll("a")];
    return {
      popoverOpen: true,
      links: links.map((a) => ({ href: a.getAttribute("href"), text: a.textContent?.trim().slice(0, 50) })),
      productLinks: links.filter((a) => a.getAttribute("href")?.startsWith("/katalog/")).length,
    };
  });
  console.log("POPOVER ORDER:", JSON.stringify(info, null, 2));
  await page.screenshot({ path: ".calendar-product-links.png" });
}
console.log("page errors:", errors.length ? errors.slice(0, 3) : "none");
await browser.close();
