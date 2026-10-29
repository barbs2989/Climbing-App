import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AVAIL_SLOT_OPTS, C, CAT, LEVEL_DESC, LVL, ME, MOUNTAINS, ROUTES, SKILLS, SL, liveSkills, SZ6, VOUCH_RATING_LABEL, VOUCH_RATING_ORDER, availSlotOn, belayLabel, catOf, certExpiryInfo, compat, compatUnknown, compatWhy, crewPlace, distMiles, genderLabel, mutualCount, mutualFirstNames, mutualLabel, profileGradeRows, pubFirst, pubName, realProfileId, roleLabel, seedHistoryFor, trophies, uApproxDist, uDistMi, useBadges, vouchAvg, vouchRowsFrom, weekOf, yearsSince } from "../../ClimbMatchCore.jsx";
import { HERO_BG, HERO_SHEEN } from "../../lib/ScreenHero";
import { POP_CLOSE_MEDIA } from "../../lib/popupChrome.js";
import { askConfirm } from "../../lib/ConfirmSheet.jsx";
import { clickable } from "../../lib/clickable";
import { dbRouteToCamel, useBelayLedgers, useClimberVouches, useFullProfile, useMyObjectives, useProfilesByIds, usePublicLists, useRoutesByIds, useVerifiedUsers } from "../../lib/db";
import { displayGrade, gradeNumFor } from "../../lib/grade.js";
import ActionIcon from "./ActionIcon.tsx";
import AscentPyramid, { type StoredPyramid } from "./AscentPyramid.tsx";
import Av from "./Av.tsx";
import BadgeGrid from "./BadgeGrid.tsx";
import Bar from "./Bar.tsx";
import CatchLedger, { type Ledger } from "./CatchLedger.tsx";
import Challenges, { type ChallengeAscent } from "./Challenges.tsx";
import Chevron from "./Chevron.tsx";
import DiscBadge from "./DiscBadge.tsx";
import DiscIcon from "./DiscIcon.tsx";
import EmptyState from "./EmptyState.tsx";
import Hr from "./Hr.tsx";
import Lbl from "./Lbl.tsx";
import LoadingRows from "./LoadingRows.tsx";
import PhotoStrip from "./PhotoStrip.tsx";
import Pill from "./Pill.tsx";
import SharedListView, { type SharedList } from "./SharedListView.tsx";
import SpeedCompat from "./SpeedCompat.tsx";
import SpeedProfile from "./SpeedProfile.tsx";
import Stars from "./Stars.tsx";
import TickList, { type LogRow, type Tick } from "./TickList.tsx";
import TopContribBadge from "./TopContribBadge.tsx";
import VouchCard, { type Vouch } from "./VouchCard.tsx";

/** A route this sheet names: a seed route, a DB route hydrated by id, or the caller's `routeById` result. `catOf` and `crewPlace` read the whole row. */
export interface ProfileRoute {
  id: string;
  name: string;
  grade?: string | null;
  discipline?: string | null;
  style?: string | null;
  mountainId?: string | null;
  _dbArea?: { name?: string | null } | null;
  activity?: ReadonlyArray<ProfileActivity> | null;
  [k: string]: unknown;
}
/** One condition report on the route the sheet was opened from (`sharedRoute`). */
export interface ProfileActivity { date?: string | null; tickType?: string | null; condTags?: ReadonlyArray<string> | null }
/** An open crew the climber sits in, as the finder row carries it (`_route`/`_area` for crewPlace). */
export interface ProfileOpenCrew { id: string | number; spots?: number | null; [k: string]: unknown }
/** A join request or a crew invite waiting on you, with the crew's place already named by App. */
export interface ProfileCrewAsk { id: string | number; note?: string | null; routeName?: string | null }
/** One of YOUR crews, for the invite list. */
export interface ProfileMyCrew { id: string | number; name: string; count: number; max: number; ready?: boolean }
/** A "Conditions only" report, which App keeps apart from logs. */
export interface ProfileCondReport { routeId?: string | null }
/**
 * The climber this sheet shows. A seed climber arrives fully populated; a REAL (uuid) profile arrives as a chip
 * (id/name/avatar) and is filled in here from `profiles`, received vouches, objectives and the verification read —
 * `_real` marks it, `_verKnown` says the verification read landed. The `__` fields are what App hydrated for it.
 */
export interface ProfileClimber {
  id?: string | number | null;
  name?: string | null;
  username?: string | null;
  showName?: boolean | null;
  resumePublic?: boolean | null;
  avatar?: string | null;
  bio?: string | null;
  location?: string | null;
  age?: number | string | null;
  gender?: string | null;
  level?: string | null;
  years?: number | string | null;
  disciplines: ReadonlyArray<string>;
  skills?: ReadonlyArray<string> | null;
  certifications: ReadonlyArray<string>;
  certExpiry?: Record<string, string> | null;
  belayDevices?: Record<string, string> | null;
  climbGrades?: unknown;
  availability?: unknown;
  availWeek?: unknown;
  hikingSpeedFtHr?: number | null;
  speedSelfReported?: boolean;
  sportGrade?: string | null;
  tradGrade?: string | null;
  boulderGrade?: string | null;
  objectiveIds: ReadonlyArray<string>;
  vouches: Vouch[];
  communityVouches?: number;
  photos?: string[] | null;
  photoAlts?: Record<string, string> | null;
  pyramid?: StoredPyramid | null;
  verified?: boolean | null;
  safetyScore?: number | null;
  catchLedger?: Ledger | null;
  _real?: boolean;
  _verKnown?: boolean;
  /** The rounded distance a nearby search returned; no coordinate is ever shared. */
  _distMi?: number | string | null;
  _tab?: string | null;
  _joinCrew?: ProfileOpenCrew | null;
  __selfLogs?: LogRow[] | null;
  __theirLogs?: LogRow[] | null;
  __theirLogsLoading?: boolean;
  __theirLogsFailed?: boolean;
  __selfCondReports?: ReadonlyArray<ProfileCondReport> | null;
  [k: string]: unknown;
}
/* HARDEST LOGGED, beside the grades a climber TYPED (Shredder audit, owner's note 2026-10-28). Shredder matches riders on
   what its GPS recorded rather than what they claim; the climbing version is the logbook. Per discipline: the hardest climb
   in the logs this viewer may read, and how many different climbs that is. A follow is not counted (you did not lead it),
   nor a top-rope except on a top-rope climb, nor anything that was not a completion. A climb we cannot resolve, or whose
   grade does not parse, adds nothing -- so this can only understate. Mountaineering and scrambling are walk-ups graded by
   class, which says nothing about a climber's level, so they are left out. */
