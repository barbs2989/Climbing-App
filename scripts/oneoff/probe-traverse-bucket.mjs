import { selectAll } from "../lib/supabase-env.mjs";

const areas = await selectAll("areas","id,name,path,parent_id,area_type,lat,lng,route_count",{}, {pageSize:1000});
const byId = new Map(areas.map(a=>[a.id,a]));
function crumb(id){ const out=[]; let cur=byId.get(id); let g=0;
  while(cur&&g++<20){ out.unshift(cur.name); cur=cur.parent_id?byId.get(cur.parent_id):null; } return out.join(" > "); }

const bucket = areas.filter(a=>/traverse/i.test(a.name||""));
console.log("=== areas whose NAME mentions traverse ===");
for(const a of bucket) console.log("*",a.id,"|",a.area_type,"| routes:",a.route_count,"|",crumb(a.id),"| lat/lng:",a.lat,a.lng);

const routes = await selectAll("routes","id,name,area_id,discipline,pitches,grade,alpine_grade",{}, {pageSize:1000});
for(const a of bucket){
  const rs = routes.filter(r=>r.area_id===a.id);
  if(!rs.length) continue;
  console.log("\n=== routes filed under "+a.name+" ("+a.id+") — "+rs.length+" ===");
  for(const r of rs) console.log("  -",r.id,"|",r.name,"|",r.discipline,"| pitches:",r.pitches,"| grade:",r.grade,"| alpine:",r.alpine_grade);
}
