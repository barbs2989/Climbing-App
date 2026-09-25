// Offline, a route that is both PACKED and inside a DOWNLOADED STATE: which copy does the page get?
//
// One-shot verifier for offlineRoutesByIds choosing the FRESHER copy (it used to be the pack,
// unconditionally, so a June pack hid a September state download). It runs the real module in a
// real browser against real IndexedDB — no database, no accounts: the dev server's own
// /lib/offline.js is imported into the page, the two stores are seeded with rows whose only
// difference is a marker in `name` and a timestamp, and the answer is read back.
//
// Spent when: offlineRoutesByIds or the pack/state row shapes change.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertQuietBox } from "../lib/quiet-box.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
assertQuietBox("verify-pack-vs-state-freshness");

function claimPort(start, span = 40) {
  return new Promise((resolve, reject) => {
    let p = start;
    const tryOne = () => { if (p >= start + span) return reject(new Error("no free port")); const s = net.createServer(); s.once("error", () => { p++; tryOne(); }); s.once("listening", () => s.close(() => resolve(p))); s.listen(p, "127.0.0.1"); };
    tryOne();
  });
}
async function waitForServer(url, tries = 120) { for (let i = 0; i < tries; i++) { try { const r = await fetch(url); if (r.ok) return true; } catch {} await new Promise((r) => setTimeout(r, 1000)); } return false; }

// [name, pack?, state?, expected marker]. Times are relative: the pack's refreshedAt vs the
// state's completion time.
const CASES = [
  ["state download NEWER than the pack -> the state's copy", { at: 1000 }, { at: 2000, complete: true }, "STATE"],
  ["pack refreshed AFTER the state download -> the pack's copy", { at: 3000 }, { at: 2000, complete: true }, "PACK"],
  ["same instant -> the pack (tie keeps the copy fetched for this route)", { at: 2000 }, { at: 2000, complete: true }, "PACK"],
  ["newer state download NOT complete -> the pack (a truncated download is never served)", { at: 1000 }, { at: 2000, complete: false }, "PACK"],
  ["packed only -> the pack", { at: 1000 }, null, "PACK"],
  ["state only, complete -> the state", null, { at: 2000, complete: true }, "STATE"],
  ["state only, NOT complete -> nothing", null, { at: 2000, complete: false }, "NONE"],
  ["old pack with no refreshedAt (packedAt only) vs newer state -> the state", { at: 1000, legacy: true }, { at: 2000, complete: true }, "STATE"],
];

let server = null, browser = null, fails = 0, ran = 0;
try {
  const port = await claimPort(5461);
  const base = `http://127.0.0.1:${port}/Climbing-App/`;
  server = spawn("npx", ["vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { cwd: ROOT, stdio: "ignore" });
  if (!(await waitForServer(base))) throw new Error("dev server never came up");
  browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 180000 });
  for (const [name, pack, state, want] of CASES) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(base + "lib/offline.js", { waitUntil: "load" });
    const got = await page.evaluate(async ({ pack, state }) => {
      const mod = await import("/Climbing-App/lib/offline.js");
      // Open (and upgrade) through the module's own code path, then seed with raw IDB.
      await mod.packedRouteIds();
      const db = await new Promise((res, rej) => { const r = indexedDB.open("climbmatch-offline"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
      const put = (store, row) => new Promise((res, rej) => { const t = db.transaction(store, "readwrite"); t.objectStore(store).put(row); t.oncomplete = res; t.onerror = () => rej(t.error); });
      const ID = "freshness_probe_route";
      const areas = { name: "Probe Peak", area_type: "peak", region: null, lat: null, lng: null, elevation_ft: null, prominence_ft: null, avy_zone: null, blurb: null, parent: null };
      if (pack) await put("pack", pack.legacy ? { id: ID, name: "PACK", area_id: "wa_probe", areas, packedAt: pack.at } : { id: ID, name: "PACK", area_id: "wa_probe", areas, packedAt: 1, refreshedAt: pack.at, _snap: { at: pack.at, reports: [], contribs: [], profiles: [] } });
      if (state) {
        await put("meta", { key: "state:wa_probe_state", name: "Probe", complete: state.complete, areaCount: 1, routeCount: 1, savedAt: state.at });
        await put("areas", { id: "wa_probe", name: "Probe Peak", area_type: "peak", parent_id: null, _state: "wa_probe_state" });
        await put("routes", { id: ID, name: "STATE", area_id: "wa_probe", _state: "wa_probe_state" });
      }
      const rows = await mod.offlineRoutesByIds([ID]);
      return { n: rows.length, name: rows[0] ? rows[0].name : "NONE", leaked: rows[0] ? Object.keys(rows[0]).filter((k) => /^(_snap|_wx|packedAt|refreshedAt)$/.test(k)) : [], hasAreas: !!(rows[0] && rows[0].areas && rows[0].areas.name) };
    }, { pack, state });
    ran++;
    const good = got.name === want && (want === "NONE" ? got.n === 0 : got.n === 1) && !got.leaked.length && (want === "NONE" || got.hasAreas);
    if (!good) fails++;
    console.log(`${good ? "ok  " : "FAIL"}  ${name}${good ? "" : "  — got " + JSON.stringify(got)}`);
    await ctx.close();
  }
} catch (e) {
  fails++; console.log("FAIL  run completed — " + (e && e.message));
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill();
}
console.log(`\n${fails ? "FAILED " + fails : "ok — " + ran + " cases"}`);
process.exit(fails || ran !== CASES.length ? 1 : 0);
