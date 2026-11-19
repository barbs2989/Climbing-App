import { C, shortDate, ago } from "../../ClimbMatchCore.jsx";
import { clickable } from "../../lib/clickable";
import { BTN_SM } from "../../lib/buttonStyles.js";
import Av from "./Av.tsx";
import Chevron from "./Chevron.tsx";

/** One climber's report behind a condition or hazard. */
export interface CRowReport {
  avatar?: string | null;
  user?: string | null;
  date?: string | null;
}
/** One aggregated condition or hazard, as buildConsensus and routeKw group it. */
export interface CRowItem {
  label: string;
  count: number;
  reports: CRowReport[];
  /** Agreed by enough reports across seasons to read as community-verified. */
  promoted?: boolean;
  /** Also stated in the route's own info. */
  official?: boolean;
  /** The newest report that named it. */
  lastDate?: string | null;
  /** How many reports said it was NOT present. */
  neg?: number | null;
}
/** The still-there / gone-now tallies for one hazard, and this climber's own vote. */
export interface HazardVote {
  still: number;
  gone: number;
  mine: "still" | "gone" | null;
}
export interface CRowProps {
  item: CRowItem;
  /** "h" for a hazard (it gets the vote buttons); anything else is a condition. */
  kind: string;
  /** The muted line under the label. Left out, it is the report count and how long ago the newest was. */
  meta?: string;
  /** A hazard reported inside the recent window and not voted gone: drawn in red with a "reported recently" mark. */
  fresh?: boolean;
  /** The key of the row that is open (`kind:label`), or null. One row opens at a time. */
  openK: string | null;
  setOpenK: (key: string | null) => void;
  routeId: string | number;
  /** Votes keyed `routeId|label`. */
  hzVotes?: Record<string, HazardVote> | null;
  /** Casts a vote on a hazard; without it the vote buttons are not drawn. */
  onVote?: ((routeId: string | number, label: string, vote: "still" | "gone") => void) | null;
}

/** How many reporters an opened row lists before it says "and N more". */
const SHOWN=8;

/**
 * One row of the Reports consensus (HAZARDS and MENTIONED MOST): the label and at most one mark on the first line, the
 * counts on the second. It opens (aria-expanded) to the reporters, newest first, any reports that said it was not
 * there, and for a hazard the Still there / Gone now vote. Every row is two lines, so nothing wraps mid-fact on a phone:
 * the old single line carried label, badge, count, season and year and broke differently on every row.
 */
export default function CRow({item,kind,meta,fresh,openK,setOpenK,routeId,hzVotes,onVote}: CRowProps){
  const key=kind+":"+item.label;const open=openK===key;
  const badge=fresh?{t:"reported recently",c:C.red,b:C.redBg}:item.promoted?{t:"community-verified",c:C.purple,b:C.purpleBg}:item.official?{t:"in route info",c:C.green,b:C.greenBg}:null;
  const more=item.reports.length-SHOWN;
  const line=meta!=null?meta:item.count+" report"+(item.count===1?"":"s")+(item.lastDate?" · "+(item.count===1?"":"latest ")+ago(item.lastDate):"");
  return <div style={{borderTop:`1px solid ${C.borderLight}`}}>
    <div {...clickable(()=>setOpenK(open?null:key))} aria-expanded={open} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",minHeight:44,padding:"7px 0"}}>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}><span style={{fontSize:13,color:C.text,fontWeight:600,overflowWrap:"anywhere"}}>{item.label}</span>{badge?<span style={{fontSize:11.5,fontWeight:700,color:badge.c,background:badge.b,borderRadius:6,padding:"1px 6px"}}>{badge.t}</span>:null}</div>
        <div style={{fontSize:12,color:C.textMuted,marginTop:2,lineHeight:1.4}}>{line}</div>
      </div>
      <span aria-hidden="true" style={{display:"flex",flexShrink:0}}><Chevron open={open} size={14} color={C.blue}/></span>
    </div>
    {open?<div style={{margin:"0 0 10px",paddingLeft:8,borderLeft:`2px solid ${C.border}`}}>
      {item.reports.slice(0,SHOWN).map((rp,ri)=><div key={ri} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><Av src={rp.avatar} size={16}/><span style={{fontSize:12,color:C.textSub,flex:1,minWidth:0,overflowWrap:"anywhere"}}>{rp.user||"A climber"}</span><span style={{fontSize:12,color:C.textMuted,flexShrink:0}}>{rp.date?shortDate(rp.date):""}</span></div>)}
      {more>0?<div style={{fontSize:12,color:C.textMuted}}>{"and "+more+" more"}</div>:null}
      {item.neg?<div style={{fontSize:12,color:C.amber,marginTop:4,lineHeight:1.4}}>{item.neg+" report"+(item.neg!==1?"s":"")+" said it was not there — it may come and go."}</div>:null}
      {kind==="h"&&onVote?(()=>{const vk=routeId+"|"+item.label;const v=(hzVotes&&hzVotes[vk])||{still:0,gone:0,mine:null};return <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8,flexWrap:"wrap"}}><span style={{fontSize:12,color:C.textMuted}}>Still there?</span><button onClick={e=>{e.stopPropagation();onVote(routeId,item.label,"still");}} aria-pressed={v.mine==="still"} style={{...BTN_SM,border:`1px solid ${v.mine==="still"?C.green:C.border}`,background:v.mine==="still"?C.greenBg:"transparent",color:v.mine==="still"?C.green:C.textSub}}>{"Still there"+(v.still?" "+v.still:"")}</button><button onClick={e=>{e.stopPropagation();onVote(routeId,item.label,"gone");}} aria-pressed={v.mine==="gone"} style={{...BTN_SM,border:`1px solid ${v.mine==="gone"?C.amber:C.border}`,background:v.mine==="gone"?C.amberBg:"transparent",color:v.mine==="gone"?C.amber:C.textSub}}>{"Gone now"+(v.gone?" "+v.gone:"")}</button></div>;})():null}
    </div>:null}
  </div>;
}
