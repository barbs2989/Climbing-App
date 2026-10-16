#!/usr/bin/env node
/* CAN YOU OPEN AN AREA-SEARCH HIT WITH NO SIGNAL?
 *
 * #1673 made the area filter box searchable offline. It did NOT make the thing you do with a
 * hit work, and that combination is worse than no search at all — a tap that visibly goes
 * somewhere and lands on an area with no ancestors and no panels.
 *
 * `areas_in_subtree` returns a NARROW projection with no ltree `path`, so `jumpToArea` runs a
 * SEQUENCE: hydrate the full row with `fetchArea`, then build the breadcrumb from its path
 * with `fetchAreaBreadcrumb`, then find the state in that breadcrumb. Offline both calls
 * threw, both had a `.catch` that swallowed it, the breadcrumb came back `[]`, and the handler
 * returned — AFTER `setScreen("areas")` and `setStateNode(a)` had already fired.
 *
 * SO THE ASSERTION HAS TO BE THE SEQUENCE, NOT THE TWO FUNCTIONS. Either one can be correct
 * in isolation while the tap still dead-ends: `fetchArea` returning null is enough on its own,
 * because the breadcrumb then has no path to walk. Section 3 runs the real handler's own steps
 * in order against the real exports.
 *
 * THE ROOT COUNTRY IS THE ONE ANCESTOR THAT IS NEVER STORED — `downloadStateOffline` keeps
 * only descendants of the state — and it is exactly the label `fetchAreaBreadcrumb` drops
 * before looking anything up, because the breadcrumb does not show the country. Section 2
 * asserts that alignment rather than assuming it: it is the whole reason this is possible
 * without a schema change, and a future breadcrumb that kept the country would break offline
 * only.
 *
 * No browser, no credentials, no project. The shim is scripts/lib/idb-shim.mjs.
 */

import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { installIdbShim } from "../lib/idb-shim.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

let ran = 0, bad = 0;
const ok = (m) => { ran++; console.log("  ok   " + m); };
const no = (m) => { ran++; bad++; console.log("  FAIL " + m); };
const names = (rows) => (rows || []).map((r) => r.id).join(" > ");
const rejects = async (fn) => { try { await fn(); return false; } catch (e) { return true; } };

installIdbShim();

/* ── the supabase stub ────────────────────────────────────────────────────────────────────
 * `offline` is a module-level switch rather than two builds, so section 4 can prove the
 * NETWORK path still wins on the same module the offline sections just exercised. A probe
 * that only ever runs the fallback cannot tell a working fallback from a hardcoded one. */
const STUB = `
export let offline = true;
export function setOffline(v) { offline = v; }
const answer = (data) => offline
  ? { data: null, error: { message: "TypeError: Failed to fetch", code: "" } }
  : { data, error: null };
export const supabase = {
  _rows: [],
  from() { return this; },
  select() { return this; },
  eq(_c, v) { this._one = v; return this; },
  in(_c, vs) { const rows = NETWORK.filter((a) => vs.includes(a.id)); return answer(rows); },
  async maybeSingle() { return answer(NETWORK.find((a) => a.id === this._one) || null); },
  async single() { return answer(NETWORK.find((a) => a.id === this._one) || null); },
};
export const NETWORK = [];
export const USE_DB = true;
`;

const tmp = fs.mkdtempSync(path.join(ROOT, ".probe-jump-"));
let db;
try {
  const out = path.join(tmp, "db.mjs");
  /* A GENERATED ENTRY, because a bundle re-exports only what its entry names: the stub's own
   * switches are module state inside the bundle and are unreachable from outside it
   * otherwise. Same reason check:topo-outage-copy generates one — reading a flag off the
   * bundled module gave `undefined` there and caught the guard rather than the app. */
  const entry = path.join(tmp, "entry.mjs");
  fs.writeFileSync(entry, [
    `export * from ${JSON.stringify(path.join(ROOT, "lib/db.js"))};`,
    `export { setOffline as __setOffline, NETWORK as __network } from "./supabase";`,
    `export { offlineAreaNamesByIds as __offlineAreaNamesByIds, offlineAreasByIds as __offlineAreasByIds } from ${JSON.stringify(path.join(ROOT, "lib/offline.js"))};`,
  ].join("\n"));
  await build({
    entryPoints: [entry],
    bundle: true, format: "esm", platform: "node", outfile: out,
    // react and react-query stay EXTERNAL or esbuild inlines a second copy; the bundle is
    // written INSIDE the project because node then resolves them from the nearest
    // node_modules, which a temp dir does not have. Both traps are recorded in CLAUDE.md.
    external: ["react", "react-dom", "@tanstack/react-query"],
    define: { "import.meta.env": "{}" },
    plugins: [{
      name: "stub-supabase",
      setup(b) {
        b.onResolve({ filter: /^\.\/supabase$/ }, () => ({ path: "stub:supabase", namespace: "stub" }));
        b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: STUB, loader: "js" }));
      },
    }],
  });
  db = await import(out);
} catch (e) {
  console.error("FAIL: could not bundle lib/db.js — nothing was checked. " + (e.stack || e.message));
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(1);
}

