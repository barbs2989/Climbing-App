// Verify on the LIVE site that the overlays fixed in #690 escape #appscroll: their DOM
// parent must be <body>, and the app header must NOT be the topmost thing over them.
import { chromium } from "playwright-core";
const BASE = process.argv[2] || "https://barbs2989.github.io/Climbing-App/";
const b = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const p = await b.newPage({ viewport: { width: 390, height: 780 } });
const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.goto(BASE, { waitUntil: "domcontentloaded", timeout: 240000 });
await p.waitForTimeout(8000);

const ctx = await p.evaluate(() => {
  const cs = getComputedStyle(document.getElementById("appscroll"));
  return `${cs.animationName}/${cs.animationFillMode}/z:${cs.zIndex}`;
});
console.log("#appscroll is still a stacking context (this is WHY portals are needed):", ctx);

// Probe: for a given open overlay, is it a child of <body>, and does it win over the nav?
const probe = async (sel, label) => p.evaluate(([sel, label]) => {
  const d = document.querySelector(sel);
  if (!d) return { label, found: false };
  const nav = document.querySelector('[role="navigation"][aria-label="Primary"]').getBoundingClientRect();
  const hit = document.elementFromPoint(195, nav.top + nav.height / 2);
  return {
    label, found: true,
    parentIsBody: d.parentElement === document.body,
    paintsOverNav: !!(hit && (hit === d || d.contains(hit))),
  };
}, [sel, label]);

// Walk tabs hunting for a "?" HelpDot trigger and for a clickable photo.
let helpDone = false, photoDone = false;
for (const tab of ["Ranks", "Logbook", "Crew", "Home", "Partners"]) {
  const t = p.locator(`text="${tab}"`).first();
  if (await t.count()) { await t.click().catch(() => {}); await p.waitForTimeout(2500); }

  if (!helpDone) {
    const qs = p.locator("button", { hasText: /^\?$/ });
    const n = Math.min(await qs.count(), 4);
    for (let i = 0; i < n; i++) {
      try {
        await qs.nth(i).click({ timeout: 2500 });
        await p.waitForTimeout(1200);
        const r = await probe('[aria-label="Help"]', "Help sheet");
        if (r.found) { console.log(JSON.stringify(r)); helpDone = true;
          await p.keyboard.press("Escape").catch(() => {});
          await p.locator('[aria-label="Help"]').click({ position: { x: 5, y: 5 } }).catch(() => {});
          await p.waitForTimeout(800); break; }
      } catch { /* not this one */ }
    }
  }
  if (!photoDone) {
    const imgs = p.locator("img");
    const n = Math.min(await imgs.count(), 14);
    for (let i = 0; i < n; i++) {
      try {
        await imgs.nth(i).click({ timeout: 1200 });
        await p.waitForTimeout(900);
        const r = await probe('[aria-label="Photo viewer"]', "Photo lightbox");
        if (r.found) { console.log(JSON.stringify(r)); photoDone = true;
          await p.keyboard.press("Escape").catch(() => {}); await p.waitForTimeout(600); break; }
      } catch { /* not clickable */ }
    }
  }
  if (helpDone && photoDone) break;
}
if (!helpDone) console.log("Help sheet: no ? trigger reached — NOT verified in-browser");
if (!photoDone) console.log("Photo lightbox: no photo reached — NOT verified in-browser");
console.log("page errors:", errs.length, errs.slice(0, 3));
await b.close();
