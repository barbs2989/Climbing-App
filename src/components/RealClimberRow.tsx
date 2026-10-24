import { C, CAT, DLOCALE, ME, availOf, compat, compatUnknown, localYmd, pubNameRow, uApproxDist, uRate } from "../../ClimbMatchCore.jsx";
import { clickable } from "../../lib/clickable";
import Av from "./Av.tsx";
import DiscBadge from "./DiscBadge.tsx";
import Pill from "./Pill.tsx";

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
  availability: string[];
  availWeek: string[];
  hikingSpeedFtHr?: number;
  _distMi?: number;
  objectiveIds: string[];
  partnerAreaPaths: Array<string | null | undefined>;
  verified: boolean;
}

export interface RealClimberRowProps {
  p: PartnerRow;
  onOpen?: (climber: RealClimberCand) => void;
  /** Their match objectives from the list's one batched read; UNDEFINED means not read (or failed), and the row refuses to score. */
  objIds?: string[] | null;
  objErr?: boolean;
  /** Only a confirmed TRUE (from the list's verified_user_ids read) sets it. */
  verified?: boolean;
  /** Their listed areas from the list's read; absent, the row builds them from its own `listed_*` columns. */
  listing?: PartnerListing[] | null;
}

/** `CAT` keyed by discipline id, for the listed-areas line's labels. */
const CATS: Record<string, { label?: string }> = CAT;
/** The fields of the signed-in climber this row reads. `ME` is a seed literal that App syncs these onto at runtime, so its inferred type lacks them. */
interface MeView { availability?: string[] | null; matchObjectiveIds?: unknown[] | null; objectiveIds?: unknown[] | null; }
const meView: MeView = ME;

/* One row for a REAL profile, shared by name-search and the browse listing. A real
   profile carries no level, catches or pace, so this renders only what the
   row actually has and says so when there is too little to score a match — reusing the
   seed climber card here is what produced the "undefined · 0" bug fixed in #715. */
