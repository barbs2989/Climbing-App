// Profiles the WA alpine routes with NEITHER a trailhead card NOR approach prose: grouped by area
// and discipline, so the backlog can be sized by what it actually is. Read-only.
import { selectAll } from "../../lib/supabase-env.mjs";
const areas = await selectAll("areas", "id,path,name,area_type", {}, { pageSize: 1000 });
const byId = new Map(areas.map(a => [a.id, a]));
const wa = new Set(areas.filter(a => String(a.path || "") === "usa.washington" || String(a.path || "").startsWith("usa.washington.")).map(a => a.id));
const routes = await selectAll("routes", "id,area_id,discipline,approach,approach_logistics,waypoints", {}, { pageSize: 1000 });
const ALP = new Set(["alpine", "mountaineering", "ice", "mixed"]);
const hasCard = r => r.approach_logistics && (r.approach_logistics.trailhead || (r.waypoints || []).some(w => w.type === "Trailhead"));
const gap = routes.filter(r => wa.has(r.area_id) && ALP.has(r.discipline) && !hasCard(r) && !String(r.approach || "").trim());
const disc = {}, types = {}, groups = {};
for (const r of gap) {
  disc[r.discipline] = (disc[r.discipline] || 0) + 1;
  const a = byId.get(r.area_id) || {};
  types[a.area_type || "?"] = (types[a.area_type || "?"] || 0) + 1;
  const k = a.name || r.area_id;
  groups[k] = (groups[k] || 0) + 1;
}
console.log("routes", gap.length, "disciplines", JSON.stringify(disc), "area types", JSON.stringify(types));
const top = Object.entries(groups).sort((a, b) => b[1] - a[1]);
console.log("areas", top.length, "| top:", top.slice(0, 25).map(([k, n]) => k + " " + n).join("; "));
console.log("areas with 1 route", top.filter(([, n]) => n === 1).length);
