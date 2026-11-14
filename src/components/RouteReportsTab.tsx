import { ROUTE_GAP, C, RSL as SL, RECENT_DAYS, MOUNTAINS, realAuthor, seedAuthor, shortDate, isRoadTag, renderMD } from "../../ClimbMatchCore.jsx";
import { useState } from "react";
import { BTN, BTN_SM, BTN_LINK } from "../../lib/buttonStyles.js";
import Capped from "./Capped.tsx";
import ConsensusPanel from "./ConsensusPanel.tsx";
import Lbl from "./Lbl.tsx";
import { savedAgo } from "../../lib/offline";
import { clickable } from "../../lib/clickable";
import Av from "./Av.tsx";
import Stars from "./Stars.tsx";
import Pill from "./Pill.tsx";
import ReportStats from "./ReportStats.tsx";
import type { ReactNode } from "react";
import type { ReportCond } from "./ReportStats.tsx";
import type { ConsensusPanelProps } from "./ConsensusPanel.tsx";

/** One trip report row as the list reads it. */
interface ReportsTabRow {
  /** The stored report's id (a database row) or the seed record's; keys the card. */
  _dbId?: string | number | null;
  id?: string | number | null;
  avatar?: string | null;
  user?: string | null;
  /** The reporter's account id, when the report is a stored one. */
  _authorId?: string | null;
  date?: string | null;
  stars: number;
  tickType?: string | null;
  outcomeReasons?: string[] | null;
  outcomeNote?: string | null;
  cond?: ReportCond | null;
  condTags?: string[] | null;
  text?: string | null;
}

export interface RouteReportsTabProps {
  /** The merged trip reports listed here. */
  activity: ReportsTabRow[];
  climberN: number;
  /** Every report that feeds the conditions, shared or not. */
  condActivity: ConsensusPanelProps["activity"];
  cragOnly?: boolean;
  hzVotes?: ConsensusPanelProps["hzVotes"];
  logged?: boolean;
  onLog: (route: RouteReportsTabProps["route"]) => void;
  onOpenReport?: (report: object) => void;
  /** Opens a consensus RECENT PHOTOS tile in the route's photo viewer. */
  onOpenPhoto?: ConsensusPanelProps["onOpenPhoto"];
  onVoteHazard?: ConsensusPanelProps["onVote"];
  recentN: number;
  /** When the reports shown are the copy saved with a pack (no signal), the time it was saved. */
  reportsPackedAt?: string | number | null;
  reportsSavedWith?: string;
  reportsUnavailable?: boolean;
  /** Draws the road-reports panel. */
  roadEl: () => ReactNode;
  route: ConsensusPanelProps["route"] & { mountainId?: string; _dbArea?: object | null };
  showScore?: boolean;
  starSum?: ConsensusPanelProps["starSum"];
  /** The trip-reports query; only the saved copy's length is read. */
  tripQ: { data: { length: number } };
}

/* tab==="conditions"? — the body of that branch of RouteDetail, lifted verbatim by extract-from-parent.mjs (branch mode);
   every binding it read from RouteDetail is a prop of the same name. Lifted verbatim from RouteDetail.jsx (PR60); only the types were added. */
