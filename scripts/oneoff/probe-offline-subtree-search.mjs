#!/usr/bin/env node
/* CAN YOU SEARCH A DOWNLOADED STATE WITH NO SIGNAL — and does the offline search ADMIT THE SAME
 * ROWS the database would?
 *
 * The browse chain has worked offline since the state download shipped. Search did not: "View all
 * N", the in-area route finder and the area filter box all go through RPCs, so with no signal you
 * could drill down and never look anything up. offlineSubtreeRoutes / offlineSubtreeRouteCount /
 * offlineAreaSearch close that, and they are a SECOND IMPLEMENTATION of routes_in_subtree,
 * routes_in_subtree_count and areas_in_subtree — an offline reader cannot call a stored procedure.
 *
 * SO THE RISK IS NOT "does it return something", IT IS "does it return the SAME something". A
 * catalog that changes which routes it admits when the signal drops is worse than one that says it
 * cannot search: the first is wrong quietly. Every assertion below is aimed at a place where a
 * naive JS transcription of that SQL diverges, and they are not hypothetical — each is a line the
 * migrations had to be explicit about:
 *
 *   * `null >= 5` is NULL in SQL (row excluded) and `0 >= 5` in JS (false — same answer). But
 *     `null <= 10` is NULL in SQL (excluded) and `0 <= 10` in JS is TRUE. So an ungraded route
 *     floods every "and under" search unless null is tested for explicitly. Section 3.
 *   * `pitches` 0 means "unknown" for a roped route and "no pitches" for a boulder problem —
 *     migration 0074, which exists because reading them the same way hid 86% of the catalog.
 *   * `desc nulls last` is not Postgres's default for desc. Get it wrong and every unrated route
 *     leads a "best first" list. Section 4.
 *   * `path <@ root.path` is a LABEL boundary, not a string prefix: `wa_index` must not swallow
 *     `wa_index_town_wall`. Section 1.
 *
 * And the distinction orOfflineExact rests on: a filter that legitimately matches NOTHING returns
 * `[]` and `0`, while an area that was never downloaded returns `undefined`. Collapse those and
 * either an empty search reads as a failed read, or an undownloaded area serves an empty catalog
 * as though it were the whole one. Section 5.
 *
 * No browser, no credentials, no project. The shim is scripts/lib/idb-shim.mjs, shared with
 * probe-offline-pack-roundtrip.
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
const names = (rows) => (rows || []).map((r) => r.name).join(", ");

installIdbShim();

/* platform node (neutral cannot resolve Supabase's subpackages) and import.meta.env defined
 * because lib/supabase.js reads it at module scope — both traps are recorded in CLAUDE.md.
 * Nothing here calls the network, so the stub only has to exist. */
const STUB = `export const supabase = null; export const USE_DB = true;`;
const tmp = fs.mkdtempSync(path.join(ROOT, ".probe-subtree-"));
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

/* ── the fixture ─────────────────────────────────────────────────────────────────────────────
 * Rows are stored exactly as downloadStateOffline stores them: raw PostgREST shape plus `_state`.
 * `wa_index_town_wall` is a SIBLING of `wa_index`, not a child, and it exists purely so a bare
 * string-prefix subtree test would wrongly swallow it. */
function seed(rows) {
  return new Promise((res, rej) => {
    const rq = indexedDB.open("climbmatch-offline", 2);
    rq.onupgradeneeded = () => {
      const db = rq.result;
      const a = db.createObjectStore("areas", { keyPath: "id" });
      a.createIndex("parent_id", "parent_id"); a.createIndex("_state", "_state");
      const r = db.createObjectStore("routes", { keyPath: "id" });
      r.createIndex("area_id", "area_id"); r.createIndex("_state", "_state");
      db.createObjectStore("meta", { keyPath: "key" });
      db.createObjectStore("pack", { keyPath: "id" });
    };
    rq.onsuccess = () => {
      const db = rq.result;
      for (const [store, list] of Object.entries(rows)) {
        const t = db.transaction(store, "readwrite");
        list.forEach((row) => t.objectStore(store).put(row));
      }
      setTimeout(res, 5);
    };
    rq.onerror = () => rej(rq.error);
  });
}

