import { chromium } from "playwright-core";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = process.env.BASE_URL || "http://localhost:3000";

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${BASE}/login`);
await page.fill('input[name="email"]', "admin@mudahsewa.id");
await page.fill('input[name="password"]', "admin123");
await Promise.all([page.waitForURL("**/admin**"), page.click('button[type="submit"]')]);
await page.goto(`${BASE}/admin/orders/cmt8j0nqv0001t0v4anojqkv6`, { waitUntil: "networkidle" });

const info = await page.evaluate(() => {
  const headings = [...document.querySelectorAll("h1, h2, h3, div")].map((h) => h.textContent?.trim() ?? "");
  const returnHeading = headings.find((t) => t?.includes("Return & Penyelesaian"));
  return {
    orderNumber: document.querySelector("h1")?.textContent?.trim(),
    hasReturnCard: !!returnHeading,
    photosInput: document.querySelector('input[name="photos"]') !== null,
    notesField: document.querySelector('textarea[name="notes"]') !== null,
    submitBtn: [...document.querySelectorAll("button")].some((b) => b.textContent?.includes("Selesaikan Order")),
    bodyPreview: document.body.innerText.slice(0, 1500),
  };
});

console.log(JSON.stringify({ ...info, bodyPreview: info.bodyPreview.slice(0, 800) }, null, 2));
await page.screenshot({ path: ".return-form-check.png", fullPage: true });
await browser.close();
