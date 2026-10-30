import { C, normTag, ROUTE_GAP } from "../../ClimbMatchCore.jsx";
import CardHead from "./CardHead.tsx";

/** One trip report, as much of it as this card reads. */
export interface BetaDiffReport {
  date?: string | null;
  condTags?: string[] | null;
  user?: string | null;
  tickType?: string | null;
}
export interface BetaDiffProps {
  /** The route; its `activity` (trip reports) is all that is read. Nothing renders without one. */
  route: { activity?: BetaDiffReport[] | null };
}

/**
 * WHAT'S CHANGED: how many parties reported lately, who reported last and when, and the condition tags the six
 * most recent reports repeat most. Reads `C` at render time. Moved verbatim from RouteDetail.jsx; only the
 * types were added.
 */
export default function BetaDiff({route}: BetaDiffProps){
  const acts=(route.activity||[]).slice().sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  if(!acts.length)return null;
  const MN=["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const fmtShort=(d?: string|null)=>{if(!d)return "recently";const q=String(d).split("-");return (MN[parseInt(q[1])]||"")+" "+(q[2]?parseInt(q[2]):"");};
  const recent=acts.slice(0,6);const tagCount: Record<string,number>={};recent.forEach(a=>(a.condTags||[]).forEach(t=>{t=normTag(t);tagCount[t]=(tagCount[t]||0)+1;}));
  const tags=Object.keys(tagCount).sort((a,b)=>tagCount[b]-tagCount[a]).slice(0,5);const latest=acts[0];
  return <div style={{background:"linear-gradient(155deg,#0f1e14,#10241a)",border:"1px solid "+C.greenDim,borderRadius:13,padding:"13px 14px",marginBottom:ROUTE_GAP}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7}}><CardHead tone={C.green}>What’s changed</CardHead><span style={{fontSize:11.5,fontWeight:700,color:C.green,background:C.greenBg,border:"1px solid "+C.greenDim,borderRadius:6,padding:"2px 7px"}}>{"✓ "+acts.length+" report"+(acts.length!==1?"s":"")}</span></div><div style={{fontSize:12,color:C.textSub,lineHeight:1.5,marginBottom:tags.length?10:0}}>{recent.length+" recent part"+(recent.length!==1?"ies":"y")+" checked in. Latest: "+(latest.user?latest.user.split(" ")[0]:"a climber")+" on "+fmtShort(latest.date)+(latest.tickType?" · "+latest.tickType:"")+"."}</div>{tags.length?<div><CardHead style={{marginBottom:8}}>What recent parties are flagging</CardHead><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{tags.map(t=><span key={t} style={{fontSize:11.5,fontWeight:600,color:C.text,background:C.card,border:"1px solid "+C.border,borderRadius:7,padding:"3px 8px"}}>{t}{tagCount[t]>1?" ×"+tagCount[t]:""}</span>)}</div></div>:null}</div>;
}
