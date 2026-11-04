import { C } from "../../ClimbMatchCore.jsx";
import { BTN } from "../../lib/buttonStyles.js";
import CardHead from "./CardHead.tsx";

export interface PitchConsensusProps {
  /** One pitch; its belay, anchor and gear are read. */
  p: { anchor?: string | null; gear?: string | null; belay?: string | null };
  /** Opens the pitch editor; without it an empty pitch draws nothing. */
  onSuggestFix?: (() => void) | null;
}

/**
 * PITCH GEAR for one pitch: the belay station, the anchor and the gear, each saying what to add when it is empty,
 * and an Add / Edit button. Reads `C` at render time. Moved verbatim from RouteDetail.jsx; only the types were added.
 */
export default function PitchConsensus({p,onSuggestFix}: PitchConsensusProps){
  const anchor=String(p.anchor||"").trim();const gear=String(p.gear||"").trim();const belay=String(p.belay||"").trim();
  if(!anchor&&!gear&&!belay&&!onSuggestFix)return null;
  const box=function(label: string,text: string,empty: string){return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:8,padding:"8px 10px",marginBottom:6}}>
    <div style={{fontSize:11,fontWeight:700,color:C.textMuted,letterSpacing:0.4,textTransform:"uppercase",marginBottom:3}}>{label}</div>
    <div style={{fontSize:13,color:text?C.text:C.textMuted,lineHeight:1.5,whiteSpace:"pre-wrap",wordBreak:"break-word",overflowWrap:"anywhere"}}>{text||empty}</div>
  </div>;};
  return <div style={{background:C.surface,borderRadius:8,padding:"10px 11px",marginBottom:9,border:"1px solid "+C.border}}>
    <CardHead tone={C.green} style={{marginBottom:8}}>Pitch gear</CardHead>
    {box("Belay station",belay,"Not described yet — say where the belayer stands and how to find it")}
    {box("Anchor",anchor,"Not described yet — say what the anchor is built of")}
    {box("Gear for this pitch",gear,"Not described yet — say what to place, e.g. cams, nuts, slings")}
    {onSuggestFix?<button onClick={onSuggestFix} style={{...BTN,marginTop:3,background:"transparent",color:C.textSub,border:"1px solid "+C.border}}>{(anchor||gear||belay)?"Edit belay, anchor & gear":"Add belay, anchor & gear"}</button>:null}
  </div>;
}
