#!/usr/bin/env node
/* Does the trip pack actually round-trip through IndexedDB, and does the v1 -> v2 upgrade keep an
 * ALREADY-DOWNLOADED catalog?
 *
 * The second question is the one that needed a test. `lib/offline.js` went DB_VER 1 -> 2 to add the
 * `pack` store, and installs in the wild hold v1 with areas/routes/meta. A bare createObjectStore
 * for the v1 set on the upgrade path throws ConstraintError, which aborts the version-change
 * transaction and FAILS THE OPEN — so the one moment this database is load-bearing (somebody at a
 * trailhead with no signal) is the moment a botched upgrade would take their catalog away. Nothing
 * else in the repo could catch it: every offline guard here is static, and the browser guards walk
 * a healthy network against a database they never downloaded to.
 *
 * NO NEW DEPENDENCY. There is no fake-indexeddb in node_modules, so scripts/lib/idb-shim.mjs
 * implements exactly the surface lib/offline.js uses and nothing more. It is deliberately STRICT
 * where the real API is strict: createObjectStore on an existing name throws, which is the entire
 * point of section 1. It was written inline here and moved out once a second probe needed it —
 * re-run BOTH after touching it, since a shim defect one probe does not exercise still leaves
 * that probe green.
 *
 * THE REAL packRouteOffline IS EXERCISED, not a re-typed copy: `./supabase` is replaced at bundle
 * time by an esbuild plugin, so the fetch, the embed and the packedAt stamp are the shipped ones.
 * A probe that re-implemented the write would agree with itself whatever the app did.
 *
 * Needs no credentials and touches no project.
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

installIdbShim();

/* ── bundle lib/offline.js with a stubbed supabase ───────────────────────────────────────────
 * platform node (neutral cannot resolve Supabase's subpackages) and import.meta.env defined
 * because lib/supabase.js reads it at module scope — both traps are recorded in CLAUDE.md. */
const ROW = {
  id: "wa_r9", area_id: "wa_crag", name: "Packed Route", grade: "5.9",
  areas: { name: "A Crag", area_type: "crag", region: null, lat: 1, lng: 2 },
};
const STUB = `
export const supabase = {
  from() { return this; },
  select() { return this; },
  eq() { return this; },
  async maybeSingle() { return { data: ${JSON.stringify(ROW)}, error: null }; },
};
export const USE_DB = true;
`;
const tmp = fs.mkdtempSync(path.join(ROOT, ".probe-offline-"));
let mod;
try {
  const out = path.join(tmp, "offline.mjs");
  await build({
    entryPoints: [path.join(ROOT, "lib/offline.js")],
    bundle: true, format: "esm", platform: "node", outfile: out,
    define: { "import.meta.env": "{}" },
    plugins: [{
      name: "stub-supabase",
      setup(b) {
        b.onResolve({ filter: /^\.\/supabase$/ }, () => ({ path: "stub:supabase", namespace: "stub" }));
        b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: STUB, loader: "js" }));
      },
    }],
  });
  mod = await import(out);
} catch (e) {
  console.error("FAIL: could not bundle lib/offline.js — nothing was checked. " + (e.stack || e.message));
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(1);
}

/* Seeds rows through the shim directly. Deliberately NOT through a test-only export on
 * lib/offline.js: production code should not grow hooks that exist for a probe. */
function rawPut(store, rows) {
  return new Promise((res, rej) => {
    const rq = indexedDB.open("climbmatch-offline", 2);
    rq.onsuccess = () => {
      const t = rq.result.transaction(store, "readwrite");
      const s = t.objectStore(store);
      rows.forEach((r) => s.put(r));
      t.oncomplete = () => res();
    };
    rq.onerror = () => rej(rq.error);
  });
}

/* ── 1. a v1 install, with a downloaded catalog in it ────────────────────────────────────────
 * Built by hand at v1 exactly as the shipped v1 built it, so the upgrade is exercised against the
 * real prior shape rather than against whatever the current code happens to create. */
console.log("1. AN EXISTING v1 DOWNLOAD SURVIVES THE UPGRADE:");
await new Promise((res, rej) => {
  const rq = indexedDB.open("climbmatch-offline", 1);
  rq.onupgradeneeded = () => {
    const db = rq.result;
    const a = db.createObjectStore("areas", { keyPath: "id" });
    a.createIndex("parent_id", "parent_id"); a.createIndex("_state", "_state");
    const r = db.createObjectStore("routes", { keyPath: "id" });
    r.createIndex("area_id", "area_id"); r.createIndex("_state", "_state");
    db.createObjectStore("meta", { keyPath: "key" });
  };
  rq.onsuccess = () => {
    const db = rq.result;
    const put = (s, rows) => { const t = db.transaction(s, "readwrite"); rows.forEach((row) => t.objectStore(s).put(row)); };
    put("areas", [
      { id: "wa", parent_id: null, name: "Washington", area_type: "state", route_count: 2, _state: "wa" },
      { id: "wa_crag", parent_id: "wa", name: "A Crag", area_type: "crag", route_count: 2, _state: "wa" },
    ]);
    put("routes", [
      { id: "wa_r1", area_id: "wa_crag", name: "First", sort_order: 1, _state: "wa" },
      { id: "wa_r2", area_id: "wa_crag", name: "Second", sort_order: 2, _state: "wa" },
    ]);
    put("meta", [{ key: "state:wa", name: "Washington", complete: true, areaCount: 2, routeCount: 2 }]);
    setTimeout(res, 5);
  };
  rq.onerror = () => rej(rq.error);
});

