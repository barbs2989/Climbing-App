import { C } from "../../ClimbMatchCore.jsx";
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
/** One aggregated condition or hazard, as buildConsensus groups it. */
export interface CRowItem {
  label: string;
  count: number;
  reports: CRowReport[];
  /** Agreed by enough trusted reporters to read as community-verified. */
  promoted?: boolean;
  /** Also stated in the route's own info. */
  official?: boolean;
  season?: string | null;
  year?: string | number | null;
  /** Reported within the recent window: the year is drawn green with a dot. */
  recent?: boolean;
  /** How many recent reports said it was NOT present. */
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
  /** "h" for a hazard (it gets the vote buttons and the community-flagged badge); anything else is a condition. */
  kind: string;
  /** The key of the row that is open (`kind:label`), or null. One row opens at a time. */
  openK: string | null;
  setOpenK: (key: string | null) => void;
  routeId: string | number;
  /** Votes keyed `routeId|label`. */
  hzVotes?: Record<string, HazardVote> | null;
  /** Casts a vote on a hazard; without it the vote buttons are not drawn. */
  onVote?: ((routeId: string | number, label: string, vote: "still" | "gone") => void) | null;
}

/**
 * One row of the CONDITIONS / HAZARDS consensus: the label, its badge, how many reports, season and year; it opens
 * (aria-expanded) to the reporters, any recent "not present" reports, and — for a hazard — Still there / Gone now.
 * Reads `C` at render time. Moved verbatim from RouteDetail.jsx; only the props type was added.
 */
export default function CRow({item,kind,openK,setOpenK,routeId,hzVotes,onVote}: CRowProps){const key=kind+":"+item.label;const open=openK===key;const badge=item.promoted?{t:"community-verified",c:C.purple,b:C.purpleBg}:item.official?{t:"✓ in route info",c:C.green,b:C.greenBg}:kind==="h"?{t:"community-flagged",c:C.amber,b:C.amberBg}:null;return <div style={{marginBottom:2}}><div {...clickable(()=>setOpenK(open?null:key))} aria-expanded={open} style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",cursor:"pointer",minHeight:44}}><span style={{fontSize:12.5,color:C.text,fontWeight:600,flex:1,minWidth:84}}>{item.label}</span>{badge?<span style={{fontSize:12,fontWeight:700,color:badge.c,background:badge.b,borderRadius:6,padding:"2px 6px"}}>{badge.t}</span>:null}<span style={{fontSize:12,color:C.text,fontWeight:700}}>{item.count+(item.count===1?" report":" reports")}</span>{item.season?<span style={{fontSize:12,color:C.textMuted}}>{item.season}</span>:null}{item.year?<span style={{fontSize:12,color:item.recent?C.green:C.textMuted,fontWeight:600}}>{(item.recent?"● ":"")+item.year}</span>:null}<span aria-hidden="true" style={{display:"flex"}}><Chevron open={open} size={14} color={C.blue}/></span></div>{open?<div style={{margin:"5px 0 9px",paddingLeft:8,borderLeft:`2px solid ${C.border}`}}>{item.reports.slice(0,8).map((rp,ri)=><div key={ri} style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}><Av src={rp.avatar} size={16}/><span style={{fontSize:12,color:C.textSub,flex:1}}>{rp.user}</span><span style={{fontSize:12,color:C.textMuted}}>{rp.date||""}</span></div>)}{item.neg?<div style={{fontSize:12,color:C.amber,marginTop:4}}>{item.neg+" recent report"+(item.neg!==1?"s":"")+" said it was not present — may be resolving."}</div>:null}{kind==="h"&&onVote?(()=>{const vk=routeId+"|"+item.label;const v=(hzVotes&&hzVotes[vk])||{still:0,gone:0,mine:null};return <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8,flexWrap:"wrap"}}><span style={{fontSize:12,color:C.textMuted}}>Still accurate?</span><button onClick={e=>{e.stopPropagation();onVote(routeId,item.label,"still");}} aria-pressed={v.mine==="still"} style={{...BTN_SM,border:`1px solid ${v.mine==="still"?C.green:C.border}`,background:v.mine==="still"?C.greenBg:"transparent",color:v.mine==="still"?C.green:C.textSub}}>{"Still there"+(v.still?" "+v.still:"")}</button><button onClick={e=>{e.stopPropagation();onVote(routeId,item.label,"gone");}} style={{...BTN_SM,border:`1px solid ${v.mine==="gone"?C.amber:C.border}`,background:v.mine==="gone"?C.amberBg:"transparent",color:v.mine==="gone"?C.amber:C.textSub}}>{"Gone now"+(v.gone?" "+v.gone:"")}</button></div>;})():null}</div>:null}</div>;}
