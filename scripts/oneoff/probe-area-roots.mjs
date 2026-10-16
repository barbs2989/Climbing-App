import { selectAll } from "../lib/supabase-env.mjs";
const areas = await selectAll("areas","id,name,path,parent_id,area_type,route_count",{}, {pageSize:1000});
const byId=new Map(areas.map(a=>[a.id,a]));
const roots = areas.filter(a=>a.parent_id==null);
console.log("ROOT areas (parent_id null):", roots.length);
for(const r of roots) console.log("  *",r.id,"|",r.name,"|",r.area_type,"| path:",r.path,"| routes:",r.route_count);
const wa = areas.find(a=>a.name==="Washington"&&a.area_type==="state");
console.log("\nWashington row:", wa && JSON.stringify({id:wa.id,parent:wa.parent_id,path:wa.path,type:wa.area_type}));
let cur=wa, chain=[];
while(cur){ chain.unshift(cur.id+" ("+cur.name+", "+cur.area_type+")"); cur=cur.parent_id?byId.get(cur.parent_id):null; }
console.log("ancestor chain to Washington:\n  " + chain.join("\n  > "));
console.log("\narea_type values at each level:", [...new Set(areas.map(a=>a.area_type))].join(", "));