// Everything below opens at DB_VER 2 through lib/offline.js's own openDb().
const states = await mod.offlineStates();
if (states.length === 1 && states[0].id === "wa") ok("the v1 catalog is still readable after the v2 upgrade");
else no("the v1 catalog was LOST by the upgrade — offlineStates() returned " + JSON.stringify(states.map((s) => s.id)));

const kids = await mod.offlineAreaChildren("wa");
if (kids.length === 1 && kids[0].id === "wa_crag") ok("...its area tree still walks");
else no("...its area tree is gone: " + JSON.stringify(kids.map((k) => k.id)));

const arts = await mod.offlineAreaRoutes("wa_crag");
if (arts.length === 2 && arts[0].id === "wa_r1") ok("...and its routes still list in order");
else no("...and its routes are gone or misordered: " + JSON.stringify(arts.map((r) => r.id)));

/* ── 2. the pack round-trips through the REAL write ──────────────────────────────────────────
 * A SEED route stores an id and nothing else — it ships in the bundle — while a DB route stores
 * the row. The list must carry both; only the DB one may come back as a route. */
console.log("\n2. THE PACK ROUND-TRIPS:");
await mod.packRouteOffline("lcc_schoolroom", { seed: true });
if ((await mod.packedRouteIds()).includes("lcc_schoolroom")) ok("a seed route is recorded, so the LIST survives a reload");
else no("a seed route was not recorded — the pack list is empty after a reload");
if (!(await mod.offlineRoutesByIds(["lcc_schoolroom"])).length)
  ok("...and is NOT returned as a stored row, because the bundle already has it");
else no("a seed marker row leaked into offlineRoutesByIds — it carries no route data");

await mod.packRouteOffline("wa_r9");
const back = await mod.offlineRoutesByIds(["wa_r9"]);
if (back.length === 1 && back[0].name === "Packed Route") ok("a packed DB route comes back as a full row");
else no("a packed DB route did not come back: " + JSON.stringify(back));
if (back.length === 1 && back[0].areas && back[0].areas.name === "A Crag")
  ok("...carrying its area embed, so the peak name cannot render as “undefined”");
else no("...without its area embed — dbRouteToCamel builds a truthy _dbArea with no name");
if (back.length === 1 && !("packedAt" in back[0]))
  ok("...and without the bookkeeping field, so it is the shape the network path returns");
else no("...still carrying packedAt, so a packed row differs from a fetched one");

/* ── 3. the pack is INDEPENDENT of a state download ──────────────────────────────────────────
 * The reason it is its own store: packing one climb must not require a whole catalog, and
 * removing a state must not take a packed route with it. */
console.log("\n3. THE PACK IS INDEPENDENT OF ANY STATE DOWNLOAD:");
await mod.removeStateOffline("Washington");
if (!(await mod.offlineStates()).length) ok("removing the state clears its catalog");
else no("removing the state left its areas behind");
if ((await mod.offlineRoutesByIds(["wa_r9"])).length === 1) ok("...and the packed route survives it");
else no("...but the packed route went with it — packing one climb would depend on keeping a state");
await mod.unpackRouteOffline("wa_r9");
if (!(await mod.offlineRoutesByIds(["wa_r9"])).length) ok("...and unpacking really reclaims it");
else no("...and unpacking left the row on the device");

/* ── 4. the completeness gate holds for the by-ids reader ────────────────────────────────────
 * The reason the download marks INCOMPLETE up front: a truncated catalog served to somebody with
 * no signal is one they have no way to cross-check. */
console.log("\n4. THE COMPLETENESS GATE HOLDS FOR THE by-ids READER:");
await rawPut("areas", [{ id: "wa_crag", parent_id: "wa", name: "A Crag", area_type: "crag", _state: "wa" }]);
await rawPut("routes", [{ id: "wa_r1", area_id: "wa_crag", name: "First", _state: "wa" }]);
await rawPut("meta", [{ key: "state:wa", name: "Washington", complete: true }]);
if ((await mod.offlineRoutesByIds(["wa_r1"])).length === 1) ok("a route inside a COMPLETE state resolves by id without being packed");
else no("a route inside a complete state did not resolve by id");
await rawPut("meta", [{ key: "state:wa", name: "Washington", complete: false }]);
if (!(await mod.offlineRoutesByIds(["wa_r1"])).length) ok("...and stops resolving the moment that state is marked INCOMPLETE");
else no("a half-downloaded state still served rows by id — a truncated catalog reads as whole");

fs.rmSync(tmp, { recursive: true, force: true });
const EXPECTED = 13;
if (ran < EXPECTED) { console.error("\nFAIL: only " + ran + " assertion(s) ran, expected " + EXPECTED + " — the probe stopped asking."); process.exit(1); }
console.log("\n" + (bad ? bad + " failure(s)"
  : "ok — " + ran + " assertions: the v1 catalog survives the upgrade, and the pack writes, reads and outlives a state removal"));
process.exit(bad ? 1 : 0);
