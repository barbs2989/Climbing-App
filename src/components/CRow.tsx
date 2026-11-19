import { C, shortDate } from "../../ClimbMatchCore.jsx";
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
  /** The list's own heading already says these are climber-reported, so the community-flagged badge is not repeated on every row. */
  underFlaggedHeading?: boolean;
}

/**
 * One row of the CONDITIONS / HAZARDS consensus, drawn as its own boxed control so it reads as something to tap:
 * the label, then one line of how many reports, season and year, with "View" and a chevron at the right ("Hide"
 * once open). It opens (aria-expanded) to the reporters with their dates, any recent "not present" reports, and,
 * for a hazard, Still there / Gone now. The row used to be bare text with a 14px chevron after the year, and
 * nothing said it opened (owner, 2026-11-18: "It's not clear what to click on to view").
 * Reads `C` at render time.
 */
export default function CRow({item,kind,openK,setOpenK,routeId,hzVotes,onVote,underFlaggedHeading}: CRowProps){const key=kind+":"+item.label;const open=openK===key;const badge=item.promoted?{t:"community-verified",c:C.purple,b:C.purpleBg}:item.official?{t:"✓ in route info",c:C.green,b:C.greenBg}:(kind==="h"&&!underFlaggedHeading)?{t:"community-flagged",c:C.amber,b:C.amberBg}:null;/* What climbers who went since have said, on the CLOSED row: three "Gone now" votes used to be visible only after opening it. */const tally=kind==="h"&&hzVotes?hzVotes[routeId+"|"+item.label]:null;const tallyText=tally&&(tally.still||tally.gone)?[tally.gone?tally.gone+(tally.gone===1?" says":" say")+" gone now":null,tally.still?tally.still+(tally.still===1?" says":" say")+" still there":null].filter(Boolean).join(" · "):"";/* ONE string, so a screen reader hears "2 reports · Oct–Nov · 2026" and not the fragments welded together (check:a11y-badges). */const meta=[item.count+(item.count===1?" report":" reports"),item.season,item.year?String(item.year):null].filter(Boolean).join(" · ");return <div style={{marginBottom:7,border:"1px solid "+(open?C.blueDim:C.border),borderRadius:10,background:C.surface,overflow:"hidden"}}><div {...clickable(()=>setOpenK(open?null:key))} aria-expanded={open} aria-label={item.label+", "+meta+(badge?", "+badge.t:"")+(tallyText?", "+tallyText:"")} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",minHeight:52,padding:"8px 12px",boxSizing:"border-box"}}><span style={{flex:1,minWidth:0}}><span style={{display:"block",fontSize:13.5,color:C.text,fontWeight:700,lineHeight:1.35}}>{item.label}</span><span style={{display:"block",fontSize:12,color:item.recent?C.green:C.textMuted,fontWeight:600,lineHeight:1.4,marginTop:1}}>{meta}</span>{tallyText?<span style={{display:"block",fontSize:12,color:tally&&tally.gone>tally.still?C.amber:C.textSub,lineHeight:1.4,marginTop:2}}>{tallyText}</span>:null}{badge?<span style={{display:"inline-block",marginTop:4,fontSize:11.5,fontWeight:700,color:badge.c,background:badge.b,borderRadius:6,padding:"2px 6px"}}>{badge.t}</span>:null}</span><span aria-hidden="true" style={{display:"inline-flex",alignItems:"center",gap:4,flexShrink:0,fontSize:12.5,fontWeight:700,color:C.blue}}>{open?"Hide":"View"}<Chevron open={open} size={14} color={C.blue}/></span></div>{open?<div style={{padding:"9px 12px 11px",borderTop:"1px solid "+C.border}}><div style={{fontSize:11.5,fontWeight:700,color:C.textMuted,marginBottom:6}}>{kind==="h"?"Who reported it":"Who reported this"}</div>{item.reports.slice(0,8).map((rp,ri)=><div key={ri} style={{display:"flex",alignItems:"center",gap:7,marginBottom:5}}><Av src={rp.avatar} size={18}/><span style={{fontSize:12.5,color:C.textSub,flex:1,minWidth:0}}>{rp.user||"A climber"}</span><span style={{fontSize:12,color:C.textMuted,whiteSpace:"nowrap"}}>{shortDate(rp.date)}</span></div>)}{item.reports.length>8?<div style={{fontSize:12,color:C.textMuted,marginTop:2}}>{"and "+(item.reports.length-8)+" more"}</div>:null}{item.neg?<div style={{fontSize:12,color:C.amber,marginTop:6,lineHeight:1.4}}>{item.neg+" recent report"+(item.neg!==1?"s":"")+" said it was not present. It may be resolving."}</div>:null}{kind==="h"&&onVote?(()=>{const vk=routeId+"|"+item.label;const v=(hzVotes&&hzVotes[vk])||{still:0,gone:0,mine:null};return <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid "+C.border}}><div style={{fontSize:12,fontWeight:700,color:C.textSub,marginBottom:7}}>Been there lately? Is it still there?</div><div style={{display:"flex",gap:8}}><button onClick={e=>{e.stopPropagation();onVote(routeId,item.label,"still");}} aria-pressed={v.mine==="still"} style={{...BTN_SM,flex:1,minHeight:44,border:`1px solid ${v.mine==="still"?C.green:C.border}`,background:v.mine==="still"?C.greenBg:"transparent",color:v.mine==="still"?C.green:C.textSub}}>{"Still there"+(v.still?" · "+v.still:"")}</button><button onClick={e=>{e.stopPropagation();onVote(routeId,item.label,"gone");}} aria-pressed={v.mine==="gone"} style={{...BTN_SM,flex:1,minHeight:44,border:`1px solid ${v.mine==="gone"?C.amber:C.border}`,background:v.mine==="gone"?C.amberBg:"transparent",color:v.mine==="gone"?C.amber:C.textSub}}>{"Gone now"+(v.gone?" · "+v.gone:"")}</button></div></div>;})():null}</div>:null}</div>;}
