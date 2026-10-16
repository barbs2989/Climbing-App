#!/usr/bin/env node
// audit:coord-origin — is every coordinate a route stores actually NEAR THE ROUTE?
//
// THE GAP IS STRUCTURAL, and it is why four separate audits were all silent on this. Every
// existing geometric audit compares a route's records against ONE ANOTHER:
//   audit:waypoints           pins vs the route's own gpx track
//   audit:waypoint-track      the same question, different tolerances
//   audit:waypoint-geometry   pins vs EACH OTHER
//   audit:trailhead-agreement the route's two copies of its own trailhead
// When a WHOLE BLOB is foreign, those records agree with each other perfectly. Two records
// agreeing is one claim counted twice — this file's own recurring lesson — so a wholesale
// contamination is invisible to all of them by construction.
//
// audit:identity is the near miss and its section 2 explains why it cannot help: it looks for
// prose NAMING A FOREIGN PEAK. The blob that produced this audit names no peak at all — only
// "Pacific Crest Trailhead at Rainy Pass" and "South-southwest via open timber basin".
//
// The AREA coordinate is a third record none of them is derived from, and the test needs no
// research, no gazetteer and no prose parsing: a coordinate 2,698 km from its own area cannot be
// right whatever the sentence beside it says.
//
// THE FOUNDING CASE. `ar_cutthroat` (an ARKANSAS 5.11d sport route) and `az_cutthroat_trout` (an
// ARIZONA 5.9+ trad route) each carry an approach_logistics describing WASHINGTON's Cutthroat
// Peak — peak coordinate 10 m from wa_cutthroat_peak, trailhead on SR-20. The only thing they
// share with it is the word "Cutthroat" in the ROUTE name. `a name is not an identity`, landing on
// coordinates this time rather than on an id or on prose.
//
// Read-only, report-only, anon key. NOT a build gate: it is a property of the DB rather than of
// the checkout, so no code change can cause or fix it — the reasoning that keeps check:counts out.
import { selectAll } from "./lib/supabase-env.mjs";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? (argv[i + 1] ?? true) : d; };
/* 50 km is deliberately LOOSE, and the looseness is the point. Three other audits already ask
   whether a pin is precise; this one asks only whether the coordinate is in the right part of the
   continent. A remote Pasayten summit really is ~30 km from its road, and this file records 236 WA
   routes legitimately more than 8 km from their own peak — a tight bound here would rediscover
   those and bury the thing it exists for. */
const FAR_KM = Number(arg("--km", 50));
const INJECT = arg("--inject", "");

