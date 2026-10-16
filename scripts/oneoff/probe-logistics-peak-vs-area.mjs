#!/usr/bin/env node
// approach_logistics stores a PEAK coordinate (peakLat/peakLng) and `areas` stores the peak's own.
// Two records of one fact, written by different passes — the shape audit:trailhead-agreement
// mines, one field over.
//
// It is not decorative: TrailheadCard's "To the peak" tile is
//   {dir: compass16(lat,lng,al.peakLat,al.peakLng), mi: distMiles({lat,lng},{lat:al.peakLat,...})}
// so a wrong peakLat states a bearing AND a distance, both confidently, from a coordinate the map
// never draws. The area coordinate is the one the rest of the app uses.
import { selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes", "id,area_id,approach_logistics",
  "approach_logistics.not.is.null", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — read 0 routes. Refusing to report a clean result about data this never saw."); process.exit(1); }

const areaIds = [...new Set(rows.map((r) => r.area_id).filter(Boolean))];
const areas = [];
for (let i = 0; i < areaIds.length; i += 300) {
  areas.push(...await selectAll("areas", "id,name,lat,lng", `id=in.(${areaIds.slice(i, i + 300).join(",")})`, { pageSize: 1000 }));
}
if (!areas.length) { console.error("FAIL — read 0 areas."); process.exit(1); }
const byId = new Map(areas.map((a) => [a.id, a]));

const m = (a, b) => {
  const R = 6371000, t = Math.PI / 180;
  const dla = (b.lat - a.lat) * t, dln = (b.lng - a.lng) * t;
  const h = Math.sin(dla / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dln / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const num = (v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

let withPeak = 0, comparable = 0, strings = 0;
const d = [];
for (const r of rows) {
  const al = r.approach_logistics || {};
  const la = num(al.peakLat), ln = num(al.peakLng);
  if (typeof al.peakLat === "string") strings++;
  if (la == null || ln == null) continue;
  withPeak++;
  const a = byId.get(r.area_id);
  if (!a || a.lat == null) continue;
  comparable++;
  d.push({ id: r.id, area: a.name, km: m({ lat: la, lng: ln }, { lat: Number(a.lat), lng: Number(a.lng) }) / 1000 });
}

d.sort((x, y) => x.km - y.km);
const q = (p) => (d.length ? d[Math.min(d.length - 1, Math.floor(d.length * p))].km : 0);
console.log(`${rows.length} routes carry approach_logistics; ${withPeak} carry a peak coordinate; ${comparable} comparable against their area.`);
console.log(`${strings} store peakLat as a STRING.\n`);
if (!comparable) { console.log("nothing comparable — the pair cannot be checked."); process.exit(0); }
console.log(`disagreement, km:  p50 ${q(0.5).toFixed(3)}   p90 ${q(0.9).toFixed(3)}   p99 ${q(0.99).toFixed(3)}   max ${d[d.length - 1].km.toFixed(2)}`);
const bad = d.filter((x) => x.km > 1);
console.log(`\n${bad.length} route(s) disagree by more than 1 km:\n`);
for (const x of bad.slice(-30)) console.log(`   ${x.km.toFixed(2)} km  ${x.id}  (area: ${x.area})`);
