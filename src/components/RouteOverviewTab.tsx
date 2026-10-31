import { ROUTE_GAP, C, SUB_LABEL, OPEN_CREWS, RECENT_DAYS, realProfileId, FALLBACK_AV, RSL as SL, enrichRoute, isRecent, MOUNTAINS, ago, catOf, CRAG_CATS, onImgErr, FALLBACK_COVER, CAT, gradeLabel, condRep } from "../../ClimbMatchCore.jsx";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { PlanActivity, PlanRoute, RoutePlanTabProps } from "./RoutePlanTab.tsx";
import type { NeighbourRow } from "./WallNeighbours.tsx";
import type { RouteTagRowProps } from "./RouteTagRow.tsx";
import type { VerifNoteProps } from "./VerifNote.tsx";
import type { CragRackProps } from "./CragRack.tsx";
import type { TopoSectionProps } from "./TopoSection.tsx";
import type { PairsWellWithProps } from "./PairsWellWith.tsx";
import type { DiffRadarProps } from "./DiffRadar.tsx";
import { BTN } from "../../lib/buttonStyles.js";
import { popInterest } from "../../lib/popInterest.js";
import { climbNoun, ClimbNoun } from "../../lib/discLabels.js";
import { clickable } from "../../lib/clickable";
import CountUp from "./CountUp.tsx";
import Av from "./Av.tsx";
import RouteTagRow from "./RouteTagRow.tsx";
import Capped from "./Capped.tsx";
import { splitParagraphs, PeakMetadataPanel } from "../../EnrichmentPanels";
import GapNote from "./GapNote.tsx";
import RoutePlanTab from "./RoutePlanTab.tsx";
import ActionIcon from "./ActionIcon.tsx";
import Chevron from "./Chevron.tsx";
import VerifNote from "./VerifNote.tsx";
import { ConfidenceLegend } from "../../lib/confidence.jsx";
import CragRack from "./CragRack.tsx";
import { typicalFor, patternStatus } from "../../lib/typicalPatterns.js";
import CardHead from "./CardHead.tsx";
import Lbl from "./Lbl.tsx";
import { savedAgo } from "../../lib/offline";
import Pill from "./Pill.tsx";
import PhotoRow from "./PhotoRow.tsx";
import DiffRadar from "./DiffRadar.tsx";
import TopoSection from "./TopoSection.tsx";
import { gapGear } from "../../lib/routeGaps.js";
import EmptySection from "./EmptySection.tsx";
import EditIconButton from "./EditIconButton.tsx";
import PairsWellWith from "./PairsWellWith.tsx";
import { USE_DB } from "../../lib/supabase";
import RouteStats from "../../lib/RouteStats.jsx";
import LinkUps from "../../lib/LinkUps.jsx";
import DiscIcon from "./DiscIcon.tsx";

/** One merged trip report, as the Overview reads it (the Plan body's fields plus the ones only Overview prints). */
interface OvActivity extends PlanActivity {
  condTags?: string[] | null;
  tickType?: string | null;
  beta?: string | null;
  photos?: string[] | null;
}
/** A climb in the crag's own list, as the "More on" cards print it. */
interface OvSib extends NeighbourRow {
  cover?: string;
}
/** One typical-conditions pattern (typicalFor). */
interface OvPattern {
  label: string;
  when?: string | null;
  detail?: string | null;
}
/** The conditions consensus (buildConsensus) the Conditions & recent activity card prints. */
interface OvConsensus {
  confidence: string;
  reportCount: number;
  recentCount?: number | null;
  lastDate?: string | null;
  hazards?: { tags: string[] }[] | null;
  clearedTags?: string[] | null;
  recentTags?: { tag: string }[] | null;
  topTags?: { tag: string }[] | null;
}
/** A climber looking at this route right now. */
interface OvViewer {
  id?: string | null;
  name?: string | null;
  avatar?: string | null;
}
/** What the Overview body itself reads off the route; the Plan body's route and the cards' route types are intersected below. */
interface OvOwnRoute {
  overview?: string | null;
  desc?: string | null;
  face?: string | null;
  condWindow?: string | string[] | null;
  beta?: string[] | null;
  proTips?: string[] | null;
  mountainId?: string;
  _dbAreaReadFailed?: boolean | null;
}
/** The route; only what the Overview body and the cards it mounts read. */
export type OvRoute = OvOwnRoute & PlanRoute & RouteTagRowProps["route"] & NonNullable<VerifNoteProps["route"]> & CragRackProps["route"] & TopoSectionProps["route"] & PairsWellWithProps["route"];

