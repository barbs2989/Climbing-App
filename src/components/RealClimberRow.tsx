import { useReliabilityOf } from "../../lib/db.js";
import { C, DB_UID, DLOCALE, ME, availOf, profileDiscGrades, compat, compatSummary, compatUnknown, localYmd, pubNameRow, uApproxDist, uRate, availSlotLabels } from "../../ClimbMatchCore.jsx";
import { clickable } from "../../lib/clickable";
import { tx } from "../../lib/tapWords.js";
import type { ReactNode } from "react";
import Av from "./Av.tsx";
import ActionIcon from "./ActionIcon.tsx";
import DiscBadge from "./DiscBadge.tsx";

/** A `profiles` row as PARTNER_COLS returns it (snake_case), plus the `listed_*`/`dist_mi`/`free_until` columns a near or area search adds. */
export interface PartnerRow {
  id: string;
  name?: string | null;
  username?: string | null;
  show_name?: boolean | null;
  resume_public?: boolean | null;
  avatar?: string | null;
  bio?: string | null;
  location?: string | null;
  disciplines?: string[] | null;
  sport_grade?: string | null;
  trad_grade?: string | null;
  boulder_grade?: string | null;
  /** 0237: ice, mixed and aid grades (and every lead/follow role), keyed sport|trad|boulder|ice|mixed|aid. */
  climb_grades?: Record<string, { grade?: string; role?: string }> | null;
  /** 0359, 0475: one of GENDERS; null = prefer not to say. */
  gender?: string | null;
  /** 0475: pronoun slugs, up to four; null = not stated. */
  pronouns?: string[] | null;
  availability?: string[] | null;
  avail_week?: string[] | null;
  hiking_speed_ft_hr?: number | string | null;
  dist_mi?: number | null;
  listed_area_paths?: string[] | null;
  listed_area_names?: string[] | null;
  listed_disciplines?: string[] | null;
  free_from?: string | null;
  free_to?: string | null;
  listed_above?: boolean | null;
  /** 0489 (partners_by_objective): they listed themselves for one of the routes searched, their note, and whether they also SAVED one. */
  listed?: boolean | null;
  listing_note?: string | null;
  saved?: boolean | null;
  free_until?: string | null;
}
/** One listed area (0300), from the list's `partner_areas_of_users` read or built from the row's own `listed_*` columns. */
export interface PartnerListing {
  name?: string | null;
  path?: string | null;
  disciplines?: string[] | null;
  freeFrom?: string | null;
  freeTo?: string | null;
  above?: boolean | null;
}
/** The row's projection of a real profile into the shape `compat()` scores and `FullProfile` opens. */
export interface RealClimberCand {
  id: string;
  name: string;
  username?: string | null;
  showName: boolean;
  resumePublic: boolean;
  avatar?: string | null;
  bio?: string | null;
  location?: string | null;
  disciplines: string[];
  sportGrade?: string | null;
  tradGrade?: string | null;
  boulderGrade?: string | null;
  climbGrades?: Record<string, { grade?: string; role?: string; follow?: string }>;
  gender?: string;
  pronouns?: string[];
  availability: string[];
  availWeek: string[];
  hikingSpeedFtHr?: number;
  _distMi?: number;
  objectiveIds: string[];
  partnerAreaPaths: Array<string | null | undefined>;
  verified: boolean;
  reliability?: ReliabilityRecord;
}

/** RELIABILITY (0519): what crewmates reported after crew trips, as counts, and the vouch Reliability stars. */
export interface ReliabilityRecord {
  trips: number; onTime: number; late: number; cancelledEarly: number; cancelledLate: number; noShow: number;
  relN: number; relAvg: number | null;
}

