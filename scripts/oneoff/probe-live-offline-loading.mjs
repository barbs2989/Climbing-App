// Does the offline state page's "Loading…" ever resolve? MEASURED: yes, and the answer closes
// the one thing #1246 left open.
//
// #1246 verified the offline catalog reads on production (the state row and its route count come
// out of IndexedDB with the network cut) and flagged a `Loading…` still on screen at 6.5s, where
// the child-area list goes. Offline a spinner that can never resolve is its own defect
// (memory/prose-must-not-start-with-loading), but 6.5s is not evidence of "never".
//
// It is NOT a defect. On production, Nebraska downloaded, network cut:
//   t+2s  380 chars  Loading…
//   t+8s  517 chars  no spinner — replaced by
//                    "Couldn't refresh just now — showing what loaded last."
//                    AREAS: Goon Stretch 7 climbs / Schramm Road 1 climb
// So it resolves inside ~8s into an honest line PLUS the downloaded child areas, and 7+1 equals
// the 8 downloaded routes — the list is being served from IndexedDB, not merely not-erroring.
//
// TWO TRAPS, both of which made an earlier run of this file report the wrong thing while exiting
// 0. Re-read them before changing the needle or the entry.
//   1. THE NEEDLE. /Loading…/ cannot match "Loading countries…" — the ellipsis follows the noun,
//      not the word. That version printed "resolved" with two spinners on screen. It is
//      /\bLoading\b/ now, and the matched text is printed rather than a yes/no.
//   2. THE SCREEN. Clicking the shortcut is not arriving at the state page, and neither "left
//      the browse root" nor "the state name is present" can tell you that you did — the pickers
//      stay on screen and the state name is the shortcut's own label. The screen is identified
//      by the DOWNLOADED ROUTE COUNT, which cannot be a label that was already there.
//
// Incidental finding, correct behaviour, recorded so it is not re-investigated: the browse root
// offline shows "Loading countries…" / "Loading states…" for ~8s and then says "Couldn't load
// countries" while still offering the downloaded state. Honest, not stuck.

import { chromium } from "playwright-core";

const SITE = "https://barbs2989.github.io/Climbing-App/";
const STATE = process.argv[2] || "Nebraska";
const LOADING = /\bLoading\b/i;   // NOT /Loading…/ — the app writes "Loading countries…"

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext();

// Download the state online first — the whole point is the OFFLINE read of downloaded data.
const page = await ctx.newPage();
await page.goto(SITE, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForTimeout(7000);
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((e) => (e.innerText || "").trim().startsWith("Manage areas"));
  if (b) b.click();
});
await page.waitForTimeout(2500);
await page.evaluate((st) => {
  const rows = [...document.querySelectorAll("div")].filter((d) => {
    const t = (d.innerText || "").trim();
    return t.startsWith(st) && t.length < 200 && d.querySelector("button");
  });
  const row = rows[rows.length - 1];
  const btn = row && [...row.querySelectorAll("button")].find((b) => /download/i.test(b.innerText || ""));
  if (btn) btn.click();
}, STATE);
let stored = 0;
for (let i = 0; i < 30; i++) {
  await page.waitForTimeout(2000);
  stored = await page.evaluate(async () => {
    try {
      const r = indexedDB.open("climbmatch-offline");
      const db = await new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
      if (!db.objectStoreNames.contains("areas")) return 0;
      const q = db.transaction("areas", "readonly").objectStore("areas").count();
      return await new Promise((res) => { q.onsuccess = () => res(q.result); q.onerror = () => res(0); });
    } catch { return 0; }
  });
  if (stored > 0) break;
}
console.log(`downloaded: ${stored} area(s) in IndexedDB`);

await ctx.addInitScript(() => {
  Object.defineProperty(Navigator.prototype, "onLine", { get: () => false, configurable: true });
});
await ctx.setOffline(true);
const off = await ctx.newPage();
await off.goto(SITE, { waitUntil: "domcontentloaded", timeout: 90000 });
// ENTRY: mirror the technique that is PROVEN to reach this screen, and identify the screen by
// EVIDENCE rather than by assuming the click worked. Three versions were wrong first:
//   - a fixed 8s sleep raced the effect seeding `downloadedStates` from IndexedDB, so the
//     shortcut was not there yet and the probe reported "could not enter" on a working app;
//   - polling then clicked the instant the control appeared, before the handler was live, and
//     took the click as entry — sampling the BROWSE ROOT for 40s while claiming to measure the
//     state page. A click is not a navigation;
//   - "left the browse root" is not the test either: the two pickers STAY on screen, so that
//     assertion failed on a screen it had genuinely reached.
// probe-live-offline-catalog.mjs reaches it with a single click after a ~9s settle, and proves
// which screen it is on by the DOWNLOADED ROUTE COUNT — a number that cannot be a label already
// on screen. Both are copied here deliberately.
await off.waitForTimeout(9000);
const clicked = await off.evaluate((st) => {
  const live = (e) => { for (let p = e; p; p = p.parentElement) { const q = getComputedStyle(p).position; if (q === "fixed" || q === "sticky") return false; } return true; };
  const c = [...document.querySelectorAll('button,[role="button"]')].filter(live).find((e) => (e.innerText || "").trim() === st);
  if (!c) return false;
  c.click();
  return true;
}, STATE);
if (!clicked) { console.log("offline, the pinned-state shortcut was not on screen at all"); await browser.close(); process.exit(1); }

const dlRoutes = await off.evaluate(async () => {
  const r = indexedDB.open("climbmatch-offline");
  const db = await new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  if (!db.objectStoreNames.contains("routes")) return 0;
  const q = db.transaction("routes", "readonly").objectStore("routes").count();
  return await new Promise((res) => { q.onsuccess = () => res(q.result); q.onerror = () => res(0); });
});

console.log(`\nsampling the offline state page (onLine=${await off.evaluate(() => navigator.onLine)})`);
const t0 = Date.now();
let last = "", settledAt = null;
for (let i = 0; i < 20; i++) {
  await off.waitForTimeout(2000);
  const t = await off.innerText("body").catch(() => "");
  const has = LOADING.test(t);
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  // Identify the screen by the downloaded route COUNT, never by the pickers (which stay on
  // screen) and never by the state name (which is the shortcut's own label).
  const onState = dlRoutes > 0 && new RegExp(`\\b${dlRoutes}\\s+(climbs?|routes?)\\b`, "i").test(t);
  const where = onState ? `state page (${dlRoutes} climbs shown)` : "NOT the state page";
  const spinners = (t.match(/Loading[^\n]*/gi) || []).map((x) => x.trim());
  if (t !== last) console.log(`  t+${secs.padStart(2)}s  ${String(t.length).padStart(4)} chars  [${where}]  Loading=${has ? JSON.stringify(spinners) : "no"}`);
  last = t;
  if (!has) { settledAt = secs; break; }
}
const finalSpinners = (last.match(/Loading[^\n]*/gi) || []).map((x) => x.trim());
console.log(settledAt !== null
  ? `\nevery "Loading" resolved by t+${settledAt}s — not a stuck spinner.`
  : `\nSTILL loading after ~40s offline: ${JSON.stringify(finalSpinners)}\nA spinner a climber cannot wait out, at the moment the offline catalog is supposed to serve them.`);
console.log("\n--- final screen ---");
console.log(last.replace(/\n{2,}/g, "\n"));

await browser.close();
process.exit(settledAt === null ? 1 : 0);