export interface RouteOverviewTabProps {
  _mapOffline: RoutePlanTabProps["_mapOffline"];
  /** The peak's "About this peak" geology text. */
  _peakGeo?: string | null;
  /** The route's confidence levels; the legend shows when it has any. */
  _rdCx?: { levels?: unknown } | null;
  _routeMap: RoutePlanTabProps["_routeMap"];
  _tracksPanel: RoutePlanTabProps["_tracksPanel"];
  activity: OvActivity[];
  baseQ: RoutePlanTabProps["baseQ"];
  baseSpots: RoutePlanTabProps["baseSpots"];
  calcInputs: RoutePlanTabProps["calcInputs"];
  climateEl: RoutePlanTabProps["climateEl"];
  /** Climbers who logged the route. */
  climberN: number;
  commentApi: RoutePlanTabProps["commentApi"];
  comments: RoutePlanTabProps["comments"];
  commentsUnavailable: RoutePlanTabProps["commentsUnavailable"];
  condPanels: RoutePlanTabProps["condPanels"];
  condTab: RoutePlanTabProps["condTab"];
  cragFactsEl: RoutePlanTabProps["cragFactsEl"];
  cragOnly: RoutePlanTabProps["cragOnly"];
  /** The crag's rest-of-page panels (crowds, "More on" neighbours). */
  cragPanels?: ReactNode;
  cragSibs: OvSib[];
  crewsForRoute: RoutePlanTabProps["crewsForRoute"];
  /** Open crews from the database, to count those eyeing this route. */
  dbCrews?: { routeId: string; spots: number }[] | null;
  dbPhotos: RoutePlanTabProps["dbPhotos"];
  diffMeta: DiffRadarProps["meta"];
  /** Climbers' difficulty reads, by route id. */
  diffRatings?: Record<string, NonNullable<DiffRadarProps["ratings"]>> | null;
  focusWaypoint: RoutePlanTabProps["focusWaypoint"];
  gearUpdateBox: RoutePlanTabProps["gearUpdateBox"];
  /** The votes on a hazard tag; `gone` counts climbers who said it is cleared. */
  hzVoteFor: (tag: string) => { gone?: number } | null | undefined;
  /** The Log buttons row. */
  logRow: () => ReactNode;
  logged: RoutePlanTabProps["logged"];
  mapWrapRef: RoutePlanTabProps["mapWrapRef"];
  mtn: RoutePlanTabProps["mtn"];
  myItin: RoutePlanTabProps["myItin"];
  noWaypoints: RoutePlanTabProps["noWaypoints"];
  notify: RoutePlanTabProps["notify"];
  onAddPhotos?: RoutePlanTabProps["onAddPhotos"];
  /** Opens a trip report; the row is the whole report plus the route and area. */
  onOpenReport?: ((report: unknown) => void) | null;
  onOpenRoute?: RoutePlanTabProps["onOpenRoute"];
  /** Records the viewer's read of one difficulty axis. */
  onRateDifficulty?: ((routeId: string, axis: string, value: number) => void) | null;
  onSaveMyItin: RoutePlanTabProps["onSaveMyItin"];
  onShareItinToCrew: RoutePlanTabProps["onShareItinToCrew"];
  /** Opens a climber's profile. */
  onViewProfile?: ((profile: { id: string | null; name: string; avatar: string; _real: boolean }) => void) | null;
  openFix: RoutePlanTabProps["openFix"];
  ovCC?: OvConsensus | null;
  /** Who is viewing the route now. */
  presence?: { others?: number; viewers?: OvViewer[] } | null;
  railEl: RoutePlanTabProps["railEl"];
  /** Trip reports in the last RECENT_DAYS days. */
  recentN: number;
  /** When the trip reports were last packed for offline; set only when they are read from the device. */
  reportsPackedAt?: number | null;
  reportsSavedWith?: string | null;
  reportsUnavailable: boolean;
  /** Hazards climbers flagged that the official info lacks. */
  rkFlagged: { label: string; count: number }[];
  route: OvRoute;
  /** The route is on the climber's objectives. */
  saved: boolean;
  /** How many climbers saved each route. */
  savedCountQ: { data?: Record<string, number> | null };
  setCalcInputs: RoutePlanTabProps["setCalcInputs"];
  setFixFocusPitch: RoutePlanTabProps["setFixFocusPitch"];
  setFixOpen: (open: boolean) => void;
  setFixOpenSection: (section: string) => void;
  setFixPrefill: RoutePlanTabProps["setFixPrefill"];
  setShowGpsModal: RoutePlanTabProps["setShowGpsModal"];
  setSibsExpand: Dispatch<SetStateAction<boolean>>;
  setTab: RoutePlanTabProps["setTab"];
  setTrackHistOpen: RoutePlanTabProps["setTrackHistOpen"];
  setTrackOpen: RoutePlanTabProps["setTrackOpen"];
  /** The route has a Plan tab (a crag's plan renders here instead). */
  showPlan: boolean;
  sibsExpand: boolean;
  sibsPending: boolean;
  sibsUnavailable: boolean;
  techStatsEl: ReactNode;
  trackHistOpen: RoutePlanTabProps["trackHistOpen"];
  trackOpen: RoutePlanTabProps["trackOpen"];
  who: RoutePlanTabProps["who"];
}

/* tab==="overview"?<div> — the body of that branch of RouteDetail, lifted verbatim by extract-from-parent.mjs (branch mode);
   every binding it read from RouteDetail is a prop of the same name.
   Lifted verbatim from RouteDetail.jsx (PR60); only the types were added. */
