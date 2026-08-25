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

const snapshot = () =>
  page.evaluate(() => {
    const card = document.querySelector("main");
    const out = {};
    if (!card) return out;
    card.querySelectorAll("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      const cs = getComputedStyle(el);
      out[`${el.tagName}.${(el.className || "").toString().slice(0, 60)}`] = {
        top: Math.round(r.top * 100) / 100,
        left: Math.round(r.left * 100) / 100,
        height: Math.round(r.height * 100) / 100,
        display: cs.display,
        position: cs.position,
        margin: cs.margin,
      };
    });
    return out;
  });

const before = await snapshot();

await page.click('button:has(svg.lucide-calendar-days) >> nth=0');
await page.waitForSelector('[data-slot="popover-content"]', { timeout: 5000 });
await page.waitForTimeout(100);
const after = await snapshot();

// diff: elemen yang bergeser
const diffs = [];
for (const key of Object.keys(after)) {
  const b = before[key];
  const a = after[key];
  if (!b) {
    diffs.push({ key, change: "NEW", a });
    continue;
  }
  if (b.top !== a.top || b.left !== a.left || b.height !== a.height) {
    diffs.push({ key, change: "MOVED", from: b, to: a });
  }
}
for (const key of Object.keys(before)) {
  if (!after[key]) diffs.push({ key, change: "GONE", b: before[key] });
}

// juga cek elemen di luar main (portal/body)
const bodyInfo = await page.evaluate(() => {
  const portalDivs = [...document.body.children].map((el) => ({
    tag: el.tagName,
    cls: (el.className || "").toString().slice(0, 80),
    rect: (() => { const r = el.getBoundingClientRect(); return { h: Math.round(r.height), top: Math.round(r.top), pos: getComputedStyle(el).position }; })(),
  }));
  const html = document.documentElement;
  return {
    bodyChildren: portalDivs,
    htmlOverflowY: getComputedStyle(html).overflowY,
    bodyOverflowY: getComputedStyle(document.body).overflowY,
    htmlScrollHeight: html.scrollHeight,
    htmlClientHeight: html.clientHeight,
    scrollY: window.scrollY,
  };
});

console.log(JSON.stringify({ diffs, bodyInfo }, null, 2));
await browser.close();
