// Read-only: where do WA routes pin a named place? usage: node named-place.mjs "Hannegan Pass" ["Blue Lake Trailhead" ...]
// Prints every waypoint whose name contains the text, with its route, so a moved pin can agree with its neighbours.
// The first run caches every WA pin to audits/route-leftovers/wa-pins.json (git-ignored); delete it to refresh.
import fs from "node:fs";
import { selectAll, requireServiceKey } from "../../lib/supabase-env.mjs";
const cache = new URL("../../../audits/route-leftovers/wa-pins.json", import.meta.url).pathname;
let pins;
if (fs.existsSync(cache)) pins = JSON.parse(fs.readFileSync(cache));
else {
  const rows = await selectAll("routes", "id,waypoints", "id=like.wa_*", { key: requireServiceKey(), pageSize: 1000 });
  pins = rows.flatMap(r => (r.waypoints || []).map((w, i) => w && { id: r.id, i, name: w.name, lat: w.lat, lng: w.lng, elev: w.elev ?? w.elevFt, type: w.type })).filter(Boolean);
  fs.writeFileSync(cache, JSON.stringify(pins));
}
for (const q of process.argv.slice(2)) {
  console.log("##", q);
  for (const p of pins) if (typeof p.name === "string" && p.name.toLowerCase().includes(q.toLowerCase())) console.log(`  ${p.lat},${p.lng}  elev ${p.elev ?? "-"}  ${p.type || ""}  ${p.id}[${p.i}] "${p.name}"`);
}
