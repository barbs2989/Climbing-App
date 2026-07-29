// Detect the bug class where one peak's enrichment lands on a different peak's route.
//
// Root cause (measured 2026-07-29): only ~9% of WA route ids are peak-scoped
// (`wa_mount_baker_north_ridge`, i.e. id starts with area_id). The other ~91% are
// derived from the ROUTE NAME alone plus a disambiguating counter — `wa_north_ridge`,
// `wa_north_ridge_2`, `wa_north_face_3`, `wa_south_face`. With name-derived ids,
// "the North Ridge route" does not identify a peak, so any handoff that resolves a
// route by name (or by a name-shaped id) can land on an arbitrary peak's row.
//
// That is how a Mount Adams permit block ended up on Mount Baker, Forbidden, Whatcom,
// Cutthroat and Primus — every one of them has a route named "North Ridge". Same
// mechanism behind migrations 0044-0046 and the routes.access contamination.
//
// Read-only. Prints a report and writes JSON; touches no route data.
//
// Usage:
//   node scripts/audit-route-identity.mjs                 # whole catalog
//   node scripts/audit-route-identity.mjs --state wa      # one state subtree
//   node scripts/audit-route-identity.mjs --json out.json

import fs from "fs";
import crypto from "crypto";
import { selectAll } from "./lib/supabase-env.mjs";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const STATE = (arg("--state", "") || "").toLowerCase();
const OUT = arg("--json", "");

// Columns written by the enrichment passes. Cross-region duplication in any of them
// is the fingerprint of a mis-targeted write.
const ENRICHED = ["approach", "descent_text", "emergency", "permit", "comms",
                  "watch_out", "obj_haz", "hazards", "bail", "pro_tips", "access"];

// Values that legitimately repeat verbatim across unrelated peaks. Boilerplate like
// "Reverse the route." is not contamination, and flagging it buries the real hits.
const BOILERPLATE = [
  /^reverse the (route|scramble)/i, /^retreat down/i, /^limited bail/i,
  /^no cell (coverage|service)/i, /^same as approach/i, /^descend the (route|ascent)/i,
];
// Placeholder route names that repeat within one crag by design (OpenBeta import).
const PLACEHOLDER = /^\s*(unknown|unnamed|project|route|no name|nameless|tbd|n\/?a|\?+|open project|wa|[\d\W]*)\s*$/i;

const norm = s => (s || "").trim().toLowerCase();
const slug = s => norm(s).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const hash = v => crypto.createHash("md5").update(JSON.stringify(v)).digest("hex").slice(0, 10);
// An object whose every value is a no-data placeholder ({"fees":"N/A","permit":"N/A",...})
// is shared by design, not by contamination. Without this, one such stub on 9 unrelated
// crags outranks the single genuine hit in the same column.
const NODATA = /^\s*(n\/?a|none|unknown|null|-|—|)\s*$/i;
const isPlaceholderObj = v => v && typeof v === "object" && !Array.isArray(v) &&
  Object.values(v).length > 0 && Object.values(v).every(x => x == null || (typeof x === "string" && NODATA.test(x)));
// Short arrays of bare hazard vocabulary (["loose rock"], ["rockfall","exposure"]) are
// shared vocabulary, not copied prose. Real contamination carries specifics — a place
// name, a phone number, a trailhead. Anything with a multi-word phrase still counts.
const GENERIC_TAG = /^(loose ?rock|rock ?fall|exposure|route ?finding|routefinding|avalanche|crevasse|serac|icefall|cornice|weather|scree|talus|moat|whiteout|altitude|remoteness|afternoon weather|verglas|wet rock)$/i;
const isGenericTags = v => Array.isArray(v) && v.length > 0 && v.length <= 4 &&
  v.every(x => typeof x === "string" && GENERIC_TAG.test(x.trim()));
const isBoilerplate = v =>
  (typeof v === "string" && BOILERPLATE.some(re => re.test(v.trim()))) ||
  isPlaceholderObj(v) || isGenericTags(v);

// Big pages: the default 60 would be ~3,400 round trips over the 200k-row routes table.
const PAGE = { pageSize: 1000 };

const areasList = await selectAll("areas", "id,name,parent_id,area_type", null, PAGE);
const areas = new Map(areasList.map(a => [a.id, a]));

function ancestry(id) {
  const out = [];
  let cur = id;
  for (let i = 0; cur && i < 12; i++) {
    const a = areas.get(cur);
    if (!a) break;
    out.push(a);
    cur = a.parent_id;
  }
  return out;
}
// Region = the broad bucket under the state, which is what makes "these two routes are
// 200 miles apart" legible without needing coordinates.
function regionOf(areaId) {
  const ch = ancestry(areaId);
  return ch.length > 2 ? ch[ch.length - 3].name : (ch[0] ? ch[0].name : "?");
}
function stateOf(areaId) {
  const ch = ancestry(areaId).map(a => norm(a.name));
  return ch.length > 1 ? ch[ch.length - 2] : (ch[0] || "?");
}

const routes = await selectAll("routes", ["id", "name", "area_id", ...ENRICHED].join(","), null, PAGE);
const scoped = STATE
  ? routes.filter(r => stateOf(r.area_id).startsWith(STATE) || String(r.id).startsWith(`${STATE}_`))
  : routes;

console.log(`routes examined: ${scoped.length}${STATE ? ` (state=${STATE})` : ""}`);
console.log("");

