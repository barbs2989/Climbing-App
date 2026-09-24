// Report-only: which routes does "trad that climbs a peak is alpine" reach?
// A route is counted when its discipline is trad (or rock with a trad/absent style) and the
// area it is filed on is typed `peak` — the same signal climbsAPeak() reads in the app.
import { selectAll } from "../lib/supabase-env.mjs";

const areas = await selectAll("areas", "id,name,area_type", "area_type=eq.peak", { pageSize: 1000 });
if (!areas.length) { console.error("FAIL: zero peak-typed areas read — a broken scan, not an answer"); process.exit(1); }
const peak = new Map(areas.map(a => [a.id, a.name]));

const routes = await selectAll("routes", "id,name,area_id,discipline", "discipline=in.(trad,rock)", { pageSize: 1000 });
if (!routes.length) { console.error("FAIL: zero trad/rock routes read — a broken scan"); process.exit(1); }

const isTrad = r => r.discipline === "trad" || r.discipline === "rock";
const hits = routes.filter(r => peak.has(r.area_id) && isTrad(r));
const byPrefix = {};
for (const r of hits) { const p = r.id.split("_")[0]; byPrefix[p] = (byPrefix[p] || 0) + 1; }

console.log(`peak-typed areas: ${areas.length}; trad/rock routes: ${routes.length}; trad on a peak: ${hits.length}`);
console.log("by id prefix:", JSON.stringify(byPrefix));
for (const r of hits.slice(0, 40)) console.log(`  ${r.id}  [${r.discipline}]  on ${peak.get(r.area_id)}`);
