import { chromium } from "playwright-core";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = process.env.BASE_URL || "http://localhost:3000";

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${BASE}/login`);
await page.fill('input[name="email"]', "admin@mudahsewa.id");
await page.fill('input[name="password"]', "admin123");
await Promise.all([page.waitForURL("**/admin**"), page.click('button[type="submit"]')]);
await page.goto(`${BASE}/admin/orders?period=custom`, { waitUntil: "networkidle" });

const dump = (label) =>
  page.evaluate((label) => {
    const wrappers = [...document.querySelectorAll("main .space-y-1")];
    return {
      label,
      wrappers: wrappers.map((w) => ({
        children: [...w.childNodes].map((c) => ({
          type: c.nodeType === 1 ? c.tagName : `#${c.nodeType}`,
          cls: c.nodeType === 1 ? String(c.className).slice(0, 60) : (c.textContent || "").trim().slice(0, 30),
          display: c.nodeType === 1 ? getComputedStyle(c).display : null,
          mb: c.nodeType === 1 ? getComputedStyle(c).marginBlockEnd || getComputedStyle(c).marginBottom : null,
        })),
      })),
    };
  }, label);

console.log(JSON.stringify(await dump("CLOSED"), null, 2));

await page.click('button:has(svg.lucide-calendar-days) >> nth=0');
await page.waitForSelector('[data-slot="popover-content"]', { timeout: 5000 });
await page.waitForTimeout(150);
console.log(JSON.stringify(await dump("OPEN"), null, 2));

await browser.close();
