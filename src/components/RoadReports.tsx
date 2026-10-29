import { useState, useMemo } from "react";
import { C, ago, isRecent, RECENT_DAYS, shortDate } from "../../ClimbMatchCore.jsx";
import { BTN_SM, BTN_LINK } from "../../lib/buttonStyles.js";
import { ROAD_TONE, roadReportsOf } from "../../lib/roadReports.js";
import CardHead from "./CardHead.tsx";

/** One road report, as roadReportOf states it, with its reporter and date. */
export interface RoadReportRow {
  status: string | null;
  tone: string | null;
  vehicle: string | null;
  issues: string[];
  note: string;
  user?: string | null;
  date?: string | null;
}
export interface RoadReportsProps {
  /** The route's trip reports; the ones that answered the road questions are read. */
  activity: Parameters<typeof roadReportsOf>[0];
  /** The reports could not be loaded (as opposed to there being none). */
  reportsUnavailable?: boolean;
  /** Opens the log form at the road questions. */
  onReport?: (() => void) | null;
}

/** ROAD CONDITIONS — what climbers who drove in said about the road, newest first. The catalog's
   own road block (GETTING THERE, on Plan) is researched once and goes stale with the season; this
   is the part that changes week to week, so it is read off reports, never off the catalog. A
   report counts when it answered any of ROAD TO THE TRAILHEAD in the log form, including the old
   open/closed chips, which are the same strings (see ROAD_STATUS in core).
 *
 * Reads `C` at render time. Moved verbatim from RouteDetail.jsx; only the types were added.
 */
export default function RoadReports({activity,reportsUnavailable,onReport}: RoadReportsProps){
  const [all,setAll]=useState(false);
  const reps: RoadReportRow[]=useMemo(function(){return roadReportsOf(activity);},[activity]);
  const lastStatus=reps.find(function(r){return r.status;});
  const shown=all?reps:reps.slice(0,3);
  return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",marginBottom:12,border:"1px solid "+C.border}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:4}}><CardHead tone={C.teal}>ROAD CONDITIONS</CardHead>{onReport?<button onClick={onReport} style={{...BTN_SM,flexShrink:0,color:C.green,background:C.greenBg,border:"1px solid "+C.greenDim}}>Report the road</button>:null}</div>
    <div style={{fontSize:11.5,color:C.textMuted,marginBottom:reps.length?10:0,lineHeight:1.5}}>{reps.length?"From climbers who drove in — newest first.":reportsUnavailable?"Couldn’t load road reports — try again in a moment.":"No one has reported the road yet. Driving in? Say whether it was open and what it took — the next party checks this before they leave home."}</div>
    {lastStatus?(function(){const tc=ROAD_TONE(lastStatus.tone);return <div style={{marginBottom:10}}><span style={{display:"inline-block",fontSize:13,fontWeight:800,color:tc[0],background:tc[1],borderRadius:8,padding:"4px 10px"}}>{lastStatus.status}</span><span style={{fontSize:12,color:C.textMuted,marginLeft:8}}>{"reported "+ago(lastStatus.date)}</span>{!isRecent(lastStatus.date)?<div style={{fontSize:11.5,color:C.amber,marginTop:6,lineHeight:1.5}}>{"That is the newest report, and it is more than "+RECENT_DAYS+" days old. Roads change with the season — check with the land manager before you drive."}</div>:null}</div>;})():null}
    {shown.map(function(r,i){const bits=[r.status,r.vehicle].concat(r.issues).filter(Boolean);return <div key={i} style={{borderTop:"1px solid "+C.border,padding:"8px 0"}}><div style={{fontSize:11.5,color:C.textMuted,marginBottom:3}}>{(r.date?shortDate(r.date)+" · ":"")+(r.user||"A climber")}</div>{bits.length?<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.5}}>{bits.join(" · ")}</div>:null}{r.note?<div style={{fontSize:12.5,color:C.text,lineHeight:1.5,marginTop:bits.length?3:0}}>{r.note}</div>:null}</div>;})}
    {reps.length>3?<button onClick={function(){setAll(!all);}} aria-expanded={all} style={{minHeight:44,...BTN_LINK(C),marginTop:4,background:"transparent",border:"none",color:C.blue}}>{all?"Show fewer":"Show all "+reps.length+" road reports"}</button>:null}
  </div>;
}