/* ── the fixture ─────────────────────────────────────────────────────────────────────────
 * Stored exactly as downloadStateOffline stores it: raw PostgREST shape plus `_state`. The
 * root country `usa` is deliberately ABSENT — that is the real shape of a downloaded state,
 * and asserting against a fixture that included it would prove nothing about section 2. */
function seed(rows) {
  return new Promise((res, rej) => {
    const rq = indexedDB.open("climbmatch-offline", 2);
    rq.onupgradeneeded = () => {
      const d = rq.result;
      const a = d.createObjectStore("areas", { keyPath: "id" });
      a.createIndex("parent_id", "parent_id"); a.createIndex("_state", "_state");
      const r = d.createObjectStore("routes", { keyPath: "id" });
      r.createIndex("area_id", "area_id"); r.createIndex("_state", "_state");
      d.createObjectStore("meta", { keyPath: "key" });
      d.createObjectStore("pack", { keyPath: "id" });
    };
    rq.onsuccess = () => {
      const d = rq.result;
      for (const [store, list] of Object.entries(rows)) {
        const t = d.transaction(store, "readwrite");
        list.forEach((row) => t.objectStore(store).put(row));
      }
      setTimeout(res, 5);
    };
    rq.onerror = () => rej(rq.error);
  });
}

const A = (id, name, parent_id, pathStr, area_type, state) =>
  ({ id, name, parent_id, path: pathStr, area_type, route_count: 1, _state: state });

await seed({
  areas: [
    A("wa", "Washington", "usa", "usa.wa", "state", "wa"),
    A("wa_cascades", "North Cascades", "wa", "usa.wa.wa_cascades", "region", "wa"),
    A("wa_index", "Index", "wa_cascades", "usa.wa.wa_cascades.wa_index", "crag", "wa"),
    A("wa_index_lower", "Lower Town Wall", "wa_index", "usa.wa.wa_cascades.wa_index.wa_index_lower", "wall", "wa"),
    A("or", "Oregon", "usa", "usa.or", "state", "or"),
    A("or_smith", "Smith Rock", "or", "usa.or.or_smith", "crag", "or"),
  ],
  meta: [
    { key: "state:wa", name: "Washington", complete: true, areaCount: 4, routeCount: 1 },
    // Oregon is HALF-DOWNLOADED. Its rows are present and must never be served.
    { key: "state:or", name: "Oregon", complete: false, areaCount: 2, routeCount: 1 },
  ],
});

/* ── 1. the row a search hit is missing ──────────────────────────────────────────────────── */
console.log("1. `fetchArea` HYDRATES THE HIT FROM THE DEVICE:");
/* CAUGHT rather than awaited bare: with no fallback this REJECTS, and an uncaught rejection
 * kills the run at the first assertion — which reads as a broken probe rather than as the
 * defect it is. The injection suite reported exactly that, with no FAIL line to match on. */
let full = await db.fetchArea("wa_index_lower").catch(() => null);
if (full && full.id === "wa_index_lower") ok("an area on the device resolves with no signal");
else no("fetchArea returned " + JSON.stringify(full) + " — the hit cannot be hydrated");
if (full && full.path) ok("...carrying its ltree `path`, which the search projection does not have");
else no("...without a `path`, so the breadcrumb below has nothing to walk");
/* An area with nothing stored must still REJECT, which is exactly what it did before this
 * change — jumpToArea's own `.catch(() => null)` turns that into the null it already handled.
 * Resolving null instead would be a quieter kind of wrong: it reports a definite "no such
 * area" for what is really a failed read. */
if (await rejects(() => db.fetchArea("ca_yosemite")))
  ok("an area that was never downloaded still REJECTS, so the caller's catch decides");
else no("an undownloaded area resolved — a failed read now reads as “no such area”");
if (await rejects(() => db.fetchArea("or_smith")))
  ok("...and so does one inside a HALF-downloaded state");
else no("a half-downloaded state was served — a truncated catalog reads as the whole one");

/* ── 2. the breadcrumb, and the country that is deliberately absent ──────────────────────── */
console.log("\n2. `fetchAreaBreadcrumb` WALKS THE PATH, AND THE MISSING COUNTRY DOES NOT MATTER:");
let crumbs = await db.fetchAreaBreadcrumb(full).catch(() => []);
if (names(crumbs) === "wa > wa_cascades > wa_index")
  ok("the ancestors come back root-first and in path order (" + names(crumbs) + ")");
