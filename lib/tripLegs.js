import { catOf, routeAscentFt, gainCoversWholeOuting, shapeOf, uDist } from "../ClimbMatchCore.jsx";
import { recShapeOf, effDistIsWholeTrip, effDistKm } from "./outing.js";

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
   before the climb, and the re-climb of it on the way home, had nowhere to appear.

   PUBLISHED FIGURES ONLY (owner, same day: "i dont want to have to do any of our own math, all the
   information should be online"): routes.approach_loss_ft and routes.return_gain_ft (0441), written by the
   research pipeline with their sources in route_field_evidence. The app computes neither -- not from the
   track's heights (PR #3352 did; this replaced it), not from loss_ft, which holds two conventions
   (research-data/gain-loss-audit-2026-11-14/). A route no source covers prints nothing. */
export function publishedLegClimb(route){
  const n=v=>v==null||v===""||!Number.isFinite(Number(v))?null:Math.round(Number(v));
  return route?{upLoss:n(route.approachLossFt),downGain:n(route.returnGainFt)}:{upLoss:null,downGain:null};
}
