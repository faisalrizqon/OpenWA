import { chromium } from "playwright-core";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = process.env.BASE_URL || "http://localhost:3000";

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await page.goto(`${BASE}/katalog/1`, { waitUntil: "networkidle" });

// Buka popover kalender via trigger pertama di BookingWidget
await page.click("button:has(svg.lucide-calendar-days)");
await page.waitForSelector('[data-slot="popover-content"]', { timeout: 5000 });

const pop = page.locator('[data-slot="popover-content"]').first();

// 1. Tidak ada animasi: opacity final harus 1 tanpa menunggu lama
const opacity = await pop.evaluate((el) => getComputedStyle(el).opacity);

// 2. Posisi awal
const rect1 = await pop.boundingBox();

// 3. Navigasi 3 bulan ke depan — tinggi harus konstan, posisi y tidak geser
const heights = [];
const tops = [];
for (let i = 0; i < 3; i++) {
  await page.click('[aria-label="Bulan berikutnya"]');
  await page.waitForTimeout(120);
  const r = await pop.boundingBox();
  heights.push(Math.round(r.height));
  tops.push(Math.round(r.y));
}
for (let i = 0; i < 3; i++) {
  await page.click('[aria-label="Bulan sebelumnya"]');
  await page.waitForTimeout(120);
}

// 4. Setelah kembali, posisi harus sama persis dengan awal
const rect2 = await pop.boundingBox();

// 5. Jumlah tombol tanggal (grid 6 minggu = 42 + 2 chevron)
const dayButtons = await page.locator('[data-slot="popover-content"] button').count();

await page.screenshot({ path: ".popover-final.png" });

console.log(JSON.stringify({
  opacity,
  initial: rect1 && { x: Math.round(rect1.x), y: Math.round(rect1.y), w: Math.round(rect1.width), h: Math.round(rect1.height) },
  afterBack: rect2 && { x: Math.round(rect2.x), y: Math.round(rect2.y), w: Math.round(rect2.width), h: Math.round(rect2.height) },
  monthHeights: heights,
  monthTops: tops,
  dayButtons,
  positionStable: rect1 && rect2 && Math.round(rect1.x) === Math.round(rect2.x) && Math.round(rect1.y) === Math.round(rect2.y),
  heightConstant: new Set(heights).size === 1,
  errors,
}, null, 2));

await browser.close();
