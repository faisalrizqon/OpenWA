import { chromium } from "playwright-core";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = process.env.BASE_URL || "http://localhost:3000";

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${BASE}/login`);
await page.fill('input[name="email"]', "admin@mudahsewa.id");
await page.fill('input[name="password"]', "admin123");
await Promise.all([page.waitForURL("**/admin**"), page.click('button[type="submit"]')]);

for (const path of ["/admin/promos", "/admin/orders/new"]) {
  const resp = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  const calButtons = await page.locator("button:has(svg.lucide-calendar-days)").count();
  let popoverOk = "no-trigger";
  if (calButtons > 0) {
    await page.locator("button:has(svg.lucide-calendar-days)").first().click();
    popoverOk = (await page.locator('[data-slot="popover-content"]').count()) > 0 ? "popover-open-ok" : "popover-FAILED";
    await page.mouse.click(10, 10);
  }
  console.log(`${path} → ${resp.status()}, calendar-triggers=${calButtons}, ${popoverOk}`);
}
await browser.close();
