import { chromium } from "playwright-core";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = process.env.BASE_URL || "http://localhost:3000";

const browser = await chromium.launch({ executablePath: EDGE, headless: true });

// === Kasus A: viewport pendek, widget di bawah layar (flip scenario) ===
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 600 } });
  await page.goto(`${BASE}/katalog/1`, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    document.querySelector("button:has(svg.lucide-calendar-days)").scrollIntoView({ block: "end" });
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: ".shot-A-before.png" });
  await page.click("button:has(svg.lucide-calendar-days)");
  await page.waitForTimeout(50);
  await page.screenshot({ path: ".shot-A-open-50ms.png" });
  await page.waitForTimeout(450);
  await page.screenshot({ path: ".shot-A-open-500ms.png" });

  // ukur posisi popup
  const info = await page.evaluate(() => {
    const pop = document.querySelector('[data-slot="popover-content"]');
    const pos = pop?.parentElement;
    const r = pop?.getBoundingClientRect();
    return {
      pop: r && { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      posStyle: pos ? { position: getComputedStyle(pos).position, opacity: getComputedStyle(pos).opacity, transition: getComputedStyle(pos).transition, transform: getComputedStyle(pos).transform } : null,
      popTransition: pop ? getComputedStyle(pop).transition : null,
      side: pos?.getAttribute("data-side") ?? pos?.style?.top,
    };
  });
  console.log("KASUS A (flip):", JSON.stringify(info, null, 2));
  await page.close();
}

// === Kasus B: normal, ukur posisi popup & check attribute data-side dari positioner ===
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}/katalog/1`, { waitUntil: "networkidle" });
  await page.click("button:has(svg.lucide-calendar-days)");
  await page.waitForTimeout(400);
  const info = await page.evaluate(() => {
    const pos = document.querySelector('[data-slot="popover-content"]')?.parentElement;
    return {
      attrs: pos ? Object.fromEntries([...pos.attributes].map(a => [a.name, a.value])) : null,
      inlineStyle: pos?.getAttribute("style"),
    };
  });
  console.log("KASUS B attrs:", JSON.stringify(info, null, 2));
  await page.screenshot({ path: ".shot-B-normal.png" });
  await page.close();
}

await browser.close();
