import { C, DbAreaBrowser, uElev, uElevN, uElevUnit, uDistMi, rankSimilarRoutes, suggestDiscSlots, AreaView, ROUTES, HERO_BG, HERO_SHEEN, inArea, MOUNTAINS, avgStars, protOf, RouteFinder, QuickMatch, OverviewMap, AreaBrowse, AreaCrags, fuzzyMatch, distMiles, ME, FALLBACK_COVER, onImgErr, hlMatch, gradeVal, catOf, CAT, ClassicClimbs, GettingThere, AreaLatest, SuggestedClimbs } from "../../ClimbMatchCore.jsx";
import { POP_CLOSE, POP_BACK, POP_REMOVE } from "../../lib/popupChrome.js";
import { USE_DB } from "../../lib/supabase";
import ActionIcon from "./ActionIcon.tsx";
import Chevron from "./Chevron.tsx";
import { Suspense } from "react";
import LoadingRows from "./LoadingRows.tsx";
import TopContributors from "./TopContributors.tsx";
import RealClimberRow from "./RealClimberRow.tsx";
import Comments from "./Comments.tsx";
import SearchSplit from "./SearchSplit.tsx";
import Lbl from "./Lbl.tsx";
import { clickable } from "../../lib/clickable";
import EmptyState from "./EmptyState.tsx";
import { ViewToggle } from "../../lib/mapKit";
import ScreenSkeleton from "./ScreenSkeleton.tsx";
import { MyAscents } from "../../lib/lazyScreens.js";
import { deleteSavedSearchRow, createSavedSearchRow } from "../../lib/db";
import DiscIcon from "./DiscIcon.tsx";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { CommentAuthor, MentionCandidate, ThreadComment } from "./Comments.tsx";
import type { ChallengeLog } from "./Challenges.tsx";
import type { SeedContribution } from "./TopContributors.tsx";

/** An example route from the demo catalog. */
type RoutesTabSeedRoute = (typeof ROUTES)[number];
/** An area from the demo tree. */
type RoutesTabSeedArea = (typeof MOUNTAINS)[number];
/** A climb as the pickers hand it back, from the demo catalog or the database. */
interface RoutesTabRoute { id: string | number; name: string; mountainId?: string | number | null }
/** An area row as the area browser hands it back. */
interface RoutesTabDbArea { id: string; name: string; area_type?: string; areaType?: string; disciplines?: string[] | null; [k: string]: unknown }
/** A saved search: a Climbs filter set. */
interface RoutesTabSearch { id: string | number; name: string; filters: RoutesTabFilters; discSel?: string[]; _dbId?: string | null; [k: string]: unknown }
/** The Climbs filter set, as App keeps it. */
interface RoutesTabFilters { aspect: string[]; [k: string]: unknown }
/** A live read, as the hooks hand it back; only the rows this tab reads. */
interface RoutesTabQuery<T> { data?: T | null; refetch?: () => unknown }
/** An open crew, with the area it meets at. */
interface RoutesTabOpenCrew { areaId?: string | null; spots: number }
/** An area page waiting to be opened by the area browser. */
interface RoutesTabJump { id: number; [k: string]: unknown }

