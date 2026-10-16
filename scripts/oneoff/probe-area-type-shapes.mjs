import { selectAll } from "../lib/supabase-env.mjs";

const areas = await selectAll("areas","id,name,parent_id,area_type,route_count",{}, {pageSize:1000});
const routes = await selectAll("routes","id,area_id",{}, {pageSize:1000});
const direct = new Map();                       // area_id -> direct route count
for (const r of routes) direct.set(r.area_id, (direct.get(r.area_id)||0)+1);
const hasKids = new Set(areas.filter(a=>a.parent_id).map(a=>a.parent_id));

console.log("Which area_type values hold routes DIRECTLY (leaf with routes)?\n");
const byType = new Map();
for (const a of areas) {
  const d = direct.get(a.id)||0;
  const t = a.area_type||"(null)";
  if (!byType.has(t)) byType.set(t,{total:0,leafWithRoutes:0,routes:0,containers:0});
  const s = byType.get(t);
  s.total++;
  if (d>0) { s.leafWithRoutes++; s.routes+=d; }
  if (hasKids.has(a.id)) s.containers++;
}
console.log("type        total   holds-routes-directly   routes    has-child-areas");
for (const [t,s] of [...byType].sort((a,b)=>b[1].total-a[1].total))
  console.log(t.padEnd(11), String(s.total).padStart(6), String(s.leafWithRoutes).padStart(20), String(s.routes).padStart(10), String(s.containers).padStart(16));

const TARGETS = ["wa_alpine_and_technical_traverses","co_indian_peaks_traverses","co_long_multi_area_traverses",
  "co_northern_san_juan_traverses","co_tenmile_range_traverses","co_traverses_at_x_y_z_area"];
console.log("\nThe six traverse containers:");
for (const id of TARGETS) {
  const a = areas.find(x=>x.id===id);
  if (!a) { console.log("  MISSING", id); continue; }
  const parent = areas.find(x=>x.id===a.parent_id);
  console.log("  " + id.padEnd(34), "type:"+String(a.area_type).padEnd(7),
    "direct routes:"+String(direct.get(id)||0).padStart(3),
    "child areas:"+(hasKids.has(id)?"YES":"no"),
    "| parent:", parent?parent.name+" ["+parent.area_type+"]":"?");
}