const KM = (p, q) => {
  const R = 6371, t = Math.PI / 180;
  const dla = (q.lat - p.lat) * t, dln = (q.lng - p.lng) * t;
  const h = Math.sin(dla / 2) ** 2 + Math.cos(p.lat * t) * Math.cos(q.lat * t) * Math.sin(dln / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
/* Contributed rows store lat/lng as STRINGS, so coerce rather than type-test — the same reason
   wpPlaced() exists. A non-numeric value is not "far away", it is absent, and belongs to
   check:waypoint-placement's question rather than to this one. */
const num = (v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const stateOf = (p) => String(p || "").split(".")[1] || "?";

const rows = await selectAll("routes", "id,name,area_id,waypoints,approach_logistics",
  "or=(waypoints.not.is.null,approach_logistics.not.is.null)", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — read 0 routes. Refusing to report a clean result about data this never saw."); process.exit(1); }

const areaIds = [...new Set(rows.map((r) => r.area_id).filter(Boolean))];
const areas = [];
for (let i = 0; i < areaIds.length; i += 300) {
  areas.push(...await selectAll("areas", "id,name,lat,lng,path", `id=in.(${areaIds.slice(i, i + 300).join(",")})`, { pageSize: 1000 }));
}
if (!areas.length) { console.error("FAIL — read 0 areas; every route would be unanchored and the run would report a clean catalog."); process.exit(1); }
const byId = new Map(areas.map((a) => [a.id, a]));

if (INJECT === "foreign") {
  const v = rows.find((r) => (r.waypoints || []).some((w) => num(w && w.lat) != null));
  v.waypoints = v.waypoints.map((w, i) => (i ? w : { ...w, lat: 27.9881, lng: 86.925 }));
  console.log(`[inject] ${v.id}: first waypoint moved to Everest — must be reported`);
}
if (INJECT === "clean") {
  for (const r of rows) {
    const a = byId.get(r.area_id);
    if (!a || a.lat == null) continue;
    r.waypoints = (r.waypoints || []).map((w) => ({ ...w, lat: Number(a.lat), lng: Number(a.lng) }));
    if (r.approach_logistics) r.approach_logistics = { ...r.approach_logistics, peakLat: Number(a.lat), peakLng: Number(a.lng), trailheadLat: Number(a.lat), trailheadLng: Number(a.lng) };
  }
  console.log("[inject] every coordinate moved onto its own area — the audit must report 0");
}

const STORES = [
  ["approach_logistics.peak", (r) => { const a = r.approach_logistics || {}; const p = { lat: num(a.peakLat), lng: num(a.peakLng), what: "peak" }; return p.lat != null && p.lng != null ? [p] : []; }],
  ["approach_logistics.trailhead", (r) => { const a = r.approach_logistics || {}; const p = { lat: num(a.trailheadLat), lng: num(a.trailheadLng), what: a.trailhead || "trailhead" }; return p.lat != null && p.lng != null ? [p] : []; }],
  ["waypoints", (r) => (Array.isArray(r.waypoints) ? r.waypoints : []).map((w) => ({ lat: num(w && w.lat), lng: num(w && w.lng), what: (w && w.name) || (w && w.type) || "waypoint" })).filter((p) => p.lat != null && p.lng != null)],
];

let checked = 0, unanchored = 0;
const findings = new Map();
for (const r of rows) {
  const a = byId.get(r.area_id);
  if (!a || a.lat == null) { unanchored++; continue; }
  const anchor = { lat: Number(a.lat), lng: Number(a.lng) };
  for (const [store, get] of STORES) {
    for (const p of get(r)) {
      checked++;
      const km = KM(p, anchor);
      if (km <= FAR_KM) continue;
      if (!findings.has(r.id)) findings.set(r.id, { id: r.id, name: r.name, area: a.name, st: stateOf(a.path), hits: [] });
      findings.get(r.id).hits.push({ store, km, what: p.what });
    }
  }
}

if (!checked) { console.error("FAIL — zero coordinates examined; the stores moved or the parse broke, and 'nothing far away' would be a false pass."); process.exit(1); }

console.log(`${rows.length} routes carry waypoints or approach_logistics; ${checked} stored coordinate(s) compared against their own area.`);
console.log(`${unanchored} route(s) could not be anchored (their area has no coordinate) and are NOT a clean verdict.\n`);
const list = [...findings.values()].sort((x, y) => Math.max(...y.hits.map((h) => h.km)) - Math.max(...x.hits.map((h) => h.km)));
console.log(`${list.length} route(s) store a coordinate more than ${FAR_KM} km from their own area:\n`);
for (const f of list) {
  console.log(`  ${f.id}  "${f.name}"   area ${f.area} (${f.st})`);
  for (const h of f.hits.sort((a, b) => b.km - a.km)) console.log(`      ${h.km.toFixed(0).padStart(5)} km  ${h.store.padEnd(28)} ${h.what}`);
  console.log("");
}
if (list.length) {
  console.log("These are FINDINGS, not a worklist with one repair: a whole foreign blob is CLEARED,");
  console.log("a route whose every other column also describes the far place is MISFILED and moves,");
  console.log("and a single stray pin among correct ones is a pin to fix. Read the row before writing.");
}
process.exitCode = 0;

// Injection-tested:
//   --inject=foreign  one waypoint moved to Everest        -> must be reported
//   --inject=clean    every coordinate put on its own area -> must report 0, which is what
//                     proves the audit is measuring distance rather than always firing