export default function RouteReportsTab({activity,climberN,condActivity,cragOnly,hzVotes,logged,onLog,onOpenPhoto,onOpenReport,onVoteHazard,recentN,reportsPackedAt,reportsSavedWith,reportsUnavailable,roadEl,route,showScore,starSum,tripQ}: RouteReportsTabProps){
  /* The list shows the newest TRIP_FIRST and folds the rest behind "Show all", as ROAD CONDITIONS does: every report drew its whole text, so a popular route was one long scroll with the reports — what the tab is for — under a tall consensus card. */
  const TRIP_FIRST=5;const [allTrips,setAllTrips]=useState(false);const trips=activity||[];const shownTrips=allTrips?trips:trips.slice(0,TRIP_FIRST);
  /* The conditions count reports kept to friends or crews (condActivity); the list shows only shared ones. Say so, or the consensus's "7 reports" over a list of 5 reads as a bug. */
  const privateN=Math.max(0,((condActivity||[]).length)-trips.length);
  const jumpToTrips=function(){const el=typeof document!=="undefined"?document.getElementById("trip-reports-section"):null;if(el&&el.scrollIntoView)el.scrollIntoView({behavior:"smooth",block:"start"});};
  /* ONE log button at a time. The full-width one leads the tab until you've logged the climb; the list header's own button is for logging it again. Both used to show, a screen apart, doing the same thing. */
  return <div>{!logged?<div style={{marginBottom:ROUTE_GAP}}><button onClick={()=>onLog(route)} style={{...BTN,width:"100%",background:C.greenBg,color:C.green,border:"1px solid "+C.greenDim}}>✓ Log your ascent</button></div>:null}
        {trips.length?<div style={{marginTop:-4,marginBottom:ROUTE_GAP-4}}><button onClick={jumpToTrips} style={{minHeight:44,...BTN_LINK(C),background:"transparent",border:"none",color:C.blue,padding:0}}>{"Jump to the "+trips.length+" "+(cragOnly?"send":"trip")+" report"+(trips.length!==1?"s":"")+" ↓"}</button></div>:null}
        <Capped><ConsensusPanel route={route} activity={condActivity} hzVotes={hzVotes} onVote={onVoteHazard} reportsUnavailable={reportsUnavailable} starSum={starSum} onOpenPhoto={onOpenPhoto}/></Capped>{showScore?null:roadEl()}
        {/* scrollMarginTop: both jumps here (this tab's link and the social row's Reports chip) land the heading at the very top, under the pinned site header + sub-tab bar (128px on desktop), so it scrolled out of sight. */}<div id="trip-reports-section" style={{scrollMarginTop:140}}><SL action={logged?<button onClick={()=>onLog(route)} style={{...BTN_SM,flexShrink:0,color:C.green,background:C.greenBg,border:"1px solid "+C.greenDim}}>{cragOnly?"Log / send":<Lbl s={"Log / report"}/>}</button>:undefined}>{cragOnly?"Send Reports":"Trip Reports"}</SL></div><div style={{fontSize:11.5,color:C.textMuted,marginBottom:11,lineHeight:1.5}}>{(activity.length?activity.length+" report"+(activity.length!==1?"s":"")+" from "+climberN+" climber"+(climberN!==1?"s":"")+(recentN?" · "+recentN+" in the last "+RECENT_DAYS+" days":"")+". ":"")+"These come straight from climbers logging their ascents — log yours and your conditions, beta & rating appear here automatically."+(privateN?" The conditions above also count "+privateN+" report"+(privateN!==1?"s":"")+" kept private to friends or crews.":"")}</div>{reportsPackedAt?<div style={{fontSize:12,color:C.amber,lineHeight:1.5,marginBottom:10}}>{tripQ.data.length?"No signal — these are the "+(tripQ.data.length)+" trip report"+(tripQ.data.length!==1?"s":"")+" "+reportsSavedWith+" "+savedAgo(reportsPackedAt)+". Newer ones need a connection.":"No signal, and no trip reports were "+reportsSavedWith+" "+savedAgo(reportsPackedAt)+". Newer ones need a connection."}</div>:null}
        {/* No second empty state here: with no reports at all, the consensus card above already says "No reports yet — be the first to log this climb", and the tab said it twice. */}
        {shownTrips.map((a,i)=><div key={a._dbId!=null?"d"+a._dbId:a.id!=null?"s"+a.id:"i"+i} /* Hand TripReport the WHOLE row. This used to copy thirteen keys by hand, and TripReport
   renders nine more that were not on the list — beta, gearBeta, sunVote, sunNote, fa,
   developed, itinerary, outcomeReasons, outcomeNote. So the send beta and the rack beta a
   climber wrote were shown on the card's parent object, the modal was built to display them,
   and "View full trip report →" opened a report with all of it missing. A hand-copied
   allowlist between two components silently loses every field added to either side after it
   was written; spreading cannot. `route`/`mtn` come last so they cannot be shadowed by a
   same-named key on an activity row. */
{...clickable(()=>onOpenReport&&onOpenReport(Object.assign({},a,{route:route,mtn:MOUNTAINS.find(m=>m.id===route.mountainId)||route._dbArea||{}})))} style={{background:C.card,borderRadius:10,padding:"11px 13px",marginBottom:ROUTE_GAP,border:`1px solid ${C.border}`,cursor:"pointer"}}><div style={{display:"flex",gap:9,alignItems:"flex-start",marginBottom:7}}><Av src={a.avatar} size={32}/><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><div style={{fontSize:13,fontWeight:700}}>{a.user}</div><div style={{fontSize:11.5,color:C.textMuted}}>{(function(){/* A real reporter's level comes from their profile (realAuthor); an example one from the seed record. */const ra=realAuthor(a._authorId);if(ra)return [ra.level,ra.years!=null?ra.years+"y exp":null].filter(Boolean).join(" · ")||null;if(a._authorId)return null;const cl=seedAuthor(a.user);return cl&&cl.level?cl.level+(cl.years?" · "+cl.years+"y exp":""):null;})()}</div><div style={{fontSize:12,color:C.textMuted}}>{shortDate(a.date)}</div></div><div style={{textAlign:"right"}}><Stars n={a.stars}/><br/><Pill label={a.tickType} color={C.blue} bg={C.blueBg} sm/></div></div></div>{(a.outcomeReasons&&a.outcomeReasons.length)?<div style={{fontSize:11.5,color:C.amber,marginTop:2}}>{"Turned back: "+a.outcomeReasons.join(", ")+(a.outcomeNote?" — "+a.outcomeNote:"")}</div>:null}</div><ReportStats cond={a.cond}/><div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>{(a.condTags||[]).filter(t=>!isRoadTag(t)).map(t=><span key={t} style={{fontSize:12,color:C.teal,background:C.tealDim,padding:"2px 6px",borderRadius:5}}>{t}</span>)}</div><div style={{fontSize:13,color:C.textSub,lineHeight:1.6,display:"-webkit-box",WebkitLineClamp:4,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{renderMD(a.text)}</div><div style={{fontSize:12,color:C.blue,fontWeight:600,marginTop:8}}>View full trip report →</div></div>)}
        {trips.length>TRIP_FIRST?<button onClick={function(){setAllTrips(!allTrips);}} aria-expanded={allTrips} style={{minHeight:44,...BTN_LINK(C),marginTop:4,background:"transparent",border:"none",color:C.blue}}>{allTrips?"Show fewer":"Show all "+trips.length+" "+(cragOnly?"send":"trip")+" reports"}</button>:null}
      </div>;
}
