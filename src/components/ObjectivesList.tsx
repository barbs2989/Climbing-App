import { Suspense } from "react";
import ScreenSkeleton from "./ScreenSkeleton.tsx";
import { C, MOUNTAINS, isHazardTag, isRoadTag, shortDate } from "../../ClimbMatchCore.jsx";
import { ListsManager } from "../../lib/lazyScreens.js";
import { saveObjective, removeObjective } from "../../lib/db";
import { saveObjDates } from "../../lib/offline";
import RetryReminder from "./RetryReminder.tsx";
import { clickable } from "../../lib/clickable";
import Av from "./Av.tsx";
import Pill from "./Pill.tsx";
import ReportStats from "./ReportStats.tsx";
import Chevron from "./Chevron.tsx";
import type { Dispatch, SetStateAction } from "react";
import type { ReportCond } from "./ReportStats.tsx";

type ObjectivesListId = string | number;
/** A trip report on a climb: an example report or one `tripRowToActivity` built from a stored row. */
interface ObjectivesListReport {
  date: string;
  user?: string | null;
  avatar?: string | null;
  tickType?: string | null;
  outcomeReasons?: string[] | null;
  outcomeNote?: string | null;
  cond?: ReportCond | null;
  condTags?: string[] | null;
  photos?: unknown[] | null;
  text?: string | null;
}
/** A saved climb: a seed route or a `dbRouteToCamel` row. */
interface ObjectivesListRoute {
  id: ObjectivesListId;
  name: string;
  grade?: string | null;
  mountainId?: string;
  _dbArea?: { name?: string } | null;
  activity?: ObjectivesListReport[] | null;
}
/** One climb's newest report, the older ones, and its age in days. */
interface ObjectivesListRow { r: ObjectivesListRoute; rep: ObjectivesListReport; more: ObjectivesListReport[]; d: number; src: string }
interface ObjectivesListCrew { id: ObjectivesListId; routeId?: ObjectivesListId | null }
/** A list in the Lists manager; "ul_obj" is the objectives list. */
interface ObjectivesListUserList { id: string; routeIds?: ObjectivesListId[]; [k: string]: unknown }

export interface ObjectivesListProps {
  activeCrews: ObjectivesListCrew[];
  /** Show every climb with a recent report, not the first three. */
  condExpand: boolean;
  crewMsgs: Record<string, unknown[] | undefined>;
  /** Some saved climbs' rows failed to load. */
  dbListRoutesFailed: boolean;
  dbListRoutesFetching: boolean;
  listsUnavailable: boolean;
  logs: unknown[];
  logsUnavailable: boolean;
  myObjectivesQ: { refetch?: () => Promise<{ data?: ObjectivesListId[] | null } | undefined> };
  /** Planned dates by route id. */
  objDates: Record<string, string>;
  /** Other climbers' reports on the objectives, by route id. */
  objReportsByRoute: Record<string, ObjectivesListReport[] | undefined>;
  objReportsUnavailable: boolean;
  /** When each objective was saved, by route id. */
  objSavedAtQ: { data?: Record<string, string> | null };
  objectivesUnavailable: boolean;
  onCreateList: (f: { name?: string; description?: string; routeIds?: ObjectivesListId[]; localId?: string }) => void;
  onFindPartnersInArea: (a: { id: string; name?: string; areaType?: string | null; area_type?: string | null }) => void;
  onUpdateList: (dbId: string, patch: Record<string, unknown>) => void;
  openRoute: (r: ObjectivesListRoute) => void;
  routeById: (id: ObjectivesListId | null | undefined) => ObjectivesListRoute | undefined;
  setCondExpand: Dispatch<SetStateAction<boolean>>;
  setCrewView: (v: string) => void;
  setListShareFor: (v: { ul: unknown; items: unknown; pub: unknown }) => void;
  setListShareSent: (v: Record<string, boolean>) => void;
  setLogFocus: (id: ObjectivesListId) => void;
  setLogModal: (r: ObjectivesListRoute) => void;
  setLogPickOpen: (open: boolean) => void;
  setLogbookTab: (tab: string) => void;
  setObjDates: Dispatch<SetStateAction<Record<string, string>>>;
  setOpenCrewId: (id: ObjectivesListId) => void;
  setPartnerClimb: (r: ObjectivesListRoute) => void;
  setPartnersMode: (mode: string) => void;
  setPendingSubTab: (tab: string) => void;
  setReport: (r: ObjectivesListReport & { route: ObjectivesListRoute; mtn: { name?: string } }) => void;
  setSelRoute: (r: null) => void;
  setTab: (tab: string) => void;
  setUserLists: Dispatch<SetStateAction<ObjectivesListUserList[]>>;
  showToast: (t: string, d?: number) => void;
  uid: string | null;
  userLists: ObjectivesListUserList[];
  wishlist: ObjectivesListId[];
}

