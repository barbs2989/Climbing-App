import FullProfile from "./FullProfile.tsx";
import { ME, crewSize, placeCap, isReady } from "../../ClimbMatchCore.jsx";
import type { Dispatch, SetStateAction } from "react";
import type { ProfileClimber, ProfileRoute } from "./FullProfile.tsx";

type ClimberProfileSheetId = string | number;
/** A crew's member list, as the sheet reads it (`climberId` 0 is the signed-in climber). */
interface ClimberProfileSheetCrew {
  id: ClimberProfileSheetId;
  routeId: string;
  members?: ReadonlyArray<{ climberId?: ClimberProfileSheetId }> | null;
}
/** Someone's ask to join one of my crews. */
interface ClimberProfileSheetJoinAsk { id: ClimberProfileSheetId; climberId: ClimberProfileSheetId; crewId: ClimberProfileSheetId }
/** A crew invite sent to me. */
interface ClimberProfileSheetInvite { id: ClimberProfileSheetId; climberId: ClimberProfileSheetId; routeId: ClimberProfileSheetId }
/** What a crew is on: a route or an area; `kind` "missing" marks one that no longer resolves. */
interface ClimberProfileSheetPlace { name?: string; kind?: string }

export interface ClimberProfileSheetProps {
  /** True for a real profile id (a uuid), false for an example climber's integer id. */
  _isUid: (v: unknown) => boolean;
  /** The climber the sheet shows, with whatever App hydrated for them. */
  _viewedClimber: ProfileClimber;
  acceptCrewInvite: (invite: ClimberProfileSheetInvite) => void;
  acceptJoin: (id: ClimberProfileSheetId) => void;
  allJoinIn: ReadonlyArray<ClimberProfileSheetJoinAsk>;
  blockClimber: (c: ProfileClimber) => void;
  /** Belay catches credited to a climber beyond their stored ledger. */
  catchCredits: Record<string, number> | null;
  connect: (c: ProfileClimber) => void;
  connections: ReadonlyArray<{ id?: ClimberProfileSheetId | null }>;
  crewMsgs: Record<string, unknown[] | undefined>;
  crewReqIn: ReadonlyArray<ClimberProfileSheetInvite>;
  crews: ReadonlyArray<ClimberProfileSheetCrew>;
  declineJoin: (id: ClimberProfileSheetId) => void;
  /** The viewer's friendship with that climber: "friends", "out", "in", or none. */
  friendState: (id: ClimberProfileSheetId | null | undefined) => string | null;
  givenVouches: ReadonlyArray<{ _targetId?: ClimberProfileSheetId | null }>;
  /** App's mutual-friends map; read only through the mutual helpers. */
  mutuals: unknown;
  mySpeedFtHr: number | null;
  openDm: (c: ProfileClimber) => void;
  openRoute: (r: { id: ClimberProfileSheetId; name: string }) => void;
  placeOf: (crew: { id?: ClimberProfileSheetId }) => ClimberProfileSheetPlace | null;
  profRouteById: (id: ClimberProfileSheetId) => ProfileRoute | null | undefined;
  /** The open profile; the sheet is only drawn while it is set. */
  profileModal: ProfileClimber;
  reqJoin: (crewId: ClimberProfileSheetId, placeName: string) => void;
  /** String ids of the profiles the climber restricted. */
  restrictedIds: ReadonlySet<string>;
  routeById: (id: ClimberProfileSheetId) => { name?: string } | undefined;
  setCrewInvite: (invite: { crewId: ClimberProfileSheetId; climber: ProfileClimber }) => void;
  setCrewReqIn: Dispatch<SetStateAction<ClimberProfileSheetInvite[]>>;
  setGiveVouchWith: (c: ProfileClimber) => void;
  setInvitePrompt: (p: { climber: ProfileClimber; route: ProfileRoute }) => void;
  setLogCatchWith: (c: ProfileClimber) => void;
  setMutualModal: (c: ProfileClimber) => void;
  setProfileModal: (c: ProfileClimber | null) => void;
  setReport: (a: unknown) => void;
  setReportUser: (c: ProfileClimber) => void;
  setResumeFor: (c: ProfileClimber) => void;
  sharedRoute: ProfileRoute | null;
  showToast: (t: string, d?: number) => void;
  toggleRestrict: (c: ProfileClimber, on: boolean) => void;
  uid: string | null;
  unvouch: (c: ProfileClimber) => void;
}