export interface RealClimberRowProps {
  p: PartnerRow;
  /** What `p.dist_mi` was measured FROM when it is not the viewer ("the climb"): the line then reads "~40 mi from the climb", not "away". */
  distFrom?: string | null;
  onOpen?: (climber: RealClimberCand) => void;
  /** Their match objectives from the list's one batched read; UNDEFINED means not read (or failed), and the row refuses to score. */
  objIds?: string[] | null;
  objErr?: boolean;
  /** Only a confirmed TRUE (from the list's verified_user_ids read) sets it. */
  verified?: boolean;
  /** Their reliability record from the list's one batched read (useReliabilityOf); absent = none yet or not read, which scores as the neutral half. */
  reliability?: ReliabilityRecord | null;
  /** True while the list's reliability read is in flight: the % waits for it. */
  relLoading?: boolean;
  /** Their listed areas from the list's read; absent, the row builds them from its own `listed_*` columns. */
  listing?: PartnerListing[] | null;
  /** A button shown inside the card, under the facts (Plan a session at an area). */
  action?: ReactNode;
  /** + Add friend: the friend state of this climber (friends | out | in | none) and the tap that asks / accepts / withdraws. */
  friendState?: (id: string) => string;
  onConnect?: (c: Record<string, unknown>) => void;
  /** THE ONE PARTNER CARD (owner 2026-11-18): an example climber passes its own camelCase object, which then scores, opens and connects in place of the one built from `p`. */
  cand?: Record<string, unknown> | null;
  online?: boolean;
  /** "Expert · 18yr": level and years climbing (partner_signals for a real climber). */
  level?: string | null;
  years?: number | null;
  /** Public climbs and vouches (partner_counts, 0460). Undefined leaves the chip out -- unknown is not 0. */
  climbs?: number | null;
  vouches?: number | null;
  climbsPrivate?: boolean;
  onClimbs?: ((c: RealClimberCand) => void) | null;
  onVouches?: ((c: RealClimberCand) => void) | null;
  /** Shared objectives, Invite to your crew, mutual friends -- drawn by the list, under the bio. */
  extras?: ReactNode;
  /** The blue line under the name when they list no areas ("Wants this climb"); none by default -- "Suggested match" on every card said nothing (audit 2026-11-18). */
  tag?: string | null;
}

/** `CAT` keyed by discipline id, for the listed-areas line's labels. */
/** The fields of the signed-in climber this row reads. `ME` is a seed literal that App syncs these onto at runtime, so its inferred type lacks them. */
interface MeView { availability?: string[] | null; matchObjectiveIds?: unknown[] | null; objectiveIds?: unknown[] | null; }
const meView: MeView = ME;

/* One row for a REAL profile, shared by name-search and the browse listing. A real
   profile carries no level, catches or pace, so this renders only what the
   row actually has and says so when there is too little to score a match — reusing the
   seed climber card here is what produced the "undefined · 0" bug fixed in #715. */
