import { catOf, routeAscentFt, gainCoversWholeOuting, shapeOf, uDist } from "../ClimbMatchCore.jsx";
import { recShapeOf, effDistIsWholeTrip, effDistKm } from "./outing.js";

// The numbers the trip-leg cards print: one leg geometry for the Approach card and the Descent section, and the two
// formats they share. Moved verbatim out of RouteDetail.jsx (2026-10-29, PR56 of the component extraction) so
// SummitLegsCard, DescentLegStrip and TripProfileCard in src/components/ read them without importing the page.

/* THE LEG GEOMETRY, ONCE. The Approach card and the Descent section both read it, so a leg's miles and
   feet cannot differ between sections. Feet are the stored gain (see gainCoversWholeOuting) and the drop
   the time model walks down: the larger of stored gain and loss, which is what planTimes() charges. */
export function tripLegGeometry(route){
  const disc=catOf(route);
  const ascent=routeAscentFt(route);
  const gainFt=ascent>0&&(disc==="alpine"||disc==="mountaineering"||disc==="hiking"||gainCoversWholeOuting(route))?ascent:null;
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
