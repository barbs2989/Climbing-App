// Read every route's waypoints (read-only) into research-data, so the gazetteer
// comparison in match-gnis.mjs never re-reads the database.
import fs from "fs";
import { selectAll } from "../../lib/supabase-env.mjs";
const OUT = "research-data/gpx-named-pins-2026-10-29/all-pins.json";
const rows = await selectAll("routes", "id,name,area_id,discipline,waypoints", "waypoints=not.is.null", { pageSize: 200 });
const pins = [];
for (const r of rows) (r.waypoints || []).forEach((w, i) => {
  // +null is 0: a pin with no coordinate must not become a pin at 0,0
  if (w.lat != null && w.lng != null && w.lat !== "" && w.lng !== "" && Number.isFinite(+w.lat) && Number.isFinite(+w.lng) && w.name) pins.push({ id: r.id, route: r.name, disc: r.discipline, i, type: w.type, name: w.name, lat: +w.lat, lng: +w.lng });
});
fs.mkdirSync("research-data/gpx-named-pins-2026-10-29", { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(pins));
console.log(rows.length, "routes,", pins.length, "named pins");
