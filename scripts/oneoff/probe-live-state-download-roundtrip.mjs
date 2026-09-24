#!/usr/bin/env node
/* Does "Download" on Manage areas actually put a whole state on the device — against the LIVE
 * catalog, not a fixture?
 *
 * Every other offline proof in this repo (check:offline-claims, probe-offline-pack-roundtrip,
 * probe-offline-subtree-search, probe-offline-area-jump) seeds FIXTURE rows into the IndexedDB
 * shim. They prove the readers and the wiring; none of them has ever run downloadStateOffline()
 * against the real database. So the thing a climber taps — page ~2,500 areas and ~8,000 routes
 * over the anon key, commit them, mark the state complete — had no witness at all.
 *
 * This runs the SHIPPED lib/offline.js and the SHIPPED lib/supabase.js (real client, anon key,
 * the same deadline fetch the app uses), with only IndexedDB replaced by scripts/lib/idb-shim.mjs.
 * It then reads the state back through every offline reader the app falls back to and reconciles
 * each against the live network answer for the same question.
 *
 *   node scripts/oneoff/probe-live-state-download-roundtrip.mjs [--state Washington]
 *
 * READ-ONLY on the database. Anon key only — the download must work with what a climber holds.
 */

import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { installIdbShim } from "../lib/idb-shim.mjs";
import { SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const STATE = (process.argv.find((a, i, all) => all[i - 1] === "--state")) || "Washington";

let ran = 0, bad = 0;
const ok = (m) => { ran++; console.log("  ok   " + m); };
const no = (m) => { ran++; bad++; console.log("  FAIL " + m); };
const check = (c, m) => (c ? ok(m) : no(m));

if (!SUPABASE_URL || !anonKey()) { console.error("FAIL: no VITE_SUPABASE_URL / anon key — nothing was checked."); process.exit(1); }

installIdbShim();
// createClient builds a RealtimeClient at construction; node 20 has no WebSocket (CLAUDE.md trap).
if (typeof globalThis.WebSocket === "undefined") globalThis.WebSocket = class { constructor() {} close() {} };

const tmp = fs.mkdtempSync(path.join(ROOT, ".probe-live-dl-"));
process.on("exit", () => fs.rmSync(tmp, { recursive: true, force: true }));
let mod;
try {
  const out = path.join(tmp, "offline.mjs");
  await build({
    entryPoints: [path.join(ROOT, "lib/offline.js")],
    bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent",
    define: {
      "import.meta.env": JSON.stringify({ VITE_SUPABASE_URL: SUPABASE_URL, VITE_SUPABASE_ANON_KEY: anonKey(), VITE_USE_DB: "true" }),
    },
  });
  mod = await import(out);
} catch (e) {
  console.error("FAIL: could not bundle lib/offline.js — nothing was checked. " + (e.stack || e.message));
  process.exit(1);
}

const H = { apikey: anonKey(), Authorization: "Bearer " + anonKey() };
async function rest(q, extra) {
  for (let a = 0; a < 5; a++) {
    const r = await fetch(SUPABASE_URL + "/rest/v1/" + q, { headers: { ...H, ...(extra || {}) } });
    if (r.ok) return r;
    await new Promise((res) => setTimeout(res, 1000 * 2 ** a));
  }
  throw new Error("live read failed: " + q);
}

console.log(`\n1. download ${STATE} with the shipped downloadStateOffline()`);
const t0 = Date.now();
let res;
try {
  res = await mod.downloadStateOffline(STATE, () => {});
} catch (e) {
  no("the download threw: " + (e.message || e));
  console.log(`\n${bad} FAIL of ${ran}`); process.exit(1);
}
ok(`downloaded ${res.areaCount} areas and ${res.routeCount} routes in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

const [st] = await (await rest(`areas?select=id,path,route_count&area_type=eq.state&name=eq.${encodeURIComponent(STATE)}`)).json();
check(st && st.id, `the live catalog has a state row for ${STATE} (${st && st.id})`);

// Live subtree sizes, counted independently of the code under test.
const areaCountLive = +((await rest(`areas?select=id&path=cd.${st.path}`, { Prefer: "count=exact", Range: "0-0" })).headers.get("content-range") || "/0").split("/")[1];
check(res.areaCount === areaCountLive, `every area in the live subtree was stored (${res.areaCount} vs live ${areaCountLive})`);
check(res.routeCount === st.route_count, `every route was stored (${res.routeCount} vs areas.route_count ${st.route_count})`);
check(res.routeCount > 1000, "the download is not vacuous — thousands of routes");

console.log("\n2. the device now says the state is complete — the list Home's Pinned states reads");
const dls = await mod.offlineDownloads();
check(dls.some((d) => d.name === STATE && d.complete), `offlineDownloads() lists ${STATE} as complete`);

console.log("\n3. each offline reader answers what the network answers");
const states = await mod.offlineStates();
check(states.some((s) => s.id === st.id), "offlineStates() returns the state (Climbs-tab root, no signal)");

const kidsOff = await mod.offlineAreaChildren(st.id);
const kidsLive = await (await rest(`areas?select=id&parent_id=eq.${st.id}`)).json();
check(kidsOff.length === kidsLive.length && kidsOff.length > 0, `offlineAreaChildren(state) — ${kidsOff.length} vs live ${kidsLive.length}`);

// A leaf area with routes, picked from live data rather than hardcoded.
const leafs = await (await rest(`routes?select=area_id,areas!inner(path)&areas.path=cd.${st.path}&limit=400`)).json();
const byArea = {}; leafs.forEach((r) => { byArea[r.area_id] = (byArea[r.area_id] || 0) + 1; });
const leaf = Object.keys(byArea).sort((a, b) => byArea[b] - byArea[a])[0];
const leafLive = await (await rest(`routes?select=id&area_id=eq.${encodeURIComponent(leaf)}`)).json();
const leafOff = await mod.offlineAreaRoutes(leaf);
check(leafOff.length === leafLive.length && leafOff.length > 0, `offlineAreaRoutes(${leaf}) — ${leafOff.length} vs live ${leafLive.length}`);
check(leafOff.every((r) => r.areas && r.areas.name && r.areas.name !== "undefined"), "every offline route carries its area embed (no 'undefined' where the peak name goes)");

const cnt = await mod.offlineSubtreeRouteCount(st.id, {});
check(cnt === res.routeCount, `offlineSubtreeRouteCount(state) — "View all N" reads ${cnt}`);

const someArea = kidsLive[0] && (await (await rest(`areas?select=id,name&parent_id=eq.${st.id}&order=route_count.desc&limit=1`)).json())[0];
const hits = someArea ? await mod.offlineAreaSearch(st.id, someArea.name.split(/\s+/)[0], 20) : [];
check(Array.isArray(hits) && hits.some((h) => h.id === someArea.id), `offlineAreaSearch finds "${someArea && someArea.name}" by name`);

const oneRoute = leafLive[0].id;
const byId = await mod.offlineRoutesByIds([oneRoute]);
check(byId && byId.length === 1 && byId[0].id === oneRoute, `offlineRoutesByIds resolves ${oneRoute} without it being packed`);

console.log("\n4. Remove really reclaims it");
await mod.removeStateOffline(STATE);
check(!(await mod.offlineDownloads()).some((d) => d.name === STATE), "offlineDownloads() no longer lists it");
check((await mod.offlineAreaRoutes(leaf)).length === 0, "and its routes no longer resolve");

console.log(`\n${bad ? "FAIL" : "ok"} — ${ran - bad} of ${ran} assertions against the live ${STATE} catalog`);
process.exitCode = bad ? 1 : 0;
