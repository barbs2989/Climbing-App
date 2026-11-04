import { ScreenHero } from "../../lib/ScreenHero";
import { C, ME, DbGuides, Guides } from "../../ClimbMatchCore.jsx";
import { Suspense } from "react";
import ScreenSkeleton from "./ScreenSkeleton.tsx";
import { PartnerSearch, CrewFinder } from "../../lib/lazyScreens.js";
import { USE_DB } from "../../lib/supabase";
import CrewShareCard from "./CrewShareCard.tsx";
import { addCrewMember as dbAddCrewMember } from "../../lib/db";
import LoadingRows from "./LoadingRows.tsx";
import type { Dispatch, SetStateAction } from "react";

type DiscoverTabId = string | number;
/** A climber as a list holds them: a seed climber (integer id) or a real profile (uuid). */
interface DiscoverTabPerson { id: DiscoverTabId; name?: string | null; objectiveIds?: ReadonlyArray<string> | null }
interface DiscoverTabRoute { id: string; name: string }
/** One stored notification row. */
interface DiscoverTabNotif { id: string; icon: string; text: string; tab: string; read: boolean }
/** A React Query result of which only the fields this tab reads are declared. */
interface DiscoverTabQuery<T> { data?: T | null; isError?: boolean }

export interface DiscoverTabProps {
  activeCrews: ReadonlyArray<{ id: DiscoverTabId; routeId?: string | number | null }>;
  areaCardById: (id: string | null | undefined) => unknown;
  blocked: ReadonlyArray<{ id: DiscoverTabId }>;
  /** Ids of the areas the climber saved. */
  bookmarks: ReadonlyArray<string>;
  connect: (c: DiscoverTabPerson) => void;
  connections: ReadonlyArray<DiscoverTabPerson>;
  /** An area the crew finder should open on (from an area page), or none. */
  crewFinderArea: unknown;
  /** The open-crews read failed: say so rather than "no crews". */
  crewListingsUnavailable: boolean;
  /** The token of a shared crew link the climber arrived on, or none. */
  crewShare: string | null;
  dbOpenCrews: ReadonlyArray<unknown>;
  freeWknd: boolean;
  friendState: (id: DiscoverTabId) => string;
  goTab: (id: string) => void;
  inviteToCrew: (crewId: DiscoverTabId, c: DiscoverTabPerson) => void;
  mutuals: Record<string, ReadonlyArray<DiscoverTabPerson> | undefined>;
  myAreasQ: DiscoverTabQuery<ReadonlyArray<unknown>>;
  myProfileRowQ: DiscoverTabQuery<{ discoverable?: boolean | null }>;
  objDates: Record<string, unknown>;
  /** The objectives read failed: say so rather than "no objectives". */
  objectivesUnavailable: boolean;
  openAreaById: (id: string | null | undefined) => void;
  openMyAreas: (prefill: { areaId?: string; name?: string; areaType?: string; disciplines?: ReadonlyArray<string> } | null) => void;
  openRoute: (route: DiscoverTabRoute) => void;
  /** An area the partner search should open on, or none. */
  partnerArea: unknown;
  /** A climb the partner search should open on, or none. */
  partnerClimb: unknown;
  /** "partners", "crews" or "guides". */
  partnersMode: string;
  profile: { gender?: string | null };
  reqJoin: (crewId: DiscoverTabId, name: string) => void;
  /** Ids of the crews the climber has asked to join. */
  requestedCrewIds: ReadonlyArray<DiscoverTabId>;
  routeById: (id: string) => DiscoverTabRoute | undefined;
  setCrewFinderArea: (area: null) => void;
  setCrewShare: (token: null) => void;
  setDashOpen: (open: boolean) => void;
  setInvitePrompt: (prompt: { climber: unknown; route: unknown }) => void;
  setLogbookTab: (tab: string) => void;
  setLoginOpen: (open: boolean) => void;
  setMutualModal: (c: unknown) => void;
  setNotifs: Dispatch<SetStateAction<DiscoverTabNotif[]>>;
  setPartnerArea: (area: null) => void;
  setPartnerClimb: (climb: null) => void;
  setPartnersMode: (mode: string) => void;
  setPrivacyOpen: (open: boolean) => void;
  setProfileModal: (c: unknown) => void;
  setResumeFor: (c: unknown) => void;
  setSavedKind: (kind: string) => void;
  setSharedRoute: (route: DiscoverTabRoute | null) => void;
  setStartCrew: (start: { mode: string; area: { id: string; name: string; areaType: string | null; disciplines: string[] }; partners: unknown[] }) => void;
  showToast: (message: string) => void;
  toggleFreeWknd: () => void;
  uid: string | null;
}

