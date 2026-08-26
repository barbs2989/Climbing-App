// Does "download a state for offline" actually work on production?
//
// This is the app's core promise for a climbing app, and the UI states it plainly: "the full
// catalog — areas, climbs, gear, hazards — is saved on this device and keeps working with no
// signal." `lib/offline.js` pulls a state's areas subtree + routes into IndexedDB and
// `lib/db.js` falls back to those readers when the network fails. I can find no evidence the
// chain has been verified end to end against the deployed site.
//
// Steps: download a SMALL state through the real UI, confirm the rows landed in IndexedDB, then
// go genuinely offline and confirm the catalog still reads.
//
// Two traps this encodes rather than rediscovers (both from memory/offline-fast-fail-retry):
//   - `context.setOffline(true)` does NOT set `navigator.onLine` false and fires no offline
//     event, so it cannot exercise the app's offline paths on its own. The override must be on
//     Navigator.PROTOTYPE, installed via addInitScript so it is in place before boot.
//   - Measuring with a warm React Query cache measures a background refetch, not the cold
//     offline path. So the offline check runs on a fresh page load.
import { chromium } from "playwright-core";

const SITE = "https://barbs2989.github.io/Climbing-App/";
const STATE = process.argv[2] || "Nebraska";   // 8 routes — tractable to download in a test
const STATE_LC = STATE.toLowerCase();
let problems = 0;
const fail = (m) => { problems++; console.log("  FAIL " + m); };
const ok = (m) => console.log("  ok   " + m);

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

console.log(`1. loading production and opening "Manage areas"`);
await page.goto(SITE, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForTimeout(7000);

const opened = await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((e) => (e.innerText || "").trim().startsWith("Manage areas"));
  if (!b) return false;
  b.click();
  return true;
});
if (!opened) { fail(`no "Manage areas" button on Home — cannot reach the download UI`); }
else ok("sheet opened");
await page.waitForTimeout(2500);

if (opened) {
  console.log(`\n2. finding ${STATE} and tapping its Download`);
  const tapped = await page.evaluate((st) => {
    // The row renders the state name; its Download control is a button inside the same row.
    const rows = [...document.querySelectorAll("div")].filter((d) => {
      const t = (d.innerText || "").trim();
      return t.startsWith(st) && t.length < 200 && d.querySelector("button");
    });
    if (!rows.length) return { hit: false, why: "no row for that state" };
    const row = rows[rows.length - 1]; // innermost matching row
    const btn = [...row.querySelectorAll("button")].find((b) => /download/i.test(b.innerText || ""));
    if (!btn) return { hit: false, why: `row found but no Download button; buttons: ${[...row.querySelectorAll("button")].map((b) => JSON.stringify((b.innerText || "").trim())).join(",")}` };
    btn.click();
    return { hit: true };
  }, STATE);
  if (!tapped.hit) fail(`could not start the download — ${tapped.why}`);
  else ok("download started");

  if (tapped.hit) {
    console.log("\n3. waiting for it to finish, then reading IndexedDB");
    // Poll IndexedDB rather than the UI: the row's label is the app's claim, the store is truth.
    let counts = null;
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(3000);
      counts = await page.evaluate(async (st) => {
        const open = () => new Promise((res, rej) => {
          const r = indexedDB.open("climbmatch-offline");
          r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
          r.onblocked = () => rej(new Error("blocked"));
        });
        let db;
        try { db = await open(); } catch { return null; }
        if (!db.objectStoreNames.contains("routes")) return { areas: 0, routes: 0, meta: [] };
        const count = (store, idx, val) => new Promise((res) => {
          const tx = db.transaction(store, "readonly");
          const s = tx.objectStore(store);
          const req = idx ? s.index(idx).count(val) : s.count();
          req.onsuccess = () => res(req.result); req.onerror = () => res(-1);
        });
        const all = (store) => new Promise((res) => {
          const tx = db.transaction(store, "readonly");
          const req = tx.objectStore(store).getAll();
          req.onsuccess = () => res(req.result); req.onerror = () => res([]);
        });
        // Report the _state values the store ACTUALLY holds rather than assuming the display
        // name. The first version of this probe counted `_state = "Nebraska"` and got 0 while
        // 8 routes sat in the store — the tag is the area SLUG (`nebraska`), as the meta key
        // `state:nebraska` was saying all along. A count keyed on a guess reads as an empty
        // download, which is the one conclusion this probe must not reach by accident.
        const rows = await all("routes");
        const areaRows = await all("areas");
        const tags = [...new Set([...rows, ...areaRows].map((r) => r._state))];
        const norm = (x) => String(x || "").toLowerCase().replace(/[^a-z]/g, "");
        const want = norm(st);
        const tag = tags.find((t) => norm(t) === want) ?? null;
        return {
          tagsInStore: tags, matchedTag: tag,
          areas: tag == null ? 0 : areaRows.filter((r) => r._state === tag).length,
          routes: tag == null ? 0 : rows.filter((r) => r._state === tag).length,
          areasTotal: areaRows.length, routesTotal: rows.length,
          sampleRoute: rows[0] ? { id: rows[0].id, name: rows[0].name, has_grade: rows[0].grade != null } : null,
          meta: (await all("meta")).map((m) => `${m.key}=${JSON.stringify(m.done ?? m.value ?? m.state ?? "")}`),
        };
      }, STATE);
      if (counts && (counts.routes > 0 || counts.areas > 0)) break;
    }
    if (!counts) fail("could not open the offline IndexedDB at all");
    else {
      console.log(`   _state tags in store: ${JSON.stringify(counts.tagsInStore)}  matched: ${JSON.stringify(counts.matchedTag)}`);
      console.log(`   areas=${counts.areas}  routes=${counts.routes}  (totals ${counts.areasTotal}/${counts.routesTotal})`);
      console.log(`   sample route: ${JSON.stringify(counts.sampleRoute)}`);
      console.log(`   meta: ${JSON.stringify(counts.meta)}`);
      if (counts.routes > 0) ok(`${counts.routes} route(s) and ${counts.areas} area(s) stored on the device`);
      else fail("the download reported nothing into IndexedDB — the offline catalog would be empty");
    }
  }
}

