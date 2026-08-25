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

await page.click('button:has(svg.lucide-calendar-days) >> nth=0');
await page.waitForSelector('[data-slot="popover-content"]', { timeout: 5000 });
await page.waitForTimeout(150);

const info = await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find(
    (b) => b.hasAttribute("data-popup-open") || (b.querySelector("svg.lucide-calendar-days") && b.getAttribute("aria-expanded") === "true")
  );
  if (!btn) return { error: "trigger tidak ditemukan" };
  const rules = [];
  const walk = (ruleList) => {
    for (const rule of ruleList) {
      if (rule.cssRules) walk(rule.cssRules); // @layer / @media
      if (!rule.selectorText) continue;
      try {
        if (btn.matches(rule.selectorText) && (rule.style.marginBottom || rule.style.margin)) {
          rules.push({ selector: rule.selectorText.slice(0, 140), marginBottom: rule.style.marginBottom, margin: rule.style.margin });
        }
      } catch {}
    }
  };
  for (const sheet of document.styleSheets) {
    try { walk(sheet.cssRules); } catch {}
  }
  return {
    id: btn.id,
    inlineStyle: btn.getAttribute("style"),
    computed: {
      marginBottom: getComputedStyle(btn).marginBottom,
      marginTop: getComputedStyle(btn).marginTop,
    },
    matchingRules: rules,
  };
});

console.log(JSON.stringify(info, null, 2));
await browser.close();
