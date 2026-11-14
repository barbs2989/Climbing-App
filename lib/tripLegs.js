import { catOf, routeAscentFt, gainCoversWholeOuting, shapeOf, uDist } from "../ClimbMatchCore.jsx";
import { recShapeOf, effDistIsWholeTrip, effDistKm } from "./outing.js";
import { metresBetween, pointOf, recordedTrackPts } from "./track.js";

// The numbers the trip-leg cards print: one leg geometry for the Approach card and the Descent section, and the two
// formats they share. Moved verbatim out of RouteDetail.jsx (2026-10-29, PR56 of the component extraction) so
// SummitLegsCard, DescentLegStrip and TripProfileCard in src/components/ read them without importing the page.

/* THE LEG GEOMETRY, ONCE. The Approach card and the Descent section both read it, so a leg's miles and
   feet cannot differ between sections. Feet are the stored gain (see gainCoversWholeOuting) and the drop
   the time model walks down: the larger of stored gain and loss, which is what planTimes() charges.
   SCRAMBLING is a peak discipline like the other three (2026-11-14 audit): it was missing from this list,
   so 178 scrambles with a stored trailhead-to-summit gain printed no Gain on their leg card at all. */
export function tripLegGeometry(route){
  const disc=catOf(route);
  const ascent=routeAscentFt(route);
  const gainFt=ascent>0&&(disc==="alpine"||disc==="mountaineering"||disc==="scrambling"||disc==="hiking"||gainCoversWholeOuting(route))?ascent:null;
  const dropM=Math.max(route.lossM||0,route.gainM||0);
  const dropFt=dropM>0?Math.round(dropM*3.28084):null;
  const km=effDistKm(route);const hasKm=km!=null&&km>0;const whole=effDistIsWholeTrip(route);const rs=recShapeOf(route);
  const outBack=rs?rs==="outback":shapeOf(route)==="outback";
  const legKm=hasKm&&outBack?(whole?km/2:km):null;
  return {disc,gainFt,dropFt,km,hasKm,whole,outBack,legKm};
}
export const fmtLegKm=function(k){return uDist(Math.round(k*10)/10);};
/* A time at the Full trip time card's own format, with "≥" where a leg has no input to count from. */
export const fmtLegHrs=function(h,floor){return (floor?"≥":"")+h.toFixed(1)+"hr";};

/* THE DOWNHILL ON THE WAY UP, AND THE UPHILL ON THE WAY DOWN (owner, 2026-11-14: "mt goode northeast
   buttress has a pretty big descent on the approach, but the stats don't show that"). The leg cards
   printed one direction per leg -- Gain going up, Drop coming down -- so an approach that loses height
   before the climb, and the re-climb of it on the way home, had nowhere to appear. Goode's approach
   drops ~2,200 ft along Bridge Creek to the North Fork, and the card read "Gain 10,700" and nothing else.

   MEASURED ON THE ROUTE'S OWN RECORDED TRACK, never typed or guessed. `loss_ft` cannot answer it: it
   holds two conventions (the descent back to the car, or only the dips on the way in; see planTimes),
   and nothing in a row says which. The track can: snap the trailhead and summit pins to it (the same
   300 m tripProfile uses), then sum the rises and falls of its heights between them, ignoring wiggles
   under 10 m (33 ft) -- DEM and GPS noise, not terrain. The way home is the track itself when it comes
   back to the trailhead, the same line reversed when the track stops at the summit of a route that is
   not a loop or point-to-point, and unknown otherwise.
   Audit 2026-11-14 over the 11,394 alpine/mountaineering/scrambling routes: 165 carry a recorded track
   with heights, and 48 of them lose 250+ ft on the way up. Returns null when nothing can be measured,
   so no card prints a number the route cannot back. */
export const LEG_NOISE_FT=33;
/* Under this the dip is a bump in the trail, not something a party plans around, so no card prints it. */
export const LEG_SHOW_FT=200;
export function climbAlong(ft){
  let gain=0,loss=0,ref=ft[0];
  for(const h of ft){if(h-ref>=LEG_NOISE_FT){gain+=h-ref;ref=h;}else if(ref-h>=LEG_NOISE_FT){loss+=ref-h;ref=h;}}
  return {gain:Math.round(gain),loss:Math.round(loss)};
}
const LEG_SNAP_M=300;
function nearestOn(line,p){let best=Infinity,idx=-1;for(let i=0;i<line.length;i++){const d=metresBetween(p,line[i]);if(d<best){best=d;idx=i;}}return {idx,m:best};}
export function measuredLegClimb(route){
  if(!route)return null;
  const wps=Array.isArray(route.waypoints)?route.waypoints:[];
  const track=recordedTrackPts(route.gpxPts,wps);if(!track)return null;
  const line=track.map(pointOf);if(line.some(v=>!v))return null;
  const ft=Array.isArray(route.elevPts)&&route.elevPts.length===line.length?route.elevPts.map(Number):null;
  if(!ft||!ft.every(Number.isFinite))return null;
  const pinOf=rx=>wps.filter(w=>w&&rx.test(String(w.type||""))&&pointOf(w)).map(w=>nearestOn(line,pointOf(w))).filter(s=>s.m<=LEG_SNAP_M).sort((a,b)=>a.m-b.m)[0];
  const th=pinOf(/trailhead/i),su=pinOf(/summit|topout/i);
  if(!th||!su||su.idx<=th.idx)return null;
  const up=climbAlong(ft.slice(th.idx,su.idx+1));
  const tail=line.length-1-su.idx;
  const backHome=tail>5&&metresBetween(line[line.length-1],line[th.idx])<=LEG_SNAP_M;
  const shape=recShapeOf(route);
  const down=backHome?climbAlong(ft.slice(su.idx)):(tail<=Math.max(5,line.length*0.03)&&shape!=="point"&&shape!=="loop"?{gain:up.loss,loss:up.gain}:null);
  return {up,down,downBy:backHome?"track":down?"reversed":null};
}
