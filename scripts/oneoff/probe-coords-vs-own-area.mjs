#!/usr/bin/env node
// Every coordinate a route stores should be NEAR THE ROUTE. Is anything checking that?
//
// The three waypoint audits ask pins-vs-track, pins-vs-each-other and pins-vs-list-order — all of
// which compare a route's records against ONE ANOTHER. audit:trailhead-agreement does the same for
// the two trailhead copies. That is exactly why the Cutthroat contamination is invisible to all of
// them: when a whole blob is foreign, its records agree with each other perfectly, and two records
// agreeing is one claim counted twice.
//
// The AREA coordinate is a third record none of them is derived from, and the test needs no
// research and no prose: a coordinate 2,698 km from its own area cannot be right whatever it says.
import { selectAll } from "../lib/supabase-env.mjs";

const KM = (p, q) => {
  const R = 6371, t = Math.PI / 180;
  const dla = (q.lat - p.lat) * t, dln = (q.lng - p.lng) * t;
  const h = Math.sin(dla / 2) ** 2 + Math.cos(p.lat * t) * Math.cos(q.lat * t) * Math.sin(dln / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const num = (v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const state = (p) => String(p || "").split(".")[1] || "?";

const rows = await selectAll("routes", "id,area_id,waypoints,approach_logistics",
  "or=(waypoints.not.is.null,approach_logistics.not.is.null)", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — read 0 routes."); process.exit(1); }
const areaIds = [...new Set(rows.map((r) => r.area_id).filter(Boolean))];
const areas = [];
for (let i = 0; i < areaIds.length; i += 300) {
  areas.push(...await selectAll("areas", "id,name,lat,lng,path", `id=in.(${areaIds.slice(i, i + 300).join(",")})`, { pageSize: 1000 }));
}
const byId = new Map(areas.map((a) => [a.id, a]));

const STORES = [
  ["logistics.peak", (r) => { const a = r.approach_logistics || {}; const p = { lat: num(a.peakLat), lng: num(a.peakLng) }; return p.lat != null && p.lng != null ? [p] : []; }],
  ["logistics.trailhead", (r) => { const a = r.approach_logistics || {}; const p = { lat: num(a.trailheadLat), lng: num(a.trailheadLng) }; return p.lat != null && p.lng != null ? [p] : []; }],
  ["waypoints", (r) => (Array.isArray(r.waypoints) ? r.waypoints : []).map((w) => ({ lat: num(w && w.lat), lng: num(w && w.lng), name: w && w.name })).filter((p) => p.lat != null && p.lng != null)],
];

// 50 km is deliberately loose. A remote Pasayten peak really is ~30 km from its road, and this
// repo records 236 WA routes legitimately over 8 km from their peak. The question here is not
// "is this pin precise" — three other audits ask that — it is "is this coordinate even in the
// right part of the continent".
const FAR_KM = 50;

for (const [label, get] of STORES) {
  let checked = 0;
  const far = [];
  for (const r of rows) {
    const a = byId.get(r.area_id);
    if (!a || a.lat == null) continue;
    const anchor = { lat: Number(a.lat), lng: Number(a.lng) };
    for (const p of get(r)) {
      checked++;
      const km = KM(p, anchor);
      if (km > FAR_KM) far.push({ id: r.id, km, area: a.name, st: state(a.path), name: p.name });
    }
  }
  console.log(`── ${label.padEnd(20)} ${String(checked).padStart(6)} coordinate(s) checked · ${far.length} over ${FAR_KM} km`);
  for (const x of far.sort((p, q) => q.km - p.km).slice(0, 12)) {
    console.log(`      ${x.km.toFixed(0).padStart(5)} km  ${x.id.padEnd(38)} ${x.st.padEnd(11)} ${x.area}${x.name ? `  [${x.name}]` : ""}`);
  }
  console.log("");
}
