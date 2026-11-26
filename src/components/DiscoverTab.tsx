import { ScreenHero } from "../../lib/ScreenHero";
import { C, ME } from "../../ClimbMatchCore.jsx";
import { Suspense } from "react";
import ScreenSkeleton from "./ScreenSkeleton.tsx";
import { PartnerSearch, CrewFinder } from "../../lib/lazyScreens.js";
import CrewShareCard from "./CrewShareCard.tsx";
import { addCrewMember as dbAddCrewMember } from "../../lib/db";

type DiscoverTabId = string | number;
/** A climber as a list holds them: a seed climber (integer id) or a real profile (uuid). */
interface DiscoverTabPerson { id: DiscoverTabId; name?: string | null; objectiveIds?: ReadonlyArray<string> | null }
interface DiscoverTabRoute { id: string; name: string }
/** One stored notification row. */
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
  /** The crew being filled from this list ("Browse everyone" on its sheet), or none. */
  inviteCrew: unknown;
  /** Open the one invite sheet for everyone picked. */
  invitePicked: (crewId: DiscoverTabId, list: ReadonlyArray<DiscoverTabPerson>) => void;
  /** Leave invite mode and go back to that crew. */
  endInviteMode: () => void;
  /** Open one of my crews on the Crew tab (the "View crew" link beside an invite already sent). */
  openCrewCard: (crewId: DiscoverTabId) => void;
  mutuals: Record<string, ReadonlyArray<DiscoverTabPerson> | undefined>;
  /** Tell App which real climbers the partner cards show, so their mutual friends are asked for. */
  askMutualsFor: (ids: string[]) => void;
  myAreasQ: DiscoverTabQuery<ReadonlyArray<unknown>>;
  myProfileRowQ: DiscoverTabQuery<{ discoverable?: boolean | null }>;
  objDates: Record<string, unknown>;
  /** The objectives read failed: say so rather than "no objectives". */
  objectivesUnavailable: boolean;
  /** The objectives read has not answered yet. */
  objectivesLoading?: boolean;
  /** The route rows of the saved climbs could not be read. */
  objectiveRowsFailed?: boolean;
  /** The route rows of the saved climbs are being read. */
  objectiveRowsLoading?: boolean;
  openAreaById: (id: string | null | undefined) => void;
  openMyAreas: (prefill: { areaId?: string; name?: string; areaType?: string; disciplines?: ReadonlyArray<string> } | null) => void;
  openRoute: (route: DiscoverTabRoute) => void;
  /** An area the partner search should open on, or none. */
  partnerArea: unknown;
  /** A climb the partner search should open on, or none. */
  partnerClimb: unknown;
  /** "partners" or "crews". */
  partnersMode: string;
  profile: { gender?: string | null };
  reqJoin: (crewId: DiscoverTabId, name: string) => void;
  /** Ids of the crews the climber has asked to join. */
  requestedCrewIds: ReadonlyArray<DiscoverTabId>;
  routeById: (id: string) => DiscoverTabRoute | undefined;
  setCrewFinderArea: (area: null) => void;
  setCrewShare: (token: null) => void;
  setInvitePrompt: (prompt: { climber: unknown; route: unknown }) => void;
  setLogbookTab: (tab: string) => void;
  setLoginOpen: (open: boolean) => void;
  setMutualModal: (c: unknown) => void;
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
export default function DiscoverTab({inviteCrew,invitePicked,endInviteMode,openCrewCard,activeCrews,areaCardById,blocked,bookmarks,connect,connections,crewFinderArea,crewListingsUnavailable,crewShare,dbOpenCrews,freeWknd,friendState,goTab,inviteToCrew,mutuals,askMutualsFor,myAreasQ,myProfileRowQ,objDates,objectivesLoading,objectiveRowsFailed,objectiveRowsLoading,objectivesUnavailable,openAreaById,openMyAreas,openRoute,partnerArea,partnerClimb,partnersMode,profile,reqJoin,requestedCrewIds,routeById,setCrewFinderArea,setCrewShare,setInvitePrompt,setLogbookTab,setLoginOpen,setMutualModal,setPartnerArea,setPartnerClimb,setPartnersMode,setPrivacyOpen,setProfileModal,setResumeFor,setSavedKind,setSharedRoute,setStartCrew,showToast,toggleFreeWknd,uid}: DiscoverTabProps){
  return <div style={{padding:14}}><ScreenHero C={C} quiet title={partnersMode==="partners"?"Find a climbing partner":"Find a crew to join"} sub={partnersMode==="partners"?"Find climbers who climb where — and what — you do.":"Open crews with spots left — ask to join one."}/><div style={{display:"flex",gap:8,marginBottom:24}}>{[["partners","Find partners"],["crews","Join a crew"]].map(x=><button key={x[0]} onClick={()=>setPartnersMode(x[0])} aria-current={partnersMode===x[0]?"true":undefined} style={{flex:1,minHeight:40,padding:"9px 6px",borderRadius:10,border:`1px solid ${partnersMode===x[0]?C.blue:C.border}`,background:partnersMode===x[0]?C.blueBg:C.surface,color:partnersMode===x[0]?"#fff":C.textSub,cursor:"pointer",fontSize:14,fontWeight:700}}>{x[1]}</button>)}</div>{partnersMode==="partners"?(<Suspense fallback={<ScreenSkeleton C={C} label="Loading climbers…"/>}><PartnerSearch inviteCrew={inviteCrew} onInvitePicked={invitePicked} onEndInvite={endInviteMode} onOpenCrew={openCrewCard} mutuals={mutuals} onAskMutuals={askMutualsFor} myGender={profile.gender||""} freeWknd={freeWknd} onToggleFreeWknd={uid?toggleFreeWknd:undefined} /* FOURTH surface fed by useMyObjectives. `objectiveIds` is written from `wishlist`, so a failed read leaves it empty and this screen tells a climber who HAS objectives that they have none -- and then asks them to go save one. Same flag as the Logbook, one screen further out. */objectivesLoading={objectivesLoading} objectiveRowsFailed={objectiveRowsFailed} objectiveRowsLoading={objectiveRowsLoading} objectivesUnavailable={objectivesUnavailable} meListed={myProfileRowQ.data?!!myProfileRowQ.data.discoverable:undefined} onOpenPrivacy={()=>setPrivacyOpen(true)} routeById={routeById} onShowMutuals={(c: DiscoverTabPerson)=>setMutualModal(c)} onResume={(c: DiscoverTabPerson)=>setResumeFor(c)} blocked={blocked} onConnect={connect} onViewProfile={(c: DiscoverTabPerson,tab?: string)=>{const _sid=(c.objectiveIds||[]).find((id: string)=>ME.objectiveIds.includes(id));const sr=_sid?routeById(_sid):null;setSharedRoute(sr||null);setProfileModal(tab?Object.assign({},c,{_tab:tab}):c);}} objDates={objDates} initialClimb={partnerClimb} onConsumeInitial={()=>setPartnerClimb(null)} initialArea={partnerArea} onConsumeInitialArea={()=>setPartnerArea(null)} myAreas={myAreasQ.data} myAreasError={!!myAreasQ.isError} onListMe={openMyAreas} notify={showToast} savedAreaIds={bookmarks} onOpenSaved={()=>{goTab("logbook");setLogbookTab("lists");setSavedKind("areas");}} friendState={friendState} crews={activeCrews} onInvite={inviteToCrew} onPlan={(c: DiscoverTabPerson,route: DiscoverTabRoute)=>setInvitePrompt({climber:c,route})} onPlanArea={(c: DiscoverTabPerson,area: { id: string; name: string; areaType?: string | null })=>setStartCrew({mode:"area",area:{id:area.id,name:area.name,areaType:area.areaType||null,disciplines:[]},partners:[c]})}/></Suspense>):<Suspense fallback={<ScreenSkeleton C={C} label="Loading crews…"/>}>{/* ONE home for your areas on this pane (audit 2026-11-19): the Looking-for-partners card that sat here opened the same sheet as the Areas-you-are-listed-at card CrewFinder draws under My climbs & areas, the default mode, so the screen showed two buttons for one job under two names. */}{crewShare?<CrewShareCard token={crewShare} signedIn={!!uid} onJoin={function(cid){return dbAddCrewMember(cid,uid,"pending").then(function(){showToast("Request sent — the organizer will see it in Requests");try{localStorage.removeItem("cm_crew_share");}catch(_e){/* storage unavailable: the token is simply not cleared */}});}} onSignIn={function(){setLoginOpen(true);}} onDismiss={function(){setCrewShare(null);try{localStorage.removeItem("cm_crew_share");}catch(_e){/* storage unavailable: the token is simply not cleared */}}}/>:null}<CrewFinder dbCrews={dbOpenCrews} dbCrewsUnavailable={crewListingsUnavailable} routeById={routeById} areaById={areaCardById} onOpenArea={openAreaById} initialArea={crewFinderArea} onConsumeInitialArea={()=>setCrewFinderArea(null)} myAreas={myAreasQ.data} myAreasError={!!myAreasQ.isError} savedAreaIds={uid?bookmarks:[]} onOpenRoute={openRoute} connections={connections} onViewProfile={function(c: DiscoverTabPerson,oc: unknown){setProfileModal(Object.assign({},c,{_joinCrew:oc}));}} onRequestJoin={reqJoin} requested={requestedCrewIds}/></Suspense>}</div>;
}