export interface RoutesTabProps {
  _blockIds: ReadonlyArray<string | number>;
  _reqClimber: (id: string | number) => unknown;
  addComment: (targetId: string | number, text: string) => void;
  areaCommentTargets: string[];
  areaMatchCount: (areaId: string) => number;
  blockClimber: (c: CommentAuthor) => void;
  bookmarks: string[];
  climberProfile: unknown;
  /** The Climbs screen's quiet headline. */
  climbsHero: ReactNode;
  comments: ReadonlyArray<ThreadComment>;
  completedRouteIds: Set<string | number>;
  condReports: ReadonlyArray<ChallengeLog & { routeId?: string | null }>;
  connections: ReadonlyArray<MentionCandidate>;
  contribs: SeedContribution[];
  cragFilter: string;
  cragSort: string;
  dbAreaJump: RoutesTabJump | null;
  dbOpenCrews: RoutesTabOpenCrew[];
  dbRouteFull: (dbR: { id: string; [k: string]: unknown }) => RoutesTabRoute;
  deleteComment: (id: string | number) => void;
  discSel: string[];
  editComment: (id: string | number, text: string) => void;
  filters: RoutesTabFilters;
  filtersActive: boolean;
  finderJump: RoutesTabJump | null;
  fireFocusFromArea: (area: unknown) => unknown;
  likeComment: (id: string | number) => void;
  logFocus: string | number | null;
  logs: ChallengeLog[];
  logsUnavailable: boolean;
  myAreasQ: RoutesTabQuery<unknown[]>;
  mySearchesQ: RoutesTabQuery<unknown>;
  notifyMentions: (text: string, candidates: ReadonlyArray<MentionCandidate>, extra: { route?: string }) => void;
  objHint: boolean;
  onFindPartnersInArea: (a: { id?: string; name?: string; areaType?: string; area_type?: string } | null) => void;
  openFireMap: (focus: unknown) => void;
  openLogReport: (l: ChallengeLog, i: number) => boolean;
  openMyAreas: (pre?: { areaId?: string; name?: string; areaType?: string; area_type?: string; disciplines?: string[] }) => void;
  openRoute: (r: RoutesTabRoute) => void;
  openGroupsNear: (a: { id: string; name: string }) => void;
  reactComment: (id: string | number, key: string) => void;
  renderObjectives: () => ReactNode;
  replyComment: (parentId: string | number, targetId: string | number, text: string) => void;
  /** Callers test the result: an id the catalog has not loaded yet comes back empty. */
  routeById: (id: string | number | null | undefined) => RoutesTabRoute;
  routeMatches: (r: RoutesTabSeedRoute) => boolean;
  routeView: string;
  savedSearches: RoutesTabSearch[];
  savingSearch: boolean;
  search: string;
  searchSaveName: string;
  selArea: RoutesTabSeedArea | null;
  selRoute: { id: string } | null;
  setAddAreaParent: Dispatch<SetStateAction<unknown>>;
  setAddRouteArea: Dispatch<SetStateAction<unknown>>;
  setAddRouteOpen: Dispatch<SetStateAction<boolean>>;
  setAreaFixArea: Dispatch<SetStateAction<unknown>>;
  setAreaFixField: Dispatch<SetStateAction<string | null>>;
  setAreaFixOpen: Dispatch<SetStateAction<boolean>>;
  setAreaTreeOpen: Dispatch<SetStateAction<boolean>>;
  setContribOpen: Dispatch<SetStateAction<boolean>>;
  setCragFilter: Dispatch<SetStateAction<string>>;
  setCragSort: Dispatch<SetStateAction<string>>;
  setCrewFinderArea: Dispatch<SetStateAction<unknown>>;
  setDbAreaCtx: Dispatch<SetStateAction<unknown>>;
  setDiscSel: Dispatch<SetStateAction<string[]>>;
  setFilters: Dispatch<SetStateAction<RoutesTabFilters>>;
  setLogEditData: Dispatch<SetStateAction<unknown>>;
  setLogModal: Dispatch<SetStateAction<unknown>>;
  setLogModalFocus: Dispatch<SetStateAction<string | null>>;
  setLoginOpen: Dispatch<SetStateAction<boolean>>;
  setManageAreasOpen: Dispatch<SetStateAction<boolean>>;
  setObjHint: Dispatch<SetStateAction<boolean>>;
  setPartnersMode: Dispatch<SetStateAction<string>>;
  setPendingSubTab: Dispatch<SetStateAction<string | null>>;
  setProfileModal: Dispatch<SetStateAction<unknown>>;
  setReport: Dispatch<SetStateAction<unknown>>;
  setRouteView: Dispatch<SetStateAction<string>>;
  setSavedSearches: Dispatch<SetStateAction<RoutesTabSearch[]>>;
  setSavingSearch: Dispatch<SetStateAction<boolean>>;
  setSearchSaveName: Dispatch<SetStateAction<string>>;
  setSelArea: Dispatch<SetStateAction<unknown>>;
  setSharedRoute: Dispatch<SetStateAction<unknown>>;
  setStartCrew: Dispatch<SetStateAction<unknown>>;
  setTab: Dispatch<SetStateAction<string>>;
  showToast: (t: string, d?: number) => void;
  stateJumpReq: unknown;
  toggleBookmark: (id: string) => void;
  toggleListRoute: (listId: string, routeId: string | number) => void;
  toggleWish: (id: string | number) => void;
  uid: string | null;
  userLists: ReadonlyArray<unknown>;
  wishlist: Array<string | number>;
}

