import { selectAll } from "file:///C:/Users/nate_/dev/Climbing-App/.claude/worktrees/map-pins-per-discipline/scripts/lib/supabase-env.mjs";
const areas = process.argv[2];
const rs = await selectAll("routes", "id,name,area_id,approach_logistics", `area_id=in.(${areas})`);
const ar = await selectAll("areas", "id,lat,lng", `id=in.(${areas})`);
for (const a of ar) console.log("PEAK", a.id, a.lat, a.lng);
for (const r of rs) { const x = r.approach_logistics; console.log(r.area_id.padEnd(30), r.id.padEnd(58), x?.trailheadLat ? `${x.trailheadLat},${x.trailheadLng} ${x.trailhead}` : "-"); }
