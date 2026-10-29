import { C } from "../../ClimbMatchCore.jsx";
import { breakdownRows } from "../../lib/breakdownRows.js";

export interface BreakdownHandoffProps {
  route: Parameters<typeof breakdownRows>[0];
}

/** The join between CLIMBING ROUTE and the ROUTE BREAKDOWN drawn directly under it: a short spine
   down from the overview and one line saying what the breakdown holds, counted by breakdownRows()
   so it names the same pitches and legs the breakdown's own intro does. Text, not a control: the
   breakdown is the very next section.
 *
 * Reads `C` at render time. Moved verbatim from RouteDetail.jsx; only the types were added.
 */
export default function BreakdownHandoff({route}: BreakdownHandoffProps){
  const {pitchCount,stageCount}=breakdownRows(route);
  if(!pitchCount&&!stageCount)return null;
  const what=pitchCount
    ?(pitchCount+" roped pitch"+(pitchCount!==1?"es":"")+(stageCount?" and "+stageCount+" leg"+(stageCount!==1?"s":""):""))
    :(stageCount+" leg"+(stageCount!==1?"s":""));
  return <div data-handoff="" style={{display:"flex",alignItems:"center",gap:10,padding:"0 0 0 24px"}}><div aria-hidden="true" style={{width:2,height:22,background:C.blueDim,flexShrink:0}}/><span style={{fontSize:11.5,color:C.textMuted,lineHeight:1.4}}>{"↓ "+(pitchCount?"Pitch by pitch":"Leg by leg")+" below — "+what+" in the route breakdown."}</span></div>;
}
