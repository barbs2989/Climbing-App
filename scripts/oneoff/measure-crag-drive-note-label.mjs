import { selectAll } from "../lib/supabase-env.mjs";
const rows = await selectAll("routes", "id,discipline,road,approach", "discipline=in.(trad,sport,bouldering)&road=not.is.null", { pageSize: 1000 });
const withRoad = rows.filter((r) => r.road && (r.road.driveNote || r.road.name));
console.log(`crag-family routes carrying a road block with a driveNote/name: ${withRoad.length} of ${rows.length} read`);
console.log(`  ...of those, also carrying approach prose: ${withRoad.filter((r) => r.approach).length}`);
console.log("sample of what renders under the label \"Trailhead\":");
for (const r of withRoad.slice(0, 5)) console.log("   " + r.id + ": " + JSON.stringify(String(r.road.driveNote || r.road.name).slice(0, 90)));
