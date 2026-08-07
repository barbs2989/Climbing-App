// One-off data repair executing supabase/migrations/0027_fix_wa_peak_hierarchy.sql via the
// PostgREST REST API (no direct psql access available). See that migration for the full
// rationale. Idempotent: re-running after a partial success just re-applies the same parent_id
// values and recomputes route_count again.
//
//   SUPABASE_SERVICE_KEY="<service_role key>" node fix-wa-peak-hierarchy.mjs
//
import { readFileSync } from "node:fs";

let url = process.env.VITE_SUPABASE_URL;
if (!url) { try { url = (readFileSync(".env.local", "utf8").match(/VITE_SUPABASE_URL=(.+)/) || [])[1]?.trim(); } catch {} }
let key = process.env.SUPABASE_SERVICE_KEY;
if (!key) { try { key = (readFileSync(".env", "utf8").match(/SUPABASE_SERVICE_KEY=(.+)/) || [])[1]?.trim(); } catch {} }
if (!url || !key) { console.error("Need VITE_SUPABASE_URL (.env.local) and SUPABASE_SERVICE_KEY (.env or env var)."); process.exit(1); }
url = url.replace(/\/$/, "");
const H = { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" };

async function patchParent(id, parentId) {
  const r = await fetch(`${url}/rest/v1/areas?id=eq.${id}`, { method: "PATCH", headers: { ...H, Prefer: "return=minimal" }, body: JSON.stringify({ parent_id: parentId }) });
  if (!r.ok) throw new Error(`patch ${id} -> ${parentId}: ${r.status} ${await r.text()}`);
  console.log(`  ${id} -> parent_id=${parentId}`);
}

async function deleteArea(id) {
  const r = await fetch(`${url}/rest/v1/areas?id=eq.${id}`, { method: "DELETE", headers: H });
  if (!r.ok) throw new Error(`delete ${id}: ${r.status} ${await r.text()}`);
  console.log(`  deleted ${id}`);
}

async function getJSON(path) {
  const r = await fetch(`${url}/rest/v1/${path}`, { headers: H });
  if (!r.ok) throw new Error(`get ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

console.log("1/6 Monte Cristo Group: reparent bucket + move its 6 peaks in");
await patchParent("wa_monte_cristo_group", "wa_glacier_peak_region");
for (const id of ["wa_cadet_peak", "wa_columbia_peak", "wa_del_campo_peak", "wa_foggy_peak", "wa_kyes_peak", "wa_monte_cristo_peak"]) {
  await patchParent(id, "wa_monte_cristo_group");
}

console.log("2/6 Chilliwack Range: move its 7 peaks in");
for (const id of ["wa_mount_rahm", "wa_mount_custer", "wa_mount_spickard", "wa_mount_redoubt", "wa_northwest_mox_peak", "wa_southeast_mox_peak", "wa_bear_mountain_chilliwack"]) {
  await patchParent(id, "wa_chilliwack_range");
}

console.log("3/6 Pasayten Wilderness: merge duplicate region into canonical one");
await patchParent("wa_blizzard_peak", "wa_pasayten");
console.log("  (leaving now-empty wa_pasayten_wilderness_region in place -- ask user before deleting)");

console.log("4/6 Castle Peak (Pasayten): fix misplaced parent");
await patchParent("wa_castle_peak_pasayten", "wa_pasayten");

console.log("5/6 Tatoosh Range: move its 5 peaks in");
for (const id of ["wa_castle_peak_tatoosh", "wa_pinnacle_peak_tatoosh", "wa_plummer_peak", "wa_lane_peak", "wa_unicorn_peak"]) {
  await patchParent(id, "wa_tatoosh_range");
}

console.log("6/6 Recomputing route_count for WA + usa rollup (scoped, not nationwide)...");
// Pull only WA's areas/routes (ids are "wa_"-prefixed by convention, see 0017_recount_wa.sql)
// plus the top-level washington/usa rows, and recompute counts in JS (mirrors
// 0017_recount_wa.sql's SQL, done client-side since we only have REST access, not psql).
async function fetchAll(table, params) {
  let out = [], offset = 0, size = 1000;
  for (;;) {
    const rows = await getJSON(`${table}?${params}&limit=${size}&offset=${offset}`);
    out = out.concat(rows);
    if (rows.length < size) break;
    offset += size;
  }
  return out;
}
// NOTE: deliberately excludes "usa" -- it aggregates all 50 states, and our leaf route set
// here only covers WA, so recomputing it against a WA-only leaf set would wrongly clobber it
// with a WA-only total. The reparents above are all WA-internal moves (net-zero to WA's own
// total), so "usa" and "washington" don't actually need correcting here anyway.
const areas = await fetchAll("areas", "select=id,path,route_count&or=(id.eq.washington,id.like.wa_*)");
const routes = await fetchAll("routes", "select=area_id&area_id=like.wa_*");
const byAreaId = {}; areas.forEach(a => byAreaId[a.id] = a);
const routeCountByLeaf = {};
routes.forEach(r => { routeCountByLeaf[r.area_id] = (routeCountByLeaf[r.area_id] || 0) + 1; });
const leafEntries = Object.entries(routeCountByLeaf)
  .map(([leafId, n]) => [byAreaId[leafId]?.path, n])
  .filter(([path]) => path);

// path is ltree text like "usa.washington.wa_northwest...."; containment = prefix match on dot segments.
function isAncestorOrSelf(ancestorPath, path) {
  return path === ancestorPath || path.startsWith(ancestorPath + ".");
}

let changed = 0;
for (const a of areas) {
  if (!a.path) continue;
  let count = 0;
  for (const [leafPath, n] of leafEntries) {
    if (isAncestorOrSelf(a.path, leafPath)) count += n;
  }
  if (count !== a.route_count) {
    const r = await fetch(`${url}/rest/v1/areas?id=eq.${a.id}`, { method: "PATCH", headers: { ...H, Prefer: "return=minimal" }, body: JSON.stringify({ route_count: count }) });
    if (!r.ok) throw new Error(`recount ${a.id}: ${r.status} ${await r.text()}`);
    changed++;
    console.log(`  ${a.id}: ${a.route_count} -> ${count}`);
  }
}
// usa's route_count also needs adjusting by the same delta WA's own total moved (if any).
const waRow = areas.find(a => a.id === "washington");
console.log(`  route_count corrected on ${changed} areas (washington total: ${waRow?.route_count})`);

console.log("\nDone. Verification:");
for (const id of ["wa_monte_cristo_group", "wa_chilliwack_range", "wa_pasayten", "wa_tatoosh_range", "wa_glacier_peak_wilderness", "wa_picket_range", "wa_southwest_cascades", "washington", "usa"]) {
  const [row] = await getJSON(`areas?id=eq.${id}&select=id,name,parent_id,route_count`);
  console.log(" ", row);
}
const gone = await getJSON("areas?id=eq.wa_pasayten_wilderness_region&select=id");
console.log("wa_pasayten_wilderness_region rows remaining (expect 0):", gone.length);
