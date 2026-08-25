import { chromium } from "playwright-core";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = process.env.BASE_URL || "http://localhost:3000";

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

// Login admin
await page.goto(`${BASE}/login`);
await page.fill('input[name="email"]', "admin@mudahsewa.id");
await page.fill('input[name="password"]', "admin123");
await Promise.all([page.waitForURL("**/admin**"), page.click('button[type="submit"]')]);

await page.goto(`${BASE}/admin/orders?period=custom`, { waitUntil: "networkidle" });

const measure = () =>
  page.evaluate(() => {
    const pick = (label) => {
      const span = [...document.querySelectorAll("span")].find((s) => s.textContent.trim() === label);
      return span?.nextElementSibling?.querySelector("button") ?? span?.parentElement?.querySelector("button");
    };
    const triggerRects = [...document.querySelectorAll('[data-popup-open], button')]
      .filter((b) => b.querySelector("svg.lucide-calendar-days") && b.closest("main"))
      .map((b) => b.getBoundingClientRect());
    const buttons = [...document.querySelectorAll("button")].filter(
      (b) => b.textContent.includes("Terapkan") || b.textContent.includes("Reset")
    );
    return {
      calendarTriggers: triggerRects.map((r) => ({ x: Math.round(r.x), w: Math.round(r.width) })),
      actionButtons: buttons.map((b) => {
        const r = b.getBoundingClientRect();
        return { text: b.textContent.trim(), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) };
      }),
      scrollbar: window.innerWidth - document.documentElement.clientWidth,
      bodyOverflow: getComputedStyle(document.body).overflow,
      scrollY: window.scrollY,
    };
  });

const log = [];
log.push({ step: "1-before-open", ...(await measure()) });

// Buka kalender "Dari"
await page.click('button:has(svg.lucide-calendar-days) >> nth=0');
await page.waitForSelector('[data-slot="popover-content"]', { timeout: 5000 });
await page.waitForTimeout(60);
log.push({ step: "2-open-60ms", ...(await measure()) });
await page.screenshot({ path: ".of-open-60ms.png" });
await page.waitForTimeout(400);
log.push({ step: "3-open-460ms", ...(await measure()) });
await page.screenshot({ path: ".of-open-460ms.png" });

// Pilih tanggal (klik hari ke-10)
await page.click('[data-slot="popover-content"] button:not([aria-label]) >> nth=12');
await page.waitForTimeout(200);
log.push({ step: "4-after-pick", ...(await measure()) });
await page.screenshot({ path: ".of-after-pick.png" });

// Tutup via klik luar
await page.mouse.click(10, 10);
await page.waitForTimeout(200);
log.push({ step: "5-closed", ...(await measure()) });

console.log(JSON.stringify(log, null, 2));
console.log("errors:", errors);
await browser.close();
