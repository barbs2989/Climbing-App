// Groups every route's EXISTING driving direction by (trailhead, direction text), so each distinct
// drive can be checked online once. Read-only (anon key). Writes existing.json beside this file.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selectAll } from "../../lib/supabase-env.mjs";
const here = path.dirname(fileURLToPath(import.meta.url));
const areas = await selectAll("areas", "id,path", {}, { pageSize: 1000 });
const pathOf = new Map(areas.map(a => [a.id, String(a.path || "")]));
const routes = await selectAll("routes", "id,name,area_id,discipline,approach_logistics", { "approach_logistics->>trailheadDirection": "not.is.null" }, { pageSize: 1000 });
const m = new Map();
for (const r of routes) {
  const al = r.approach_logistics || {};
  const dir = String(al.trailheadDirection || "").trim();
  if (!dir) continue;
  const key = (al.trailhead || "") + "\u0000" + dir;
  if (!m.has(key)) m.set(key, { trailhead: al.trailhead || null, trailheadDirection: dir, state: (pathOf.get(r.area_id) || "").split(".").slice(0, 2).join("."), routes: [] });
  m.get(key).routes.push(r.id);
}
const list = [...m.values()].sort((a, b) => a.state.localeCompare(b.state) || String(a.trailhead).localeCompare(String(b.trailhead)));
fs.writeFileSync(path.join(here, "existing.json"), JSON.stringify(list, null, 1));
const byState = {};
for (const e of list) byState[e.state] = (byState[e.state] || 0) + 1;
console.log("routes with a direction", routes.filter(r => String(r.approach_logistics?.trailheadDirection || "").trim()).length, "distinct (trailhead, direction)", list.length, byState);
