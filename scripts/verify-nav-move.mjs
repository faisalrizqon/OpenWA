import { chromium } from "playwright-core";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = process.env.BASE_URL || "http://localhost:3000";

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${BASE}/login`);
await page.fill('input[name="email"]', "admin@mudahsewa.id");
await page.fill('input[name="password"]', "admin123");
await Promise.all([page.waitForURL("**/admin**"), page.click('button[type="submit"]')]);
await page.goto(`${BASE}/admin/orders`, { waitUntil: "networkidle" });

// cari link detail order (bukan /admin/orders/new)
const href = await page.evaluate(() => {
  const links = [...document.querySelectorAll('a[href^="/admin/orders/"]')]
    .map((a) => a.getAttribute("href"))
    .filter((h) => h && h !== "/admin/orders/new");
  return links[0] ?? null;
});
console.log("order detail:", href);
if (!href) { console.log("TIDAK ADA ORDER"); await browser.close(); process.exit(0); }

await page.goto(`${BASE}${href}`, { waitUntil: "networkidle" });

const check = await page.evaluate(() => {
  const daftar = [...document.querySelectorAll("a")].find((a) => a.textContent.includes("Daftar Orders"));
  const kalender = [...document.querySelectorAll("a")].find((a) => a.textContent.includes("Lihat Kalender"));
  const insideCard = (el) => !!el?.parentElement?.closest('[class*="Card"], [class*="card"]');
  return {
    daftarTop: daftar ? Math.round(daftar.getBoundingClientRect().top) : null,
    kalenderFound: !!kalender,
    kalenderInsideCard: insideCard(kalender),
    kalenderTop: kalender ? Math.round(kalender.getBoundingClientRect().top) : null,
  };
});
console.log(JSON.stringify(check, null, 2));
await page.screenshot({ path: ".order-detail-nav.png", clip: { x: 0, y: 0, width: 1440, height: 420 } });
await browser.close();
