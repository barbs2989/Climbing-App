// What does the Climbs catalog actually SAY offline, with a state downloaded?
//
// The end-to-end probe found the tap navigates (576 -> 380 chars) but no downloaded area or
// route name reaches the screen. That is either a broken promise ("keeps working with no
// signal") or a screen I misread. Dump the text rather than infer.
import { chromium } from "playwright-core";

const SITE = "https://barbs2989.github.io/Climbing-App/";
const STATE = process.argv[2] || "Nebraska";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext();

// --- online: download the state -------------------------------------------------------------
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
// Wait for the rows to land rather than a fixed sleep.
for (let i = 0; i < 30; i++) {
  await page.waitForTimeout(2000);
  const n = await page.evaluate(async () => {
    try {
      const r = indexedDB.open("climbmatch-offline");
      const db = await new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
      if (!db.objectStoreNames.contains("routes")) return 0;
      const q = db.transaction("routes", "readonly").objectStore("routes").count();
      return await new Promise((res) => { q.onsuccess = () => res(q.result); q.onerror = () => res(0); });
    } catch { return 0; }
  });
  if (n > 0) { console.log(`downloaded: ${n} routes in IndexedDB`); break; }
}

// --- offline --------------------------------------------------------------------------------
await ctx.addInitScript(() => {
  Object.defineProperty(Navigator.prototype, "onLine", { get: () => false, configurable: true });
});
await ctx.setOffline(true);
const off = await ctx.newPage();
await off.goto(SITE, { waitUntil: "domcontentloaded", timeout: 90000 });
await off.waitForTimeout(9000);

console.log(`\n=== OFFLINE, Home (onLine=${await off.evaluate(() => navigator.onLine)}) ===`);
console.log((await off.innerText("body")).replace(/\n{2,}/g, "\n"));

for (const label of [STATE, "Climbs"]) {
  const hit = await off.evaluate((n) => {
    const live = (e) => { for (let p = e; p; p = p.parentElement) { const q = getComputedStyle(p).position; if (q === "fixed" || q === "sticky") return false; } return true; };
    const c = [...document.querySelectorAll('button,[role="button"]')].filter(live).find((e) => (e.innerText || "").trim() === n);
    if (!c) return false;
    c.click();
    return true;
  }, label);
  if (!hit) { console.log(`\n(no control labelled ${JSON.stringify(label)})`); continue; }
  await off.waitForTimeout(6000);
  console.log(`\n=== OFFLINE, after tapping ${JSON.stringify(label)} ===`);
  console.log((await off.innerText("body")).replace(/\n{2,}/g, "\n"));
}

await browser.close();