/* renderObjectives — the body of that closure of App, lifted verbatim by extract-from-parent.mjs (closure mode);
   its parameters () and every binding it read from App are props of the same name. */
export default function ObjectivesList({activeCrews,condExpand,crewMsgs,dbListRoutesFailed,dbListRoutesFetching,listsUnavailable,logs,logsUnavailable,myObjectivesQ,objDates,objReportsByRoute,objReportsUnavailable,objSavedAtQ,objectivesUnavailable,onCreateList,onFindPartnersInArea,onUpdateList,openRoute,routeById,setCondExpand,setCrewView,setListShareFor,setListShareSent,setLogFocus,setLogModal,setLogPickOpen,setLogbookTab,setObjDates,setOpenCrewId,setPartnerClimb,setPartnersMode,setPendingSubTab,setReport,setSelRoute,setTab,setUserLists,showToast,uid,userLists,wishlist}: ObjectivesListProps){
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- the planned-date map is keyed by route id; dropping a cleared date is the intended behaviour
  return <div><Suspense fallback={<ScreenSkeleton C={C} label="Loading your lists…"/>}><ListsManager notify={showToast} routesLoading={dbListRoutesFetching} routesFailed={dbListRoutesFailed} onShareList={function(ul: unknown,items: unknown,pub: unknown){setListShareSent({});setListShareFor({ul:ul,items:items,pub:pub});}} onFindPartnersInArea={onFindPartnersInArea} objSavedAt={objSavedAtQ.data||{}} onObjectivesChanged={function(prev: ObjectivesListId[],next: ObjectivesListId[]){/* Logbook › Objectives' ✕, Remove selected and Add climbs edit `ul_obj`, which has no user_lists row; without this they never reached the objectives table and a removed climb came back on reload. Signed out, the list lives on this device only, as toggleWish's does. */if(!uid)return;const add=next.filter(function(id: ObjectivesListId){return prev.indexOf(id)<0;});const gone=prev.filter(function(id: ObjectivesListId){return next.indexOf(id)<0;});Promise.all(add.map(function(id: ObjectivesListId){return saveObjective(uid,id);}).concat(gone.map(function(id: ObjectivesListId){return removeObjective(uid,id);}))).catch(function(){showToast("Couldn’t save that change to your objectives — check your connection and try again.");if(myObjectivesQ.refetch)myObjectivesQ.refetch().then(function(r){if(r&&r.data)setUserLists(function(ls){return ls.map(function(l){return l.id==="ul_obj"?Object.assign({},l,{routeIds:(r.data as ObjectivesListId[]).slice()}):l;});});});});}} listsUnavailable={listsUnavailable} objectivesUnavailable={objectivesUnavailable} logsUnavailable={logsUnavailable} objDates={objDates} onSetObjDate={function(rid: string,d: string | null){setObjDates(function(p){const n=Object.assign({},p);if(d)n[rid]=d;else delete n[rid];/* best-effort, like the bookmarks: a browser refusing IndexedDB keeps it for the session */saveObjDates(uid,n).catch(function(){});return n;});}} userLists={userLists} setUserLists={setUserLists} onCreateList={onCreateList} onUpdateList={onUpdateList} logs={logs} onOpen={openRoute} crews={activeCrews} crewMsgs={crewMsgs} routeById={routeById} onFindPartners={function(r: ObjectivesListRoute){setPartnerClimb(r);setPartnersMode("partners");setTab("discover");setSelRoute(null);}} onOpenCrew={function(r: ObjectivesListRoute){const c=activeCrews.find(function(x){return x.routeId===r.id;});if(c){setOpenCrewId(c.id);setCrewView("crews");setTab("crew");}}} onOpenLog={function(r: ObjectivesListRoute){setLogbookTab("completed");setLogFocus(r.id);}} onLogClimb={function(r: ObjectivesListRoute){setLogModal(r);}} onPickLog={function(){setLogPickOpen(true);}}/></Suspense><RetryReminder logs={logs} routes={routeById} onOpen={openRoute}/><div style={{marginTop:18}}>{(()=>{/* THE EMPTY STATE BELOW BRANCHES ON objs.length, and it used to give two pieces of advice that were both wrong for a real account. It said "Save a climb to your objectives OR BOOKMARK AN AREA" — but this list is built from `wishlist` alone, so a bookmarked area contributes nothing to it and never has (the vestigial src:"obj" sort is the only trace of a second source). And it told a climber who ALREADY HAS objectives to go save one: measured on the check:signed-in walk, an account holding "North Ridge" was shown exactly that. Correct at zero, wrong the moment you have data — the #654 shape inverted. */const objs=wishlist.map(function(id: ObjectivesListId){return routeById(id);}).filter(Boolean);const hd={fontSize:13,fontWeight:800,letterSpacing:0.4,textTransform:"uppercase",color:C.text,borderLeft:"3px solid "+C.blue,paddingLeft:9,margin:"2px 0 9px"};const now=Date.now();const seen: Record<string, number>={};const cand: { r: ObjectivesListRoute; src: string }[]=[];objs.forEach(function(r){if(r&&!seen[r.id]){seen[r.id]=1;cand.push({r:r,src:"obj"});}});const dayOf=function(a: ObjectivesListReport){return Math.floor((now-new Date(a.date+"T12:00:00").getTime())/86400000);};/* EVERY report from the last 90 days, not just the newest. This kept acts[0] and dropped the rest, so when three climbers reported on one objective the block showed one of them and gave no sign the other two existed (WTA's hike page and Mountain Project's ticks list every report by date; the climber looking for conditions wants the second opinion most). */const allrows=(cand.map(function(c){const r=c.r;const acts=((r&&r.activity)||[]).concat((r&&objReportsByRoute[r.id])||[]).filter(function(a){return a&&a.date&&dayOf(a)<=90;}).slice().sort(function(a,b){return b.date.localeCompare(a.date);});const rep=acts[0];if(!rep)return null;return {r:r,rep:rep,more:acts.slice(1),d:dayOf(rep),src:c.src};}).filter(Boolean) as ObjectivesListRow[]).sort(function(a,b){const oa=a.src==="obj"?0:1,ob=b.src==="obj"?0:1;return oa!==ob?oa-ob:a.d-b.d;});const rows=condExpand?allrows:allrows.slice(0,3);/* saved climbs whose rows are still on their way (or failed): not an empty objectives list */const _objsPending=objs.length<wishlist.length&&(dbListRoutesFetching||dbListRoutesFailed);if(!rows.length)return <div><div style={hd}>Recent condition reports</div><div style={{background:C.card,border:"1px dashed "+C.border,borderRadius:12,padding:"16px 14px",textAlign:"center"}}><div style={{fontSize:13,color:C.textSub,fontWeight:600,marginBottom:3}}>{objectivesUnavailable?"Couldn’t load your objectives":objReportsUnavailable?"Couldn’t load condition reports":_objsPending?(dbListRoutesFailed?"Couldn’t load your objectives":"Checking your objectives…"):"No recent condition reports"}</div><div style={{fontSize:12,color:C.textMuted,lineHeight:1.5}}>{objectivesUnavailable?"This list is built from the climbs in your objectives, and those didn’t load. Check your connection and try again.":objReportsUnavailable?"Other climbers’ reports on your objectives didn’t load. Check your connection and try again.":_objsPending?(dbListRoutesFailed?"Some of your saved climbs didn’t load, so their reports can’t be shown. Check your connection and try again.":"Recent reports on your saved climbs show here once they load."):objs.length?"None of your objectives has a report from the last 90 days. New ones show up here as other climbers file them.":"Save a climb to your objectives and fresh reports from other climbers show up here."}</div></div></div>;const openRep=function(rep: ObjectivesListReport,r: ObjectivesListRoute){setReport(Object.assign({},rep,{route:r,mtn:MOUNTAINS.find(function(m){return m.id===r.mountainId;})||r._dbArea||{}}));};const who=function(rep: ObjectivesListReport){return rep.user||"A climber";};const hzOf=function(rep: ObjectivesListReport){return (rep.condTags||[]).some(function(t){return isHazardTag(t);});};return <div><div style={hd}>Recent condition reports</div><div style={{fontSize:11.5,color:C.textMuted,margin:"-4px 0 9px",lineHeight:1.5}}>Trip reports from the last 90 days on the climbs in your objectives, newest first. Tap a report to read it in full.</div>{rows.map(function(row,i){const r=row.r,rep=row.rep,d=row.d,more=row.more;const isObj=row.src==="obj";const tags=(rep.condTags||[]).filter(function(t){return !isRoadTag(t);}).slice().sort(function(x,y){return (isHazardTag(y)?1:0)-(isHazardTag(x)?1:0);});const hz=hzOf(rep);const fresh=d<=21;const ago=d<1?"today":d===1?"yesterday":d+" days ago";const mtn=((MOUNTAINS.find(function(m){return m.id===r.mountainId;})||r._dbArea||{}).name)||"";const nPh=(rep.photos||[]).length;return <div key={r.id} className={d<=2?"cm-pulse":undefined} style={{background:C.card,border:`1px solid ${hz?C.amber:C.border}`,borderLeft:`4px solid ${hz?C.amber:C.teal}`,borderRadius:12,padding:"10px 12px",marginBottom:i===rows.length-1?0:8}}><div {...clickable(function(){openRep(rep,r);})} aria-label={"Read "+who(rep)+"’s trip report on "+r.name} style={{cursor:"pointer"}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,color:C.text,overflowWrap:"anywhere"}}>{r.name}</div><div style={{fontSize:11.5,color:C.textMuted,marginTop:1}}>{mtn+(r.grade?" · "+r.grade:"")+(isObj?"":(row.src==="area"?" · area you follow":""))}</div></div><span style={{fontSize:11.5,fontWeight:700,color:fresh?C.green:C.textMuted,background:fresh?C.greenBg:C.surface,borderRadius:20,padding:"3px 9px",whiteSpace:"nowrap",flexShrink:0}}>{ago}</span></div><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}><Av src={rep.avatar} size={24}/><div style={{flex:1,minWidth:0,fontSize:12,color:C.textSub}}><span style={{fontWeight:700,color:C.text}}>{who(rep)}</span>{" · "+shortDate(rep.date)}</div>{rep.tickType?<Pill label={rep.tickType} color={C.blue} bg={C.blueBg} sm/>:null}</div>{(rep.outcomeReasons&&rep.outcomeReasons.length)?<div style={{fontSize:11.5,color:C.amber,marginBottom:6}}>{"Turned back: "+rep.outcomeReasons.join(", ")+(rep.outcomeNote?" — "+rep.outcomeNote:"")}</div>:null}<ReportStats cond={rep.cond}/>{tags.length?<div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:6}}>{tags.map(function(t){const h=isHazardTag(t);return <span key={t} style={{fontSize:11.5,fontWeight:h?700:400,color:h?C.amber:C.textSub,background:h?C.amberBg:C.surface,border:`1px solid ${h?C.amber:C.border}`,borderRadius:6,padding:"2px 7px"}}>{t}</span>;})}</div>:null}{rep.text?<div style={{fontSize:12,color:C.textSub,lineHeight:1.5,whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{rep.text}</div>:null}<div style={{display:"flex",alignItems:"center",gap:8,marginTop:7}}>{nPh?<span style={{fontSize:11.5,color:C.textMuted}}>{nPh+" photo"+(nPh!==1?"s":"")}</span>:null}<span style={{fontSize:12,color:C.blue,fontWeight:600,marginLeft:"auto"}}>Read full report ›</span></div></div>{more.length?<div style={{borderTop:"1px solid "+C.border,marginTop:9,paddingTop:8}}><div style={{fontSize:11.5,fontWeight:700,color:C.textMuted,marginBottom:4}}>{more.length+" more report"+(more.length!==1?"s":"")+" in the last 90 days"}</div>{more.slice(0,3).map(function(m,mi){const mt=(m.condTags||[]).filter(function(t){return !isRoadTag(t);}).slice(0,2);const mh=hzOf(m);return <div key={mi} {...clickable(function(){openRep(m,r);})} aria-label={"Read "+who(m)+"’s trip report from "+shortDate(m.date)} style={{display:"flex",alignItems:"center",gap:7,padding:"6px 0",cursor:"pointer",borderTop:mi?"1px solid "+C.border:"none"}}><Av src={m.avatar} size={20}/><div style={{flex:1,minWidth:0,fontSize:12,color:C.textSub,overflowWrap:"anywhere"}}><span style={{fontWeight:700,color:C.text}}>{who(m)}</span>{" · "+shortDate(m.date)+(mt.length?" · "+mt.join(", "):"")}</div>{mh?<span style={{fontSize:11.5,fontWeight:700,color:C.amber,flexShrink:0}}>hazard</span>:null}<span aria-hidden="true" style={{display:"flex",flexShrink:0}}><Chevron size={16} color={C.textMuted}/></span></div>;})}</div>:null}<button onClick={function(){setPendingSubTab("conditions");openRoute(r);}} style={{display:"block",width:"100%",marginTop:8,padding:"7px",borderRadius:8,border:"1px solid "+C.border,background:C.surface,color:C.blue,fontSize:12,fontWeight:700,cursor:"pointer"}}>{more.length>3?"See all "+(more.length+1)+" reports on this climb":"All trip reports on this climb"}</button></div>;})}{allrows.length>3?<button onClick={function(){setCondExpand(function(v){return !v;});}} style={{width:"100%",marginTop:9,padding:"8px",borderRadius:9,border:"1px solid "+C.border,background:C.surface,color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{condExpand?"Show fewer":"Show "+(allrows.length-3)+" more climb"+((allrows.length-3)!==1?"s":"")}</button>:null}</div>;})()}</div></div>;
}
