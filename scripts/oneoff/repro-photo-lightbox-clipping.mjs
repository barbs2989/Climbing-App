// The ClimbMatchCore photo lightbox opens at z-index 99999 with its close button at
// top:16 — but rendered inside #appscroll it was trapped under the header/nav, so the ×
// was completely covered and unclickable. Hit-test it.
import { chromium } from "playwright-core";
const BASE = process.argv[2] || "http://localhost:5199/Climbing-App/";
const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const p = await b.newPage({ viewport: { width: 390, height: 780 } });
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120000 });
await p.waitForTimeout(7000);

// Find any PhotoStrip thumbnail in the app and open it. The strip lives on trip reports /
// profiles; walk the tabs until one turns up.
let opened = false;
for (const tab of ["Home", "Crew", "Logbook", "Partners"]) {
  const t = p.locator(`text="${tab}"`).first();
  if (await t.count()) { await t.click(); await p.waitForTimeout(2500); }
  const imgs = p.locator('img[style*="cursor"], img');
  const n = Math.min(await imgs.count(), 25);
  for (let i = 0; i < n; i++) {
    try {
      await imgs.nth(i).click({ timeout: 1200 });
      await p.waitForTimeout(900);
      if (await p.locator('[aria-label="Photo viewer"]').count()) { opened = true; break; }
    } catch { /* not clickable, keep looking */ }
  }
  if (opened) break;
}
if (!opened) { console.log("could not open a photo lightbox in this demo state — inconclusive"); await b.close(); process.exit(0); }

const m = await p.evaluate(() => {
  const dlg = document.querySelector('[aria-label="Photo viewer"]');
  const close = dlg.querySelector('[aria-label="Close"]');
  const cb = close.getBoundingClientRect();
  const hit = document.elementFromPoint(cb.left + cb.width / 2, cb.top + cb.height / 2);
  return {
    parentIsBody: dlg.parentElement === document.body,
    closeTop: Math.round(cb.top),
    closeHitTest: hit ? (hit.getAttribute("aria-label") || hit.tagName) : null,
    closeIsReachable: !!(hit && (hit === close || close.contains(hit))),
  };
});
console.log(JSON.stringify(m, null, 1));
console.log("page errors:", errs.length);
await b.close();
