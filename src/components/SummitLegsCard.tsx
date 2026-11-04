import { C, SUB_LABEL, climbsAPeak, uElev } from "../../ClimbMatchCore.jsx";
import { itinDayCount } from "../../lib/outing.js";
import { planTimes } from "../../lib/planTimes.js";
import { tripLegGeometry, fmtLegKm, fmtLegHrs } from "../../lib/tripLegs.js";

/** A stat on a leg card: its label, then its value. */
type LegStat = [string, string];
/** A leg card: its heading and the stats it prints (a null is a stat the route has no number for). */
type Leg = [string, (LegStat | null)[]];
export interface SummitLegsCardProps {
  route: Parameters<typeof tripLegGeometry>[0];
  /** The Full trip time settings (pace, pack, party, departure). */
  calc: Parameters<typeof planTimes>[1];
}

/** TRAILHEAD TO SUMMIT · SUMMIT TO TRAILHEAD (owner, 2026-10-21): the two legs a party plans the day by, under
   the trailhead card, so the drive, the coordinates and how long it is from the car to the top and back sit
   together. Laid out the way The Mountaineers' route pages print their trip profile — one row per leg, each
   with its time, gain and distance. The times come from planTimes() at the pace, pack, party and departure
   the climber set in Full trip time (passed in as `calc`), so this card, the Descent section and Full trip
   time are one estimate and cannot disagree. A stored leg wins there and here alike. It sits OUTSIDE
   TrailheadCard on purpose: that card carries no stat tiles (check:trailhead-directions section 7).
   GAIN only where the stored gain is the whole climb to the top — the rule TECH STATS labels it by — and
   DISTANCE per leg only on a route that comes back the way it went; a loop or point-to-point gives the
   whole outing once instead of inventing a split.
 *
 * Reads `C` at render time. Moved verbatim from RouteDetail.jsx; only the types were added.
 */
export default function SummitLegsCard({route,calc}: SummitLegsCardProps){
  const pt=planTimes(route,calc);const g=tripLegGeometry(route);
  const {disc,gainFt,dropFt,km,hasKm,whole,outBack,legKm}=g;
  const top=climbsAPeak(route)||disc==="alpine"||disc==="mountaineering"||disc==="hiking"||disc==="scrambling"?"summit":"top of the climb";
  const upFloor=!pt.walkInKnown||!pt.climbKnown;const downFloor=!pt.walkOutKnown;
  const legs: Leg[]=pt.publishedIsWholeDay
    ?[["CAR TO CAR",[gainFt?["Gain","↑ "+uElev(gainFt)]:null,hasKm?["Distance",fmtLegKm(outBack&&!whole?km*2:km)]:null,["Time",fmtLegHrs(pt.tripH,upFloor||downFloor)]]]]
    :[["TRAILHEAD TO "+top.toUpperCase(),[gainFt?["Gain","↑ "+uElev(gainFt)]:null,legKm?["Distance","~"+fmtLegKm(legKm)]:null,["Time",fmtLegHrs(pt.totalH,upFloor)]]],
      [top.toUpperCase()+" TO TRAILHEAD",[legKm?["Distance","~"+fmtLegKm(legKm)]:null,legKm&&dropFt?["Drop","↓ "+uElev(dropFt)]:null,["Time",fmtLegHrs(pt.downH,downFloor)]]]];
  const shown=legs.map(function(l): [string, LegStat[]] {return [l[0],l[1].filter(function(s): s is LegStat {return s!==null;})];}).filter(function(l){return l[1].length;});
  if(!shown.length)return null;
  const days=itinDayCount(route);
  const note="Times use the pace, pack and party set in Full trip time below."
    +(!pt.publishedIsWholeDay&&hasKm&&!legKm?" This route does not come back the way it goes: "+fmtLegKm(km)+" for the whole outing.":"")
    +(days>1?" Usually done over "+days+" days — the Trip plan below splits it by day.":"");
  return <div style={{background:C.surface,borderRadius:10,padding:"4px 12px 11px",border:"1px solid "+C.border,marginBottom:12}}>
    {shown.map(function(l,i){return <div key={l[0]} style={{padding:"8px 0",borderTop:i===0?"none":"1px solid "+C.borderLight}}>
      <div style={{...SUB_LABEL,marginBottom:5}}>{l[0]}</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:"4px 18px"}}>{l[1].map(function(s){return <div key={s[0]} style={{minWidth:0}}><div style={{fontSize:14,fontWeight:700,color:C.text,fontVariantNumeric:"tabular-nums",whiteSpace:"nowrap"}}>{s[1]}</div><div style={{fontSize:11,color:C.textMuted}}>{s[0]}</div></div>;})}</div>
    </div>;})}
    <div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45,marginTop:4}}>{note}</div>
  </div>;
}
