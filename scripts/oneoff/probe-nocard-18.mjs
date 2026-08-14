// The 18 WA alpine routes whose trailhead card does not render at all (no name, no coord
// in either record). For each, print everything on the row that could ESTABLISH a trailhead
// without leaving the route: its own approach prose, its own gpx start, and its peers on the
// same peak. Nothing here is researched — this is what the row already knows.
import { selectAll } from "../lib/supabase-env.mjs";

const areas = await selectAll("areas","id,name,path,lat,lng",{}, {pageSize:1000});
const byId=new Map(areas.map(a=>[a.id,a]));
const wa = new Set(areas.filter(a=>String(a.path||"")==="usa.washington"||String(a.path||"").startsWith("usa.washington.")).map(a=>a.id));
const routes = await selectAll("routes","id,name,area_id,discipline,approach,approach_logistics,waypoints,gpx",{}, {pageSize:1000});
const ALPINE=new Set(["alpine","mountaineering","ice","mixed"]);
const al=r=>r.approach_logistics||{};
const thWp=r=>(Array.isArray(r.waypoints)?r.waypoints:[]).find(w=>/trailhead/i.test(String(w&&w.type||"")));
const card=r=>!!(al(r).trailhead)||!!(thWp(r)&&thWp(r).name)||al(r).trailheadLat!=null||!!(thWp(r)&&thWp(r).lat!=null);
const alp = routes.filter(r=>wa.has(r.area_id)&&ALPINE.has(r.discipline));
const noCard = alp.filter(r=>!card(r));

console.log("WA alpine routes with NO trailhead card:", noCard.length, "\n");
for (const r of noCard) {
  const a = byId.get(r.area_id);
  const peers = alp.filter(p=>p.area_id===r.area_id && p.id!==r.id);
  const peerTh = peers.map(p=>{
    const w=thWp(p); const n=al(p).trailhead||(w&&w.name);
    const lat=al(p).trailheadLat!=null?al(p).trailheadLat:(w&&w.lat);
    const lng=al(p).trailheadLng!=null?al(p).trailheadLng:(w&&w.lng);
    return n?{route:p.id,name:n,lat,lng}:null;
  }).filter(Boolean);
  console.log("======== " + r.id + "   [" + (a?a.name:"?") + "]  — " + r.name);
  console.log("  gpx: " + (Array.isArray(r.gpx)?r.gpx.length:0) + " pts" + (Array.isArray(r.gpx)&&r.gpx.length?("  START="+JSON.stringify(r.gpx[0])):""));
  console.log("  peers on this peak WITH a trailhead: " + (peerTh.length?"":"(none)"));
  for (const p of peerTh) console.log("      " + p.route + "  ->  " + p.name + "  @ " + p.lat + "," + p.lng);
  console.log("  own approach (" + String(r.approach||"").length + " chars): " + JSON.stringify(String(r.approach||"").slice(0,600)));
  console.log("");
}
