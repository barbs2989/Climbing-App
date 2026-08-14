import { selectAll } from "../lib/supabase-env.mjs";

const areas = await selectAll("areas","id,name,path,lat,lng,elevation_ft",{}, {pageSize:1000});
const byId=new Map(areas.map(a=>[a.id,a]));
const wa = new Set(areas.filter(a=>String(a.path||"")==="usa.washington"||String(a.path||"").startsWith("usa.washington.")).map(a=>a.id));
const routes = await selectAll("routes","id,name,area_id,discipline,approach,approach_logistics,waypoints,gpx,dist_km,gain_ft",{}, {pageSize:1000});
const ALPINE=new Set(["alpine","mountaineering","ice","mixed"]);
const al=r=>r.approach_logistics||{};
const thWp=r=>(Array.isArray(r.waypoints)?r.waypoints:[]).find(w=>/trailhead/i.test(String(w&&w.type||"")));
const hasDir=r=>!!(al(r).trailheadDirection&&String(al(r).trailheadDirection).trim());
const alp = routes.filter(r=>wa.has(r.area_id)&&ALPINE.has(r.discipline));
const noDir = alp.filter(r=>!hasDir(r) && (al(r).trailhead || thWp(r)));

const only = process.argv[2] ? new Set(process.argv[2].split(",")) : null;
const list = only ? noDir.filter(r=>only.has(r.id)) : noDir;
console.log("routes:", list.length, "\n");
for (const r of list) {
  const a = byId.get(r.area_id);
  const w = thWp(r);
  console.log("======== " + r.id + "  |  " + (a?a.name:"?") + " — " + r.name);
  console.log("  peak lat/lng: " + (a?a.lat+","+a.lng:"?") + "   dist_km:" + r.dist_km + "  gain_ft:" + r.gain_ft);
  console.log("  AL.trailhead      : " + (al(r).trailhead||"(none)"));
  console.log("  AL.trailheadLat/Lng: " + (al(r).trailheadLat!=null?al(r).trailheadLat+","+al(r).trailheadLng:"(none)"));
  console.log("  WP trailhead      : " + (w?JSON.stringify({name:w.name,lat:w.lat,lng:w.lng,elev:w.elev!=null?w.elev:w.elevFt}):"(none)"));
  console.log("  gpx points        : " + (Array.isArray(r.gpx)?r.gpx.length:0) + (Array.isArray(r.gpx)&&r.gpx.length?("  first="+JSON.stringify(r.gpx[0])):""));
  console.log("  APPROACH          : " + JSON.stringify(String(r.approach||"").slice(0,700)));
  console.log("");
}