const A = (id, name, parent_id, pathStr, area_type, route_count, state) =>
  ({ id, name, parent_id, path: pathStr, area_type, route_count, _state: state });
const R = (id, area_id, name, extra) => ({ id, area_id, name, _state: "wa", ...extra });

await seed({
  areas: [
    A("wa", "Washington", "usa", "usa.wa", "state", 5, "wa"),
    A("wa_index", "Index", "wa", "usa.wa.wa_index", "crag", 3, "wa"),
    A("wa_index_lower", "Lower Town Wall", "wa_index", "usa.wa.wa_index.wa_index_lower", "wall", 1, "wa"),
    A("wa_index_town_wall", "Index Town Wall", "wa", "usa.wa.wa_index_town_wall", "crag", 1, "wa"),
    A("wa_baker", "Mount Baker", "wa", "usa.wa.wa_baker", "peak", 1, "wa"),
    A("or", "Oregon", "usa", "usa.or", "state", 1, "or"),
    A("or_smith", "Smith Rock", "or", "usa.or.or_smith", "crag", 1, "or"),
  ],
  routes: [
    // Ungraded, unrated, no length, roped with pitches 0 — the row every null test is about.
    R("wa_aries", "wa_index", "Aries", { discipline: "trad", grade_num: null, stars: null, pitches: 0, length_m: null }),
    R("wa_boulder", "wa_index", "Boulder Problem", { discipline: "bouldering", grade_num: 4, stars: null, pitches: 0, length_m: null }),
    R("wa_godzilla", "wa_index_lower", "Godzilla", { discipline: "trad", grade_num: 9, stars: 3, pitches: 3, length_m: 60 }),
    R("wa_outsider", "wa_index_town_wall", "Outsider", { discipline: "trad", grade_num: 11, stars: 4, pitches: 5, length_m: 90 }),
    R("wa_bakerroute", "wa_baker", "North Ridge", { discipline: "alpine", grade_num: 6, stars: 4, pitches: 8, length_m: 300 }),
    { id: "or_r1", area_id: "or_smith", name: "Chain Reaction", _state: "or", discipline: "sport", grade_num: 12 },
  ],
  meta: [
    { key: "state:wa", name: "Washington", complete: true, areaCount: 5, routeCount: 5 },
    // Oregon is HALF-DOWNLOADED. Its rows are present and must never be served.
    { key: "state:or", name: "Oregon", complete: false, areaCount: 2, routeCount: 1 },
  ],
});

/* ── 1. the subtree is an ltree subtree, not a string prefix ─────────────────────────────────── */
console.log("1. THE SUBTREE IS RESOLVED THE WAY `path <@ root.path` READS:");
let rows = await mod.offlineSubtreeRoutes("wa_index", {});
if (names(rows) === "Aries, Boulder Problem, Godzilla")
  ok("an area's whole subtree is searched, children included (" + names(rows) + ")");
else no("the subtree is wrong: " + names(rows));
if (!(rows || []).some((r) => r.id === "wa_outsider"))
  ok("...and `wa_index` does NOT swallow the sibling `wa_index_town_wall` — a label boundary, not a prefix");
else no("a bare string prefix pulled in a SIBLING area's routes — every id-prefixed neighbour leaks in");
rows = await mod.offlineSubtreeRoutes("wa", {});
if ((rows || []).length === 5) ok("...and the state root reaches every route under it (" + rows.length + ")");
else no("the state root did not reach its whole catalog: " + names(rows));
if (rows && rows[0] && !("areas" in rows[0]))
  ok("...returning BARE rows with no `areas` embed, the shape routes_in_subtree returns");
else no("offline rows carry an `areas` embed the RPC does not — an offline hit is a different shape from a network one");

