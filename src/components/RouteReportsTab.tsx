import { ROUTE_GAP, C, RSL as SL, RECENT_DAYS, MOUNTAINS, realAuthor, seedAuthor, shortDate, isRoadTag, renderMD } from "../../ClimbMatchCore.jsx";
import { BTN, BTN_SM } from "../../lib/buttonStyles.js";
import Capped from "./Capped.tsx";
import BetaDiff from "./BetaDiff.tsx";
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
import type { BetaDiffProps } from "./BetaDiff.tsx";
import type { ConsensusPanelProps } from "./ConsensusPanel.tsx";

/** One trip report row as the list reads it. */
interface ReportsTabRow {
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
  onVoteHazard?: ConsensusPanelProps["onVote"];
  recentN: number;
  /** When the reports shown are the copy saved with a pack (no signal), the time it was saved. */
  reportsPackedAt?: string | number | null;
  reportsSavedWith?: string;
  reportsUnavailable?: boolean;
  /** Draws the road-reports panel. */
  roadEl: () => ReactNode;
  route: ConsensusPanelProps["route"] & BetaDiffProps["route"] & { mountainId?: string; _dbArea?: object | null };
  showScore?: boolean;
  starSum?: ConsensusPanelProps["starSum"];
  /** The trip-reports query; only the saved copy's length is read. */
  tripQ: { data: { length: number } };
}

/* tab==="conditions"? — the body of that branch of RouteDetail, lifted verbatim by extract-from-parent.mjs (branch mode);
   every binding it read from RouteDetail is a prop of the same name. Lifted verbatim from RouteDetail.jsx (PR60); only the types were added. */
export default function RouteReportsTab({activity,climberN,condActivity,cragOnly,hzVotes,logged,onLog,onOpenReport,onVoteHazard,recentN,reportsPackedAt,reportsSavedWith,reportsUnavailable,roadEl,route,showScore,starSum,tripQ}: RouteReportsTabProps){
  return <div>{!logged?<div style={{marginBottom:ROUTE_GAP}}><button onClick={()=>onLog(route)} style={{...BTN,width:"100%",background:C.greenBg,color:C.green,border:"1px solid "+C.greenDim}}>✓ Log your ascent</button></div>:null}
        <Capped><BetaDiff route={route}/></Capped><Capped><ConsensusPanel route={route} activity={condActivity} hzVotes={hzVotes} onVote={onVoteHazard} reportsUnavailable={reportsUnavailable} starSum={starSum}/></Capped>{showScore?null:roadEl()}
        <div id="trip-reports-section"><SL action={<button onClick={()=>onLog&&onLog(route)} style={{...BTN_SM,flexShrink:0,color:C.green,background:C.greenBg,border:"1px solid "+C.greenDim}}>{cragOnly?"Log / send":<Lbl s={"Log / report"}/>}</button>}>{cragOnly?"Send Reports":"Trip Reports"}</SL></div><div style={{fontSize:11.5,color:C.textMuted,marginBottom:11,lineHeight:1.5}}>{(activity.length?activity.length+" report"+(activity.length!==1?"s":"")+" from "+climberN+" climber"+(climberN!==1?"s":"")+(recentN?" · "+recentN+" in the last "+RECENT_DAYS+" days":"")+". ":"")+"These come straight from climbers logging their ascents — log yours and your conditions, beta & rating appear here automatically."}</div>{reportsPackedAt?<div style={{fontSize:12,color:C.amber,lineHeight:1.5,marginBottom:10}}>{"No signal — these are the "+(tripQ.data.length)+" trip report"+(tripQ.data.length!==1?"s":"")+" "+reportsSavedWith+" "+savedAgo(reportsPackedAt)+". Newer ones need a connection."}</div>:null}
        {(activity&&activity.length)||reportsUnavailable||reportsPackedAt?null:<div style={{textAlign:"center",padding:"24px 16px",color:C.textMuted,fontSize:13}}>Add a trip report from your logbook — be the first to log this climb.</div>}
        {(activity||[]).map((a,i)=><div key={i} /* Hand TripReport the WHOLE row. This used to copy thirteen keys by hand, and TripReport
   renders nine more that were not on the list — beta, gearBeta, sunVote, sunNote, fa,
   developed, itinerary, outcomeReasons, outcomeNote. So the send beta and the rack beta a
   climber wrote were shown on the card's parent object, the modal was built to display them,
   and "View full trip report →" opened a report with all of it missing. A hand-copied
   allowlist between two components silently loses every field added to either side after it
   was written; spreading cannot. `route`/`mtn` come last so they cannot be shadowed by a
   same-named key on an activity row. */
{...clickable(()=>onOpenReport&&onOpenReport(Object.assign({},a,{route:route,mtn:MOUNTAINS.find(m=>m.id===route.mountainId)||route._dbArea||{}})))} style={{background:C.card,borderRadius:10,padding:"11px 13px",marginBottom:ROUTE_GAP,border:`1px solid ${C.border}`,cursor:"pointer"}}><div style={{display:"flex",gap:9,alignItems:"flex-start",marginBottom:7}}><Av src={a.avatar} size={32}/><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><div style={{fontSize:13,fontWeight:700}}>{a.user}</div><div style={{fontSize:11.5,color:C.textMuted}}>{(function(){/* A real reporter's level comes from their profile (realAuthor); an example one from the seed record. */const ra=realAuthor(a._authorId);if(ra)return [ra.level,ra.years!=null?ra.years+"y exp":null].filter(Boolean).join(" · ")||null;if(a._authorId)return null;const cl=seedAuthor(a.user);return cl&&cl.level?cl.level+(cl.years?" · "+cl.years+"y exp":""):null;})()}</div><div style={{fontSize:12,color:C.textMuted}}>{shortDate(a.date)}</div></div><div style={{textAlign:"right"}}><Stars n={a.stars}/><br/><Pill label={a.tickType} color={C.blue} bg={C.blueBg} sm/></div></div></div>{(a.outcomeReasons&&a.outcomeReasons.length)?<div style={{fontSize:11.5,color:C.amber,marginTop:2}}>{"Turned back: "+a.outcomeReasons.join(", ")+(a.outcomeNote?" — "+a.outcomeNote:"")}</div>:null}</div><ReportStats cond={a.cond}/><div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>{(a.condTags||[]).filter(t=>!isRoadTag(t)).map(t=><span key={t} style={{fontSize:12,color:C.teal,background:C.tealDim,padding:"2px 6px",borderRadius:5}}>{t}</span>)}</div><div style={{fontSize:13,color:C.textSub,lineHeight:1.6}}>{renderMD(a.text)}</div><div style={{fontSize:12,color:C.blue,fontWeight:600,marginTop:8}}>View full trip report →</div></div>)}
      </div>;
}