console.log("\n4. going genuinely offline (prototype onLine override + network cut) and cold-loading");
await ctx.addInitScript(() => {
  Object.defineProperty(Navigator.prototype, "onLine", { get: () => false, configurable: true });
});
await ctx.setOffline(true);
const off = await ctx.newPage();
let offText = "";
try {
  await off.goto(SITE, { waitUntil: "domcontentloaded", timeout: 90000 });
  await off.waitForTimeout(9000);
  offText = await off.innerText("body").catch(() => "");
} catch (e) {
  fail(`the app did not load at all offline: ${String(e.message || e).slice(0, 120)}`);
}
if (offText) {
  console.log(`   offline body: ${offText.length} chars, navigator.onLine=${await off.evaluate(() => navigator.onLine)}`);
  if (offText.length < 300) fail("offline load rendered only a shell — the precache did not serve the app");
  else ok("the app shell renders offline");
  const st = new RegExp(STATE, "i").test(offText);
  console.log(`   mentions ${STATE}: ${st}`);
  // Honesty check: offline it must not claim you have nothing.
  const lies = /no climbs|nothing here|0 routes|no areas/i.test(offText);
  if (lies) console.log(`   NOTE: offline copy includes an emptiness claim — check it is scoped, not a blanket "you have nothing"`);
}

