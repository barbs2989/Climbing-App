// Injection test for the check:ui route-navigation fix.
//
// The flake it repairs is intermittent, so reverting the fix does NOT reliably turn the
// guard red — the old code passed most of the time too. Testing "does it pass now" would
// therefore prove nothing. Instead this reproduces ONLY the navigation sequence, twice
// (old fixed-3000ms timing vs new floor+settle), under a deliberately delayed DB response,
// which is the condition the fix exists for.
//
// RESULT 2026-08-09: it does NOT discriminate. OLD opened the route at 6000ms and again at
// 12000ms, so the flat-wait timing is NOT a demonstrated cause of the observed red. Kept
// committed anyway, because the two things it ruled out are worth more than the hypothesis
// it failed to confirm:
//
//   1. ZERO of the 4 delayed /rest/v1/routes requests per attempt were name=ilike searches.
//      The search box on this path filters client-side over an already-loaded list, so no
//      story about search-query latency can explain anything here.
//   2. The delayed requests resolve during the settled Climbs step further up, which has a
//      60s budget and absorbs them — so injecting latency at the transport layer cannot
//      starve the step under test.
//
// A bigger delay would eventually break OLD, but picking one until the test agrees with the
// hypothesis is not evidence. If the red recurs, capture the failing page's text (--snapshot)
// rather than reaching for this.
//
// usage: node inject-slow-search.mjs <baseUrl> <delayMs>
import { chromium } from "playwright-core";
import { settledText } from "../lib/render-settle.mjs";

const BASE = process.argv[2];
const DELAY = Number(process.argv[3] || 6000);
const STATE = "Washington", ROUTE = "North Ridge (Complete)";
if (!BASE) { console.error("usage: inject-slow-search.mjs <baseUrl> [delayMs]"); process.exit(1); }

const browser = await chromium.launch({ channel: "chrome", headless: true });

async function tap(page, label) {
  const hit = await page.evaluate((t) => {
    const els = [...document.querySelectorAll("button,a,div,span,li,td,h1,h2,h3,h4")];
    const el = els.reverse().find((e) => (e.innerText || "").trim() === t && e.offsetParent !== null);
    if (!el) return false;
    el.click();
    return true;
  }, label);
  if (hit) await page.waitForTimeout(1600);
  return hit;
}

async function attempt(mode) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  // Delay every routes query, mimicking the cold-connection cost measured at 3.8-6.4s.
  // Counted, because an injection that never fires reports a clean result: the first draft
  // of this test showed OLD and NEW both succeeding, which is indistinguishable from the
  // interception not matching a single request.
  let delayed = 0, searches = 0;
  await page.route("**/rest/v1/routes*", async (r) => {
    delayed++;
    if (/name=ilike/.test(r.request().url())) searches++;
    await new Promise((res) => setTimeout(res, DELAY));
    await r.continue();
  });
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForTimeout(4000);
  await tap(page, "Climbs");
  await settledText(page, { min: 30, timeout: 60000 });

  await page.evaluate((state) => {
    const sel = document.querySelector("select");
    if (!sel) return;
    const opt = [...sel.options].find((o) => o.label === state || o.label.startsWith(state + " "));
    if (!opt) return;
    sel.value = opt.value;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  }, STATE);

  if (mode === "old") {
    await page.waitForTimeout(3000);
    await tap(page, "Routes");
    const input = await page.$('input[type="text"], input:not([type])');
    if (input) { await input.fill(ROUTE); await page.waitForTimeout(3000); }
    var found = await tap(page, ROUTE);
  } else {
    await page.waitForTimeout(800);
    await settledText(page, { min: 30, timeout: 45000 });
    await tap(page, "Routes");
    const input = await page.$('input[type="text"], input:not([type])');
    if (input) { await input.fill(ROUTE); await page.waitForTimeout(800); await settledText(page, { min: 30, timeout: 45000 }); }
    var found = await tap(page, ROUTE);
  }
  let chars = 0;
  if (found) { await page.waitForTimeout(2500); chars = (await page.innerText("body")).length; }
  await ctx.close();
  return { found, chars, delayed, searches };
}

console.log(`injecting a ${DELAY}ms delay on every /rest/v1/routes request\n`);
// Run old,new,old: the first attempt also pays vite's lazy-chunk cold compile, so a single
// old-then-new pair confounds the implementations with warm-up order.
for (const mode of ["old", "new", "old"]) {
  const t0 = Date.now();
  const r = await attempt(mode);
  console.log(`  ${mode.toUpperCase().padEnd(4)} opened=${r.found}  body=${r.chars} chars  `
    + `delayed=${r.delayed} req (${r.searches} name-search)  (${Date.now() - t0}ms)`);
  if (!r.delayed) console.log("       ^ NO request was intercepted — this row proves nothing");
}
await browser.close();
