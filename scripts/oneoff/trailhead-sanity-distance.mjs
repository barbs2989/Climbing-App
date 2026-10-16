// Plausibility, not proof: how far is each borrowed trailhead from its own peak, and does
// that match the distance the route itself claims? The Primus failure was a trailhead 21.5 km
// away that belonged to a different peak — a gross distance check would have caught it.
import { selectAll } from "../lib/supabase-env.mjs";
import { WRITE } from "./trailhead-nocard-plan.mjs";

const areas = await selectAll("areas","id,name,lat,lng",{}, {pageSize:1000});
const A = new Map(areas.map(a => [a.id, a]));
const routes = await selectAll("routes","id,area_id,dist_km",{}, {pageSize:1000});
const R = new Map(routes.map(r => [r.id, r]));
const rad = Math.PI / 180;
const km = (aLat,aLng,bLat,bLng) => {
  const dLat=(bLat-aLat)*rad, dLng=(bLng-aLng)*rad;
  const s=Math.sin(dLat/2)**2+Math.cos(aLat*rad)*Math.cos(bLat*rad)*Math.sin(dLng/2)**2;
  return 2*6371*Math.asin(Math.sqrt(s));
};

console.log("route".padEnd(38) + "TH->peak   route says   verdict");
for (const e of WRITE) {
  if (!e.coord) { console.log(e.id.padEnd(38) + "  (name only, no coordinate written)"); continue; }
  const r = R.get(e.id); const a = A.get(r.area_id);
  if (!a || a.lat == null) { console.log(e.id.padEnd(38) + "  peak has no coordinate"); continue; }
  const d = km(e.coord[0], e.coord[1], a.lat, a.lng);
  const claim = r.dist_km;
  // straight line is always shorter than the trail; flag only a gross mismatch
  const verdict = d > 40 ? "FAR — check" : (claim != null && d > claim * 1.15) ? "further than the route's own dist_km" : "plausible";
  console.log(e.id.padEnd(38) + (d.toFixed(1)+" km").padEnd(11) + String(claim == null ? "—" : claim + " km").padEnd(13) + verdict);
}
