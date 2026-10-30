// Read every NON-Washington route that carries waypoints ONCE, plus the areas they hang off (and
// every ancestor), into local JSON, so the census and research steps of the out-of-state waypoint
// audit read nothing twice.
//   node scripts/oneoff/oos-waypoint-audit/snapshot.mjs ROUTES.json AREAS.json
import fs from "fs";
import { selectAll, requireServiceKey } from "../../lib/supabase-env.mjs";
const key = requireServiceKey();
const rows = await selectAll("routes", "id,name,area_id,discipline,disciplines,waypoints,approach_logistics,high_point_ft,dist_km,gain_ft",
  "id=not.like.wa_*&waypoints=not.is.null", { pageSize: 100, key });
const withPins = rows.filter(r => Array.isArray(r.waypoints) && r.waypoints.length);
fs.writeFileSync(process.argv[2], JSON.stringify(withPins));
const areas = {};
const want = [...new Set(withPins.map(r => r.area_id).filter(Boolean))];
while (want.length) {
  const chunk = want.splice(0, 60);
  const got = await selectAll("areas", "*", `id=in.(${chunk.map(encodeURIComponent).join(",")})`, { pageSize: 100, key });
  for (const a of got) areas[a.id] = a;
  for (const a of got) if (a.parent_id && !areas[a.parent_id] && !want.includes(a.parent_id)) want.push(a.parent_id);
  await new Promise(s => setTimeout(s, 400));
}
fs.writeFileSync(process.argv[3], JSON.stringify(Object.values(areas)));
const byDisc = {}; for (const r of withPins) byDisc[r.discipline] = (byDisc[r.discipline] || 0) + 1;
console.log(withPins.length, "non-WA routes with waypoints;", Object.keys(areas).length, "areas;", JSON.stringify(byDisc));
