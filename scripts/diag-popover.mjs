import { chromium } from "playwright-core";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = process.env.BASE_URL || "http://localhost:3000";

const browser = await chromium.launch({ executablePath: EDGE, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(`${BASE}/katalog/1`, { waitUntil: "networkidle" });

const diag = await page.evaluate(() => {
  return new Promise((resolve) => {
    const samples = [];
    const scrollbarBefore = window.innerWidth - document.documentElement.clientWidth;
    const bodyScrollTopBefore = window.scrollY;
    let raf = 0;
    let frames = 0;

    const observer = new MutationObserver(() => {
      const pop = document.querySelector('[data-slot="popover-content"]');
      const pos = document.querySelector('[data-slot="popover-content"]')?.parentElement;
      if (pop) {
        const r = pop.getBoundingClientRect();
        const pr = pos ? pos.getBoundingClientRect() : null;
        samples.push({
          f: frames,
          x: Math.round(r.x * 10) / 10,
          y: Math.round(r.y * 10) / 10,
          w: Math.round(r.width * 10) / 10,
          h: Math.round(r.height * 10) / 10,
          popOpacity: getComputedStyle(pop).opacity,
          posOpacity: pos ? getComputedStyle(pos).opacity : null,
          posTransform: pr ? `${Math.round(pr.x)},${Math.round(pr.y)}` : null,
        });
      }
      frames++;
      if (frames > 60) {
        observer.disconnect();
        cancelAnimationFrame(raf);
        resolve({
          samples,
          scrollbarBefore,
          scrollbarAfter: window.innerWidth - document.documentElement.clientWidth,
          scrollTopBefore: bodyScrollTopBefore,
          scrollTopAfter: window.scrollY,
          overflowBody: getComputedStyle(document.body).overflow,
        });
      } else {
        raf = requestAnimationFrame(() => {});
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });

    // klik trigger tanggal
    const btn = document.querySelector("button:has(svg.lucide-calendar-days)") || document.querySelectorAll("button")[0];
    btn.click();
    // safety resolve
    setTimeout(() => {
      observer.disconnect();
      resolve({
        samples,
        scrollbarBefore,
        scrollbarAfter: window.innerWidth - document.documentElement.clientWidth,
        scrollTopBefore: bodyScrollTopBefore,
        scrollTopAfter: window.scrollY,
        overflowBody: getComputedStyle(document.body).overflow,
      });
    }, 2500);
  });
});

console.log(JSON.stringify(diag, null, 2));
await browser.close();
