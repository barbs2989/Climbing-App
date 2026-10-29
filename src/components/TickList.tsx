import { useState } from "react";
import { C, CAT, ME, MOUNTAINS, ROUTES, catOf, seedHistoryFor, shortDate } from "../../ClimbMatchCore.jsx";
import { clickable } from "../../lib/clickable";
import DiscIcon from "./DiscIcon.tsx";
import Pill from "./Pill.tsx";
import Stars from "./Stars.tsx";
import Chevron from "./Chevron.tsx";
import EmptyState from "./EmptyState.tsx";

/** A route as a tick row needs it: the seed `ROUTES` shape or a `dbRouteToCamel` row (`_dbArea` stands in for the seed area). */
export interface TickRoute {
  id: string | number;
  name: string;
  grade?: string | null;
  mountainId?: string | number | null;
  _dbArea?: { name?: string | null } | null;
}
/** One logged climb as `climb_logs` hydrates it (`logs` prop); another climber's rows carry their own `user`. */
export interface LogRow {
  routeId: string | number;
  date?: string | null;
  tickType?: string | null;
  stars?: number | null;
  user?: string | null;
  avatar?: string | null;
  _dbId?: string | null;
  _authorId?: string | null;
  condTags?: string[] | null;
  text?: string | null;
  notes?: string | null;
  partners?: string[] | null;
  cond?: unknown;
  photos?: unknown;
  photoAlts?: unknown;
  gpxName?: string | null;
}
/** A row of the list: the route, its area, and what the climber logged; `onOpen` receives it whole. */
export interface Tick {
  route: TickRoute;
  mtn: { name?: string | null };
  date?: string | null;
  tickType?: string | null;
  stars?: number | null;
  user?: string | null;
  avatar?: string | null;
  _dbId?: string | null;
  _authorId?: string | null;
  condTags?: string[] | null;
  text?: string | null;
  partners?: string[] | null;
  cond?: unknown;
  photos?: unknown;
  photoAlts?: unknown;
  gpxName?: string | null;
}
export interface TickListProps {
  /** Whose list: `seedHistoryFor` adds the seed history ONLY for a seed identity (check:seed-history). */
  climber: { name?: string | null } | null | undefined;
  logs?: ReadonlyArray<LogRow> | null;
  onOpen?: (t: Tick) => void;
  /** Rows shown before "Show all"; 6 when unset. */
  initial?: number;
  /** Resolves a logged route id on the DB path; the seed `ROUTES` otherwise. */
  routeById?: (id: string | number) => TickRoute | null | undefined;
}

/** LOGGED CLIMBS on a profile: the climber's logs (plus seed history for a seed identity), sortable, filterable by discipline, six at a time. */
export default function TickList({climber,logs,onOpen,initial,routeById}: TickListProps){
  /* `CAT` keyed by discipline, for the filter chips' labels. Read HERE, at render time, never at module scope: core
     imports this component back (FullProfile renders it), so a module-scope read runs before core has evaluated. */
  const cats: Record<string, { label?: string }> = CAT;
  const [sort,setSort]=useState("new");const [disc,setDisc]=useState("all");const [showAll,setShowAll]=useState(false);
  const base: Tick[]=seedHistoryFor(climber);
  const extra=(logs||[]).map((l): Tick | null=>{const r: TickRoute | null | undefined=(routeById?routeById(l.routeId):ROUTES.find(x=>x.id===l.routeId));return r?{route:r,mtn:MOUNTAINS.find(m=>m.id===r.mountainId)||r._dbArea||{},date:l.date,tickType:l.tickType,stars:l.stars,/* Another real climber's logs carry their own author and must not be filed under ME; partners stay ABSENT when the row never said (not "solo"). */user:l.user||ME.name,avatar:l.user?l.avatar:ME.avatar,_dbId:l._dbId,_authorId:l._authorId,condTags:l.condTags||[],text:l.text||l.notes||"",partners:l.user?l.partners:(l.partners||[]),cond:l.cond,photos:l.photos,photoAlts:l.photoAlts,gpxName:l.gpxName}:null;}).filter((t): t is Tick => !!t);
  const allRaw=[...extra,...base];
  if(!allRaw.length)return <EmptyState C={C} icon="log">No logged climbs yet — log an ascent from any climb's page and it shows up here.</EmptyState>;
  const all=allRaw.map(t=>({t,d:catOf(t.route)}));const discs=Array.from(new Set(all.map(x=>x.d)));
  let view=all.filter(x=>disc==="all"||x.d===disc);
  view=view.slice().sort((a,b)=>sort==="old"?(a.t.date||"").localeCompare(b.t.date||""):sort==="stars"?(((b.t.stars||0)-(a.t.stars||0))||(b.t.date||"").localeCompare(a.t.date||"")):(b.t.date||"").localeCompare(a.t.date||""));
  const N=initial||6;const shown=showAll?view:view.slice(0,N);
  return <div>
    {allRaw.length>3?<div style={{marginBottom:9}}><select aria-label="Sort guides" value={sort} onChange={e=>setSort(e.target.value)} style={{width:"100%",padding:"7px 10px",borderRadius:9,border:`1px solid ${C.border}`,background:C.surface,color:C.text,fontSize:12.5,cursor:"pointer",marginBottom:discs.length>1?7:0}}>{[["new","Newest first"],["old","Oldest first"],["stars","Top rated"]].map(o=><option key={o[0]} value={o[0]}>{o[1]}</option>)}</select>{discs.length>1?<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{[["all","All"]].concat(discs.map(dc=>[dc,(cats[dc]||{}).label||dc])).map(x=><button key={x[0]} onClick={()=>setDisc(x[0])} aria-current={disc===x[0]?"true":undefined} style={{padding:"7px 12px",borderRadius:20,border:`1px solid ${disc===x[0]?C.blue:C.border}`,background:disc===x[0]?C.blueBg:"transparent",color:disc===x[0]?"#fff":C.textSub,fontSize:11.5,fontWeight:600,cursor:"pointer"}}><span style={{display:"inline-flex",alignItems:"center",gap:5}}>{x[0]!=="all"?<DiscIcon d={x[0]} size={13}/>:null}{x[1]}</span></button>)}</div>:null}</div>:null}
    <div className="cm-stagger">{shown.map(({t},i)=><div key={i} {...clickable(()=>onOpen&&onOpen(t))} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:i<shown.length-1?`1px solid ${C.borderLight}`:"none",cursor:onOpen?"pointer":"default"}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600}}>{t.route.name}</div><div style={{fontSize:12,color:C.textMuted}}>{t.mtn.name} · {t.route.grade} · {shortDate(t.date)}</div></div><div style={{textAlign:"right",flexShrink:0}}><Pill label={t.tickType} color={C.blue} bg={C.blueBg} sm/><div style={{marginTop:3}}><Stars n={t.stars||0} size={11}/></div></div>{onOpen?<span aria-hidden="true" style={{display:"flex",flexShrink:0}}><Chevron size={16} color={C.textMuted}/></span>:null}</div>)}</div>
    {view.length>N?<button onClick={()=>setShowAll(a=>!a)} style={{marginTop:9,width:"100%",padding:"8px",background:"transparent",color:C.blue,border:`1px solid ${C.border}`,borderRadius:9,fontSize:12,fontWeight:700,cursor:"pointer"}}>{showAll?"Show fewer":"Show all "+view.length+" →"}</button>:null}
  </div>;
}