/* tab==="discover"&& — the body of that branch of App, lifted verbatim by extract-from-parent.mjs (branch mode);
   every binding it read from App is a prop of the same name. */
export default function DiscoverTab({activeCrews,areaCardById,blocked,bookmarks,connect,connections,crewFinderArea,crewListingsUnavailable,crewShare,dbOpenCrews,freeWknd,friendState,goTab,inviteToCrew,mutuals,myAreasQ,myProfileRowQ,objDates,objectivesUnavailable,openAreaById,openMyAreas,openRoute,partnerArea,partnerClimb,partnersMode,profile,reqJoin,requestedCrewIds,routeById,setCrewFinderArea,setCrewShare,setDashOpen,setInvitePrompt,setLogbookTab,setLoginOpen,setMutualModal,setNotifs,setPartnerArea,setPartnerClimb,setPartnersMode,setPrivacyOpen,setProfileModal,setResumeFor,setSavedKind,setSharedRoute,setStartCrew,showToast,toggleFreeWknd,uid}: DiscoverTabProps){
  return <div style={{padding:14}}><ScreenHero C={C} quiet title={partnersMode==="partners"?"Find a climbing partner":partnersMode==="crews"?"Find a crew to join":"Find a certified guide"} sub={partnersMode==="partners"?"Search by name, or find climbers near you.":partnersMode==="crews"?"Open crews with spots left — ask to join one.":"✓ means we verified a current certification."}/><div style={{display:"flex",gap:8,marginBottom:24}}>{[["partners","Find partners"],["crews","Join a crew"],["guides","Hire a guide"]].map(x=><button key={x[0]} onClick={()=>setPartnersMode(x[0])} aria-current={partnersMode===x[0]?"true":undefined} style={{flex:1,padding:"13px 6px",borderRadius:12,border:`1.5px solid ${partnersMode===x[0]?C.blue:C.border}`,background:partnersMode===x[0]?C.blueBg:C.surface,color:partnersMode===x[0]?"#fff":C.textSub,cursor:"pointer",fontSize:14,fontWeight:700}}>{x[1]}</button>)}</div>{partnersMode==="partners"?(<Suspense fallback={<ScreenSkeleton C={C} label="Loading climbers…"/>}><PartnerSearch mutuals={mutuals} myGender={profile.gender||""} freeWknd={freeWknd} onToggleFreeWknd={uid?toggleFreeWknd:undefined} /* FOURTH surface fed by useMyObjectives. `objectiveIds` is written from `wishlist`, so a failed read leaves it empty and this screen tells a climber who HAS objectives that they have none -- and then asks them to go save one. Same flag as the Logbook, one screen further out. */objectivesUnavailable={objectivesUnavailable} meListed={myProfileRowQ.data?!!myProfileRowQ.data.discoverable:undefined} onOpenPrivacy={()=>setPrivacyOpen(true)} routeById={routeById} onShowMutuals={(c: DiscoverTabPerson)=>setMutualModal(c)} onResume={(c: DiscoverTabPerson)=>setResumeFor(c)} blocked={blocked} onConnect={connect} onViewProfile={(c: DiscoverTabPerson,tab?: string)=>{const _sid=(c.objectiveIds||[]).find((id: string)=>ME.objectiveIds.includes(id));const sr=_sid?routeById(_sid):null;setSharedRoute(sr||null);setProfileModal(tab?Object.assign({},c,{_tab:tab}):c);}} objDates={objDates} initialClimb={partnerClimb} onConsumeInitial={()=>setPartnerClimb(null)} initialArea={partnerArea} onConsumeInitialArea={()=>setPartnerArea(null)} myAreas={myAreasQ.data} myAreasError={!!myAreasQ.isError} onListMe={openMyAreas} savedAreaIds={bookmarks} onOpenSaved={()=>{goTab("logbook");setLogbookTab("lists");setSavedKind("areas");}} friendState={friendState} crews={activeCrews} onInvite={inviteToCrew} onPlan={(c: DiscoverTabPerson,route: DiscoverTabRoute)=>setInvitePrompt({climber:c,route})} onPlanArea={(c: DiscoverTabPerson,area: { id: string; name: string; areaType?: string | null })=>setStartCrew({mode:"area",area:{id:area.id,name:area.name,areaType:area.areaType||null,disciplines:[]},partners:[c]})}/></Suspense>):partnersMode==="crews"?<Suspense fallback={<ScreenSkeleton C={C} label="Loading crews…"/>}>{/* Crag partners are found by AREA (0300): the crews pane offers the listing too, so a climber looking for a session does not have to know it lives under Find partners. */USE_DB&&uid?<div style={{display:"flex",alignItems:"center",gap:10,background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"10px 12px",marginBottom:14}}><div style={{flex:1,minWidth:0,fontSize:12.5,color:C.textSub,lineHeight:1.45}}>{"Looking for crag partners? List the areas you climb"+((myAreasQ.data||[]).length?" — you’re listed at "+(myAreasQ.data||[]).length+" area"+((myAreasQ.data||[]).length===1?"":"s")+".":".")}</div><button onClick={()=>openMyAreas(null)} style={{flexShrink:0,padding:"9px 12px",borderRadius:9,border:"1px solid "+C.blueDim,background:C.blueBg,color:C.onSolid,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>My areas</button></div>:null}{crewShare?<CrewShareCard token={crewShare} signedIn={!!uid} onJoin={function(cid){return dbAddCrewMember(cid,uid,"pending").then(function(){showToast("Request sent — the organiser will see it in Requests");try{localStorage.removeItem("cm_crew_share");}catch(_e){/* storage unavailable: the token is simply not cleared */}});}} onSignIn={function(){setLoginOpen(true);}} onDismiss={function(){setCrewShare(null);try{localStorage.removeItem("cm_crew_share");}catch(_e){/* storage unavailable: the token is simply not cleared */}}}/>:null}<CrewFinder dbCrews={dbOpenCrews} dbCrewsUnavailable={crewListingsUnavailable} routeById={routeById} areaById={areaCardById} onOpenArea={openAreaById} initialArea={crewFinderArea} onConsumeInitialArea={()=>setCrewFinderArea(null)} myAreas={myAreasQ.data||[]} savedAreaIds={uid?bookmarks:[]} onOpenRoute={openRoute} connections={connections} onViewProfile={function(c: DiscoverTabPerson,oc: unknown){setProfileModal(Object.assign({},c,{_joinCrew:oc}));}} onRequestJoin={reqJoin} requested={requestedCrewIds}/></Suspense>:USE_DB?<Suspense fallback={<LoadingRows C={C} label="Loading guides…" rows={4} style={{padding:"20px 0"}}/>}><DbGuides onDash={()=>setDashOpen(true)} notify={showToast} C={C}/></Suspense>:<Guides notify={showToast} onDash={()=>setDashOpen(true)} onInquire={(g: { id: DiscoverTabId; name: string })=>setNotifs(ns=>[{id:"inq"+g.id+"_"+Date.now(),icon:"",text:"You noted interest in "+g.name+".",tab:"discover",read:false},...ns])}/>}</div>;
}