export default function RealClimberRow({p,distFrom,onOpen,objIds,objErr,verified,reliability,relLoading,listing,action,friendState,onConnect,cand,online,level,years,climbs,vouches,climbsPrivate,onClimbs,onVouches,extras,tag}: RealClimberRowProps){/* MY reliability, for my side of the match (0519): one query key for every row, so the list reads it once. */const _myRelQ=useReliabilityOf(DB_UID?[DB_UID]:[]);/* THE SCORE IS FED REAL SIGNALS NOW (0209). Until then `_cand` carried one of the four signals
     compatUnknown counts -- it hardcoded `objectiveIds:[]`, and `profiles` had no availability or
     pace column -- so `_unk` was >= 3 for every real climber and the score never rendered. The row
     now gets availability, the week grid and pace from its own columns, and objectives from ONE
     batched read in the list (`objIds`). Do NOT move the `_unk>=3` threshold: an absent objectives
     list scores ZERO rather than a neutral partial (#612), so a climber who shares little must
     still read as "not enough shared info", never as a low match. And `objIds` UNDEFINED means the
     read has not landed or failed -- scoring then would count their objectives as none. */
  /* PARTNER_COLS fetches `username`, `show_name` and `resume_public`; this mapping dropped all
     three, and the third is the dangerous one. FullProfile gates its resume button on
     `climber.resumePublic !== false`, so an ABSENT field reads as PUBLIC — a climber who made
     their resume private had it offered from partner browse. `!!` rather than `!== false`
     because this is SOMEBODY ELSE's row: an omitted column must hide a button, never expose a
     resume. `!== false` is only correct for your own read-back. */
  const _cand={id:p.id,name:p.name||"Climber",username:p.username,showName:!!p.show_name,resumePublic:!!p.resume_public,avatar:p.avatar,bio:p.bio,location:p.location,disciplines:Array.isArray(p.disciplines)?p.disciplines:[],sportGrade:p.sport_grade,tradGrade:p.trad_grade,boulderGrade:p.boulder_grade,climbGrades:(p.climb_grades&&typeof p.climb_grades==="object")?p.climb_grades:undefined,/* 0359 */gender:p.gender||undefined,/* 0475 */pronouns:Array.isArray(p.pronouns)&&p.pronouns.length?p.pronouns:undefined,availability:Array.isArray(p.availability)?p.availability:[],availWeek:Array.isArray(p.avail_week)?p.avail_week:[],hikingSpeedFtHr:Number(p.hiking_speed_ft_hr)||undefined,_distMi:p.dist_mi!=null?p.dist_mi:undefined,objectiveIds:Array.isArray(objIds)?objIds:[],/* Their LISTED AREAS (0300): the list's one partner_areas_of_users read, or the row's own listed_* columns when it came from an area search. Paths feed compat()'s shared-areas term. */partnerAreaPaths:(Array.isArray(listing)?listing.map(function(x){return x&&x.path}):(Array.isArray(p.listed_area_paths)?p.listed_area_paths:[])).filter(Boolean),/* From the list's one verified_user_ids read (0232). Only a confirmed TRUE sets it: unknown must not cost the match % nor read as unverified on the profile this row opens. */verified:verified===true,/* 0519: both sides' reliability counts; theirs from the list's batched read. */reliability:reliability||undefined};
  const _c=(cand||_cand) as typeof _cand;
  const _nm=pubNameRow(p)||"Climber";/* Held until their objectives AND both climbers' reliability have landed (review 2026-11-24): scoring with the neutral prior first and the real record a moment later moved the % under the reader, and disagreed with the profile, which waits. */const _objReady=Array.isArray(objIds)&&!relLoading&&!_myRelQ.isLoading;/* The viewer's side of the score: mountain objectives only (crag objectives are a tick list, not a match signal) plus their listed areas. */const _me=Object.assign({},ME,{objectiveIds:Array.isArray(meView.matchObjectiveIds)?meView.matchObjectiveIds:(meView.objectiveIds||[])},DB_UID&&_myRelQ.data?{reliability:_myRelQ.data[DB_UID]}:{});const _unk=compatUnknown(_me,_c),_pct=compat(_me,_c);
  const _lst: PartnerListing[] | null=Array.isArray(listing)?listing:(Array.isArray(p.listed_area_names)?p.listed_area_names.map(function(n,i){return {name:n,path:(p.listed_area_paths||[])[i],disciplines:p.listed_disciplines||[],freeFrom:p.free_from||null,freeTo:p.free_to||null,above:!!p.listed_above};}):null);
  const _lstLine=(function(){if(!_lst||!_lst.length)return null;const names=_lst.slice(0,2).map(function(l){return l.name;}).filter(Boolean);const more=_lst.length>2?" +"+(_lst.length-2):"";const discs: string[]=[];_lst.forEach(function(l){(l.disciplines||[]).forEach(function(d){if(discs.indexOf(d)<0)discs.push(d);});});const win=_lst.find(function(l){return l.freeFrom&&l.freeTo;});const fmt=function(d: string){try{return new Date(d+"T12:00:00").toLocaleDateString(DLOCALE,{month:"short",day:"numeric"});}catch{return d;}};return (_lst[0].above?"Listed across ":"Listed at ")+names.join(", ")+more+(win?" · free "+(win.freeFrom===win.freeTo?fmt(win.freeFrom||""):fmt(win.freeFrom||"")+"–"+fmt(win.freeTo||"")):"");})();
  /* THE MATCH IN WORDS (2026-11-23): one sentence of what the two of you share, from the rows the % is summed from. Their listed-area names let it name the shared area. Held until their objectives have landed, like the %, so it does not change under the reader. */
  const _sumNames: Record<string, string>={};(_lst||[]).forEach(function(l){if(l.path&&l.name)_sumNames[l.path]=l.name;});const _sum: string | null=_objReady?compatSummary(_me,_c,_sumNames):null;
  /* Both sides through availOf(), which reads the week grid when there is one, as the card's "Usually free" line and the match % do. */const _myAv=availOf(meView) as string[];const _overlap=!!(_myAv.length&&(availOf(_c) as string[]).filter(function(x: string){return x!=="flexible"&&_myAv.indexOf(x)>=0;}).length);
  /* REAL CLIMBERS WEAR THE EXAMPLE CLIMBER CARD (owner 2026-11-18: "i want the example climber card to be on the app"). Same box, same layout as PartnerSearch's example cards: a 52px photo, the name with its tick, a match box on the right, where/distance/pace, the discipline chips, when they are free, their bio, then the actions -- Plan a session (action), + Add friend and Full profile & vouches. The whole card is NOT one button any more: the name and photo open the profile, so buttons never nest in a button. */
  const _free=typeof p.free_until==="string"&&p.free_until>=localYmd();
  const _where=[p.dist_mi!=null?(p.dist_mi<=5?"under "+uApproxDist(5):"~"+uApproxDist(p.dist_mi))+(distFrom?" from "+distFrom:" away"):null,_c.hikingSpeedFtHr?uRate(_c.hikingSpeedFtHr)+" pace":null].filter(Boolean) as string[];
  const _sc=_pct,_band=_sc>=90?{bg:C.greenBg,bd:C.greenDim,fg:C.green}:_sc>=70?{bg:C.blueBg,bd:C.blueDim,fg:"#fff"}:_sc>=50?{bg:C.amberBg,bd:C.border,fg:C.amber}:{bg:C.redBg,bd:C.border,fg:C.red};
  const _open=onOpen?function(){onOpen(_c);}:null;
  const _gs=profileDiscGrades(_c) as [string, string][];const _gk=_gs.map(function(g){return g[0];});const _rest=(_c.disciplines||[]).filter(function(d){return _gk.indexOf(d)<0;});
  const _av=availSlotLabels(_c) as string[];
  const fst=friendState?friendState(p.id):null;const _fs=fst==="friends"?{bg:C.greenBg,fg:C.green,bd:C.greenDim}:fst==="out"?{bg:C.amberBg,fg:C.amber,bd:C.amber}:fst==="in"?{bg:C.green,fg:C.onBright,bd:C.green}:{bg:C.actionSolid,fg:C.onSolid,bd:C.actionSolid};
  return <div key={p.id} data-real-climber-card="" style={{background:C.card,borderRadius:16,padding:"16px 16px",marginBottom:24,border:"1px solid "+C.borderHi,boxShadow:"0 1px 3px rgba(0,0,0,0.28)"}}>
    <div style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:12}}>
      <span {...(_open?clickable(_open):{})} /* The photo opens the profile by mouse; the NAME beside it is the one keyboard / screen-reader stop, so the same profile is not announced twice per card (audit 2026-11-18). */ tabIndex={-1} aria-hidden="true" style={{cursor:_open?"pointer":"default",flexShrink:0}}><Av src={p.avatar} size={52} online={online}/></span>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:2}}><span {...(_open?clickable(_open):{})} style={{display:"inline-flex",alignItems:"center",minHeight:24,fontWeight:700,fontSize:15,cursor:_open?"pointer":"default",overflowWrap:"anywhere"}}>{_nm}</span>{verified===true?<span title="Verified climber" style={{color:C.green,fontSize:12,fontWeight:700}}>✓</span>:null}</div>
        {/* @handle (when the name shows instead), level and years on ONE line, as the example card read "Expert · 18yr". */(function(){const sub=[(p.username&&_nm!=="@"+p.username)?"@"+p.username:null,level||null,years?years+"yr":null].filter(Boolean);return sub.length?<div style={{fontSize:12,color:C.text,marginBottom:4,overflowWrap:"anywhere"}}>{sub.join(" · ")}</div>:null;})()}
        {_free?<div style={{fontSize:11.5,fontWeight:800,color:C.green,marginBottom:3}}>{"● Free this weekend"}</div>:null}
        {_lstLine?<div style={{fontSize:11.5,color:C.blue,fontWeight:700,overflowWrap:"anywhere"}}>{_lstLine}</div>:(tag?<span style={{fontSize:11.5,fontWeight:700,color:C.blue}}>{tag}</span>:null)}
      </div>
      {!_objReady?<div style={{flexShrink:0,maxWidth:96,textAlign:"center",fontSize:11,color:objErr?C.amber:C.textSub,lineHeight:1.35}}>{objErr?"Couldn’t load their objectives to score a match":"Scoring match…"}</div>:_unk>=3?<div style={{flexShrink:0,maxWidth:96,textAlign:"center",fontSize:11,color:C.textSub,lineHeight:1.35}}>Not enough shared info to score a match</div>:<div title={"Match % blends where you climb (shared objectives or listed areas), grade range, disciplines, availability overlap, reliability and whether each of you is verified"+(_unk?" · based on limited info":"")} style={{flexShrink:0,textAlign:"center",background:_band.bg,borderRadius:13,padding:"7px 10px",border:"1px solid "+_band.bd,minWidth:52}}><div style={{fontSize:18,fontWeight:800,color:_band.fg,lineHeight:1}}>{_sc}%</div><div style={{fontSize:10.5,color:_band.fg,marginTop:3,textTransform:"uppercase",letterSpacing:0.6}}>match</div></div>}
    </div>
    {_sum?<div data-match-summary="" style={{fontSize:12.5,color:C.text,lineHeight:1.45,marginBottom:7,overflowWrap:"anywhere"}}>{_sum}</div>:null}
    {/* One line, facts split by " · " (polish 2026-11-18: two facts side by side read as one). */(p.location||_where.length)?<div style={{fontSize:12,color:C.text,marginBottom:6,overflowWrap:"anywhere"}}>{[p.location||null].concat(_where).filter(Boolean).join(" · ")}</div>:null}
    {(_gs.length||_rest.length)?<div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:6}}>{_gs.map(function(g){return <DiscBadge key={g[0]} id={g[0]} grade={g[1]} sm/>;})}{_rest.map(function(d){return <DiscBadge key={d} id={d} sm/>;})}</div>:null}
    {(_overlap||_av.length)?<div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap",marginBottom:7}}>{_overlap?<span style={{fontSize:12,fontWeight:700,color:C.onSolid,background:C.blueBg,border:"1px solid "+C.blueDim,borderRadius:7,padding:"2px 8px"}}>✓ Overlaps yours</span>:null}{_av.length?<span style={{fontSize:11.5,color:C.text}}>{"Usually free: "+_av.join(" · ")}</span>:null}</div>:null}
    {p.bio?<p style={{fontSize:13,color:C.text,lineHeight:1.55,margin:"0 0 14px",overflowWrap:"anywhere"}}>{p.bio}</p>:null}
    {extras||null}
    {(climbs!=null||vouches!=null)?<div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:6,marginBottom:10}}>{([["mountain",climbs,"climbs","climb",climbsPrivate?null:(onClimbs||null)],["award",vouches,"vouches","vouch",onVouches||null]] as [string, number | null | undefined, string, string, ((c: typeof _cand) => void) | null][]).map(function(st){if(st[1]==null)return <span key={st[2]}/>;const act=st[4];/* A PRIVATE résumé's chip is TEXT, not a dead button (it read as the résumé failing to open). */const priv=st[2]==="climbs"&&!!climbsPrivate;return <span key={st[2]} {...(act?clickable(function(){act(_c);}):{})} style={{display:"flex",flexWrap:"wrap",justifyContent:"center",alignItems:"center",gap:"0 4px",boxSizing:"border-box",minHeight:30,fontSize:11.5,color:act?C.onSolid:C.text,background:act?C.blueBg:C.surface,borderRadius:8,padding:"4px 6px",border:"1px solid "+(act?C.blueDim:C.border),cursor:act?"pointer":"default",textAlign:"center",whiteSpace:"nowrap"}}><ActionIcon name={st[0]} size={11} color={act?C.blue:C.text}/>{st[1]+" "+(st[1]===1?st[3]:st[2])}{priv?<>{" "}<span style={{width:"100%",fontSize:10,color:C.textSub}}>résumé private</span></>:null}</span>;})}</div>:null}
    {action?<div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:7}}>{action}</div>:null}
    <div style={{display:"flex",gap:7}}>{onConnect?<button type="button" onClick={function(){onConnect(_c);}} disabled={fst==="friends"} aria-pressed={fst==="out"} title={fst==="out"?tx("Tap to withdraw your friend request"):undefined} style={{flex:1,padding:8,minHeight:40,background:_fs.bg,color:_fs.fg,border:"1px solid "+_fs.bd,borderRadius:9,fontSize:13,cursor:fst==="friends"?"default":"pointer",fontWeight:700}}>{fst==="friends"?"✓ Friends":fst==="out"?tx("Requested · tap to undo"):fst==="in"?"✓ Accept friend":"+ Add friend"}</button>:null}{_open?<button type="button" onClick={_open} style={{flex:1,padding:8,minHeight:40,background:C.surface,color:C.text,border:"1px solid "+C.borderHi,borderRadius:9,fontSize:13,fontWeight:700,cursor:"pointer"}}>Full profile & vouches</button>:null}</div>
  </div>;
}
