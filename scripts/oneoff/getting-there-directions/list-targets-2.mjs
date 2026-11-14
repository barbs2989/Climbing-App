// Batch 2 of the fill: WA alpine routes with a trailhead card but NO driving directions, whatever
// their approach prose (batch 1 took only those with >=200 chars). Groups them by stored trailhead.
// Read-only. Writes routes-2.json and trailheads-2.json beside this file.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selectAll } from "../../lib/supabase-env.mjs";
const here = path.dirname(fileURLToPath(import.meta.url));
const areas = await selectAll("areas", "id,path", {}, { pageSize: 1000 });
const wa = new Set(areas.filter(a => String(a.path || "") === "usa.washington" || String(a.path || "").startsWith("usa.washington.")).map(a => a.id));
const routes = await selectAll("routes", "id,name,area_id,discipline,approach,approach_logistics,waypoints", {}, { pageSize: 1000 });
const ALP = new Set(["alpine", "mountaineering", "ice", "mixed"]);
const hasDir = r => r.approach_logistics && String(r.approach_logistics.trailheadDirection || "").trim();
const hasCard = r => r.approach_logistics && (r.approach_logistics.trailhead || (r.waypoints || []).some(w => w.type === "Trailhead"));
const out = routes.filter(r => wa.has(r.area_id) && ALP.has(r.discipline) && !hasDir(r) && hasCard(r))
  .map(r => ({ id: r.id, name: r.name, trailhead: r.approach_logistics?.trailhead || null, approach_logistics: r.approach_logistics || {} }));
fs.writeFileSync(path.join(here, "routes-2.json"), JSON.stringify(out, null, 1));
const m = {};
for (const r of out) if (r.trailhead) (m[r.trailhead] = m[r.trailhead] || { trailhead: r.trailhead, routes: [] }).routes.push(r.name + " (" + r.id + ")");
const list = Object.values(m).sort((a, b) => a.trailhead.localeCompare(b.trailhead));
fs.writeFileSync(path.join(here, "trailheads-2.json"), JSON.stringify(list, null, 1));
console.log("targets", out.length, "with a named trailhead", out.filter(r => r.trailhead).length, "distinct trailheads", list.length);
