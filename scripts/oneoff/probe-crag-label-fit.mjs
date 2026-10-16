// "Crag" is a rock-climbing word. How many LEAF areas labelled Crag are actually alpine?
import { selectAll } from "../lib/supabase-env.mjs";

const areas = await selectAll("areas","id,name,parent_id,area_type,route_count,dominant_discipline",{}, {pageSize:1000});
const crags = areas.filter(a=>a.area_type==="crag");
const byDisc = new Map();
for (const a of crags) {
  const d = a.dominant_discipline || "(null)";
  byDisc.set(d, (byDisc.get(d)||0)+1);
}
console.log("area_type='crag' by dominant_discipline (" + crags.length + " total):");
for (const [d,n] of [...byDisc].sort((a,b)=>b[1]-a[1])) console.log("  " + String(n).padStart(6), d);

const ALPINE = new Set(["alpine","mountaineering","ice","mixed"]);
const alpineCrags = crags.filter(a=>ALPINE.has(a.dominant_discipline));
console.log("\ncrags whose dominant discipline is alpine-ish:", alpineCrags.length);
console.log("of those, with routes:", alpineCrags.filter(a=>a.route_count>0).length);
console.log("\nsample (top 20 by route_count):");
for (const a of alpineCrags.sort((x,y)=>y.route_count-x.route_count).slice(0,20))
  console.log("  " + String(a.route_count).padStart(4), a.id.padEnd(42), a.dominant_discipline, "|", a.name);

const TARGETS = ["wa_alpine_and_technical_traverses","co_indian_peaks_traverses","co_long_multi_area_traverses",
  "co_northern_san_juan_traverses","co_tenmile_range_traverses","co_traverses_at_x_y_z_area"];
console.log("\nthe six traverse containers' dominant_discipline:");
for (const id of TARGETS) { const a = areas.find(x=>x.id===id); console.log("  " + id.padEnd(34), a ? a.dominant_discipline : "MISSING"); }
