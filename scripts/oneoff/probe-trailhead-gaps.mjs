import { selectAll } from "../lib/supabase-env.mjs";

const areas = await selectAll("areas","id,name,path,parent_id,area_type",{}, {pageSize:1000});
const byId=new Map(areas.map(a=>[a.id,a]));
const wa = new Set(areas.filter(a=>String(a.path||"")==="usa.washington"||String(a.path||"").startsWith("usa.washington.")).map(a=>a.id));
const routes = await selectAll("routes","id,name,area_id,discipline,approach,approach_logistics,waypoints",{}, {pageSize:1000});
const ALPINE=new Set(["alpine","mountaineering","ice","mixed"]);
const alp = routes.filter(r=>wa.has(r.area_id)&&ALPINE.has(r.discipline));

const al=r=>r.approach_logistics||{};
const wpTh=r=>(Array.isArray(r.waypoints)?r.waypoints:[]).find(w=>/trailhead/i.test(String(w&&w.type||"")));
const hasDir=r=>!!(al(r).trailheadDirection&&String(al(r).trailheadDirection).trim());
const card=r=>!!(al(r).trailhead)||!!(wpTh(r)&&wpTh(r).name)||al(r).trailheadLat!=null||!!(wpTh(r)&&wpTh(r).lat!=null);
const app=r=>r.approach?String(r.approach).trim():"";
const peak=r=>{const a=byId.get(r.area_id);return a?a.name:"?";};

const noCard = alp.filter(r=>!card(r));
const noDir  = alp.filter(r=>card(r)&&!hasDir(r));
const thin   = alp.filter(r=>app(r)&&app(r).length<200);
const noApp  = alp.filter(r=>!app(r));

console.log("WA alpine-discipline routes:", alp.length);
console.log("\n=== A. NO trailhead card at all (no name, no coord) — "+noCard.length+" ===");
for(const r of noCard) console.log("  -",r.id,"|",peak(r),"|",r.name,"| approach chars:",app(r).length);
console.log("\n=== B. NO approach prose — "+noApp.length+" ===");
for(const r of noApp) console.log("  -",r.id,"|",peak(r),"|",r.name);
console.log("\n=== C. trailhead card but NO driving directions — "+noDir.length+" ===");
for(const r of noDir.slice(0,80)) console.log("  -",r.id,"|",peak(r),"|",r.name);
if(noDir.length>80) console.log("  … and "+(noDir.length-80)+" more");
console.log("\n=== D. THIN approach prose (<200 chars) — "+thin.length+" ===");
for(const r of thin.slice(0,50)) console.log("  -",String(app(r).length).padStart(4),"|",r.id,"|",peak(r),"|",JSON.stringify(app(r).slice(0,110)));
if(thin.length>50) console.log("  … and "+(thin.length-50)+" more");