else no("the breadcrumb is wrong: " + names(crumbs));
/* THE COUNTRY IS GENUINELY ABSENT FROM THE STORE, which is what makes the assertion above
 * mean something. Testing instead that `usa` is not among the crumbs would be VACUOUS — the
 * lookup ends in `.filter(Boolean)`, so an unstored id drops out whether or not the slice
 * that removes it is still there, and that assertion would pass against a breadcrumb which
 * had stopped dropping the country. Assert the fixture models a real download instead. */
/* The batch reader carries its OWN completeness gate, and nothing above reaches it — section
 * 1's half-downloaded case goes through `offlineArea`, a different function. Without this the
 * gate could be deleted here and every assertion would still pass. */
if (!(await db.__offlineAreasByIds(["or_smith"])).length)
  ok("...an id inside a HALF-downloaded state resolves nothing through the batch reader either");
else no("a half-downloaded state was served by offlineAreasByIds");
if (!(await db.__offlineAreasByIds(["usa"])).length)
  ok("...and the root country really is NOT on the device, so the full breadcrumb above was\n" +
     "       built without it rather than in spite of it");
else no("the fixture stores the country, so this section proves nothing about a real download");
if (crumbs.some((c) => c.area_type === "state"))
  ok("...and it contains the STATE, which is the test jumpToArea bails on");
else no("no state in the breadcrumb — jumpToArea returns after switching screens");

/* ── 3. the sequence, which is the defect ───────────────────────────────────────────────── */
console.log("\n3. THE WHOLE TAP, RUN THE WAY jumpToArea RUNS IT:");
// Exactly what offlineAreaSearch returns: no `path`, no `area_type` beyond the projection.
const hit = { id: "wa_index_lower", name: "Lower Town Wall", area_type: "wall", route_count: 1, parent_id: "wa_index", parent_name: "Index", total: 1 };
let node = hit, stack = [], state = null;
if (!hit.path) {
  const row = await db.fetchArea(hit.id).catch(() => null);
  if (row) node = row;
}
const anc = await db.fetchAreaBreadcrumb(node).catch(() => []);
state = anc.find((x) => x.area_type === "state") || null;
if (state) stack = [...anc.filter((x) => x.area_type !== "state"), node];
if (state && state.id === "wa")
  ok("a hit with no `path` still resolves its state, so the handler does not bail");
else no("the handler bailed after switching screens — the dead tap is still there");
if (names(stack) === "wa_cascades > wa_index > wa_index_lower")
  ok("...and the stack it builds is the real ancestry (" + names(stack) + ")");
else no("the stack is wrong: " + names(stack));

/* ── 4. the network still wins ───────────────────────────────────────────────────────────
 * A fallback that is consulted unconditionally would pass every assertion above while
 * serving a stale local row to somebody who has a signal. */
console.log("\n4. WITH A SIGNAL, THE NETWORK ANSWER IS THE ONE USED:");
db.__setOffline(false);
db.__network.push({ id: "wa_index_lower", name: "RENAMED ONLINE", parent_id: "wa_index", path: "usa.wa.wa_cascades.wa_index.wa_index_lower", area_type: "wall" });
const online = await db.fetchArea("wa_index_lower");
if (online && online.name === "RENAMED ONLINE")
  ok("fetchArea prefers the network row over the stored one");
else no("the offline row was served while the network was up: " + JSON.stringify(online));
db.__setOffline(true);

/* ── 5. the names map ───────────────────────────────────────────────────────────────────── */
console.log("\n5. AREA NAMES RESOLVE, AND A COMPLETE MISS SAYS SO:");
const some = await db.__offlineAreaNamesByIds(["wa_index", "ca_yosemite"]);
if (some && some.wa_index === "Index" && !("ca_yosemite" in some))
  ok("a PARTIAL map is a real answer and is kept");
else no("the partial map is wrong: " + JSON.stringify(some));
if ((await db.__offlineAreaNamesByIds(["ca_yosemite"])) === undefined)
  ok("...and resolving nothing returns undefined, so orOfflineExact rethrows rather than\n" +
     "       serving an empty map that reads as “looked up, no names”");
else no("a complete miss returned a map, which would swallow the read failure");

fs.rmSync(tmp, { recursive: true, force: true });
const EXPECTED = 13;
if (ran < EXPECTED) {
  console.error("\nFAIL: only " + ran + " assertion(s) ran, expected " + EXPECTED + " — the probe stopped asking.");
  process.exit(1);
}
console.log("\n" + (bad ? bad + " failure(s)"
  : "ok — " + ran + " assertions: an area-search hit opens with no signal, breadcrumb and all"));
process.exit(bad ? 1 : 0);