export default function RouteOverviewTab({_mapOffline,_peakGeo,_rdCx,_routeMap,_tracksPanel,activity,baseQ,baseSpots,calcInputs,climateEl,climberN,commentApi,comments,commentsUnavailable,condPanels,condTab,cragFactsEl,cragOnly,cragPanels,cragSibs,crewsForRoute,dbCrews,dbPhotos,diffMeta,diffRatings,focusWaypoint,gearUpdateBox,hzVoteFor,logRow,logged,mapWrapRef,mtn,myItin,noWaypoints,notify,onAddPhotos,onOpenReport,onOpenRoute,onRateDifficulty,onSaveMyItin,onShareItinToCrew,onViewProfile,openFix,ovCC,presence,railEl,recentN,reportsPackedAt,reportsSavedWith,reportsUnavailable,rkFlagged,route,saved,savedCountQ,setCalcInputs,setFixFocusPitch,setFixOpen,setFixOpenSection,setFixPrefill,setShowGpsModal,setSibsExpand,setTab,setTrackHistOpen,setTrackOpen,showPlan,sibsExpand,sibsPending,sibsUnavailable,techStatsEl,trackHistOpen,trackOpen,who}: RouteOverviewTabProps){
  return <div>{/* No fire panel here: its home is the Safety tab (see fireEl above), which
    every route now has. It did start on `conditions`, and that is worth not repeating — that tab is
    LABELLED "Reports" / "Send Reports", so a climber looking for hazards never opens it. Same trap
    as #655. */}
      {saved?<div style={{marginBottom:ROUTE_GAP}}><div className="cm-pop" style={{display:"flex",alignItems:"center",gap:9,background:C.greenBg,border:"1px solid "+C.greenDim,borderRadius:11,padding:"7px 13px"}}><span style={{fontSize:13.5,fontWeight:700,color:C.green,flex:1}}>On your objectives</span><button onClick={()=>setTab("partners")} style={{...BTN,background:C.blueChip,color:C.onSolid,border:"none"}}>Find partners →</button></div></div>:null}<div style={{marginBottom:ROUTE_GAP}}>{logged?<div style={{fontSize:12.5,color:C.green,fontWeight:700,marginBottom:6}}>✓ In your logbook</div>:null}{logRow()}</div>{route.condWindow?<div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"10px 14px",marginBottom:12}}><div style={{...SUB_LABEL,marginBottom:3}}>Conditions window</div><div style={{fontSize:12.5,color:C.textSub,lineHeight:1.5}}>{Array.isArray(route.condWindow)?route.condWindow.join(", "):route.condWindow}</div></div>:null}{(()=>{const vw=(presence&&presence.others)||0;const viewers=(presence&&presence.viewers)||[];const ey=[...OPEN_CREWS,...(dbCrews||[])].filter(function(oc){return oc.routeId===route.id&&oc.spots>0;}).length;const lists=popInterest(route)+(((savedCountQ.data||{})[route.id])||0);const asc=activity.length;const chips=[];if(ey)chips.push({n:ey,label:" crew"+(ey!==1?"s":"")+" eyeing"});if(asc)chips.push({n:climberN,label:" climber"+(climberN!==1?"s":"")+" logged it",reports:true});if(recentN)chips.push({n:recentN,label:" in the last "+RECENT_DAYS+" days",reports:true});if(lists>0)chips.push({n:lists,label:" list"+(lists!==1?"s":"")+" saved"});const _social=vw||viewers.length||chips.length;return <div style={{marginBottom:ROUTE_GAP}}>{/* Each pill is its own control. The strip itself used to be the button (to Partners), with the viewer avatars and the ascents chip as buttons INSIDE it -- controls nested in a control, which a screen reader cannot operate reliably (axe nested-interactive). */_social?<div className="cm-stagger" style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap",marginBottom:7}}>{vw?<span {...clickable(()=>setTab("partners"))} style={{cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6,background:C.greenBg,border:"1px solid "+C.greenDim,borderRadius:20,padding:"4px 11px"}}><span style={{width:7,height:7,borderRadius:"50%",background:C.green,flexShrink:0,animation:"cm-pulse 2s infinite"}}/><span style={{fontSize:12,fontWeight:700,color:C.green}}><CountUp value={vw}/> viewing now</span></span>:null}{viewers.slice(0,4).map(function(vwr,i){/* A signed-in viewer opens THEIR OWN profile, by uid. It used to open a copy of the first example climber with the viewer's name pasted on -- their location, grades and disciplines -- under an id nothing could message. A signed-out viewer has no profile to open. */const _vid=realProfileId(vwr.id);return <span key={"v"+i} {...clickable(_vid?function(e: {stopPropagation: () => void}){e.stopPropagation();if(onViewProfile)onViewProfile({id:_vid,name:vwr.name||"Climber",avatar:vwr.avatar||FALLBACK_AV,_real:true});}:undefined)} title={(vwr.name||"A climber")+" is viewing this "+climbNoun(route)+" now"+(_vid?" — tap to view their profile":"")} style={{cursor:_vid?"pointer":"default",display:"inline-flex"}}><Av src={vwr.avatar} size={22}/></span>;})}{chips.map(function(c,i){/* "N ascents logged" is about the trip reports, not partners — it opens them; the rest of the strip still goes to Partners. */return <span key={i} {...(c.reports?clickable(function(){setTab("conditions");setTimeout(function(){const el=document.getElementById("trip-reports-section");if(el&&el.scrollIntoView)el.scrollIntoView({behavior:"smooth",block:"start"});},60);}):clickable(()=>setTab("partners")))} style={{cursor:"pointer",display:"inline-flex",alignItems:"center",gap:4,background:C.surface,border:"1px solid "+C.border,borderRadius:20,padding:"4px 10px",fontSize:12,fontWeight:600,color:C.textSub}}><b style={{color:C.text,fontWeight:800}}><CountUp value={c.n}/></b>{c.label}</span>;})}</div>:null}<RouteTagRow route={route}/></div>;})()}{cragOnly?techStatsEl:null}{/* MERGE NOTE: the card renders when there is a description OR "About this peak", because
    geology has no other home — PeakMetadataPanel stopped rendering it, so gating this card on
    the description alone would leave routes.peak_metadata.geology populated and displayed
    nowhere. The GapNote still fires on a missing DESCRIPTION specifically, which is a
    different claim from a missing peak blurb. */}
{(route.overview||route.desc||_peakGeo)?<SL>{(route.overview||route.desc)?ClimbNoun(route)+" description":"About the peak"}</SL>:null}{(route.overview||route.desc||_peakGeo)?<Capped><div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"12px 14px",marginBottom:12}}>{(route.overview||route.desc)?splitParagraphs(route.overview||route.desc).map((p,i)=><p key={i} style={{fontSize:14,color:C.textSub,lineHeight:1.75,margin:i===0?"0 0 10px":"10px 0 0"}}>{p}</p>):null}{_peakGeo?<div style={{marginTop:(route.overview||route.desc)?12:0,paddingTop:(route.overview||route.desc)?12:0,borderTop:(route.overview||route.desc)?"1px solid "+C.borderLight:"none"}}><div style={{...SUB_LABEL,marginBottom:5}}>About this peak</div>{splitParagraphs(_peakGeo).map((p,i)=><p key={i} style={{fontSize:13.5,color:C.textSub,lineHeight:1.7,margin:i===0?"0":"9px 0 0"}}>{p}</p>)}</div>:null}</div></Capped>:null}
{/* This CTA sent the climber to `beta`, and the gap it reports is on `overview||desc` — so
    writing the description could never clear the note, however many people answered it. The
    card above reads overview||desc and BETA is a separate section further down the page, so
    the two are different claims; the fix is to open the field the card actually reads. */}
      {(route.overview||route.desc)?null:<GapNote what={"No "+climbNoun(route)+" description yet"} why="Nobody has written up what this line actually climbs or how it goes." cta="Write the description" onFix={()=>{openFix("overview");}}/>}{route.face?<div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"11px 14px",marginBottom:12}}><div style={{...SUB_LABEL,marginBottom:3}}>FACE / WHERE ON THE PEAK</div><div style={{fontSize:13,color:C.textSub,lineHeight:1.5}}>{route.face}</div></div>:null}{cragOnly?<RoutePlanTab atTabTop={undefined} _mapOffline={_mapOffline} _routeMap={_routeMap} _tracksPanel={_tracksPanel} activity={activity} baseQ={baseQ} baseSpots={baseSpots} calcInputs={calcInputs} climateEl={climateEl} commentApi={commentApi} comments={comments} commentsUnavailable={commentsUnavailable} condPanels={condPanels} condTab={condTab} cragFactsEl={cragFactsEl} cragOnly={cragOnly} cragSibs={cragSibs} crewsForRoute={crewsForRoute} dbPhotos={dbPhotos} focusWaypoint={focusWaypoint} gearUpdateBox={gearUpdateBox} logged={logged} mapWrapRef={mapWrapRef} mtn={mtn} myItin={myItin} noWaypoints={noWaypoints} notify={notify} onAddPhotos={onAddPhotos} onOpenRoute={onOpenRoute} onSaveMyItin={onSaveMyItin} onShareItinToCrew={onShareItinToCrew} openFix={openFix} railEl={railEl} route={route} setCalcInputs={setCalcInputs} setFixFocusPitch={setFixFocusPitch} setFixPrefill={setFixPrefill} setShowGpsModal={setShowGpsModal} setTab={setTab} setTrackHistOpen={setTrackHistOpen} setTrackOpen={setTrackOpen} trackHistOpen={trackHistOpen} trackOpen={trackOpen} who={who}/>:null}{/* The Protection/Anchor card lived here. It moved to Plan without the Anchor half (no
        `routes.anchor` column existed then), and was removed there on 2026-10-23: the RACK card says it all. */}{rkFlagged.length?<div {...clickable(()=>setTab("safety"))} style={{display:"flex",alignItems:"center",gap:9,background:C.amberBg,border:`1px solid ${C.amber}`,borderRadius:11,padding:"10px 13px",marginBottom:13,cursor:"pointer"}}><span style={{flexShrink:0}}><ActionIcon name="alert" size={17} color={C.amber}/></span><div style={{flex:1}}><div style={{fontSize:12.5,fontWeight:700,color:C.amber}}>Climbers are flagging hazards not in the official info</div><div style={{fontSize:11.5,color:C.textSub,lineHeight:1.4,marginTop:2}}>{rkFlagged.slice(0,3).map(h=>h.label+" ("+h.count+(h.count===1?" report)":" reports)")).join(", ")+" — tap to open Safety."}</div></div><span aria-hidden="true" style={{display:"flex",flexShrink:0}}><Chevron size={16} color={C.amber}/></span></div>:null}
        {!cragOnly?techStatsEl:null}<VerifNote route={route}/>{_rdCx&&_rdCx.levels?<ConfidenceLegend/>:null}{route._dbAreaReadFailed&&!route._dbArea?<div style={{fontSize:12.5,color:C.textMuted,lineHeight:1.6,marginBottom:8}}>Couldn’t load this climb’s area — the peak, range and walk-in are missing until the connection returns.</div>:null}<Capped><PeakMetadataPanel route={enrichRoute(route)} C={C} ActionIcon={ActionIcon}/></Capped>{/* DATA CONFIDENCE (ProvenancePanel) and DATA QUALITY (DataQualityPanel, mounted from
        ClimbMatch.jsx) both sat on Overview and both answered "how complete/trusted is this
        route's data" — two boxes for one question, ahead of the route itself. Gaps are now
        reported only by the section that owns the missing field (GapNote), so the reader is
        told where to look instead of being told, twice, that there is somewhere to look. The "I'm at the base" check-in moved under the route map (BaseCheckinPanel). */}{cragOnly?<div style={{margin:ROUTE_GAP+"px 0"}}><CragRack route={route} activity={activity} facts={cragFactsEl("rack")} onSeeReports={()=>{setTab("conditions");setTimeout(()=>{if(typeof document!=="undefined"){const el=document.getElementById("trip-reports-section");if(el&&el.scrollIntoView)el.scrollIntoView({behavior:"smooth",block:"start"});}},60);}} onEditRack={function(cur,sec){setFixOpenSection(sec||"rack");setFixPrefill(cur&&(!sec||sec==="rack")?{rack:{note:cur}}:null);setFixOpen(true);}}/>{gearUpdateBox}</div>:null}{cragOnly?cragFactsEl("gear"):null}{cragOnly?cragFactsEl("cond"):null}
        {/* The per-discipline safety advice boxes were removed as too generic; nothing to render inline here. */}
        {(()=>{const tp=noWaypoints?null:typicalFor(route);if(!tp)return null;const rtags=new Set(activity.filter(a=>isRecent(a.date)).flatMap(a=>a.condTags||[]));const conf=(tp.patterns||[]).filter((pat: OvPattern)=>{const st=patternStatus(pat.label,rtags);return st&&st.status==="confirmed";}).length;const diff=(tp.patterns||[]).filter((pat: OvPattern)=>{const st=patternStatus(pat.label,rtags);return st&&st.status!=="confirmed";}).length;return <><SL>What to expect</SL><Capped><div style={{background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,padding:"13px 15px",marginBottom:ROUTE_GAP}}><CardHead style={{marginBottom:8}}>Typical conditions · the general picture</CardHead>{(conf||diff)?<div style={{display:"flex",alignItems:"center",gap:7,background:diff?C.amberBg:C.greenBg,border:`1px solid ${(diff?C.amber:C.green)}44`,borderRadius:9,padding:"7px 10px",marginBottom:10}}><span style={{fontSize:12,fontWeight:600,color:diff?C.amber:C.green}}>{((conf&&diff)?("Recent reports: "+conf+" confirmed · "+diff+" differ"):diff?("Recent reports differ from typical on "+diff+" point"+(diff!==1?"s":"")):("Recent reports back up the typical picture · "+conf+" confirmed"))+" ("+recentN+" report"+(recentN!==1?"s":"")+", last "+RECENT_DAYS+" days)"}</span></div>:null}{tp.summary?<div style={{fontSize:13,color:C.textSub,lineHeight:1.6,marginBottom:(tp.patterns&&tp.patterns.length)?9:0}}>{tp.summary}</div>:null}{(tp.patterns||[]).map((pat: OvPattern,i: number)=><div key={i} style={{display:"flex",gap:9,padding:"8px 0",borderTop:`1px solid ${C.borderLight}`}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700,marginBottom:2}}>{pat.label}{" "}{pat.when?<span style={{marginLeft:7,fontSize:12,fontWeight:700,color:C.onSolid,background:C.blueBg,padding:"1px 7px",borderRadius:6,whiteSpace:"nowrap"}}>{pat.when}</span>:null}</div><div style={{fontSize:12,color:C.textSub,lineHeight:1.55}}>{pat.detail}</div>{(()=>{const st=patternStatus(pat.label,rtags);if(!st)return null;const good=st.status==="confirmed";const col=good?C.green:C.amber;const tg=(good?st.matched:(st.countered.length?st.countered:st.matched))||[];return <div style={{display:"inline-flex",alignItems:"center",gap:5,marginTop:5,padding:"2px 8px",borderRadius:8,background:good?C.greenBg:C.amberBg,border:`1px solid ${col}44`}}><span style={{fontSize:12,fontWeight:700,color:col}}>{good?"✓ Confirmed by recent reports":st.status==="mixed"?"± Mixed recent reports":"↔ Recent reports differ"}</span>{tg.length?<span style={{fontSize:12,color:C.textMuted}}>{"· "+tg.slice(0,2).join(", ")}</span>:null}</div>;})()}</div></div>)}<div {...clickable(()=>setTab("conditions"))} style={{marginTop:11,paddingTop:10,borderTop:"1px solid "+C.border,fontSize:12,color:C.blue,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>{/* `rtags` is the tag set from RECENT trip reports, and patternStatus returns null without it --
    so with no reports every pattern above is the generic discipline picture, and calling that
    "a consensus from recent trip reports" claimed a consensus that does not exist. On the route
    this was found on the page header read "0 Reports" a few hundred pixels above this line. */}
<Lbl s={reportsUnavailable?"Couldn’t load this "+climbNoun(route)+"'s trip reports, so what follows is the general picture for the discipline rather than this "+climbNoun(route)+"'s own conditions — try again in a moment":reportsPackedAt?("No signal — this reads the trip reports "+reportsSavedWith+" "+savedAgo(reportsPackedAt)+". Newer ones need a connection"):rtags.size?"This is a consensus from recent trip reports, not one person's edit — climbed it recently? Log a report to help keep it accurate":(activity.length?("No trip reports in the last "+RECENT_DAYS+" days, so this is the general picture for the discipline rather than current conditions — climbed it recently? Log a report to help keep it accurate"):"Nobody has logged a trip report here yet, so this is the general picture for the discipline rather than this "+climbNoun(route)+"'s own conditions — climb it and log one to start a real consensus")}/></div></div></Capped></>;})()}{cragOnly?null:(()=>{const cc=ovCC;const recent=[...(activity||[])].sort((x,y)=>(y.date||"").localeCompare(x.date||"")).slice(0,3);const confCol=cc?(cc.confidence==="high"?C.green:cc.confidence==="medium"?C.amber:C.red):C.textMuted;const mtn=MOUNTAINS.find(m=>m.id===route.mountainId)||route._dbArea||{};const hz=cc&&cc.hazards&&cc.hazards.length?[...new Set(cc.hazards.flatMap(h=>h.tags))]:[];return <div style={{background:C.card,borderRadius:12,border:`1px solid ${hz.length?C.red+"55":C.border}`,padding:"13px 15px",marginBottom:ROUTE_GAP}}>{cc&&cc.clearedTags&&cc.clearedTags.length?<div style={{fontSize:11.5,color:C.green,fontWeight:700,marginBottom:10,lineHeight:1.4,background:C.greenBg,border:"1px solid "+C.greenDim,borderRadius:9,padding:"7px 10px"}}>{"✓ Reported cleared: "+cc.clearedTags.map(function(t){const v=hzVoteFor(t);return v&&v.gone?t+" ("+v.gone+(v.gone===1?" climber said gone)":" climbers said gone)"):t;}).join(", ")}</div>:null}<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><CardHead>Conditions & recent activity</CardHead><div style={{display:"flex",gap:5,alignItems:"center"}}>{cc&&cc.lastDate?(()=>{const dd=Math.floor((Date.now()-new Date(cc.lastDate).getTime())/86400000);const fr=dd<=14?["• Fresh",C.green]:dd<=60?["• Recent",C.amber]:["Stale",C.red];return <Pill label={fr[0]} color={fr[1]} bg={fr[1]+"22"} sm/>;})():null}{cc?<Pill label={`${cc.confidence} · ${cc.reportCount} report${cc.reportCount!==1?"s":""}`} color={confCol} bg={`${confCol}22`} sm/>:null}</div></div>{hz.length?<div style={{background:C.redBg,border:`1px solid ${C.red}55`,borderRadius:9,padding:"8px 11px",marginBottom:10}}><div style={{...SUB_LABEL,marginBottom:2,color:C.red}}>{"Hazards reported in the last "+RECENT_DAYS+" days"}</div><div style={{fontSize:12,color:C.textSub}}>{hz.slice(0,4).join(" · ")}</div></div>:null}{cc?<div style={{fontSize:12,color:C.textSub,marginBottom:recent.length?12:0}}><span style={{color:C.textMuted}}>{cc.recentCount?("In the last "+RECENT_DAYS+" days ("+cc.recentCount+" report"+(cc.recentCount!==1?"s":"")+"): "):"Latest reported: "}</span>{((cc.recentCount?cc.recentTags:cc.topTags)||[]).slice(0,3).map(t=>t.tag).join(" · ")||"—"}{cc.lastDate?<span style={{color:C.textMuted}}>{" · last report "+ago(cc.lastDate)}</span>:null}</div>:<div style={{fontSize:12,color:C.textMuted}}>{reportsUnavailable?"Couldn’t load this "+climbNoun(route)+"'s reports — try again in a moment.":"No reports yet — be the first to log this climb and tell others if it's in."}</div>}{recent.length?<div><CardHead style={{marginBottom:8}}>Recently climbed</CardHead>{recent.map((aa,i)=>{const summ=/summit/i.test(aa.tickType||"");const att=/attempt|bail|retreat|turn/i.test(aa.tickType||"");const _out=summ?"✓ Summited":att?"Attempt":aa.tickType;return <div key={i} aria-label={aa.user+", "+String(_out||"report").replace("✓ ","")+", "+ago(aa.date)} {...clickable(()=>onOpenReport&&onOpenReport(Object.assign({},aa,{route:route,mtn:mtn}))/* the WHOLE row, like the Reports tab below: this used to copy 11 named fields, so a report opened from here had no beta, no outcome, no itinerary, no sun or road note, no partner accounts and no _dbId -- no comments, no Report link, and no way to read the reporter's own track -- while the same report opened from Reports had all of it. */)} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 0",borderTop:i?`1px solid ${C.borderLight}`:"none",cursor:"pointer"}}><Av src={aa.avatar} size={28}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600}}>{aa.user}<span style={{marginLeft:7,fontSize:12,fontWeight:700,color:summ?C.green:att?C.amber:C.blue}}>{_out}</span></div><div style={{fontSize:12,color:C.textMuted}}>{ago(aa.date)+" · "+aa.date}</div></div><span aria-hidden="true" style={{display:"flex",flexShrink:0}}><Chevron size={16} color={C.textMuted}/></span></div>;})}</div>:null}<div {...clickable(()=>setTab("conditions"))} style={{marginTop:12,textAlign:"center",fontSize:12,color:C.blue,fontWeight:600,cursor:"pointer",paddingTop:10,borderTop:`1px solid ${C.borderLight}`}}>View all reports & conditions →</div></div>;})()}{(()=>{const ph=activity.flatMap(a=>(a.photos||[]).map(u=>({u,a})));if(!ph.length)return null;const nC=new Set(ph.map(x=>x.a.user)).size;return <div style={{marginBottom:ROUTE_GAP}}><SL action={<span style={{fontSize:12,color:C.textMuted}}>{ph.length} photo{ph.length!==1?"s":""} · {nC} climber{nC!==1?"s":""}</span>}>Photos from climbers</SL><PhotoRow items={ph.slice(0,12)}/></div>;})()}<div style={{marginTop:12}}/>
        <div style={{marginBottom:12}}><DiffRadar disc={catOf(route)} ratings={(diffRatings||{})[route.id]} onRate={onRateDifficulty?(axis,val)=>onRateDifficulty(route.id,axis,val):undefined} meta={diffMeta}/></div>
        
        <Capped><TopoSection route={route}/></Capped>{/* PITCH-BY-PITCH and all of the rappel information moved to the Plan tab, which is where
    the approach, the descent and the rack already live. They were kept together on Overview
    because splitting a route's descent across two tabs is worse than either placement
    (151 routes split it, and 585 with a summary and no table showed nothing here at all —
    scripts/oneoff/count-rappel-shapes.mjs). That constraint is unchanged; both halves simply
    moved to the same tab as the rest of the plan rather than away from it. */}
        {(gapGear(route)&&!cragOnly&&catOf(route)!=="bouldering"?<GapNote what="No gear or rack listed" why="Nothing says what to bring — rack sizes, draws, screws or anchor material are all unrecorded." cta="Add the rack" onFix={()=>{openFix("rack");}}/>:null)}
        {(()=>{const _allBeta=(Array.isArray(route.beta)?route.beta:[]).filter((b: string)=>typeof b==="string"&&b.trim());/* A crag line's beta (how the moves go, where it rests) is its own BETA section however short each entry is; the 220-character split only sorts a long route's write-up from its one-line tips. */const _cragBeta=CRAG_CATS.includes(catOf(route));const longBeta=_allBeta.filter((b: string)=>_cragBeta||b.length>=220);/* An empty crag BETA keeps its heading (owner note 2026-10-21: "add back the beta section"): with no beta on file the section vanished, which reads as the app having no place for it. Same rule as the other EmptySections (#2431). */if(!longBeta.length)return _cragBeta?<EmptySection title="BETA" what="No beta yet" why="Nothing says how the moves go, where the crux is or where to rest." cta="Add beta" editTitle="Add beta for this climb" onFix={function(){openFix("beta");}}/>:null;return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"12px 14px",marginBottom:ROUTE_GAP}}><div style={{marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><span style={{display:"inline-flex",alignItems:"center",gap:7}}><CardHead>BETA</CardHead></span>{/* The section-header ✎ Edit, as on KNOWN HAZARDS (#2592): a full-size Suggest a fix button outweighed the heading. */}<EditIconButton onClick={function(e: {stopPropagation: () => void}){e.stopPropagation();openFix("beta");} as () => void} title="Suggest a fix to the beta"/></div>{longBeta.map(function(b: string,i: number){return <div key={"lb"+i}>{splitParagraphs(b).map(function(p,k){return <p key={k} style={{fontSize:13,color:C.textSub,lineHeight:1.7,margin:k===0?"0":"8px 0 0"}}>{p}</p>;})}</div>;})}{(function(){/* BETA → THE CLIMB ITSELF (owner note 2026-10-22: "make the flow easier from that section to the climbing route"). BETA is prose on Overview; the same climb section by section — ROUTE BREAKDOWN, or CLIMBING ROUTE on an unpitched route — is on Plan (or further down Overview on a crag route, which has no Plan tab), with nothing between them. This opens it and scrolls to it, the way Mountain Project's topo ties its description to each pitch. It lands on CLIMBING ROUTE when one is written (since #2648 it comes first and hands off to the breakdown), else on ROUTE BREAKDOWN. Shown only when that section has rows: it never leads to an empty one. */const _bd=route.discipline==="bouldering"?null:((route.climbingRoute||[]).length?{id:"climbing-route",n:route.climbingRoute.length,name:"Climbing route"}:((route.pitchDetail&&route.pitchDetail.length)?{id:"route-breakdown",n:route.pitchDetail.length,name:"Route breakdown"}:null));if(!_bd)return null;return <button onClick={function(e){e.stopPropagation();if(showPlan)setTab("planner");setTimeout(function(){const el=document.getElementById((_bd as NonNullable<typeof _bd>).id);if(el&&el.scrollIntoView)el.scrollIntoView({block:"start",behavior:"smooth"});},120);}} style={{...BTN,width:"100%",marginTop:12,display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,border:"1px solid "+C.blueDim,background:C.blueBg,color:C.onSolid,textAlign:"left"}}><span>{"Follow the climb section by section"}<span style={{display:"block",fontSize:11.5,fontWeight:500,color:C.textMuted,marginTop:2}}>{_bd.name+" · "+_bd.n+" section"+(_bd.n!==1?"s":"")+(showPlan?" · on the Plan tab":" · further down")}</span></span><span aria-hidden="true">→</span></button>;})()}</div>;})()}{(()=>{const shortBeta=CRAG_CATS.includes(catOf(route))?[]:(Array.isArray(route.beta)?route.beta:[]).filter((b: string)=>typeof b==="string"&&b.length<220);const tips=shortBeta.concat(route.proTips||[]);if(!tips.length)return null;return <div style={{background:C.blueBg,borderRadius:10,padding:"10px 12px",marginBottom:ROUTE_GAP,border:`1px solid ${C.blueDim}`}}><div style={{marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><CardHead>PRO TIPS</CardHead><EditIconButton onClick={function(e: {stopPropagation: () => void}){e.stopPropagation();openFix("beta");} as () => void} title="Suggest a fix to the pro tips"/></div>{tips.map((b: string,i: number)=><div key={"pt"+i} style={{fontSize:13,color:C.textSub,padding:"3px 0",lineHeight:1.5}}>• {b}</div>)}</div>;})()}{(()=>{/* What a climber BROUGHT (gearBeta) lives with the rack: RackBetaList, at the foot of RouteRackBox (alpine) and of CragRack (trad, sport, toprope, aid; not bouldering). Printing it here too made it two boxes for one fact. */const cb=activity.filter(a=>a.beta);if(!cb.length)return null;return <div style={{background:C.surface,borderRadius:10,padding:"11px 12px",marginBottom:8,border:"1px solid "+C.border}}><CardHead tone={C.green} style={{marginBottom:8}}>CLIMBER BETA <span style={{color:C.textMuted,fontWeight:500,textTransform:"none",letterSpacing:0}}>· from logged ascents</span></CardHead>{cb.map((a,i)=><div key={i} style={{display:"flex",gap:9,padding:"7px 0",borderTop:i?"1px solid "+C.borderLight:"none"}}><Av src={a.avatar} size={26}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:11.5,color:C.textSub,marginBottom:2}}><b style={{color:C.text}}>{a.user}</b>{a.date?" · "+a.date:""}</div>{a.beta?<div style={{fontSize:13,color:C.textSub,lineHeight:1.5}}>{a.beta}</div>:null}</div></div>)}</div>;})()}
{/* The `permits` / `permitUrl` pair used to render HERE, loose on Overview between the beta
    blocks and PAIRS WELL WITH, under no heading of any kind — a green banner with no label
    saying what it was, and on a route with permit text but no link, a bare 12px grey line
    with nothing to say it was about a permit at all. Meanwhile everything else about getting
    in past the gate — the permit name, the land manager, the pass, the closures, how to
    apply — sat in ACCESS & REGULATIONS on the PLAN tab, a tab away. Two permit surfaces on
    two different screens, one of them anonymous. It now renders inside that panel, beside
    the rest of what it is about. Do not put it back on Overview. */}
      {/* PAIRS WELL WITH links objectives into one trip — a second peak off the same camp. At a crag the climbs beside this one ARE the trip, and "More on" below already lists them, so crag routes (sport, trad, top-rope, aid, bouldering) do not get it (owner, 2026-10-14). */}{/* Crowds for a crag route (and sun and season when it has no Conditions tab), mounted by ClimbMatch.jsx; they come BEFORE "More on" so that list closes the page, right above Top contributors and the Discussion (owner, 2026-10-15). */}{cragOnly&&!condTab?condPanels:null}{cragPanels||null}{cragOnly?null:<Capped><PairsWellWith route={route} onOpenRoute={onOpenRoute} notify={notify}/></Capped>}{/* LINK-UPS: the researched multi-peak trips this climb is a leg of (route_link_ups, lib/LinkUps.jsx). Same gate as PAIRS WELL WITH: alpine, mountaineering and scrambling only (owner, 2026-10-28). */}{cragOnly?null:<Capped><LinkUps route={route} onOpenRoute={onOpenRoute}/></Capped>}{/* ROUTE STATS: page views, sends, logged climbs, objectives, the star breakdown and sends by month (0353, lib/RouteStats.jsx). Above the log buttons, so "More on" still closes the page. */}{USE_DB?<RouteStats routeId={route.id} cragOnly={cragOnly} onOpenPartners={function(){setTab("partners");}}/>:null}{/* 30px above, the section gap the "More on" rule keeps below: at 12px the buttons sat under ROUTE STATS' footnote and read as part of that box (owner note, 2026-10-29). */}<div style={{margin:"30px 0 "+ROUTE_GAP+"px"}}>{logRow()}</div>{(()=>{const sibs=cragSibs.filter(x=>x.id!==route.id);/* A crag is not a peak, and bouldering calls its lines PROBLEMS (owner, 2026-10-21). */const sibNoun=catOf(route)==="bouldering"?"problems":"routes";const sibWhere=!cragOnly?"on this peak":catOf(route)==="bouldering"?"in this area":"at this crag";return <div id={"sibs-"+route.id} style={{marginTop:30,paddingTop:16,borderTop:"2px solid "+C.borderHi}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}><div style={{fontSize:15,fontWeight:700}}>{(cragOnly?"More at ":"More on ")+mtn.name}</div>{sibs.length?<span style={{fontSize:11.5,color:C.textMuted}}>{(sibs.length+1)+" "+sibNoun}</span>:null}</div><div style={{fontSize:12,color:C.textSub,marginBottom:11,lineHeight:1.5}}>{sibs.length?(cragOnly?"Other "+sibNoun+" "+sibWhere+" — tap any to compare conditions and beta.":"Other established lines on this peak — tap any to compare conditions and beta."):sibsUnavailable?"Couldn’t load the other "+sibNoun+" "+sibWhere+" — this is not a claim that there are none. Check your connection and try again.":sibsPending?"Checking for other "+sibNoun+" "+sibWhere+"…":cragOnly?("The only "+sibNoun.replace(/s$/,"")+" catalogued at "+mtn.name+" so far. Add the others as climbers find them, and they will collect here."):("The only route catalogued on "+mtn.name+" so far. As climbers log ascents, every line on the peak — other routes, ridges and variations — will collect here under the mountain.")}</div>{(sibsExpand?sibs:sibs.slice(0,5)).map(sr=><div key={sr.id} {...clickable(()=>onOpenRoute&&onOpenRoute(sr))} style={{display:"flex",alignItems:"center",gap:11,background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"9px 11px",marginBottom:ROUTE_GAP,cursor:"pointer"}}><div style={{width:40,height:40,borderRadius:8,overflow:"hidden",flexShrink:0}}><img loading="lazy" decoding="async" src={sr.cover} className="cover-x" alt="" onError={onImgErr(FALLBACK_COVER)} style={{width:"100%",height:"100%",objectFit:"cover"}}/></div><div style={{flex:1,minWidth:0}}><div style={{fontSize:13.5,fontWeight:700}}>{sr.name}</div><div style={{fontSize:11.5,color:C.textSub,display:"flex",alignItems:"center",gap:4}}><DiscIcon d={catOf(sr)} size={11}/>{((CAT[catOf(sr)]||{}).label||catOf(sr))+(gradeLabel(sr)?" · "+gradeLabel(sr):"")}</div>{condRep(sr)?<div style={{fontSize:11,color:C.green,fontWeight:700,marginTop:1}}>{"✓ "+condRep(sr)+" report"+(condRep(sr)!==1?"s":"")}</div>:null}</div><span aria-hidden="true" style={{display:"flex",flexShrink:0}}><Chevron size={16} color={C.textMuted}/></span></div>)}{sibs.length>5?<button onClick={()=>setSibsExpand(x=>!x)} style={{...BTN,width:"100%",border:"1px solid "+C.border,background:C.surface,color:C.blue}}>{sibsExpand?"Show fewer":"Show all "+(sibs.length+1)+" "+sibNoun}</button>:null}</div>;})()}</div>;
}
