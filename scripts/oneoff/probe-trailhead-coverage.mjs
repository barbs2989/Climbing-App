import { selectAll } from "../lib/supabase-env.mjs";

const areas = await selectAll("areas","id,name,path,parent_id,area_type",{}, {pageSize:1000});
const wa = new Set(areas.filter(a=>String(a.path||"")==="usa.washington"||String(a.path||"").startsWith("usa.washington.")).map(a=>a.id));
const routes = await selectAll("routes","id,name,area_id,discipline,approach,approach_logistics,waypoints,road,dist_km",{}, {pageSize:1000});
const waR = routes.filter(r=>wa.has(r.area_id));

const ALPINE = new Set(["alpine","mountaineering","ice","mixed"]);
const alp = waR.filter(r=>ALPINE.has(r.discipline));

function stat(set,label){
  const n=set.length;
  const al=r=>r.approach_logistics||{};
  const wpTh=r=>(Array.isArray(r.waypoints)?r.waypoints:[]).find(w=>/trailhead/i.test(String(w&&w.type||"")));
  const hasName=r=>!!(al(r).trailhead)|| !!(wpTh(r)&&wpTh(r).name);
  const hasCoord=r=>al(r).trailheadLat!=null||!!(wpTh(r)&&wpTh(r).lat!=null);
  const hasDir=r=>!!(al(r).trailheadDirection&&String(al(r).trailheadDirection).trim());
  const hasApproach=r=>!!(r.approach&&String(r.approach).trim());
  const card=r=>hasName(r)||hasCoord(r);           // TrailheadCard renders at all
  const pct=x=>n?(100*x/n).toFixed(1)+"%":"-";
  console.log("\n=== "+label+" — "+n+" routes ===");
  console.log("  trailhead NAME or coord (card renders at all) :", set.filter(card).length, pct(set.filter(card).length));
  console.log("  trailhead NAME                                :", set.filter(hasName).length, pct(set.filter(hasName).length));
  console.log("  trailhead COORDINATE                          :", set.filter(hasCoord).length, pct(set.filter(hasCoord).length));
  console.log("  DRIVING directions (trailheadDirection)       :", set.filter(hasDir).length, pct(set.filter(hasDir).length));
  console.log("  approach PROSE                                :", set.filter(hasApproach).length, pct(set.filter(hasApproach).length));
  console.log("  NEITHER approach prose NOR trailhead card     :", set.filter(r=>!hasApproach(r)&&!card(r)).length, pct(set.filter(r=>!hasApproach(r)&&!card(r)).length));
  const lens=set.filter(hasApproach).map(r=>String(r.approach).length).sort((a,b)=>a-b);
  if(lens.length) console.log("  approach length p10/med/p90                   :", lens[Math.floor(lens.length*0.1)], lens[Math.floor(lens.length/2)], lens[Math.floor(lens.length*0.9)]);
  const thin=set.filter(r=>hasApproach(r)&&String(r.approach).length<200).length;
  console.log("  approach prose under 200 chars ('thin')       :", thin, pct(thin));
}

stat(waR,"ALL WA routes");
stat(alp,"WA ALPINE-discipline routes");
