#!/usr/bin/env node
// Two routes store a peak coordinate over 1,600 km from their own area, and both are named
// "cutthroat". Washington has a Cutthroat Peak. Is this the name-collision class again?
import { selectAll } from "../lib/supabase-env.mjs";

const ids = ["az_cutthroat_trout", "ar_cutthroat", "wa_mount_shuksan_white_salmon_glacier"];
const rows = await selectAll("routes", "id,name,area_id,approach_logistics,discipline,grade",
  `id=in.(${ids.join(",")})`, { pageSize: 50 });
if (!rows.length) { console.error("FAIL — read 0 routes."); process.exit(1); }

const areas = await selectAll("areas", "id,name,lat,lng,path",
  `id=in.(${[...new Set(rows.map((r) => r.area_id))].join(",")})`, { pageSize: 50 });
const byId = new Map(areas.map((a) => [a.id, a]));

for (const r of rows) {
  const al = r.approach_logistics || {};
  const a = byId.get(r.area_id) || {};
  console.log(`── ${r.id}   "${r.name}"  [${r.discipline} ${r.grade}]`);
  console.log(`   area        ${a.name}  ${a.lat},${a.lng}`);
  console.log(`   path        ${a.path}`);
  console.log(`   peakLat/Lng ${al.peakLat},${al.peakLng}`);
  console.log(`   trailhead   ${JSON.stringify(al.trailhead)}  ${al.trailheadLat},${al.trailheadLng}`);
  console.log("");
}

// Which area in the catalog actually sits at that stored peak coordinate?
const m = (a, b) => {
  const R = 6371000, t = Math.PI / 180;
  const dla = (b.lat - a.lat) * t, dln = (b.lng - a.lng) * t;
  const h = Math.sin(dla / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dln / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const named = await selectAll("areas", "id,name,lat,lng", "name=ilike.*cutthroat*", { pageSize: 200 });
console.log(`areas named *cutthroat*: ${named.length}`);
for (const a of named) console.log(`   ${a.id.padEnd(34)} ${a.name.padEnd(24)} ${a.lat},${a.lng}`);

for (const r of rows.filter((x) => /cutthroat/.test(x.id))) {
  const al = r.approach_logistics || {};
  const p = { lat: Number(al.peakLat), lng: Number(al.peakLng) };
  if (!Number.isFinite(p.lat)) continue;
  let best = null;
  for (const a of named) {
    if (a.lat == null) continue;
    const km = m(p, { lat: Number(a.lat), lng: Number(a.lng) }) / 1000;
    if (!best || km < best.km) best = { a, km };
  }
  if (best) console.log(`\n${r.id}'s stored peak coord is ${best.km.toFixed(2)} km from ${best.a.id} (${best.a.name})`);
}