export default function RealClimberRow({p,onOpen,objIds,objErr,verified,listing}: RealClimberRowProps){/* THE SCORE IS FED REAL SIGNALS NOW (0209). Until then `_cand` carried one of the four signals
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
  const _cand={id:p.id,name:p.name||"Climber",username:p.username,showName:!!p.show_name,resumePublic:!!p.resume_public,avatar:p.avatar,bio:p.bio,location:p.location,disciplines:Array.isArray(p.disciplines)?p.disciplines:[],sportGrade:p.sport_grade,tradGrade:p.trad_grade,boulderGrade:p.boulder_grade,availability:Array.isArray(p.availability)?p.availability:[],availWeek:Array.isArray(p.avail_week)?p.avail_week:[],hikingSpeedFtHr:Number(p.hiking_speed_ft_hr)||undefined,_distMi:p.dist_mi!=null?p.dist_mi:undefined,objectiveIds:Array.isArray(objIds)?objIds:[],/* Their LISTED AREAS (0300): the list's one partner_areas_of_users read, or the row's own listed_* columns when it came from an area search. Paths feed compat()'s shared-areas term. */partnerAreaPaths:(Array.isArray(listing)?listing.map(function(x){return x&&x.path}):(Array.isArray(p.listed_area_paths)?p.listed_area_paths:[])).filter(Boolean),/* From the list's one verified_user_ids read (0232). Only a confirmed TRUE sets it: unknown must not cost the match % nor read as unverified on the profile this row opens. */verified:verified===true};
  const _nm=pubNameRow(p)||"Climber";const _objReady=Array.isArray(objIds);/* The viewer's side of the score: mountain objectives only (crag objectives are a tick list, not a match signal) plus their listed areas. */const _me=Object.assign({},ME,{objectiveIds:Array.isArray(meView.matchObjectiveIds)?meView.matchObjectiveIds:(meView.objectiveIds||[])});const _unk=compatUnknown(_me,_cand),_pct=compat(_me,_cand);
  const _lst: PartnerListing[] | null=Array.isArray(listing)?listing:(Array.isArray(p.listed_area_names)?p.listed_area_names.map(function(n,i){return {name:n,path:(p.listed_area_paths||[])[i],disciplines:p.listed_disciplines||[],freeFrom:p.free_from||null,freeTo:p.free_to||null,above:!!p.listed_above};}):null);
  const _lstLine=(function(){if(!_lst||!_lst.length)return null;const names=_lst.slice(0,2).map(function(l){return l.name;}).filter(Boolean);const more=_lst.length>2?" +"+(_lst.length-2):"";const discs: string[]=[];_lst.forEach(function(l){(l.disciplines||[]).forEach(function(d){if(discs.indexOf(d)<0)discs.push(d);});});const win=_lst.find(function(l){return l.freeFrom&&l.freeTo;});const fmt=function(d: string){try{return new Date(d+"T12:00:00").toLocaleDateString(DLOCALE,{month:"short",day:"numeric"});}catch{return d;}};return (_lst[0].above?"Listed across ":"Listed at ")+names.join(", ")+more+(discs.length?" · "+discs.map(function(d){return (CATS[d]||{}).label||d;}).join(", "):"")+(win?" · free "+(win.freeFrom===win.freeTo?fmt(win.freeFrom||""):fmt(win.freeFrom||"")+"–"+fmt(win.freeTo||"")):"");})();
  const _overlap=!!(meView.availability&&meView.availability.length&&availOf(_cand).filter(function(x: string){return x!=="flexible"&&(meView.availability||[]).indexOf(x)>=0;}).length);
  return <div key={p.id} {...(onOpen?clickable(function(){onOpen(_cand);}):{})} style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"10px 12px",marginBottom:8,display:"flex",alignItems:"center",gap:10,cursor:onOpen?"pointer":"default"}}><Av src={p.avatar} size={38}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{_nm}</div>{typeof p.free_until==="string"&&p.free_until>=localYmd()?<div style={{fontSize:11,fontWeight:800,color:C.green,marginTop:1}}>{"● Free this weekend"}</div>:null}{_lstLine?<div style={{fontSize:11,color:C.blue,fontWeight:700,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{_lstLine}</div>:null}<div style={{fontSize:11.5,color:C.textMuted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{[(p.username&&_nm!=="@"+p.username)?"@"+p.username:null,/* A distance from partners_near (0189) REPLACES the typed city: the radius and the number shown come from one record, which is what Mountain Project gets wrong (it searches a zip and shows a self-typed city). The server rounds it up to a multiple of 5 miles. */p.dist_mi!=null?(p.dist_mi<=5?"under "+uApproxDist(5)+" away":"~"+uApproxDist(p.dist_mi)+" away"):(p.location||null)].filter(Boolean).join(" · ")||"On ClimbMatch"}</div>{!_objReady?<div style={{fontSize:11,color:objErr?C.amber:C.textMuted,marginTop:2}}>{objErr?"Couldn’t load their objectives to score a match":"Scoring match…"}</div>:_unk>=3?<div style={{fontSize:11,color:C.textMuted,marginTop:2}}>Not enough shared info to score a match</div>:<div style={{fontSize:11,color:C.textSub,marginTop:2}}>{_pct+"% match"+(_unk?" · based on limited info":"")}</div>}{(_overlap||verified===true)?<div style={{marginTop:4,display:"flex",gap:5,flexWrap:"wrap"}}>{verified===true?<span style={{fontSize:11,fontWeight:700,color:C.green,background:C.greenBg,border:"1px solid "+C.greenDim,borderRadius:7,padding:"1px 7px"}}>✓ Verified</span>:null}{_overlap?<span style={{fontSize:11,fontWeight:700,color:C.blue,background:C.blueBg,border:"1px solid "+C.blueDim,borderRadius:7,padding:"1px 7px"}}>✓ Overlaps yours</span>:null}</div>:null}{(_cand.hikingSpeedFtHr||_cand.disciplines.length||_cand.sportGrade||_cand.tradGrade||_cand.boulderGrade)?<div style={{display:"flex",gap:5,flexWrap:"wrap",alignItems:"center",marginTop:5}}>{/* The seed card's pace and discipline chips, from this climber's OWN columns, so a real row is no sparser than a sample one. */(function(){const pairs: [string, string | null | undefined][]=[["sport",_cand.sportGrade],["trad",_cand.tradGrade],["bouldering",_cand.boulderGrade]];const gs=pairs.filter(function(g): g is [string, string]{return !!g[1]&&g[1]!=="N/A"&&g[1]!=="-";});const gk=gs.map(function(g){return g[0];});const rest=_cand.disciplines.filter(function(d){return gk.indexOf(d)<0;});const ex=rest.slice(0,Math.max(0,3-gs.length));const more=rest.length-ex.length;return gs.map(function(g){return <DiscBadge key={g[0]} id={g[0]} grade={g[1]} sm/>;}).concat(ex.map(function(d){return <DiscBadge key={d} id={d} sm/>;})).concat(more>0?[<span key="more" role="img" aria-label={more+" more disciplines"} title={more+" more disciplines"} style={{display:"inline-flex"}}><Pill sm label={"+"+more} color={C.textSub} bg={C.surface}/></span>]:[]);})()}{_cand.hikingSpeedFtHr?<span style={{fontSize:11.5,color:C.textSub,whiteSpace:"nowrap"}}>{" "+uRate(_cand.hikingSpeedFtHr)+" pace"}</span>:null}</div>:null}</div></div>;
}
