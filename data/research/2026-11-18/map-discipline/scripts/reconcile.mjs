import fs from "fs";
const { selectAll, requireServiceKey } = await import("file:///C:/Users/nate_/dev/Climbing-App/.claude/worktrees/map-pins-per-discipline/scripts/lib/supabase-env.mjs");
const b = JSON.parse(fs.readFileSync("C:/Users/nate_/.claude/jobs/be35cfe5/tmp/research/batch.json"));
const ids = Object.keys(b), key = requireServiceKey(), rows = [];
for (let i = 0; i < ids.length; i += 40) rows.push(...await selectAll("routes", "id,approach_logistics,waypoints", `id=in.(${ids.slice(i, i + 40).map(x => `"${x}"`).join(",")})`, { key, pageSize: 100 }));
let bad = 0;
for (const id of ids) { const r = rows.find(x => x.id === id), e = b[id];
  if (!r) { bad++; console.log("MISSING", id); continue; }
  if (e.set.approach_logistics) { const a = r.approach_logistics || {}; if (a.trailheadLat !== e.set.approach_logistics.trailheadLat || a.trailheadLng !== e.set.approach_logistics.trailheadLng) { bad++; console.log("TH NOT LANDED", id); } }
  if (e.set.waypoints) { const p = e.set.waypoints[e.set.waypoints.length - 1]; if (!(r.waypoints || []).some(w => w.type === "Summit" && w.lat === p.lat && w.lng === p.lng)) { bad++; console.log("SUMMIT NOT LANDED", id); } } }
console.log(`reconciled ${ids.length} rows; not landed: ${bad}`);