const LOGGED_CATS=["sport","trad","toprope","bouldering","alpine","ice","mixed","aid"];
const NOT_LED: Record<string, 1>={Attempt:1,"Turned around":1,Fell:1,Hung:1,Project:1,Conditions:1,Follow:1};
export interface LoggedHardest { k: string; label: string; grade: string; n: number }
export function loggedHardest(logs: ReadonlyArray<LogRow>, routeById?: (id: string | number) => ProfileRoute | null | undefined): LoggedHardest[] {
  const by: Record<string, { best: number; grade: string; ids: Record<string, 1> }> = {};
  (logs||[]).forEach(l=>{
    const t=String(l.tickType||"");if(NOT_LED[t])return;
    const r=routeById?routeById(l.routeId):null;if(!r)return;
    const c=catOf(r);if(LOGGED_CATS.indexOf(c)<0)return;
    if(t==="Top-rope"&&c!=="toprope")return;
    const num=gradeNumFor(r.grade,c);const shown=displayGrade(r);if(num==null||!shown)return;
    const b=by[c]||(by[c]={best:-Infinity,grade:"",ids:{}});b.ids[String(r.id)]=1;
    if(num>b.best){b.best=num;b.grade=shown;}
  });
  return LOGGED_CATS.filter(c=>by[c]).map(c=>({k:c,label:(CAT[c]||{}).label||c,grade:by[c].grade,n:Object.keys(by[c].ids).length}));
}
export interface FullProfileProps {
  climber: ProfileClimber;
  onClose: () => void;
  /** Toast. */
  notify?: (msg: string) => void;
  restricted?: boolean;
  onRestrict?: (c: ProfileClimber, on: boolean) => void;
  onJoinCrew?: (oc: ProfileOpenCrew) => void;
  onConnect?: (c: ProfileClimber) => void;
  /** Friendship with the viewer: "friends", "out" (request sent), "in" (request received), or none. */
  fstate?: string | null;
  /** The route the sheet was opened from, for its last-climbed line. */
  sharedRoute?: ProfileRoute | null;
  onResume?: (c: ProfileClimber) => void;
  onFormCrew?: (r: ProfileRoute) => void;
  onMessage?: (c: ProfileClimber) => void;
  /** A logged climb's row (the tick list) or a challenge list's ascent. */
  onOpenReport?: (t: Tick | ChallengeAscent) => void;
  /** Belay catches credited to a climber beyond their stored ledger. */
  catchCredits?: Record<string, number> | null;
  onBlock?: (c: ProfileClimber) => void;
  onReport?: (c: ProfileClimber) => void;
  /** Your relation to them for the catch gate: "crew" counts as close. */
  emRel?: string | null;
  onLogCatch?: (c: ProfileClimber) => void;
  onVouch?: (c: ProfileClimber) => void;
  joinReq?: ProfileCrewAsk | null;
  onAcceptJoin?: (id: string | number) => void;
  onDeclineJoin?: (id: string | number) => void;
  crewInv?: ProfileCrewAsk | null;
  onAcceptInv?: (id: string | number) => void;
  onDeclineInv?: (id: string | number) => void;
  myCrews?: ReadonlyArray<ProfileMyCrew> | null;
  onInviteToCrew?: (crewId: string | number) => void;
  vouched?: boolean;
  onUnvouch?: (c: ProfileClimber) => void;
  /** App's mutual-friends map; read only through mutualCount/mutualLabel/mutualFirstNames. */
  mutuals?: unknown;
  onShowMutuals?: (c: ProfileClimber) => void;
  /** Your pace override, for the speed comparison. */
  mySpeedFtHr?: number | null;
  onOpenRoute?: (r: { id: string | number; name: string }) => void;
  routeById?: (id: string | number) => ProfileRoute | null | undefined;
}

