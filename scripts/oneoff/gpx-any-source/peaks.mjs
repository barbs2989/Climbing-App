// Worklist -> the distinct peaks (area rows) to look up on Peakbagger, with coordinates.
// Usage: node scripts/oneoff/gpx-any-source/peaks.mjs <worklist.json> <peaks.json>
import fs from "fs";
import { selectAll } from "../../lib/supabase-env.mjs";
const [wl, out] = process.argv.slice(2);
const list = JSON.parse(fs.readFileSync(wl, "utf8"));
const ids = [...new Set(list.map(r => r.area_id))];
const areas = [];
for (let i = 0; i < ids.length; i += 100) {
  const chunk = ids.slice(i, i + 100).map(encodeURIComponent).join(",");
  areas.push(...await selectAll("areas", "id,name,lat,lng,elevation_ft,parent_id", `id=in.(${chunk})`, { pageSize: 1000 }));
}
const byId = new Map(areas.map(a => [a.id, a]));
const peaks = ids.map(id => { const a = byId.get(id) || {}; return { area_id: id, name: a.name, lat: a.lat, lng: a.lng, elev: a.elevation_ft, routes: list.filter(r => r.area_id === id).map(r => r.id) }; });
fs.writeFileSync(out, JSON.stringify(peaks, null, 1));
console.log("peaks", peaks.length, "with coord", peaks.filter(p => p.lat != null).length);
