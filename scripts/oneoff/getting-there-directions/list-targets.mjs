// Lists WA alpine routes that have a trailhead card and >=200 chars of approach prose but NO
// driving directions (approach_logistics.trailheadDirection), and groups them by stored trailhead.
// Read-only. Writes routes.json and trailheads.json beside this file.
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
const out = routes.filter(r => wa.has(r.area_id) && ALP.has(r.discipline) && !hasDir(r) && String(r.approach || "").trim().length >= 200 && hasCard(r))
  .map(r => ({ id: r.id, name: r.name, trailhead: r.approach_logistics?.trailhead || null, approach_logistics: r.approach_logistics || {} }));
fs.writeFileSync(path.join(here, "routes.json"), JSON.stringify(out, null, 1));
const m = {};
for (const r of out) if (r.trailhead) (m[r.trailhead] = m[r.trailhead] || { trailhead: r.trailhead, routes: [] }).routes.push(r.name + " (" + r.id + ")");
const list = Object.values(m).sort((a, b) => a.trailhead.localeCompare(b.trailhead));
fs.writeFileSync(path.join(here, "trailheads.json"), JSON.stringify(list, null, 1));
console.log("targets", out.length, "with a named trailhead", out.filter(r => r.trailhead).length, "distinct trailheads", list.length);
