import { campSites, campReportsOf, campOrderNote, campWalkHrs } from "../../lib/camps.js";
import { C, ROUTE_GAP, shortDate, RSL as SL } from "../../ClimbMatchCore.jsx";
import EditIconButton from "./EditIconButton.tsx";
import GapNote from "./GapNote.tsx";
import OvernightPermit from "./OvernightPermit.tsx";
import CampSite from "./CampSite.tsx";
import Capped from "./Capped.tsx";
import type { CampRow } from "./CampSite.tsx";

export interface CampingPanelProps {
  /** The route; campSites() reads its bivy rows and OvernightPermit its permit fields. */
  route: Parameters<typeof campSites>[0] & Parameters<typeof OvernightPermit>[0]["route"] & { itinerary?: { days?: unknown } | null };
  /** Opens the camping editor; none means the climber cannot edit. */
  onEdit?: (() => void) | null;
  /** The planner's fitness and pack inputs, for walk-in times. */
  calc?: { fit?: string | null; pack?: number | null } | null;
  /** The route's trip reports, for "slept here" counts. */
  activity?: { date?: string | null; cond?: { camps?: string[] | null } | null }[] | null;
}

/* CAPACITY, WATER and PERMIT are PROSE, and they used to render as CHIPS. Measured on the live
   catalog: median 130 / 136 / 297 characters, up to 1,386 — so 5,001 / 5,008 / 5,020 of 5,083
   sites carried a paragraph inside a rounded pill. That is the failure CLAUDE.md already records
   for `season` (a window that got a 232-char explanation) and `grade` (a grade that got a
   qualifier): enrichment prose written into a DISPLAY field. The repair is the one those two
   took — defend it on the READ side. The pill is gone and the prose renders as a labelled block
   inside the disclosure, which is the right shape for a paragraph.
   Exported because this is the half a static guard can actually prove: whether the prose is
   SELECTED for display is a pure question; whether a tap reveals it is a browser one.
   Moved verbatim from RouteDetail.jsx; only the types were added. */
export default function CampingPanel({route,onEdit,calc,activity}: CampingPanelProps){
  const sites=campSites(route);
  const _days=(route&&route.itinerary&&Array.isArray(route.itinerary.days))?route.itinerary.days.length:0;
  const slept=campReportsOf(sites,activity);
  /* The camps trip reports name that this list lacks: the climber's answer coming back as a gap to fill. */
  const named=slept.extra.length?<div style={{background:C.surface,border:"1px dashed "+C.purple+"66",borderRadius:12,padding:"11px 13px",marginTop:sites.length?ROUTE_GAP:0,marginBottom:sites.length?0:ROUTE_GAP}}>
    <div style={{fontSize:11.5,fontWeight:800,color:C.purple,letterSpacing:0.6}}>{"NAMED IN TRIP REPORTS · NOT LISTED YET"}</div>
    <div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45,marginTop:2,marginBottom:8}}>{"Climbers logged a night at these. Know the spot? Add it with its height, water and permit so the next party can plan on it."}</div>
    {slept.extra.slice(0,6).map(function(x){return <div key={x.name} style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:10,padding:"5px 0",borderTop:"1px solid "+C.borderLight}}><span style={{fontSize:13,fontWeight:700,color:C.text,minWidth:0,wordBreak:"break-word"}}>{x.name}</span><span style={{fontSize:11.5,color:C.textSub,flexShrink:0}}>{x.n+" report"+(x.n===1?"":"s")+(x.last?" \u00b7 "+shortDate(x.last):"")}</span></div>;})}
    {onEdit?<button onClick={onEdit} style={{marginTop:9,padding:"8px 12px",background:C.card,color:C.blue,border:"1px solid "+C.border,borderRadius:9,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{"Add a camp"}</button>:null}
  </div>:null;
  /* campingGate() already decided this route is one you might sleep on, so empty is a placeholder. */
  if(!sites.length)return <div style={{marginBottom:ROUTE_GAP}}><SL action={onEdit?<EditIconButton onClick={onEdit} title="Edit camping and bivy sites"/>:null} wp="Campsite">CAMPING & BIVY</SL>{named}<GapNote what="No camps or bivy sites yet" why="Nothing says where parties sleep on the approach or the route." cta="Add a camp or bivy" onFix={onEdit}/></div>;
  /* A SECTION heading (SL), not a card heading: this is a planner section in its own right, the
     peer of ROUTE TRACK and RAPPELS beside it, and SL's top margin is what separates it from the
     climate block above — inside a card it sat flush against it and read as part of it. Each site
     is its own card, so the section is not wrapped in one: a card of cards just nests borders. */
  return <div style={{marginBottom:ROUTE_GAP}}>
    <SL action={onEdit?<EditIconButton onClick={onEdit} title="Edit camping and bivy sites"/>:null} wp="Campsite">{"CAMPING & BIVY · "+sites.length}</SL>
    {/* The "also a pin on the route track" sentence is CONDITIONAL, because it is only true of
        waypoint-derived sites. Most researched bivy rows carry no coordinate at all — measured:
        4 of 175 catalog-wide — so stating it unconditionally tells a climber to look for pins
        that are not there. Claim it only when at least one site actually is on the track. */}
    <div style={{fontSize:12,color:C.textMuted,lineHeight:1.5,marginBottom:12}}>{"Where you can sleep on this route — camps, approach bivies and high camps. Worth reading even if you plan to go car-to-car, for the day that runs long or the weather that turns."+(sites.some((s: CampRow)=>s.onTrack)?" Anything marked on the track is also a pin under ROUTE TRACK.":"")+campOrderNote(sites)}</div>
    <OvernightPermit route={route}/>
    {/* Capped HERE, around the sites only. It used to wrap the whole panel, and the intro plus the
        permit panel alone fill the 400px a capped block shows — so the first thing under "Show more"
        was every actual camp, and the section read as a permit and nothing else. */}
    {(function(){
      /* What the night chips and walk-in times are, said once, only when at least one site carries one. */
      return (sites.some(function(s: CampRow){return s.nights&&s.nights.length;})||sites.some(function(s: CampRow){return campWalkHrs(s,calc)!=null;}))?<div style={{fontSize:12,color:C.textSub,lineHeight:1.5,marginBottom:10}}>{"Choosing a camp: "+[sites.some(function(s: CampRow){return s.nights&&s.nights.length;})?"a green tag marks where the trip plan above spends each night":"",sites.some(function(s: CampRow){return campWalkHrs(s,calc)!=null;})?"walk-in times use the fitness and pack set in the planner, so change those to see your own":""].filter(Boolean).join("; ")+". A higher camp shortens the summit day and lengthens the carry."}</div>:null;
    })()}
    {(function(){
      /* The FIRST site sits outside the cap entirely, so one camp is always shown whole — a cap
         that slices through it (its Notes cut off, the next camp hidden) leaves the same doubt the
         cap was moved to remove. Everything after it is capped. ONE list, in the order the walk in
         reaches the sites (campRouteOrder, applied by campSites); each says what parties use it for. */
      const one=function(b: CampRow,i: number){return <CampSite key={i} b={b} i={i} first={i===0} calc={calc} dayCount={_days} slept={slept.by.get(i)} prev={i?sites[i-1]:null}/>;};
      const rest=sites.slice(1).map(function(b: CampRow,k: number){return one(b,k+1);});
      return <>{one(sites[0],0)}{rest.length?<Capped>{rest}</Capped>:null}</>;
    })()}
    {named}
  </div>;
}
