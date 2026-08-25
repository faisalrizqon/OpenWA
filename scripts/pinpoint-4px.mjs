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

// fokus ke container filter (space-y-2 pertama di main)
const snapshot = () =>
  page.evaluate(() => {
    const root = [...document.querySelectorAll("main .space-y-2")][0];
    const out = [];
    root.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      out.push({
        sel: `${el.tagName}#${el.id}.${(el.className?.baseVal ?? el.className ?? "").toString().slice(0, 70)}`,
        h: Math.round(r.height * 100) / 100,
        mb: getComputedStyle(el).marginBottom,
        mt: getComputedStyle(el).marginTop,
      });
    });
    return out;
  });

const before = await snapshot();

await page.click('button:has(svg.lucide-calendar-days) >> nth=0');
await page.waitForSelector('[data-slot="popover-content"]', { timeout: 5000 });
await page.waitForTimeout(100);
const after = await snapshot();

for (let i = 0; i < before.length; i++) {
  const b = before[i], a = after[i];
  if (!a) { console.log("GONE:", b.sel); continue; }
  if (b.h !== a.h || b.mt !== a.mt || b.mb !== a.mb) {
    console.log("CHANGED:", a.sel, "\n  h:", b.h, "->", a.h, "| mt:", b.mt, "->", a.mt, "| mb:", b.mb, "->", a.mb);
  }
}
if (after.length > before.length) console.log("NEW ELEMENTS:", after.slice(before.length));
await browser.close();