/* ── 2. nothing from a state that is not fully downloaded ────────────────────────────────────── */
console.log("\n2. A HALF-DOWNLOADED STATE IS NOT SEARCHED, AND AN UNDOWNLOADED ONE SAYS SO:");
if ((await mod.offlineSubtreeRoutes("or_smith", {})) === undefined)
  ok("a root inside an INCOMPLETE state returns undefined, so the caller shows the network error");
else no("a half-downloaded state was searched — a truncated catalog reads as the whole one");
if ((await mod.offlineSubtreeRoutes("ca_yosemite", {})) === undefined)
  ok("...and so does an area that was never downloaded at all");
else no("an undownloaded area returned a result");
if ((await mod.offlineSubtreeRouteCount("or_smith", {})) === undefined)
  ok("...and the COUNT refuses it too, rather than answering 0");
else no("the count answered for a half-downloaded state — 0 would read as 'no routes here'");

/* ── 3. the filters admit exactly what the SQL admits ────────────────────────────────────────── */
console.log("\n3. THE FILTERS MIRROR THE SQL, INCLUDING ITS NULL SEMANTICS:");
rows = await mod.offlineSubtreeRoutes("wa_index", { maxGrade: 10 });
if (names(rows) === "Boulder Problem, Godzilla")
  ok("an UNGRADED route fails a maximum-grade filter — `null <= 10` is NULL in SQL, and TRUE in naive JS");
else no("maxGrade admitted the wrong rows: " + names(rows));
rows = await mod.offlineSubtreeRoutes("wa_index", { minGrade: 5 });
if (names(rows) === "Godzilla") ok("...and a minimum-grade filter excludes it as well");
else no("minGrade admitted the wrong rows: " + names(rows));
rows = await mod.offlineSubtreeRoutes("wa_index", { minStars: 1 });
if (names(rows) === "Godzilla") ok("an unrated route counts as 0 stars, never as unknown-and-therefore-fine");
else no("minStars admitted the wrong rows: " + names(rows));
rows = await mod.offlineSubtreeRoutes("wa_index", { minPitches: 1 });
if (names(rows) === "Aries, Godzilla")
  ok("`pitches: 0` on a ROPED route reads as unknown and passes “1+” (migration 0074)");
else no("the roped-route pitch normalisation is wrong: " + names(rows));
if (!(rows || []).some((r) => r.id === "wa_boulder"))
  ok("...while `pitches: 0` on a BOULDER PROBLEM still means no pitches, and stays out");
else no("a boulder problem passed a pitch filter — 0074's whole distinction is lost");
rows = await mod.offlineSubtreeRoutes("wa_index", { minLengthM: 10 });
if (names(rows) === "Godzilla") ok("a route with no recorded length fails a length filter, both ends");
else no("minLengthM admitted the wrong rows: " + names(rows));
rows = await mod.offlineSubtreeRoutes("wa_index", { q: "GOD" });
if (names(rows) === "Godzilla") ok("the name filter is case-insensitive, like ILIKE");
else no("the name filter is wrong: " + names(rows));
rows = await mod.offlineSubtreeRoutes("wa_index", { disc: "trad" });
if (names(rows) === "Aries, Godzilla") ok("the discipline filter is exact");
else no("the discipline filter is wrong: " + names(rows));

/* ── 4. ordering, including nulls-last on a DESCENDING sort ──────────────────────────────────── */
console.log("\n4. THE ORDERING MATCHES, AND NULLS STAY LAST IN BOTH DIRECTIONS:");
rows = await mod.offlineSubtreeRoutes("wa_index", { sortBy: "stars_desc" });
if (names(rows) === "Godzilla, Aries, Boulder Problem")
  ok("`stars_desc` puts unrated routes LAST — Postgres's own default for desc is nulls FIRST");
else no("stars_desc ordering is wrong: " + names(rows));
rows = await mod.offlineSubtreeRoutes("wa_index", { sortBy: "grade_asc" });
if (names(rows) === "Boulder Problem, Godzilla, Aries")
  ok("`grade_asc` sorts by grade and puts the ungraded route last");
