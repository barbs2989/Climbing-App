#!/usr/bin/env node
// wa_glacier_peak_kennedy_glacier names one road and gives directions up another.
//
// road.name           White Chuck Road (FR 23)
// road.status         that road's MP 3.7 closure, "in effect through at least Dec 31, 2025"
// road.driveNote      drives the Mountain Loop Highway to Sloan Creek Road (FR 49)
// access.closures     the FR 49 / Mountain Loop corridor
//
// Reported by audit:expiring-closures and deliberately not repaired at the time, because which
// half is wrong is a judgement no single column settles. This reads the whole Glacier Peak family
// so the answer comes from the catalog rather than from a guess: which road do this route's OWN
// waypoints, distance and siblings say it uses?
import { selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes",
  "id,name,area_id,road,approach,approach_logistics,waypoints,dist_km,gain_ft",
  "area_id=eq.wa_glacier_peak", { pageSize: 100 });
if (!rows.length) { console.error("FAIL — read 0 Glacier Peak routes."); process.exit(1); }

const KM = (p, q) => { const R = 6371, t = Math.PI / 180;
  const dla = (q.lat - p.lat) * t, dln = (q.lng - p.lng) * t;
  return 2 * R * Math.asin(Math.sqrt(Math.sin(dla / 2) ** 2 + Math.cos(p.lat * t) * Math.cos(q.lat * t) * Math.sin(dln / 2) ** 2)); };
const num = (v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

// The two candidate trailheads, taken from the SIBLINGS' own records rather than typed here.
const th = new Map();
for (const r of rows) {
  const al = r.approach_logistics || {};
  const la = num(al.trailheadLat), ln = num(al.trailheadLng);
  if (la != null && al.trailhead) th.set(al.trailhead, { lat: la, lng: ln, from: r.id });
  for (const w of r.waypoints || []) {
    if (!/trailhead/i.test(String(w.type || "") + String(w.name || ""))) continue;
    const a = num(w.lat), b = num(w.lng);
    if (a != null && w.name) th.set(w.name, { lat: a, lng: b, from: r.id });
  }
}
console.log("trailheads this family records:");
for (const [n, p] of th) console.log(`   ${n.padEnd(48)} ${p.lat},${p.lng}   (from ${p.from})`);

console.log("\nper route:");
for (const r of rows.sort((a, b) => a.id.localeCompare(b.id))) {
  const rd = r.road || {};
  console.log(`\n── ${r.id}`);
  console.log(`   road.name      ${JSON.stringify(rd.name || null)}`);
  for (const k of ["status", "seasonalGate", "driveNote"]) {
    if (rd[k]) console.log(`   road.${k.padEnd(13)} ${String(rd[k]).replace(/\s+/g, " ").slice(0, 150)}`);
  }
  const al = r.approach_logistics || {};
  if (al.trailhead) console.log(`   logistics TH   ${al.trailhead}  ${al.trailheadLat},${al.trailheadLng}`);
  const wtn = (r.waypoints || []).filter((w) => /trailhead/i.test(String(w.type || "") + String(w.name || "")));
  for (const w of wtn) console.log(`   waypoint TH    ${w.name}  ${w.lat},${w.lng}`);
  if (r.dist_km != null) console.log(`   dist_km        ${r.dist_km}   gain_ft ${r.gain_ft ?? "—"}`);
  if (r.approach) console.log(`   approach       ${String(r.approach).replace(/\s+/g, " ").slice(0, 200)}`);
}

// Which named trailhead is each route's own start actually AT?
console.log("\nwhich recorded trailhead does each route's own start sit on?");
for (const r of rows.sort((a, b) => a.id.localeCompare(b.id))) {
  const al = r.approach_logistics || {};
  const p = { lat: num(al.trailheadLat), lng: num(al.trailheadLng) };
  if (p.lat == null) { console.log(`   ${r.id.padEnd(46)} (no logistics coordinate)`); continue; }
  let best = null;
  for (const [n, q] of th) { const km = KM(p, q); if (!best || km < best.km) best = { n, km }; }
  console.log(`   ${r.id.padEnd(46)} ${best.km < 0.05 ? "==" : `${best.km.toFixed(1)} km from`} ${best.n}`);
}