export default function FullProfile({restricted,onRestrict,notify,climber,onClose,onJoinCrew,onConnect,fstate,sharedRoute,onResume,onFormCrew,onMessage,onOpenReport,catchCredits,onBlock,onReport,emRel,onLogCatch,onVouch,joinReq,onAcceptJoin,onDeclineJoin,crewInv,onAcceptInv,onDeclineInv,myCrews,onInviteToCrew,vouched,onUnvouch,mutuals,onShowMutuals,mySpeedFtHr,onOpenRoute,routeById}: FullProfileProps){
  // Real (uuid) profiles arrive with only a few fields (id/name/avatar from a
  // member chip or search row), while this component was written against the
  // fully-populated seed climbers — bare access blanked the whole app (compat's
  // b.objectiveIds.includes, vouches.reduce, LVL[undefined].color). Fetch what
  // is real (profile row, received vouches), default the
  // rest, and HIDE seed-only sections rather than showing zeros we don't know.
  const _realId=realProfileId(climber.id);
  const realProfileQ=useFullProfile(_realId);
  const realVouchesQ=useClimberVouches(_realId);
  /* Their belay record (0315): the catches that count on the Belay board. A failed read shows a dash, not "none". */const realLedgerQ=useBelayLedgers(_realId?[_realId]:[]);const belayLedgerUnavailable=!!_realId&&realLedgerQ.isError;const realLedger=_realId?((realLedgerQ.data&&realLedgerQ.data[_realId])||(belayLedgerUnavailable?{otherReal:true}:null)):null;
  const _vAuthorIds=useMemo(()=>_realId?[...new Set((realVouchesQ.data||[]).map(r=>r.from_id))]:[],[_realId,realVouchesQ.data]);
  const vAuthorsQ=useProfilesByIds(_vAuthorIds);
  // Their PUBLIC lists (user_lists.shared). Nothing read that flag before; a climber could make a list
  // public and no one could ever see it. _realId is null for a seed climber, which disables the read.
  const pubListsQ=usePublicLists(_realId);const [openList,setOpenList]=useState<SharedList | null>(null);
  /* A real climber's OBJECTIVES. Every door into this screen (friends, partner rows, route viewers,
     Ranks) builds a real climber with objectiveIds:[], and the tab below resolved ids against the
     seed ROUTES only -- so a real profile always read "No objectives listed yet". `objectives` is
     public read (0031); the routes are read by id, because a DB route is not in ROUTES. */
  const realObjQ=useMyObjectives(_realId);const _objIds=useMemo(()=>(_realId&&realObjQ.data)?realObjQ.data:[],[_realId,realObjQ.data]);
  const objRoutesQ=useRoutesByIds(_objIds.filter(id=>!ROUTES.some(r=>r.id===id)));
  const _objRoute=useMemo(()=>{const m: Record<string, ProfileRoute>={};(objRoutesQ.data||[]).forEach((r: { id: string | number })=>{m[r.id]=dbRouteToCamel(r);});return function(id: string | number): ProfileRoute | null{return ROUTES.find(x=>x.id===id)||m[id]||(routeById?routeById(id):null)||null;};},[objRoutesQ.data,routeById]);
  /* Whether THEY are verified. verification_records is owner-read only, so until 0232 every real climber
     read as unverified to everyone but themselves: no ✓ on this avatar, an amber "Unverified" on their
     résumé. `_verKnown` is false while the read is in flight or failed, and the résumé shows NO chip
     then, rather than calling a verified climber unverified. */
  const realVerQ=useVerifiedUsers(_realId?[_realId]:[]);
  climber=useMemo(function(){
    if(!_realId)return climber;
    const p=realProfileQ.data||{};
    const vouches: Vouch[]=vouchRowsFrom(realVouchesQ.data,vAuthorsQ.data);
    return Object.assign({},climber,{_real:true,vouches:vouches,communityVouches:vouches.length,objectiveIds:realObjQ.data||climber.objectiveIds||[],photos:climber.photos||[],photoAlts:climber.photoAlts,/* Their stored certifications and skills (0181) and the 0237 fields. These read the CALL SITE's copy before, which for a real climber is always empty -- so nothing they listed ever reached anyone. */certifications:(Array.isArray(p.certifications)&&p.certifications.length)?p.certifications:(climber.certifications||[]),skills:(Array.isArray(p.skills)&&p.skills.length)?liveSkills(p.skills):liveSkills(climber.skills),level:p.level||climber.level,/* 0299: years from the year they started; their résumé and compare grid read `years`. */years:p.climbing_since?yearsSince(p.climbing_since):climber.years,climbGrades:(p.climb_grades&&typeof p.climb_grades==="object")?p.climb_grades:climber.climbGrades,certExpiry:(p.cert_expiry&&typeof p.cert_expiry==="object")?p.cert_expiry:climber.certExpiry,belayDevices:(p.belay_devices&&typeof p.belay_devices==="object"&&Object.keys(p.belay_devices).length)?p.belay_devices:climber.belayDevices,/* 0209: their stored availability, week grid and pace, which the schedule card and SpeedCompat read. */availability:Array.isArray(p.availability)&&p.availability.length?p.availability:(climber.availability||[]),availWeek:Array.isArray(p.avail_week)&&p.avail_week.length?p.avail_week:(climber.availWeek||[]),hikingSpeedFtHr:Number(p.hiking_speed_ft_hr)||climber.hikingSpeedFtHr,disciplines:p.disciplines||climber.disciplines||[],name:p.name||climber.name,avatar:p.avatar||climber.avatar,username:p.username||climber.username,bio:p.bio||climber.bio,location:p.location||climber.location,sportGrade:p.sport_grade||climber.sportGrade,tradGrade:p.trad_grade||climber.tradGrade,boulderGrade:p.boulder_grade||climber.boulderGrade,/* THE TWO PRIVACY FIELDS THIS MEMO USED TO DROP. It re-hydrates name, username, bio,
       location and grades from an authoritative select("*"), so `showName` and
       `resumePublic` were whatever the CALL SITE happened to carry — and a call site that
       carried neither got `resumePublic === undefined`, which the button's `!== false`
       gate reads as PUBLIC. Reading them here closes it for every caller at once rather
       than one chip at a time.
       The fallbacks are asymmetric on purpose. While the row is still loading `p` is {},
       so an unknown `resume_public` degrades to `!!climber.resumePublic` — absent means
       HIDE. Being briefly wrong about a button costs a reload; being wrong the other way
       publishes a resume somebody made private. */showName:p.show_name!=null?!!p.show_name:!!climber.showName,resumePublic:p.resume_public!=null?!!p.resume_public:!!climber.resumePublic,verified:realVerQ.data?realVerQ.data.has(_realId):climber.verified===true,_verKnown:!!realVerQ.data});
  },[climber,_realId,realProfileQ.data,realVouchesQ.data,vAuthorsQ.data,realObjQ.data,realVerQ.data]);
  const [pt,setPt]=useState(climber._tab||"overview");const [invOpen,setInvOpen]=useState(false);
  const isSelf=climber.id===ME.id;
  /* The logs the profile's challenges read: seed history, then your own or the ones their visibility lets you read. */
  const _chLogs=useMemo(()=>seedHistoryFor(climber).map((t: Tick): LogRow=>({routeId:t.route.id,tickType:t.tickType,stars:t.stars,date:t.date})).concat(climber.__selfLogs||climber.__theirLogs||[]),[climber]);
  /* TROPHY CASE: the badges they earned, near the top of the profile, where Strava puts a climber's recent trophies -- not under every log. */
  const _trophies=trophies(useBadges(_chLogs,routeById));
  const _loggedHardest=useMemo(()=>loggedHardest(_chLogs,routeById),[_chLogs,routeById]);
  /* A REAL climber is scored too, by the partner row's rule: once their objectives have landed and no more than two of the
     match's signals are unknown. Their distance is the rounded one a nearby search returned (no coordinate is ever
     shared), so it is only known when the sheet was opened from that search. */
  const _meM=Object.assign({},ME,{objectiveIds:Array.isArray(ME.matchObjectiveIds)?ME.matchObjectiveIds:(ME.objectiveIds||[])});
  const _unkN=climber._real?compatUnknown(_meM,climber):0;
  const score=climber._real?((realObjQ.data&&_unkN<3)?compat(_meM,climber):null):compat(_meM,climber),dist=climber._real?(climber._distMi!=null?Number(climber._distMi):null):distMiles(ME,climber),_ratedVouches=climber.vouches.filter(v=>vouchAvg(v)!=null),avgVouch=_ratedVouches.length?_ratedVouches.reduce((s,v)=>s+(vouchAvg(v)||0),0)/_ratedVouches.length:null,_vouchCats=VOUCH_RATING_ORDER.map((k: string): [string, number] | null=>{const xs=climber.vouches.map(v=>Number(v.ratings?v.ratings[k]:undefined)).filter(n=>n>=1&&n<=5);return xs.length?[k,xs.reduce((s,x)=>s+x,0)/xs.length]:null;}).filter((x): x is [string, number]=>!!x),_vouchSkills=Object.entries(climber.vouches.reduce<Record<string, number>>((m,v)=>{(v.skills||[]).forEach(k=>{m[k]=(m[k]||0)+1;});return m;},{})).sort((a,b)=>b[1]-a[1]);/* Each category averages only the vouches that RATED it. Dividing by every vouch counted a category someone left blank as a zero, which a blank-by-default form would have made the norm. */const tcol=C.border;
  /* The card is overflow CLIP, not hidden: `hidden` makes it a scroll container, and a sticky child then sticks to a box that never scrolls -- the ✕ scrolled away with the profile, so leaving a long one meant scrolling back up to find it. The ✕ rides in a zero-height sticky row, dark-filled so it reads over the text it floats above; the hero keeps a same-sized gap where it rests. */
  return createPortal(<div onClick={onClose} role="dialog" aria-label="Climber profile" aria-modal="true" style={{position:"fixed",inset:0,background:C.scrimStrong,zIndex:9800,overflowY:"auto",overscrollBehavior:"contain",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"12px 8px"}}>
    <div onClick={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:18,width:"100%",maxWidth:480,border:`1px solid ${C.border}`,overflow:"clip"}}>
      <div style={{position:"sticky",top:0,zIndex:5,height:0,display:"flex",justifyContent:"flex-end",padding:"0 16px"}}><button onClick={onClose} aria-label="Close" style={Object.assign({},POP_CLOSE_MEDIA,{marginTop:16,boxShadow:"0 2px 10px rgba(0,0,0,0.45)"})}>✕</button></div>
      <div style={{background:HERO_BG,boxShadow:HERO_SHEEN,padding:16}}>
        <div aria-hidden="true" style={{height:POP_CLOSE_MEDIA.height,marginBottom:10}}></div>
        <div style={{display:"flex",gap:13,alignItems:"flex-start",marginBottom:12}}><div style={{position:"relative",padding:2,borderRadius:"50%",background:"linear-gradient(135deg,"+tcol+"33,"+tcol+"00)"}}><Av src={climber.avatar} size={72}/>{climber.verified?<div style={{position:"absolute",bottom:0,right:0,width:20,height:20,background:C.green,borderRadius:"50%",border:`2px solid ${C.surface}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>✓</div>:null}</div><div style={{flex:1}}><div style={{color:C.text,fontWeight:700,fontSize:19}}>{pubName(climber)}{climber.age?", "+climber.age:""}</div><div style={{marginTop:6}}></div>{(()=>{const tb=<TopContribBadge climber={climber}/>;return tb?<div style={{marginTop:6}}>{tb}</div>:null;})()}{mutualCount(climber.id,mutuals)?<div {...clickable(()=>onShowMutuals&&onShowMutuals(climber))} style={{fontSize:12,color:C.blue,fontWeight:600,marginTop:6,display:"flex",alignItems:"center",gap:5,cursor:onShowMutuals?"pointer":"default"}}><span style={{display:"inline-flex"}}><ActionIcon name="crews" size={13} color={C.blue}/></span><span style={{minWidth:0,overflow:"hidden",textOverflow:"ellipsis"}}>{mutualLabel(climber.id,mutuals)+(mutualFirstNames(climber.id,mutuals).length?" · "+mutualFirstNames(climber.id,mutuals).slice(0,3).join(", "):"")}</span>{onShowMutuals?<span aria-hidden="true" style={{display:"flex",flexShrink:0}}><Chevron size={16} color={C.textMuted}/></span>:null}</div>:null}<div style={{fontSize:13,marginTop:3,color:C.textSub,display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}><span>{<Lbl s={"📍 "+(climber.location||"Location not set")}/>}</span>{genderLabel(climber.gender)?<><span style={{color:C.textMuted}}>·</span><span>{genderLabel(climber.gender)}</span></>:null}{dist!=null&&isFinite(dist)?<><span style={{color:C.textMuted}}>·</span><span style={{color:C.blue}}>{(climber._real?(dist<=5?"under "+uApproxDist(5):"~"+uApproxDist(dist)):uDistMi(+dist.toFixed(1)))+" away"}</span></>:null}</div><div style={{display:"flex",gap:5,marginTop:7,flexWrap:"wrap"}}>{LVL[climber.level||""]?<Pill label={climber.level} color={LVL[climber.level||""].color} bg={LVL[climber.level||""].bg} sm/>:null}</div></div></div>{!isSelf?<div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:13}}><button onClick={()=>{if(fstate!=="friends"&&onConnect)onConnect(climber);}} disabled={fstate==="friends"} aria-pressed={fstate==="out"} title={fstate==="out"?"Tap to withdraw your request":undefined} style={{flex:1,padding:"9px 4px",borderRadius:10,border:"1px solid "+(fstate==="friends"?C.green:fstate==="out"?C.border:C.blueDim),cursor:fstate==="friends"?"default":"pointer",fontSize:11.5,fontWeight:700,whiteSpace:"nowrap",background:fstate==="friends"?C.greenBg:fstate==="out"?C.surface:C.blueBg,color:fstate==="friends"?C.green:fstate==="out"?C.textMuted:C.blue}}>{fstate==="friends"?"✓ Friend":fstate==="out"?"Requested · undo":fstate==="in"?"Accept":"+ Friend"}</button><button onClick={()=>onMessage&&onMessage(climber)} style={{flex:1,padding:"9px 4px",borderRadius:10,border:`1px solid ${C.blueDim}`,background:C.blueBg,color:C.blue,fontSize:11.5,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>Message</button><button onClick={()=>setInvOpen(true)} style={{flex:1,padding:"9px 4px",borderRadius:10,border:`1px solid ${C.blueDim}`,background:C.blueBg,color:C.blue,fontSize:11.5,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>Invite to crew</button>{onVouch?(vouched?<button onClick={()=>onUnvouch&&onUnvouch(climber)} aria-pressed={true} title="You vouched — tap to withdraw" style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"9px 4px",borderRadius:10,border:"1px solid "+C.purple,background:C.purpleBg,color:C.purple,fontSize:11.5,fontWeight:700,whiteSpace:"nowrap",boxSizing:"border-box",cursor:"pointer"}}>{"✓ Vouched"}</button>:<button onClick={()=>onVouch(climber)} aria-label="Vouch" style={{flex:1,padding:"9px 4px",borderRadius:10,border:"1px solid "+C.blueDim,background:C.blueBg,color:C.onSolid,fontSize:11.5,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>Vouch</button>):null}</div>:null}{crewInv?<div style={{background:C.blueBg,border:`1px solid ${C.blueDim}`,borderRadius:12,padding:"11px 13px",marginTop:12,marginBottom:12}}><div style={{fontSize:13,fontWeight:700,color:C.blue,marginBottom:3}}>Invited you to their crew</div><div style={{fontSize:12,color:C.text,lineHeight:1.45,marginBottom:crewInv.note?8:10}}>{pubName(climber)+" invited you to climb "+(crewInv.routeName||"with their crew")+". Look over their profile, then respond."}</div>{crewInv.note?<div style={{fontSize:12,color:C.textSub,background:"rgba(0,0,0,0.3)",borderRadius:8,padding:"7px 9px",marginBottom:10,lineHeight:1.4,fontStyle:"italic"}}>{"“"+crewInv.note+"”"}</div>:null}<div style={{display:"flex",gap:12}}><button onClick={()=>onAcceptInv&&onAcceptInv(crewInv.id)} style={{flex:1,padding:"9px",background:C.green,color:C.onBright,border:"none",borderRadius:9,fontSize:13,fontWeight:700,cursor:"pointer"}}>Accept & join</button><button onClick={()=>onDeclineInv&&onDeclineInv(crewInv.id)} style={{flex:1,padding:"9px",background:C.surface,color:C.textMuted,border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,cursor:"pointer"}}>Decline</button></div></div>:null}{(!isSelf&&myCrews&&myCrews.length)?<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px",marginTop:12,marginBottom:12}}><div style={{fontSize:13,fontWeight:700,color:C.text,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:invOpen?9:0}}><span style={SZ6}>Invite {(pubName(climber)||"").split(" ")[0]} to one of your crews</span><button onClick={()=>setInvOpen(o=>!o)} aria-label="Crews" aria-expanded={invOpen} style={{minHeight:44,minWidth:44,flexShrink:0,border:`1px solid ${C.border}`,background:C.surface,color:C.textSub,borderRadius:8,padding:"8px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}><Chevron open={invOpen} color={C.blue}/></button></div>{invOpen?<div style={{display:"flex",flexDirection:"column",gap:7}}>{myCrews.map(c=><div key={c.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"8px 10px",borderRadius:9,background:C.surface,border:`1px solid ${C.border}`}}><div style={{minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div><div style={{fontSize:12,color:c.ready?C.green:C.textMuted}}>{c.count+" of "+c.max+" climbers"+(c.ready?" · ready to climb":"")}</div></div><button onClick={()=>onInviteToCrew&&onInviteToCrew(c.id)} style={{flexShrink:0,padding:"9px 13px",borderRadius:8,border:`1px solid ${C.blue}`,background:C.blueBg,color:C.blue,fontSize:12,fontWeight:700,cursor:"pointer"}}>Invite to crew</button></div>)}</div>:null}</div>:null}{joinReq?<div style={{background:C.amberBg,border:`1px solid ${C.amber}`,borderRadius:12,padding:"11px 13px",marginTop:12,marginBottom:12}}><div style={{fontSize:13,fontWeight:700,color:C.amber,marginBottom:3}}>Wants to join your crew</div><div style={{fontSize:12,color:C.text,lineHeight:1.45,marginBottom:joinReq.note?8:10}}>{"Asked to join your "+(joinReq.routeName||"crew")+". Review the profile below, then decide."}</div>{joinReq.note?<div style={{fontSize:12,color:C.textSub,background:"rgba(0,0,0,0.3)",borderRadius:8,padding:"7px 9px",marginBottom:10,lineHeight:1.4,fontStyle:"italic"}}>{"“"+joinReq.note+"”"}</div>:null}<div style={{display:"flex",gap:12}}><button onClick={()=>onAcceptJoin&&onAcceptJoin(joinReq.id)} style={{flex:1,padding:"9px",background:C.green,color:C.onBright,border:"none",borderRadius:9,fontSize:13,fontWeight:700,cursor:"pointer"}}>Accept into crew</button><button onClick={()=>onDeclineJoin&&onDeclineJoin(joinReq.id)} style={{flex:1,padding:"9px",background:C.surface,color:C.textMuted,border:`1px solid ${C.border}`,borderRadius:9,fontSize:13,cursor:"pointer"}}>Decline</button></div></div>:null}
        {climber.bio?<div style={{fontSize:13,color:C.textSub,lineHeight:1.5,marginTop:10}}>{climber.bio}</div>:null}{LEVEL_DESC[climber.level||""]?<div style={{fontSize:12,color:C.textMuted,lineHeight:1.4,marginTop:6}}>{LEVEL_DESC[climber.level||""]}</div>:null}
      </div>
      {(()=>{const _gc=[C.blue,C.amber,C.purple,C.green,C.red,C.textSub];const gs=profileGradeRows(climber).filter(g=>g.grade).map((g,gi)=>[g.label,g.grade,_gc[gi%_gc.length],roleLabel(g.role)]);/* What they say, then what their logbook shows -- each labelled, neither overriding the other. */const lg=_loggedHardest;return ((gs.length||lg.length)&&pt==="overview")?<div style={{padding:"12px 16px 16px"}}>{gs.length?<><div style={{fontSize:13,color:C.text,fontWeight:800,letterSpacing:0.4,textTransform:"uppercase",marginBottom:8,borderLeft:"3px solid "+C.blue,paddingLeft:9}}>Hardest grades</div><div style={{display:"grid",gridTemplateColumns:"repeat("+Math.min(gs.length,3)+",1fr)",gap:8}}>{gs.map(x=><div key={x[0]} style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"9px 7px",textAlign:"center"}}><div style={{fontSize:13,color:C.text,fontWeight:800,letterSpacing:0.4,textTransform:"uppercase",borderLeft:"3px solid "+C.blue,paddingLeft:9}}>{x[0]}</div><div style={{fontSize:17,fontWeight:800,color:x[2],marginTop:2}}>{x[1]}</div>{x[3]?<div style={{fontSize:11.5,color:C.textMuted,marginTop:2}}>{x[3]}</div>:null}</div>)}</div></>:null}{lg.length?<div style={{marginTop:gs.length?12:0}}><div style={{fontSize:13,color:C.text,fontWeight:800,letterSpacing:0.4,textTransform:"uppercase",marginBottom:4,borderLeft:"3px solid "+C.green,paddingLeft:9}}>Hardest logged</div><div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.4,marginBottom:8}}>{(isSelf?"From your logbook":"From the climbs "+pubFirst(climber)+" logged that you can see")+". Follows and attempts are not counted."}</div><div style={{display:"flex",flexDirection:"column",gap:6}}>{lg.map(x=><div key={x.k} style={{display:"flex",alignItems:"center",gap:9,background:C.card,border:"1px solid "+C.border,borderRadius:10,padding:"8px 11px"}}><DiscIcon d={x.k} size={14}/><span style={{flex:1,minWidth:0,fontSize:13,fontWeight:700,color:C.text}}>{x.label}</span><span style={{fontSize:14,fontWeight:800,color:C.green}}>{x.grade}</span><span style={{fontSize:11.5,color:C.textMuted,minWidth:58,textAlign:"right"}}>{x.n+" climb"+(x.n===1?"":"s")}</span></div>)}</div></div>:null}</div>:null;})()}
      {sharedRoute?(()=>{const reps=(sharedRoute.activity||[]).filter((a): a is ProfileActivity & { date: string }=>!!(a&&a.date)).slice().sort((a,b)=>b.date.localeCompare(a.date));const last=reps[0];const fmt=(d: number)=>d<1?"today":d===1?"1 day ago":d<45?d+" days ago":d<365?Math.round(d/30)+" months ago":Math.round(d/365)+" year"+(d>=730?"s":"")+" ago";let txt: string,col: string,bg: string;if(!last){txt="No condition reports yet — be the first to log it";col=C.textMuted;bg=C.surface;}else{const d=Math.floor((Date.now()-new Date(last.date+"T12:00:00").getTime())/86400000);const fresh=d<=30;const tags=(last.condTags||[]).slice(0,3);col=fresh?C.teal:C.textMuted;bg=fresh?C.tealDim:C.surface;txt="Last climbed "+fmt(d)+(last.tickType?" · "+last.tickType:"")+(tags.length?" · "+tags.join(" · "):"");}return <div style={{display:"flex",alignItems:"center",gap:7,padding:"8px 14px",background:bg,borderBottom:`1px solid ${C.border}`,fontSize:11.5,color:col,fontWeight:600}}><span style={{flex:1,minWidth:0}}>{txt}</span></div>;})():null}{climber._joinCrew?(function(){const oc=climber._joinCrew;if(!oc)return null;/* ONE place, a route or an area (0302); the finder row carries `_route`/`_area`, so this resolves without App's lookups. */const rt=crewPlace(oc,{});return <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",background:C.blueBg,borderBottom:"1px solid "+C.blueDim}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:12.5,fontWeight:700,color:C.blue}}>{"In the "+(rt&&rt.name?rt.name:"this")+" crew"}</div><div style={{fontSize:12,color:C.textSub,marginTop:1}}>{oc.spots+" spot"+(oc.spots!==1?"s":"")+" open · vet them, then join"}</div></div><button onClick={function(){if(onJoinCrew)onJoinCrew(oc);}} style={{flexShrink:0,padding:"9px 14px",borderRadius:10,border:"none",background:C.blueSolid,color:C.onSolid,fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>{<Lbl s={"Join this crew"}/>}</button></div>;})():null}<div className="cm-hscroll" style={{display:"flex",background:C.surface,borderBottom:`1px solid ${C.border}`,overflowX:"auto",paddingBottom:6,paddingRight:14}}>{/* The 6px under the tabs is the SCROLLBAR's lane. cm-hscroll hides the bar, but iOS Safari has long ignored ::-webkit-scrollbar and draws its swipe indicator along the bottom edge anyway -- right over the selected tab's blue underline (owner note). With the lane the indicator runs below the underline; the 14px at the end (wider than a desktop overlay bar) keeps the last tab's underline clear of the profile's own vertical indicator. */}{[["overview","Overview"],["safety","Safety"],["vouches","Vouches"],["speed","Speed"],["objectives","Objectives"]].map(x=><button key={x[0]} onClick={()=>setPt(x[0])} aria-current={pt===x[0]?"true":undefined} style={{flex:"0 0 auto",padding:"13px 16px",border:"none",background:"transparent",color:pt===x[0]?C.blue:C.textSub,fontSize:14.5,fontWeight:pt===x[0]?"700":"600",cursor:"pointer",borderBottom:`3px solid ${pt===x[0]?C.blue:"transparent"}`,whiteSpace:"nowrap"}}>{x[1]}</button>)}</div>
      <div style={{padding:"22px 16px 14px"}}>
        {pt==="overview"?<div>
          {climber.photos&&climber.photos.length?<div style={{marginBottom:13}}><PhotoStrip photos={climber.photos} alts={climber.photoAlts}/></div>:null}
          {/* Another climber with none, or whose logs are loading or failed, shows nothing: no badge is not a claim this sheet can make. */}{_trophies.length?<div style={{marginBottom:14}}><SL>{"Badges · "+_trophies.length}</SL><BadgeGrid badges={_trophies}/></div>:(climber.__selfLogs?<div style={{marginBottom:14}}><SL>Badges</SL><div style={{fontSize:12.5,color:C.textMuted,lineHeight:1.5}}>Badges mark real milestones: 50 crag sends, 10 alpine summits, a finished list. Challenges in your Logbook shows how close you are.</div></div>:null)}
          {climber.resumePublic!==false?<button onClick={()=>onResume&&onResume(climber)} style={{width:"100%",padding:"10px 13px",background:HERO_BG,boxShadow:HERO_SHEEN,border:"1px solid "+C.border,borderRadius:12,cursor:"pointer",display:"flex",alignItems:"center",gap:12,textAlign:"left",marginBottom:13}}><span style={{flexShrink:0,display:"flex"}}><ActionIcon name="doc" size={18} color={C.blue}/></span><div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:700,color:C.text}}>View climbing résumé</div><div style={{fontSize:11.5,color:C.textSub,marginTop:2}}>Sends by grade, courses & verified experience</div></div><Chevron color={C.textMuted}/></button>:<div style={{padding:"12px 14px",fontSize:12.5,color:C.textMuted,background:C.card,textAlign:"center",borderRadius:12,border:"1px solid "+C.border,marginBottom:13}}>This climber keeps their résumé private</div>}
          {!isSelf&&score!=null?<div title="How well your climbing lines up. Blends your shared objectives, grade range, disciplines, listed areas, pace, availability overlap and whether they are verified." style={{background:C.blueBg,borderRadius:11,padding:"11px 13px",marginBottom:13,border:`1px solid ${C.blueDim}`}}><div style={{fontSize:12,fontWeight:700,color:C.blue,marginBottom:4}}>COMPATIBILITY WITH YOU — {score}%</div><Bar val={score} color={score>=75?C.green:C.blue}/><div style={{fontSize:12,color:C.textSub,marginTop:4}}>{(score>=80?"Excellent match":score>=60?"Good match":"Limited overlap")+(_unkN?" · based on limited info":"")+(dist!=null&&isFinite(dist)?" · "+(climber._real?(dist<=5?"under "+uApproxDist(5):"~"+uApproxDist(dist)):uDistMi(+dist.toFixed(1)))+" away":"")}</div><div style={{fontSize:11.5,fontWeight:800,color:C.text,letterSpacing:0.4,textTransform:"uppercase",marginTop:10,marginBottom:5}}>How you match</div>{compatWhy(_meM,climber).map(r=>{const ic=r.tone==="good"?["✓",C.green]:r.tone==="part"?["~",C.amber]:r.tone==="bad"?["✕",C.red]:["?",C.textMuted];return <div key={r.k} style={{display:"flex",gap:7,alignItems:"flex-start",fontSize:12.5,color:r.tone==="unk"?C.textMuted:C.textSub,lineHeight:1.4,marginTop:3}}><span aria-hidden="true" style={{flex:"0 0 14px",textAlign:"center",fontWeight:800,color:ic[1]}}>{ic[0]}</span><span style={{minWidth:0}}>{r.text}</span></div>;})}<div style={{fontSize:11,color:C.textMuted,marginTop:6,lineHeight:1.4}}>Listed by how much each counts. Anything one of you has not filled in counts as neutral, not as a mismatch.</div></div>:null}
          {(!isSelf&&climber.objectiveIds.filter(id=>ME.objectiveIds.includes(id)).length>0)?(()=>{const so=climber.objectiveIds.filter(id=>ME.objectiveIds.includes(id)).map(_objRoute).filter((r): r is ProfileRoute=>!!r);return so.length?<div style={{background:C.card,border:"1px solid "+C.green+"55",borderRadius:12,padding:"12px 14px",marginBottom:12}}><div style={{fontSize:13,fontWeight:700,color:C.green,marginBottom:9,display:"flex",alignItems:"center",gap:6}}><ActionIcon name="partners" size={14} color={C.green}/><span>You both want {so.length+" "+(so.length>1?"climbs":"climb")} — start a crew</span></div><div style={{display:"flex",flexDirection:"column",gap:7}}>{so.map(r=><div key={r.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"8px 10px",borderRadius:9,background:C.surface,border:"1px solid "+C.border}}><div style={{minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</div><div style={{fontSize:12,color:C.textMuted,display:"flex",alignItems:"center",gap:4}}><DiscIcon d={catOf(r)} size={11}/>{((CAT[catOf(r)]||{}).label||catOf(r))+(r.grade?" · "+r.grade:"")}</div></div><button onClick={e=>{e.stopPropagation();if(onFormCrew)onFormCrew(r);}} style={{flexShrink:0,padding:"6px 12px",borderRadius:8,border:"1px solid "+C.green,background:C.greenBg,color:C.green,fontSize:12,fontWeight:700,cursor:"pointer"}}>Form a crew</button></div>)}</div></div>:null;})():null}{!isSelf?<SpeedCompat a={mySpeedFtHr!=null?Object.assign({},ME,{hikingSpeedFtHr:mySpeedFtHr,speedSelfReported:true}):ME} b={climber}/>:null}
          {(()=>{const av=weekOf(climber);return <div style={{marginTop:13,marginBottom:13}}><div style={{fontSize:13,fontWeight:800,color:C.text,letterSpacing:0.4,textTransform:"uppercase",marginBottom:8,borderLeft:"3px solid "+C.blue,paddingLeft:9}}>Availability</div>{av.length?<div style={{display:"flex",gap:5}}>{AVAIL_SLOT_OPTS.map(o=>{const on=availSlotOn(av,o[0]);return <span key={o[0]} style={{flex:"1 1 0",minWidth:0,textAlign:"center",lineHeight:1.25,padding:"6px 2px",borderRadius:13,border:"1px solid "+(on?C.blue:C.border),background:on?C.blueBg:C.surface,color:on?C.onSolid:C.textMuted,fontSize:11.5,fontWeight:700}}>{o[1]}</span>;})}</div>:<div style={{fontSize:12.5,color:C.textMuted}}>Not shared yet</div>}</div>;})()}
          
          <Hr/>
          
          
          <SL>Disciplines</SL><div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>{climber.disciplines.map(d=><DiscBadge key={d} id={d} sm/>)}</div>
          {(()=>{/* Your own logs, or another real climber's (__theirLogs, hydrated by App). */const _lg=climber.__selfLogs||climber.__theirLogs;return ((_lg&&_lg.length)||climber.pyramid)?<div style={{marginBottom:12}}><SL>Sends by grade</SL><div style={{fontSize:12,color:C.textMuted,margin:"-2px 0 8px",lineHeight:1.5}}>{climber.__selfLogs?"Your sends by grade — where you operate and what you can project.":"Their sends by grade — a quick read on where they operate."}</div><AscentPyramid routeById={routeById} logs={_lg} pyramid={climber.pyramid}/></div>:null;})()}<Challenges hideBadges routeById={routeById} logs={_chLogs} condReports={climber.__selfCondReports} who={realProfileId(climber.id)?pubName(climber):climber.name} self={!!climber.__selfLogs} onOpen={onOpenRoute} onOpenReport={onOpenReport}/>
          
          <div style={{marginBottom:12}}><SL>{"Logged Climbs"+(climber.__theirLogsLoading||climber.__theirLogsFailed?"":" · "+(seedHistoryFor(climber).length+(climber.__selfLogs||climber.__theirLogs||[]).length))}</SL>{climber.__theirLogsFailed?<div style={{fontSize:12,color:C.amber,marginBottom:6,lineHeight:1.5}}>Couldn’t load their logbook right now — this isn’t an empty one.</div>:climber.__theirLogsLoading?<LoadingRows C={C} label="Loading their logbook…" style={{marginBottom:6}}/>:null}<div style={{background:C.surface,borderRadius:11,padding:"2px 13px",border:`1px solid ${C.border}`}}><TickList routeById={routeById} climber={climber} logs={climber.__selfLogs||climber.__theirLogs||[]} onOpen={onOpenReport} initial={6}/></div></div>
          
        </div>:null}
        {pt==="safety"?<div>
          {climber.safetyScore!=null?<div style={{background:C.greenBg,borderRadius:11,padding:"11px 13px",marginBottom:12,border:`1px solid ${C.greenDim}`}}><div style={{fontSize:12,fontWeight:700,color:C.green,marginBottom:3}}>OVERALL SAFETY SCORE — {climber.safetyScore}/100</div><Bar val={climber.safetyScore} color={C.green}/></div>:null}
          {realLedger?<CatchLedger ledger={realLedger} unavailable={belayLedgerUnavailable}/>:climber.catchLedger?<CatchLedger ledger={{...climber.catchLedger,totalCatches:(climber.catchLedger.totalCatches||0)+(catchCredits&&climber.id!=null&&catchCredits[climber.id]||0)}}/>:null}
          {(climber.belayDevices&&Object.keys(climber.belayDevices).length)?<div style={{marginTop:12}}><SL>BELAY DEVICE PROFICIENCY</SL><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{Object.entries(climber.belayDevices).map(([dev,lvl])=><span key={dev} style={{fontSize:12,padding:"2px 8px",borderRadius:6,background:lvl==="Expert"?C.greenBg:lvl==="Proficient"?C.blueBg:C.amberBg,color:lvl==="Expert"?C.green:lvl==="Proficient"?C.blue:C.amber,fontWeight:600}}>{belayLabel(dev)} · {lvl}</span>)}</div></div>:null}
          <Hr/><SL>Certifications</SL><div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>{climber.certifications.length?climber.certifications.map(c=>{const ex=certExpiryInfo(climber.certExpiry?climber.certExpiry[c]:undefined);return <span key={c} style={{fontSize:12,color:ex&&ex.expired?C.amber:C.text,background:ex&&ex.expired?C.amberBg:C.surface,border:"1px solid "+(ex&&ex.expired?C.amberBg:C.border),padding:"3px 9px",borderRadius:7}}>{c}{ex?" · "+ex.label:""}</span>;}):<span style={{fontSize:12,color:C.textMuted}}>None listed.</span>}</div>{(climber.skills||[]).length?<><SL>Skills</SL><div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>{(climber.skills||[]).map(sk=><span key={sk} style={{fontSize:12,color:C.text,background:C.surface,border:"1px solid "+C.border,padding:"3px 9px",borderRadius:7}}>{sk}</span>)}</div></>:null}
          
        </div>:null}
        {pt==="vouches"?<div>
          {/* A real climber's vouches arrive in two reads (the vouches, then their authors' names), and until
             both land `climber.vouches` is []. The tab used to render that as "No vouches yet" on every open, for as
             long as the read took, and for good when it failed, then swap the real list in underneath the reader. */}{(_realId&&realVouchesQ.isError)?<div style={{fontSize:13,color:C.amber,lineHeight:1.5,padding:"18px 4px"}}>{"Couldn’t load "+(isSelf?"your":"their")+" vouches — this is not a claim there are none. Check your connection and try again."}</div>:(_realId&&(realVouchesQ.isLoading||vAuthorsQ.isLoading))?<div role="status" style={{textAlign:"center",padding:30,color:C.textMuted,fontSize:12}}>{"Loading vouches…"}</div>:<>
          {climber.vouches.length>0?<div style={{background:C.card,borderRadius:12,padding:13,marginBottom:12,border:`1px solid ${C.border}`}}><div style={{display:"flex",gap:13,alignItems:"stretch"}}><div style={{textAlign:"center",background:C.amberBg,border:`1px solid ${C.amber}`,borderRadius:11,padding:"10px 14px",display:"flex",flexDirection:"column",justifyContent:"center",minWidth:74,flexShrink:0}}>{avgVouch!=null?<><div style={{fontSize:30,fontWeight:800,color:C.amber,lineHeight:1}}>{avgVouch.toFixed(1)}</div><div style={{margin:"5px 0 3px"}}><Stars n={avgVouch}/></div></>:<div style={{fontSize:30,fontWeight:800,color:C.amber,lineHeight:1}}>{climber.vouches.length}</div>}<div style={{fontSize:11.5,color:C.textMuted,fontWeight:600}}>{climber.vouches.length+" vouch"+(climber.vouches.length!==1?"es":"")}</div></div><div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",justifyContent:"center"}}>{_vouchCats.length?_vouchCats.map(([k,avg])=><div key={k} style={{display:"flex",gap:6,alignItems:"center",marginBottom:4}}><span style={{fontSize:12,color:C.textMuted,width:104,flexShrink:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{VOUCH_RATING_LABEL[k]}</span><div style={{flex:1}}><Bar val={avg} max={5} color={C.blue} h={5}/></div><span style={{fontSize:12,color:C.textSub,width:20,textAlign:"right"}}>{avg.toFixed(1)}</span></div>):<div style={{fontSize:12,color:C.textSub,lineHeight:1.45}}>No star ratings yet — these vouches endorse without rating.</div>}</div></div>{_vouchSkills.length?<div style={{marginTop:11,paddingTop:10,borderTop:"1px solid "+C.borderLight}}><div style={{fontSize:11.5,fontWeight:700,color:C.textMuted,letterSpacing:0.4,marginBottom:6}}>SKILLS VOUCHED FOR</div><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{_vouchSkills.map(([k,n])=><span key={k} style={{fontSize:12,fontWeight:600,background:C.blueBg,color:C.onSolid,padding:"3px 9px",borderRadius:20}}>{(SKILLS[k]?SKILLS[k].label:k)+(n>1?" ×"+n:"")}</span>)}</div></div>:null}</div>:null}
          {climber.vouches.map((v,i)=><VouchCard key={i} v={v}/>)}
          {!climber.vouches.length?<EmptyState C={C} icon="shield">No vouches yet</EmptyState>:null}
          </>}
        </div>:null}
        {pt==="speed"?<SpeedProfile climber={climber}/>:null}
                {pt==="objectives"?<div><SL>Objectives</SL>{(_realId&&realObjQ.isError)?<div style={{fontSize:13,color:C.amber,lineHeight:1.5}}>{"Couldn’t load "+(isSelf?"your":"their")+" objectives. Check your connection and try again."}</div>:(_realId&&realObjQ.isLoading)?<LoadingRows C={C} label="Loading objectives…"/>:climber.objectiveIds.length?<div style={{fontSize:12,color:C.textMuted,marginBottom:9,lineHeight:1.5}}>{isSelf?"Other climbers see your objectives here — a climber who saves the same climb is matched with you as a partner for it.":"Tap to plan a crew on any of these — even ones not yet on your list."}</div>:<div style={{fontSize:13,color:C.textMuted}}>No objectives listed yet.</div>}{(_realId&&(realObjQ.isError||realObjQ.isLoading))?null:climber.objectiveIds.map(id=>{const r=_objRoute(id);/* Your own list is not "shared" with yourself: every row read "You both want this!" on your own profile. */const shared=!isSelf&&ME.objectiveIds.includes(id);return r?<div key={id} style={{background:shared?C.blueBg:C.card,borderRadius:10,padding:"10px 12px",marginBottom:7,border:`1px solid ${shared?C.blueDim:C.border}`,display:"flex",alignItems:"center",gap:10}}><div style={{flex:1,minWidth:0}}><div style={{fontWeight:700,fontSize:13.5}}>{r.name}</div><div style={{fontSize:12,color:C.textMuted,marginTop:1}}>{[(r._dbArea&&r._dbArea.name)||(MOUNTAINS.find(m=>m.id===r.mountainId)||{}).name,r.grade].filter(Boolean).join(" · ")}</div>{shared?<div style={{fontSize:12,color:C.blue,marginTop:3}}>You both want this!</div>:null}</div>{onFormCrew?<button onClick={()=>onFormCrew(r)} style={{flexShrink:0,padding:"7px 11px",background:shared?C.blueSolid:C.blueBg,color:shared?C.onSolid:C.blue,border:shared?"none":"1px solid "+C.blueDim,borderRadius:9,fontSize:12.5,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>{shared?"Plan together":"Suggest crew"}</button>:null}</div>:null;})}{_realId?<div style={{marginTop:16}}><SL>Public lists</SL>{pubListsQ.isError?<div style={{fontSize:13,color:C.amber,lineHeight:1.5}}>{"Couldn’t load "+(isSelf?"your":"their")+" lists. Check your connection and try again."}</div>:pubListsQ.isLoading?<LoadingRows C={C} label="Loading lists…"/>:!(pubListsQ.data||[]).length?<div style={{fontSize:13,color:C.textMuted,lineHeight:1.5}}>{isSelf?"You haven’t made a list public. Turn on Show on my profile under a list in Logbook › Objectives.":"No public lists yet."}</div>:(pubListsQ.data||[]).map(function(pl){const n=(pl.routeIds||[]).length;return <button key={pl.id} onClick={function(){setOpenList(pl);}} aria-label={"Open list "+pl.name} style={{display:"block",width:"100%",textAlign:"left",padding:"11px 13px",marginBottom:7,borderRadius:12,border:"1px solid "+C.border,background:C.card,cursor:"pointer"}}><span style={{display:"flex",alignItems:"center",gap:8}}><span style={{flex:1,minWidth:0,fontSize:14,fontWeight:700,color:C.text,overflowWrap:"anywhere"}}>{pl.name}</span><span style={{flexShrink:0,fontSize:12,color:C.textMuted}}>{n+(n===1?" climb ›":" climbs ›")}</span></span>{pl.description?<span style={{display:"block",fontSize:12,color:C.textSub,lineHeight:1.45,marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pl.description}</span>:null}</button>;})}</div>:null}{openList?<SharedListView list={openList} notify={notify} onClose={function(){setOpenList(null);}} onOpenRoute={function(r){setOpenList(null);if(onOpenRoute)onOpenRoute(r);}} routeById={routeById}/>:null}</div>:null}
      </div>
      {(()=>{/* A CATCH can be logged with ANY real climber, not only a friend or crew-mate (owner, 2026-10-23) -- it counts only once they confirm it (0361). A vouch keeps the friends-or-crew gate. */const _close=!isSelf&&(fstate==="friends"||emRel==="crew");const _catch=!!onLogCatch&&!isSelf&&(_close||!!realProfileId(climber.id));const _vouch=!!onVouch&&_close;return (_catch||_vouch)?<div style={{padding:"12px 16px",borderTop:`1px solid ${C.border}`}}>{_catch?<button onClick={()=>onLogCatch&&onLogCatch(climber)} style={{width:"100%",padding:10,background:C.greenBg,color:C.green,border:`1px solid ${C.greenDim}`,borderRadius:10,fontSize:14,cursor:"pointer",fontWeight:700,marginBottom:_vouch?8:0}}>Log a belay catch</button>:null}{_vouch?(vouched?<span style={{display:"block",width:"100%",padding:10,background:C.greenBg,color:C.green,border:`1px solid ${C.greenDim}`,borderRadius:10,fontSize:14,fontWeight:700,textAlign:"center",boxSizing:"border-box"}}>{"✓ You vouched for "+pubFirst(climber)}</span>:<button onClick={()=>onVouch(climber)} style={{width:"100%",padding:10,background:C.blueBg,color:C.blue,border:`1px solid ${C.blueDim}`,borderRadius:10,fontSize:14,cursor:"pointer",fontWeight:700}}>Vouch for {pubFirst(climber)}</button>):null}</div>:null;})()}{!isSelf?<div style={{display:"flex",justifyContent:"center",gap:32,padding:"2px 16px 8px"}}><button onClick={()=>onReport&&onReport(climber)} style={{background:"none",border:"none",color:C.textMuted,fontSize:12,cursor:"pointer",textDecoration:"underline",padding:"8px 10px"}}>Report</button>{onRestrict?<button onClick={()=>{if(restricted){onRestrict(climber,false);return;}askConfirm({title:"Restrict "+pubFirst(climber)+"?",body:"A quieter option than blocking: their messages go to Message requests without a badge, and their friend requests stop pinging you. They aren’t told, and they can still see your profile and message you.",confirmLabel:"Restrict",danger:false}).then(function(ok){if(ok)onRestrict(climber,true);});}} style={{background:"none",border:"none",color:C.textMuted,fontSize:12,cursor:"pointer",textDecoration:"underline",padding:"8px 10px"}}>{restricted?"Unrestrict":"Restrict"}</button>:null}<button onClick={()=>{if(onBlock)askConfirm({title:"Block "+pubFirst(climber)+"?",body:"This also removes them as a friend and clears any friend requests between you.",confirmLabel:"Block"}).then(function(ok){if(ok)onBlock(climber);});}} style={{background:"none",border:"none",color:C.red,fontSize:12,cursor:"pointer",textDecoration:"underline",padding:"8px 10px"}}>Block {pubFirst(climber)}</button></div>:null}
    </div>
  </div>,document.body);
}