else no("grade_asc ordering is wrong: " + names(rows));
rows = await mod.offlineSubtreeRoutes("wa_index", { sortBy: "name_desc" });
if (names(rows) === "Godzilla, Boulder Problem, Aries") ok("`name_desc` reverses the name order");
else no("name_desc ordering is wrong: " + names(rows));
rows = await mod.offlineSubtreeRoutes("wa_index", { pageSize: 2, page: 1 });
if (names(rows) === "Godzilla") ok("paging takes a slice rather than the whole list");
else no("paging is wrong: " + names(rows));

/* ── 5. empty is an ANSWER; undownloaded is an ABSENCE ───────────────────────────────────────── */
console.log("\n5. A FILTER THAT MATCHES NOTHING IS AN ANSWER, NOT A FAILED READ:");
rows = await mod.offlineSubtreeRoutes("wa_index", { q: "no such climb" });
if (Array.isArray(rows) && rows.length === 0)
  ok("a search with no matches returns [] — the caller shows “no routes match”, not an error");
else no("a search with no matches returned " + JSON.stringify(rows) + " instead of []");
const zero = await mod.offlineSubtreeRouteCount("wa_index", { q: "no such climb" });
if (zero === 0) ok("...and the count returns 0, which orOfflineExact must not read as absence");
else no("the count returned " + JSON.stringify(zero) + " instead of 0");
const total = await mod.offlineSubtreeRouteCount("wa_index", { minPitches: 1 });
const listed = await mod.offlineSubtreeRoutes("wa_index", { minPitches: 1, pageSize: 100 });
if (total === listed.length) ok("the count and the list agree about the same filter (" + total + ")");
else no("the count says " + total + " and the list holds " + listed.length + " — one screen, two answers");

/* ── 6. the area filter box ──────────────────────────────────────────────────────────────────── */
console.log("\n6. THE AREA SEARCH RANKS, COUNTS AND EXCLUDES THE ROOT:");
let hits = await mod.offlineAreaSearch("wa", "index", 40);
if (names(hits) === "Index, Index Town Wall") ok("an exact name outranks a prefix match (" + names(hits) + ")");
else no("area ranking is wrong: " + names(hits));
if (hits[0] && hits[0].total === 2) ok("...and every row carries `total`, the count BEFORE the limit");
else no("`total` is missing or wrong: " + JSON.stringify(hits[0]));
hits = await mod.offlineAreaSearch("wa", "index", 1);
if (hits.length === 1 && hits[0].total === 2)
  ok("...so a truncated search can say it truncated, instead of reading as the whole answer");
else no("a limited search lost its total: " + JSON.stringify(hits));
hits = await mod.offlineAreaSearch("wa", "baker", 40);
if (names(hits) === "Mount Baker")
  ok("“baker” reaches “Mount Baker” — the honorific is dropped, as it is in migration 0147");
else no("the honorific rule is missing: " + names(hits));
hits = await mod.offlineAreaSearch("wa", "washington", 40);
if (Array.isArray(hits) && hits.length === 0) ok("the root itself is never a hit in its own subtree");
else no("the root matched its own search: " + names(hits));
hits = await mod.offlineAreaSearch("wa_index", "lower", 40);
if (hits.length === 1 && hits[0].parent_name === "Index")
  ok("...and a hit carries its parent's NAME, so the row reads “Lower Town Wall · Index”");
else no("parent_name is missing: " + JSON.stringify(hits));
if ((await mod.offlineAreaSearch("or", "smith", 40)) === undefined)
  ok("an area search inside an INCOMPLETE state returns undefined like the route search");
else no("the area search served a half-downloaded state");

fs.rmSync(tmp, { recursive: true, force: true });
const EXPECTED = 29;
if (ran < EXPECTED) {
  console.error("\nFAIL: only " + ran + " assertion(s) ran, expected " + EXPECTED + " — the probe stopped asking.");
  process.exit(1);
}
console.log("\n" + (bad ? bad + " failure(s)"
  : "ok — " + ran + " assertions: a downloaded state is searchable with no signal, and the offline"
    + "\nfilters admit the same rows the RPCs do"));
process.exit(bad ? 1 : 0);