// 5. The half that actually matters at a trailhead: can the DOWNLOADED CATALOG be browsed with
//    no signal? A rendering shell plus a Home shortcut is not the promise; "areas, climbs, gear
//    and beta ... keeps working with no signal" is. `orOffline` is documented as consulting
//    IndexedDB inside the FIRST attempt, so this should not wait on retries either.
if (offText) {
  console.log("\n5. browsing the downloaded catalog offline");
  const t0 = Date.now();
  const tapped = await off.evaluate((st) => {
    // Prefer the downloaded-state shortcut if Home offers one; else go via the Climbs tab.
    const live = (e) => { for (let p = e; p; p = p.parentElement) { const q = getComputedStyle(p).position; if (q === "fixed" || q === "sticky") return false; } return true; };
    // A real control only: a wrapping div with the same innerText matches first in document
    // order, and clicking a parent does not fire the child's handler.
    const ctrl = [...document.querySelectorAll('button,[role="button"]')].filter(live);
    const shortcut = ctrl.find((e) => (e.innerText || "").trim() === st);
    if (shortcut) { shortcut.click(); return "shortcut"; }
    const climbs = [...document.querySelectorAll("button")].find((e) => (e.innerText || "").trim() === "Climbs");
    if (climbs) { climbs.click(); return "climbs-tab"; }
    return null;
  }, STATE);
  console.log(`   entered via: ${tapped || "(nothing tappable)"}`);
  if (!tapped) fail("offline, there was no way into the catalog at all");
  else {
    await off.waitForTimeout(6000);
    const after = await off.innerText("body").catch(() => "");
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`   after ${secs}s: ${after.length} chars`);
    // The downloaded rows are the evidence: a route or area name that can only have come from
    // IndexedDB, since the network is cut.
    const names = await off.evaluate(async () => {
      const r = indexedDB.open("climbmatch-offline");
      const db = await new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
      const all = (store) => new Promise((res) => {
        const q = db.transaction(store, "readonly").objectStore(store).getAll();
        q.onsuccess = () => res(q.result); q.onerror = () => res([]);
      });
      return { routes: (await all("routes")).map((x) => x.name).filter(Boolean), areas: (await all("areas")).map((x) => x.name).filter(Boolean) };
    });
    // WHAT COUNTS AS EVIDENCE, after getting this wrong in both directions.
    //
    // First version matched any downloaded name and passed on "Nebraska" — the shortcut's own
    // label, on a screen that had not navigated. So I excluded the state name. That then FAILED
    // a working app, because on the state's own page the state name is exactly what the offline
    // store supplies, and its two child areas were still rendering ("Loading…").
    //
    // The unambiguous evidence is the COUNT: "8 climbs" / "View all 8 routes" is the number of
    // downloaded routes, and with the network cut it can only have come from IndexedDB. A count
    // cannot be a label that was already on screen.
    const dlRoutes = names.routes.length;
    const countShown = dlRoutes > 0 && new RegExp(`\\b${dlRoutes}\\s+(climbs?|routes?)\\b`, "i").test(after);
    const named = [...names.routes, ...names.areas].filter((n) => n && after.includes(n));
    console.log(`   downloaded route count (${dlRoutes}) on screen: ${countShown}`);
    console.log(`   downloaded names on screen: ${JSON.stringify(named.slice(0, 4))}`);
    if (after === offText) {
      fail(`the screen did not change after the tap (${after.length} chars both before and after) — nothing was navigated, so the catalog was never asked for`);
    } else if (countShown) {
      ok(`the offline catalog reads: the screen states the downloaded route count (${dlRoutes}) with the network cut`);
    } else if (named.length) {
      ok(`the offline catalog reads (by name): ${JSON.stringify(named.slice(0, 3))}`);
    } else {
      fail("the screen changed but neither the downloaded count nor any downloaded name reached it");
    }
    // Offline, a spinner that can never resolve is its own defect — see
    // memory/prose-must-not-start-with-loading. Reported, not failed: it may still settle.
    if (/Loading…|Loading\.\.\./i.test(after)) {
      // ANSWERED by probe-live-offline-loading.mjs, so this is context rather than an open
      // question: sampled past this point it clears by ~t+8s and is replaced by "Couldn't
      // refresh just now — showing what loaded last." plus the downloaded child areas. This
      // probe stops at 6.2s, which is mid-resolution — do not read it as a stuck spinner.
      console.log('   NOTE: a "Loading…" is on screen at this instant. Measured elsewhere: it clears by ~8s into an honest line plus the downloaded areas (probe-live-offline-loading.mjs). Not a stuck spinner.');
    }
    if (/Couldn.t load|check your connection/i.test(after) && shown.length) {
      console.log("   NOTE: an error line renders ALONGSIDE working offline data — 'data outranks error' may not hold on this path");
    }
  }
}

console.log(problems ? `\n${problems} problem(s).` : "\nthe offline catalog chain works end to end on production.");
await browser.close();
process.exit(problems ? 1 : 0);
