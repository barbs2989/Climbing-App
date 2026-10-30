// One read of the catalog for matching routes that have NO pins: every alpine, mountaineering and
// scrambling route with its area, then those AREAS by primary key (a scan of areas filtered by type
// returned HTTP 500 under load; id=in.(...) chunks are cheap). Read-only, paced.
// Writes research-data/gpx-tracks-fkt-peaks-2026-10-29/{routes,peaks}.json; reuses routes.json if present.
import fs from "fs";
import { selectAll, SUPABASE_URL, headers, anonKey } from "../../lib/supabase-env.mjs";
const D = "research-data/gpx-tracks-fkt-peaks-2026-10-29";
fs.mkdirSync(D, { recursive: true });
const routes = fs.existsSync(`${D}/routes.json`) ? JSON.parse(fs.readFileSync(`${D}/routes.json`, "utf8"))
  : await selectAll("routes", "id,name,area_id,discipline,grade", "discipline=in.(alpine,mountaineering,scrambling)", { pageSize: 200 });
fs.writeFileSync(`${D}/routes.json`, JSON.stringify(routes));
const ids = [...new Set(routes.map(r => r.area_id).filter(Boolean))];
const areas = fs.existsSync(`${D}/peaks.partial.json`) ? JSON.parse(fs.readFileSync(`${D}/peaks.partial.json`, "utf8")) : [];
const have = new Set(areas.map(a => a.id));
const todo = ids.filter(i => !have.has(i));
for (let i = 0; i < todo.length; i += 100) {
  const q = todo.slice(i, i + 100).map(encodeURIComponent).join(",");
  const t0 = Date.now();
  const r = await fetch(`${SUPABASE_URL}/rest/v1/areas?id=in.(${q})&select=id,name,area_type,lat,lng,elevation_ft,parent_id`, { headers: headers(anonKey()) });
  if (!r.ok) { console.log(`areas chunk ${i / 100 + 1}: HTTP ${r.status} — stopping; re-run resumes from peaks.partial.json`); process.exit(1); }
  areas.push(...await r.json());
  fs.writeFileSync(`${D}/peaks.partial.json`, JSON.stringify(areas));
  if (Date.now() - t0 > 10000) { console.log("a chunk took over 10 s — stopping to spare the database; re-run later"); process.exit(1); }
  await new Promise(s => setTimeout(s, 1000));
}
const peaks = areas.filter(a => a.lat != null && a.lng != null);
fs.writeFileSync(`${D}/peaks.json`, JSON.stringify(peaks));
console.log(routes.length, "routes;", areas.length, "areas read;", peaks.length, "with a coordinate");