/* tab==="routes"? — the body of that branch of App, lifted verbatim by extract-from-parent.mjs (branch mode);
   every binding it read from App is a prop of the same name. */
export default function RoutesTab({_blockIds,_reqClimber,addComment,areaCommentTargets,areaMatchCount,blockClimber,bookmarks,climberProfile,climbsHero,comments,completedRouteIds,condReports,connections,contribs,cragFilter,cragSort,dbAreaJump,dbOpenCrews,dbRouteFull,deleteComment,discSel,editComment,filters,filtersActive,finderJump,fireFocusFromArea,likeComment,logFocus,logs,logsUnavailable,myAreasQ,mySearchesQ,notifyMentions,objHint,onFindPartnersInArea,openFireMap,openLogReport,openMyAreas,openRoute,openGroupsNear,reactComment,renderObjectives,replyComment,routeById,routeMatches,routeView,savedSearches,savingSearch,search,searchSaveName,selArea,selRoute,setAddAreaParent,setAddRouteArea,setAddRouteOpen,setAreaFixArea,setAreaFixField,setAreaFixOpen,setAreaTreeOpen,setContribOpen,setCragFilter,setCragSort,setCrewFinderArea,setDbAreaCtx,setDiscSel,setFilters,setLogEditData,setLogModal,setLogModalFocus,setLoginOpen,setManageAreasOpen,setObjHint,setPartnersMode,setPendingSubTab,setProfileModal,setReport,setRouteView,setSavedSearches,setSavingSearch,setSearchSaveName,setSelArea,setSharedRoute,setStartCrew,setTab,showToast,stateJumpReq,toggleBookmark,toggleListRoute,toggleWish,uid,userLists,wishlist}: RoutesTabProps){
  return <div style={{padding:14,display:selRoute?"none":"block",pointerEvents:selRoute?"none":"auto"}}>{/* HOME'S "Save your first objective" lands here. It used to switch tabs and say nothing, so a climber stood on the area browser with no idea what the tap wanted (owner note). The card names the task, why, and the one tap that does it; the Save button on the route page is outlined while it shows. Gone once an objective is saved, on leaving Climbs, or on the close button. */}{objHint&&!wishlist.length?<div role="status" style={{position:"relative",background:C.card,border:"1px solid "+C.blue+"66",borderLeft:"3px solid "+C.blue,borderRadius:12,padding:"11px 44px 11px 13px",marginBottom:12}}><div style={{fontSize:11,fontWeight:800,letterSpacing:0.5,textTransform:"uppercase",color:C.blue}}>Finish setting up</div><div style={{fontSize:14.5,fontWeight:700,color:C.text,marginTop:3}}>Save your first objective</div><div style={{fontSize:12.5,color:C.textSub,marginTop:4,lineHeight:1.45}}>Partner search and crews match you to climbers who want the same climbs.</div><div style={{fontSize:12.5,color:C.text,marginTop:6,lineHeight:1.45}}>Find a climb you want to do below, open it, and tap Save at the top of its page.</div><button onClick={()=>setObjHint(false)} aria-label="Dismiss" title="Dismiss" style={{...POP_CLOSE,position:"absolute",top:8,right:8,width:32,height:32,borderRadius:16,fontSize:14}}>✕</button></div>:null}{/* The Climbs tab's headline box. On the DB path it heads ONLY the country/state picker: DbAreaBrowser draws it there (rootHeader), and once you are in an area that area's own box is the header -- Florida, not "Climbs" above Florida. The labels it names -- Route finder, Save, Find partners -- are the controls' own. */}{USE_DB?null:climbsHero}{/* Entry to the Fire map. Deliberately does no fetching of its own — it shows no
    count and makes no claim about whether anything is burning, because a badge here
    would have to be right on every visit to be worth trusting, and a stale or failed
    one reading "0" is worse than no badge at all. The map itself is where the data
    lives, and it is honest about loading and failing. */}
{/* SEED PATH ONLY. On the DB path this full-width card sat at the very top of the Climbs tab, above the breadcrumb and the area itself, and the owner asked for it to go somewhere quieter: it now renders as a compact pill inside the area's header card (AreaPage, via `onFireMap`), which is also where it belongs — the map opens focused on that area. Like AreaPage, it starts at the range: a world, country or state page (the first Climbs screen, where you pick the place) shows none (owner note). */}{USE_DB?null:selArea&&selArea.areaType!=="world"&&selArea.areaType!=="country"&&selArea.areaType!=="state"?<button onClick={function(){openFireMap(fireFocusFromArea(selArea));}} style={{width:"100%",marginBottom:12,padding:"11px 13px",borderRadius:11,border:"1px solid "+C.border,background:C.surface,cursor:"pointer",display:"flex",alignItems:"center",gap:10,textAlign:"left"}}><ActionIcon name="fire" size={17} color={C.red}/><span style={{flex:1,minWidth:0}}><span style={{display:"block",fontSize:13.5,fontWeight:700,color:C.text}}>Fire map</span><span style={{display:"block",fontSize:11.5,color:C.textMuted,marginTop:2,lineHeight:1.45}}>Active wildfires and red-flag warnings, updated live</span></span><span aria-hidden="true" style={{display:"flex",flexShrink:0}}><Chevron size={16} color={C.textMuted}/></span></button>:null}{USE_DB?<Suspense fallback={<>{climbsHero}<LoadingRows C={C} label="Loading climbs…" rows={4} style={{padding:"20px 0"}}/></>}><DbAreaBrowser TopContributors={TopContributors} onGroupsHere={function(a: RoutesTabDbArea){openGroupsNear({id:a.id,name:a.name});}} onStartCrew={function(a: RoutesTabDbArea){setStartCrew({mode:"area",area:{id:a.id,name:a.name,areaType:a.area_type,disciplines:a.disciplines||[]},partners:[]});}} onCrewsHere={function(a: RoutesTabDbArea){setCrewFinderArea({id:a.id,name:a.name});setPartnersMode("crews");setTab("discover");}} openCrewCountAt={function(id: string){return dbOpenCrews.filter(function(oc){return oc.areaId===id&&oc.spots>0;}).length;}} PartnerRow={RealClimberRow} uid={USE_DB?uid:null} myListings={myAreasQ.data||[]} onListMe={openMyAreas} onFindPartnersInArea={onFindPartnersInArea} onViewProfile={function(c: unknown){setSharedRoute(null);setProfileModal(c);}} notify={showToast} onAddClimb={function(a: RoutesTabDbArea){setAddRouteArea(a);setAddRouteOpen(true);}} onAddArea={function(a: RoutesTabDbArea){setAddAreaParent(a);}} onSuggestAreaEdit={function(a: RoutesTabDbArea,k?: string){setAreaFixArea(a);setAreaFixField(k||null);setAreaFixOpen(true);}} myId={uid} onAreaContext={setDbAreaCtx} rootHeader={climbsHero} onFireMap={function(a: RoutesTabDbArea){openFireMap(fireFocusFromArea(a));}}onOpenRoute={(dbR: { id: string })=>openRoute(dbRouteFull(dbR))} C={C} bookmarks={bookmarks} jumpToAreaReq={dbAreaJump} jumpToFinderReq={finderJump} onSignIn={function(){setLoginOpen(true);}} uElev={uElev} uElevN={uElevN} uElevUnit={uElevUnit} uDistMi={uDistMi} onToggleBookmark={(id: string)=>toggleBookmark(id)} onToggleWish={toggleWish} userLists={userLists} onToggleListRoute={toggleListRoute} wishlist={wishlist} profile={climberProfile} completedIds={completedRouteIds} rankSuggested={rankSimilarRoutes} discSlots={suggestDiscSlots} jumpToStateReq={stateJumpReq}/></Suspense>:null}{/* Area comments on the DB path. The seed instance is gated on `selArea` and so has never rendered in production; `dbAreaCtx` is set only once a climber has drilled into an area, which is exactly when there is something to discuss. Props mirror the seed call so the two cannot drift on what a comment can do. */}{areaCommentTargets.length?<div style={{marginTop:4}}><Comments blockedIds={_blockIds} onBlock={blockClimber} onReact={reactComment} targetId={areaCommentTargets[0]} comments={comments} onAdd={(tid,txt)=>{addComment(tid,txt);notifyMentions(txt,connections,{});}} onViewProfile={setProfileModal} onEdit={(id,txt)=>{editComment(id,txt);notifyMentions(txt,connections,{});}} onDelete={deleteComment} onLike={likeComment} onReply={(pid,tid,txt)=>{replyComment(pid,tid,txt);notifyMentions(txt,connections,{});}} mentionCandidates={connections}/></div>:null}
        
        
        {!USE_DB&&<>        {selArea&&routeView==="areas"?<AreaView area={selArea} booked={bookmarks.includes(selArea.id)} onBook={()=>toggleBookmark(selArea.id)} onOpenArea={(a: RoutesTabSeedArea)=>setSelArea(a)} countIn={areaMatchCount} onMap={()=>setRouteView("map")} onFinder={()=>setRouteView("finder")} onQuickMatch={()=>setRouteView("quickmatch")} onObjectives={()=>setRouteView("objectives")} onAllAreas={()=>setAreaTreeOpen(true)}/>:null}
      {selArea&&routeView==="areas"&&!ROUTES.some(function(r){return r.mountainId===selArea.id;})?<><div style={{background:HERO_BG,boxShadow:HERO_SHEEN,borderRadius:14,padding:"13px 14px",marginBottom:14}}><div style={{fontSize:13,fontWeight:800,color:C.text,textTransform:"uppercase",borderLeft:"3px solid "+C.blue,paddingLeft:9,letterSpacing:0.4,marginBottom:8}}>{"Search "+selArea.name}</div><SearchSplit defaultMode="areas" scope={selArea.id} onArea={function(a){setSelArea(a);setRouteView("areas");}} onRoute={function(r){openRoute(r);}}/></div><TopContributors areaId={selArea.id} contribs={contribs} mb={12}/></>:null}{routeView==="objectives"?(<div><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><button onClick={()=>setRouteView("areas")} style={POP_BACK}>{<Lbl s={"← Back"}/>}</button><span style={{color:C.text,fontSize:17,fontWeight:700,borderLeft:"3px solid "+C.blue,paddingLeft:9}}>{"My objectives"+(selArea?" · "+selArea.name:"")}</span></div>{(function(){const list=ROUTES.filter(function(r){return wishlist.indexOf(r.id)>=0&&(!selArea||inArea(r.mountainId,selArea.id));});return list.length?list.map(function(r){const m=MOUNTAINS.find(function(x){return x.id===r.mountainId;});return <div key={r.id} {...clickable(function(){openRoute(r);})} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 12px",marginBottom:8,background:C.card,border:"1px solid "+C.border,borderRadius:12,cursor:"pointer"}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,color:C.text,overflowWrap:"anywhere"}}>{r.name}</div><div style={{fontSize:11,color:C.textMuted,display:"flex",alignItems:"center",gap:5}}>{avgStars(r)?<span style={{color:C.amber,fontWeight:700,flexShrink:0}}>{"★".repeat(avgStars(r))}</span>:null}<span style={{overflowWrap:"anywhere"}}>{[protOf(r)?protOf(r)[0].toUpperCase()+protOf(r).slice(1):null,m?m.name:null,r.pitches>1?r.pitches+"p":null].filter(Boolean).join(" · ")}</span></div></div><span style={{fontSize:12,color:C.textMuted,flexShrink:0,fontWeight:700}}>{r.grade}</span></div>;}):<EmptyState C={C} icon="target">{"No objectives here yet — open a climb and tap to add it to your objectives."}</EmptyState>;})()}</div>):routeView==="finder"?<RouteFinder scope={selArea} onOpen={(r: RoutesTabRoute)=>openRoute(r)} onBack={()=>setRouteView("areas")}/>:routeView==="quickmatch"?<QuickMatch scope={selArea} onOpen={(r: RoutesTabRoute)=>openRoute(r)} onBack={()=>setRouteView("areas")}/>:routeView==="map"?(<div><ViewToggle mode="map" onList={()=>setRouteView("areas")} onMap={()=>{}} C={C}/><OverviewMap onOpenClimb={(r: RoutesTabRoute)=>openRoute(r)} onOpenArea={(a: RoutesTabSeedArea)=>{setSelArea(a);setRouteView("areas");}} disc={discSel.length===1?discSel[0]:"All"} filters={filters} wishlist={wishlist} scope={selArea}/></div>):routeView==="ascents"?<Suspense fallback={<ScreenSkeleton C={C} label="Loading your climbs…"/>}><MyAscents logsUnavailable={logsUnavailable} routeById={routeById} climberFor={_reqClimber} logs={logs} focusId={logFocus} onReport={function(l: ChallengeLog,i: number){openLogReport(l,i);}} condReports={condReports} onReportCond={function(cr: ChallengeLog & { routeId?: string | null },i: number){setLogModalFocus("report");setLogEditData(Object.assign({},cr,{_idx:i}));setLogModal(routeById(cr.routeId));}} onVouch={(c: unknown)=>setProfileModal(c)} onOpen={(r: RoutesTabRoute,sub?: string)=>{if(sub)setPendingSubTab(sub);openRoute(r);}} onView={function(l: ChallengeLog,i: number,r: RoutesTabRoute){setReport(Object.assign({},l,{route:r,mtn:MOUNTAINS.find(function(m){return m.id===r.mountainId;})||{},_idx:i}));}}/></Suspense>:routeView==="saved"?renderObjectives():(<div>{selArea?null:<AreaBrowse onOpenArea={(a: RoutesTabSeedArea)=>setSelArea(a)} countIn={areaMatchCount} filtersActive={filtersActive} onManage={function(){setManageAreasOpen(true);}}/>}{routeView==="areas"&&selArea?<>{search?null:<AreaCrags area={selArea} countIn={areaMatchCount} onOpenArea={(a: RoutesTabSeedArea)=>setSelArea(a)}/>}{(savedSearches.length>0||savingSearch)?<div style={{marginBottom:12}}><div style={{fontSize:12,color:C.textMuted,fontWeight:700,marginBottom:6,letterSpacing:0.3}}>SAVED SEARCHES</div><div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:savingSearch?8:0}}>{savedSearches.map(ss=><div key={ss.id} style={{display:"flex",alignItems:"center",background:C.blueBg,border:`1px solid ${C.blueDim}`,borderRadius:14,overflow:"hidden"}}><button onClick={()=>{setFilters(ss.filters);setDiscSel(ss.discSel||[]);showToast("Applied: "+ss.name);}} style={{padding:"5px 10px 5px 11px",background:"transparent",color:C.blue,border:"none",fontSize:12.5,fontWeight:600,cursor:"pointer"}}>{ss.name}</button><button onClick={()=>(function(){const _r=ss;setSavedSearches(pp=>pp.filter(x=>x.id!==ss.id));if(uid&&_r._dbId){deleteSavedSearchRow(_r._dbId).then(function(){if(mySearchesQ.refetch)mySearchesQ.refetch();}).catch(function(){setSavedSearches(pp=>pp.some(x=>x.id===_r.id)?pp:pp.concat([_r]));showToast("Couldn't delete that search — try again.");});}})()} title="Delete" style={Object.assign({},POP_REMOVE,{marginLeft:6,marginRight:4})} aria-label="Delete saved search">✕</button></div>)}{!savingSearch?<button onClick={()=>setSavingSearch(true)} style={{padding:"5px 11px",borderRadius:14,border:"1px dashed "+C.border,background:"transparent",color:C.textSub,fontSize:12.5,fontWeight:600,cursor:"pointer"}}>+ Save this search</button>:null}</div>{savingSearch?<div style={{display:"flex",gap:12}}><input aria-label="Name this search" value={searchSaveName} onChange={e=>setSearchSaveName(e.target.value)} placeholder="Name this search…" style={{flex:1,padding:"7px 10px",borderRadius:9,border:"1px solid "+C.border,background:C.surface,color:C.text,fontSize:13,boxSizing:"border-box",outline:"none"}}/><button onClick={()=>{if(!searchSaveName.trim())return;const _ssid="ss"+Date.now();const _ssname=searchSaveName.trim();setSavedSearches(pp=>pp.concat([{id:_ssid,name:_ssname,filters,discSel}]));setSearchSaveName("");setSavingSearch(false);if(uid){createSavedSearchRow(uid,_ssname,{filters:filters,discSel:discSel}).then(function(){if(mySearchesQ.refetch)mySearchesQ.refetch();}).catch(function(){setSavedSearches(pp=>pp.filter(x=>x.id!==_ssid));showToast("Couldn't save that search — try again.");});}showToast("Search saved"+(uid?"":" on this device — sign in to keep it"));}} style={{padding:"7px 14px",background:C.blueSolid,color:C.onSolid,border:"none",borderRadius:9,fontSize:13,fontWeight:700,cursor:"pointer"}}>Save</button><button onClick={()=>{setSavingSearch(false);setSearchSaveName("");}} style={{padding:"7px 11px",background:C.surface,color:C.textSub,border:"1px solid "+C.border,borderRadius:9,fontSize:13,cursor:"pointer"}}>Cancel</button></div>:null}</div>:<div style={{marginBottom:12}}><button onClick={()=>setSavingSearch(true)} style={{padding:"7px 13px",borderRadius:14,border:"1px dashed "+C.border,background:"transparent",color:C.textMuted,fontSize:12.5,fontWeight:600,cursor:"pointer"}}>+ Save this search</button></div>}
        
        {search&&!selArea?(()=>{const q=search;const hit=(m: RoutesTabSeedArea)=>fuzzyMatch(q,m.name)||(m.region&&fuzzyMatch(q,m.region));const places=MOUNTAINS.filter(m=>["range","region","state","canyon","crag","peak"].includes(m.areaType)&&hit(m));if(!places.length)return null;const pll=(m: RoutesTabSeedArea)=>{if(m.lat!=null)return {lat:m.lat,lng:m.lng};const r=ROUTES.find(x=>inArea(x.mountainId,m.id));const mm=r&&MOUNTAINS.find(x=>x.id===r.mountainId);return mm&&mm.lat!=null?{lat:mm.lat,lng:mm.lng}:null;};const pdist=(m: RoutesTabSeedArea)=>{const ll=pll(m);return ll?distMiles(ME,ll):1e9;};const GRP: Array<[string,string,string[]]>=[["","Ranges & areas",["range","region","state"]],["","Canyons",["canyon"]],["","Crags",["crag"]],["","Peaks",["peak"]]];return <div style={{marginBottom:6}}>{GRP.map((g,gi)=>{const rows=places.filter(m=>g[2].includes(m.areaType)).sort((a,b)=>pdist(a)-pdist(b));if(!rows.length)return null;return <div key={gi} style={{marginBottom:11}}><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}><span style={{fontSize:12,color:C.textMuted,fontWeight:700,letterSpacing:0.3}}>{g[0]+" "+g[1].toUpperCase()}</span><span style={{fontSize:11.5,fontWeight:700,color:C.textSub,background:C.surface,border:"1px solid "+C.border,borderRadius:9,padding:"0px 7px"}}>{rows.length}</span></div>{rows.slice(0,6).map(m=>{const rc=(ROUTES.find(r=>inArea(r.mountainId,m.id))||{}).cover;const md=pdist(m);return <div key={m.id} {...clickable(()=>{setSelArea(m);setRouteView("areas");})} style={{display:"flex",alignItems:"center",gap:10,background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"9px 12px",marginBottom:6,cursor:"pointer"}}><div style={{width:42,height:42,borderRadius:8,overflow:"hidden",flexShrink:0}}><img loading="lazy" decoding="async" className="cover-x" src={rc||FALLBACK_COVER} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} onError={onImgErr(FALLBACK_COVER)}/></div><div style={{flex:1,minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,color:C.text}}>{hlMatch(m.name,search)}</div><div style={{fontSize:11.5,color:C.textMuted,marginTop:1}}>{m.region}{md<1e9?" · "+(md<10?md.toFixed(1):Math.round(md))+" mi":""}</div></div><span aria-hidden="true" style={{display:"flex",flexShrink:0}}><Chevron size={16} color={C.textMuted}/></span></div>;})}</div>;})}</div>;})():null}</>:null}{selArea&&ROUTES.some(function(r){return r.mountainId===selArea.id;})?(function(){let rs=ROUTES.filter(function(r){return r.mountainId===selArea.id;}).filter(routeMatches).slice();if(cragFilter!=="all")rs=rs.filter(function(r){return cragFilter==="multi"?(r.pitches>1):protOf(r)===cragFilter;});if(cragSort==="grade")rs.sort(function(a,b){return gradeVal(a)-gradeVal(b);});else if(cragSort==="stars")rs.sort(function(a,b){return avgStars(b)-avgStars(a);});else if(cragSort==="name")rs.sort(function(a,b){return a.name.localeCompare(b.name);});return <div style={{marginTop:18,marginBottom:8}}><div style={{fontSize:13,fontWeight:800,color:C.text,letterSpacing:0.4,textTransform:"uppercase",borderLeft:"3px solid "+C.blue,paddingLeft:9,margin:"0 0 9px"}}>{"Climbs ("+rs.length+")"}</div><div style={{display:"flex",gap:6,marginBottom:10}}>{[["grade","Grade"],["stars","Stars"],["name","A–Z"]].map(function(o){return <button key={o[0]} onClick={function(){setCragSort(o[0]);}} aria-current={cragSort===o[0]?"true":undefined} style={{minHeight:44,padding:"10px 14px",borderRadius:10,border:"1px solid "+(cragSort===o[0]?C.blue:C.border),background:cragSort===o[0]?C.blueBg:C.surface,color:cragSort===o[0]?"#fff":C.textSub,fontSize:13.5,fontWeight:700,cursor:"pointer"}}>{o[1]}</button>;})}</div><div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>{[["all","All"],["trad","Trad"],["sport","Sport"],["multi","Multipitch"]].map(function(o){return <button key={o[0]} onClick={function(){setCragFilter(o[0]);}} aria-current={cragFilter===o[0]?"true":undefined} style={{minHeight:44,padding:"10px 13px",borderRadius:10,border:"1px solid "+(cragFilter===o[0]?C.blue:C.border),background:cragFilter===o[0]?C.blueBg:C.surface,color:cragFilter===o[0]?"#fff":C.textSub,fontSize:13.5,fontWeight:700,cursor:"pointer"}}>{o[1]}</button>;})}</div>{!rs.length?<EmptyState C={C} icon="search">No climbs match this filter.</EmptyState>:null}{rs.map(function(r){return <div key={r.id} {...clickable(function(){openRoute(r);})} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 12px",marginBottom:8,background:C.card,border:"1px solid "+C.border,borderRadius:12,cursor:"pointer"}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,color:C.text,overflowWrap:"anywhere"}}>{r.name}{r.classic?<span style={{marginLeft:6,fontSize:10,color:C.amber}}>{"★"}</span>:null}</div><div style={{fontSize:11,color:C.textMuted,display:"flex",alignItems:"center",gap:5}}>{avgStars(r)?<span style={{color:C.amber,fontWeight:700,flexShrink:0}}>{"★".repeat(avgStars(r))}</span>:null}<DiscIcon d={catOf(r)} size={11}/><span style={{overflowWrap:"anywhere"}}>{[protOf(r)?protOf(r)[0].toUpperCase()+protOf(r).slice(1):((CAT[catOf(r)]||{}).label||r.discipline||null),r.pitches>1?r.pitches+"p":null].filter(Boolean).join(" · ")}</span></div></div><span style={{fontSize:12,color:C.textMuted,flexShrink:0,fontWeight:700}}>{r.grade}</span></div>;})}</div>;})():null}{selArea&&(selArea.areaType==="canyon"||ROUTES.some(function(r){return r.mountainId===selArea.id;}))?<ClassicClimbs scopeId={selArea.id} onOpen={(r: RoutesTabRoute)=>openRoute(r)}/>:null}{selArea&&ROUTES.some(function(r){return r.mountainId===selArea.id;})?<GettingThere area={selArea}/>:null}<AreaLatest area={selArea} onOpenReport={(a: unknown)=>setReport(a)}/><button onClick={()=>setAddRouteOpen(true)} style={{width:"100%",marginTop:14,padding:"11px",background:C.surface,color:C.blue,border:"1px dashed "+C.border,borderRadius:11,fontSize:13,fontWeight:700,cursor:"pointer"}}>{"Don’t see a climb? Add it to ClimbMatch →"}</button><button onClick={()=>setContribOpen(true)} style={{width:"100%",marginTop:7,padding:"8px",background:"transparent",border:"none",color:C.textSub,fontSize:12.5,fontWeight:600,cursor:"pointer"}}>{"Your contributions ("+contribs.length+") →"}</button>{selArea&&!["world","country","state"].includes(selArea.areaType)?<Comments blockedIds={_blockIds} onBlock={blockClimber} onReact={reactComment} targetId={selArea.id} comments={comments} onAdd={(tid,txt)=>{addComment(tid,txt);notifyMentions(txt,connections,{route:selRoute?selRoute.id:undefined});}} onViewProfile={setProfileModal} onEdit={(id,txt)=>{editComment(id,txt);notifyMentions(txt,connections,{route:selRoute?selRoute.id:undefined});}} onDelete={deleteComment} onLike={likeComment} onReply={(pid,tid,txt)=>{replyComment(pid,tid,txt);notifyMentions(txt,connections,{route:selRoute?selRoute.id:undefined});}} mentionCandidates={connections}/>:null}<SuggestedClimbs area={selArea} profile={climberProfile} completedIds={completedRouteIds} wishlist={wishlist} onOpen={(r: RoutesTabRoute)=>openRoute(r)}/></div>)}</>}
      </div>;
}