// ---------------------------------------------------------------- 1. id scoping
const orphan = scoped.filter(r => !(r.area_id && String(r.id).startsWith(`${r.area_id}_`)));
const families = new Map();
for (const r of orphan) {
  const base = String(r.id).replace(/_\d+$/, "");
  if (!families.has(base)) families.set(base, []);
  families.get(base).push(r);
}
// A family is only a collision risk if the same name-derived base spans >1 peak.
const collisions = [...families.entries()]
  .map(([base, rs]) => [base, rs, new Set(rs.map(r => r.area_id)).size])
  .filter(([, , peaks]) => peaks > 1)
  .sort((a, b) => b[1].length - a[1].length);

console.log("1. ROUTE ID SCOPING");
console.log(`   peak-scoped ids            : ${scoped.length - orphan.length}`);
console.log(`   name-derived ids           : ${orphan.length}`);
console.log(`   collision families (>1 peak): ${collisions.length}`);
for (const [base, rs, peaks] of collisions.slice(0, 10)) {
  const names = [...new Set(rs.map(r => (areas.get(r.area_id) || {}).name))].slice(0, 4);
  console.log(`     ${base.padEnd(26)} x${String(rs.length).padStart(3)} across ${peaks} peaks: ${names.join(", ")}`);
}
console.log("");

// ------------------------------------------------- 2. cross-region duplicate values
console.log("2. CROSS-REGION DUPLICATE FIELD VALUES  (the contamination fingerprint)");
const contamination = [];
for (const col of ENRICHED) {
  const blobs = new Map();
  for (const r of scoped) {
    const v = r[col];
    if (v == null || v === "" || (Array.isArray(v) && !v.length)) continue;
    if (isBoilerplate(v)) continue;
    const h = hash(v);
    if (!blobs.has(h)) blobs.set(h, []);
    blobs.get(h).push(r);
  }
  const susp = [...blobs.entries()].filter(([, rs]) =>
    new Set(rs.map(r => r.area_id)).size > 1 && new Set(rs.map(r => regionOf(r.area_id))).size > 1);
  const routesInvolved = susp.reduce((n, [, rs]) => n + rs.length, 0);
  console.log(`   ${col.padEnd(14)} ${String(susp.length).padStart(3)} blob(s)  ${String(routesInvolved).padStart(4)} route(s)`);
  for (const [h, rs] of susp.sort((a, b) => b[1].length - a[1].length).slice(0, 3)) {
    contamination.push({ column: col, blob: h, routes: rs.map(r => r.id),
                         names: [...new Set(rs.map(r => r.name))],
                         regions: [...new Set(rs.map(r => regionOf(r.area_id)))] });
  }
}
console.log("");
for (const c of contamination.slice(0, 8)) {
  console.log(`   ${c.column} ${c.blob}: ${c.routes.length} routes / ${c.regions.length} regions`);
  console.log(`      names  : ${c.names.slice(0, 4).join(" | ")}`);
  console.log(`      regions: ${c.regions.slice(0, 4).join(" | ")}`);
  console.log(`      ids    : ${c.routes.slice(0, 6).join(", ")}`);
}
console.log("");

// --------------------------------------------------------- 3. duplicate route rows
console.log("3. DUPLICATE ROUTES  (same name on the same area — what a UNIQUE index would block)");
const byKey = new Map();
for (const r of scoped) {
  if (!r.area_id) continue;
  const k = `${r.area_id} ${norm(r.name)}`;
  if (!byKey.has(k)) byKey.set(k, []);
  byKey.get(k).push(r);
}
const dupes = [...byKey.entries()].filter(([, rs]) => rs.length > 1);
const realDupes = dupes.filter(([k]) => !PLACEHOLDER.test(k.split(" ")[1]));
console.log(`   duplicate (area, name) pairs : ${dupes.length}`);
console.log(`     placeholder names (fine)   : ${dupes.length - realDupes.length}`);
console.log(`     REAL collisions (suspect)  : ${realDupes.length}`);
for (const [k, rs] of realDupes) {
  const [aid, nm] = k.split(" ");
  console.log(`     x${rs.length}  ${((areas.get(aid) || {}).name || "?").slice(0, 28).padEnd(28)} | ${nm.slice(0, 30).padEnd(30)} | ${rs.map(r => r.id).join(", ")}`);
}
console.log("");

// -------------------------------------------- 4. id-prefix blind spot for state queries
// `id like 'wa_%'` is the reflex filter, and it silently misses legacy ids such as
// `stuart_west_ridge`. Any coverage percentage computed that way understates its own
// denominator.
if (STATE) {
  const inTree = routes.filter(r => stateOf(r.area_id).startsWith(STATE));
  const missed = inTree.filter(r => !String(r.id).startsWith(`${STATE}_`));
  console.log(`4. ID-PREFIX BLIND SPOT for id=like.${STATE}_*`);
  console.log(`   routes in the ${STATE} subtree : ${inTree.length}`);
  console.log(`   missed by the prefix filter    : ${missed.length}`);
  for (const r of missed.slice(0, 20)) {
    console.log(`     ${r.id.padEnd(40)} ${((areas.get(r.area_id) || {}).name || "?").slice(0, 22)} / ${r.name}`);
  }
  console.log("");
}

const report = {
  examined: scoped.length,
  idScoping: { peakScoped: scoped.length - orphan.length, nameDerived: orphan.length,
               collisionFamilies: collisions.map(([b, rs]) => ({ base: b, ids: rs.map(r => r.id) })) },
  contamination,
  duplicateRoutes: realDupes.map(([k, rs]) => ({ areaId: k.split(" ")[0], name: k.split(" ")[1], ids: rs.map(r => r.id) })),
};
if (OUT) { fs.writeFileSync(OUT, JSON.stringify(report, null, 1)); console.log(`wrote ${OUT}`); }

const problems = contamination.length + realDupes.length;
console.log(problems ? `FOUND ${problems} thing(s) to look at.` : "Clean.");
