import { C, SUB_LABEL, uElev } from "../../ClimbMatchCore.jsx";
import { planTimes } from "../../lib/planTimes.js";
import { tripLegGeometry, fmtLegKm, fmtLegHrs } from "../../lib/tripLegs.js";

export interface DescentLegStripProps {
  route: Parameters<typeof tripLegGeometry>[0];
  /** The Full trip time settings (pace, pack, party, departure). */
  calc: Parameters<typeof planTimes>[1];
}

/** THE DESCENT'S OWN LEG, at the top of the DESCENT section: the way down, timed and measured with the same
   numbers SummitLegsCard prints under GETTING THERE (tripLegGeometry and planTimes at the same calc). It
   gives a leg only where the route comes back the way it went; a loop or point-to-point has no split to
   print, and its whole-day row is timed on the trip profile above. Renders nothing when there is no leg.
 *
 * Reads `C` at render time. Moved verbatim from RouteDetail.jsx; only the types were added.
 */
export default function DescentLegStrip({route,calc}: DescentLegStripProps){
  const pt=planTimes(route,calc);const g=tripLegGeometry(route);
  if(pt.publishedIsWholeDay||!g.legKm)return null;
  const rowsAll: ([string, string] | null)[]=[["Distance","~"+fmtLegKm(g.legKm)],g.dropFt?["Drop","↓ "+uElev(g.dropFt)]:null,["Time",fmtLegHrs(pt.downH,!pt.walkOutKnown)]];
  const rows=rowsAll.filter(function(s): s is [string, string] {return s!==null;});
  return <div style={{background:C.surface,borderRadius:10,padding:"8px 12px",marginBottom:8,border:"1px solid "+C.border}}>
    <div style={{...SUB_LABEL,marginBottom:5}}>{"SUMMIT TO TRAILHEAD"}</div>
    <div style={{display:"flex",flexWrap:"wrap",gap:"4px 18px"}}>{rows.map(function(s){return <div key={s[0]} style={{minWidth:0}}><div style={{fontSize:14,fontWeight:700,color:C.text,fontVariantNumeric:"tabular-nums",whiteSpace:"nowrap"}}>{s[1]}</div><div style={{fontSize:11,color:C.textMuted}}>{s[0]}</div></div>;})}</div>
  </div>;
}