/* profileModal&& — the body of that branch of App, lifted verbatim by extract-from-parent.mjs (branch mode);
   every binding it read from App is a prop of the same name. */
export default function ClimberProfileSheet({_isUid,_viewedClimber,acceptCrewInvite,acceptJoin,allJoinIn,blockClimber,catchCredits,connect,connections,crewMsgs,crewReqIn,crews,declineJoin,friendState,givenVouches,mutuals,mySpeedFtHr,openDm,openRoute,placeOf,profRouteById,profileModal,reqJoin,restrictedIds,routeById,setCrewInvite,setCrewReqIn,setGiveVouchWith,setInvitePrompt,setLogCatchWith,setMutualModal,setProfileModal,setReport,setReportUser,setResumeFor,sharedRoute,showToast,toggleRestrict,uid,unvouch}: ClimberProfileSheetProps){
  return <FullProfile notify={showToast} restricted={!!(profileModal&&restrictedIds.has(String(profileModal.id)))} onRestrict={uid&&profileModal&&_isUid(profileModal.id)?toggleRestrict:undefined} routeById={profRouteById} mySpeedFtHr={mySpeedFtHr} onUnvouch={unvouch} vouched={!!givenVouches.some(v=>v._targetId===profileModal.id)} mutuals={mutuals} onShowMutuals={c=>setMutualModal(c)} onOpenRoute={function(r){setProfileModal(null);openRoute(r);}} onJoinCrew={function(oc){if(!oc)return;const _pp=placeOf(oc);reqJoin(oc.id,_pp&&_pp.name?_pp.name:"the");setProfileModal(null);}} climber={_viewedClimber} onVouch={c=>setGiveVouchWith(c)} joinReq={(()=>{const jr=allJoinIn.find(j=>j.climberId===profileModal.id);if(!jr)return null;const cr=crews.find(c=>c.id===jr.crewId);return Object.assign({},jr,{routeName:((cr&&placeOf(cr))||{}).name||"your crew"});})()} onAcceptJoin={(rid)=>{acceptJoin(rid);setProfileModal(null);}} onDeclineJoin={(rid)=>{declineJoin(rid);setProfileModal(null);}} crewInv={(()=>{const ci=crewReqIn.find(x=>x.climberId===profileModal.id);if(!ci)return null;return Object.assign({},ci,{routeName:(routeById(ci.routeId)||{}).name||"their crew"});})()} onAcceptInv={(cid)=>{const ci=crewReqIn.find(x=>x.id===cid);setProfileModal(null);if(ci)acceptCrewInvite(ci);}} onDeclineInv={(cid)=>{showToast("Invite declined");setCrewReqIn(pp=>pp.filter(x=>x.id!==cid));setProfileModal(null);}} catchCredits={catchCredits} onBlock={blockClimber} onReport={c=>{setProfileModal(null);setReportUser(c);}} onClose={()=>setProfileModal(null)} onLogCatch={c=>{setProfileModal(null);setLogCatchWith(c);}} onConnect={c=>{setProfileModal(null);connect(c);}} fstate={friendState(profileModal.id)} sharedRoute={sharedRoute} onResume={c=>setResumeFor(c)} onFormCrew={(route)=>{setProfileModal(null);setInvitePrompt({climber:profileModal,route});}} onMessage={c=>openDm(c)} emRel={(()=>{const c=profileModal;if(!c||c.id===ME.id)return "none";if(crews.some(cr=>(cr.members||[]).some(m=>m.climberId===c.id)))return "crew";return connections.some(x=>x.id===c.id)?"friend":"none";})()} onOpenReport={a=>setReport(a)} myCrews={(()=>{const cl=profileModal;if(!cl)return [];return crews.filter(cr=>{const _p=placeOf(cr);if(!_p||_p.kind==="missing")return false;const iAmIn=(cr.members||[]).some(m=>m.climberId===0);if(!(iAmIn||ME.objectiveIds.includes(cr.routeId)))return false;if((cr.members||[]).some(m=>m.climberId===cl.id))return false;return true;}).map(cr=>{const _p=placeOf(cr)||{};return {id:cr.id,name:_p.name||"Crew",count:crewSize(cr),max:placeCap(_p),ready:isReady(cr,(crewMsgs[cr.id]||[]).length>0)};});})()} onInviteToCrew={(cid)=>{setCrewInvite({crewId:cid,climber:profileModal});setProfileModal(null);}}/>;
}
