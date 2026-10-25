import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { C, CAT, ME, MOUNTAINS, MeH, catOf, pitchesClimbed, uElev, useBadges, useCuratedLists } from "../../ClimbMatchCore.jsx";
import { POP_CLOSE } from "../../lib/popupChrome.js";
import { clickable } from "../../lib/clickable";
import ActionIcon from "./ActionIcon.tsx";
import BadgeGrid, { type Badge } from "./BadgeGrid.tsx";
import Chevron from "./Chevron.tsx";
import CountUp from "./CountUp.tsx";
import DiscIcon from "./DiscIcon.tsx";
import type { CuratedList } from "./TrackedLists.tsx";

/** A climb log as the Logbook holds them (yours), or as a profile sheet hands another climber's; a route's own `activity` rows share the shape, with `user`. */
export interface ChallengeLog {
  routeId?: string | null;
  user?: string | null;
  date?: string | null;
  tickType?: string | null;
  text?: string | null;
  condTags?: ReadonlyArray<string> | null;
  avatar?: string | null;
  stars?: number | null;
  partners?: unknown;
  cond?: unknown;
  photos?: unknown;
  photoAlts?: unknown;
  gpxName?: string | null;
  [k: string]: unknown;
}
/** A route in a list's roster — or a PEAK posing as one (`_peak`, with `ft`), or a roster entry the catalog lacks (`_noOpen`). */
export interface ListRoute {
  id: string;
  name: string;
  grade?: string | null;
  mountainId?: string | null;
  driveMinSLC?: number | null;
  activity?: ReadonlyArray<ChallengeLog> | null;
  _peak?: boolean;
  _noOpen?: boolean;
  /** The list's own numbering ("12. Mount Rose"). */
  _n?: number | string | null;
  _sub?: string | null;
  ft?: number | null;
  [k: string]: unknown;
}
/** What the Report button hands `onOpenReport`: the row's log, with the route and its mountain attached. */
export interface ChallengeAscent {
  route: ListRoute;
  mtn: unknown;
  user?: string | null;
  avatar?: string | null;
  date?: string | null;
  tickType?: string | null;
  stars?: number | null;
  condTags?: ReadonlyArray<string> | null;
  text?: string | null;
  partners?: unknown;
  cond?: unknown;
  photos?: unknown;
  photoAlts?: unknown;
  gpxName?: string | null;
}
/** A curated list with a roster of routes (or peaks). */
export interface RosterList extends CuratedList {
  scope: string;
  quiver?: false | null;
  routes: ListRoute[];
  /** A peak list supplies its own test; a route list counts `got(id)`. */
  doneBy?: ((r: ListRoute) => boolean) | null;
  /** The list's advertised total where the catalog holds fewer. */
  total?: number | null;
  blurb?: string | null;
}
/** The one list with no roster: send a route in every discipline. */
export interface QuiverList extends CuratedList {
  scope: string;
  quiver: true;
  routes?: undefined;
  doneBy?: undefined;
  total?: number | null;
  blurb?: string | null;
}
export type ChallengeList = RosterList | QuiverList;
/** The slice of `useCuratedLists`' result this component reads. */
interface ChallengeLists { lists: ChallengeList[]; got: (id: string) => boolean; discsSent: string[]; allDiscs: string[] }
/** `useBadges` marks a list's finisher badge, and whether that list is started. */
export interface ChallengeBadge extends Badge { list?: boolean; started?: boolean }
/** One row of YOUR CHALLENGES: progress toward a target. */
interface ChallengeRow { icon: string; label: string; cur: number; tgt: number; col: string }
/** The stamp App sets when the Menu's "Climbing lists" tile asks the lists to open (a time), or a Home list row does (the time and the list's `key`). */
export type ListsAtStamp = number | { at: number; key?: string | null };
export interface ChallengesProps {
  hideBadges?: boolean;
  /** false: the caller drew the "Challenges" heading itself (the Logbook). */
  titled?: boolean;
  catchTotal?: number | null;
  logs: ReadonlyArray<ChallengeLog>;
  /** "Conditions only" reports, which App keeps apart from logs. */
  condReports?: ReadonlyArray<{ routeId?: string | null }> | null;
  onOpen?: (r: ListRoute) => void;
  /** Whose: the Logbook passes ME.name; a profile sheet passes the climber's public name. */
  who?: string | null;
  /** A profile sheet says outright whether these are yours. */
  self?: boolean | null;
  onOpenReport?: (asc: ChallengeAscent) => void;
  givenVouches?: ReadonlyArray<unknown> | null;
  catches?: ReadonlyArray<{ dir?: string | null }> | null;
  routeById?: ((id: string) => ListRoute | undefined) | null;
  /** A peak objective is an AREA id: the caller jumps to the area browser. */
  onOpenArea?: (areaId: string, name?: string | null) => void;
  listsAt?: ListsAtStamp | null;
  /** The list keys Home follows; the switch is drawn only with `onToggleTrack`. */
  tracked?: ReadonlyArray<string> | null;
  onToggleTrack?: (key: string) => void;
}

let _listsAtSeen: ListsAtStamp | null=null;
export default function Challenges({hideBadges,titled,catchTotal,logs,condReports,onOpen,who,self,onOpenReport,givenVouches,catches,routeById,onOpenArea,listsAt,tracked,onToggleTrack}: ChallengesProps){
  /* Whose challenges these are. The Logbook passes who={ME.name}; a profile sheet passes `self` itself, because a signed-in climber's sheet names them by pubName(), which is not ME.name. */
  const mine=self!=null?!!self:who===ME.name;
  const [open,setOpen]=useState<string | null>(null);const [hideDone,setHideDone]=useState(false);const [showLists,setShowLists]=useState(false);const [scopeF,setScopeF]=useState("All");
  /* The Menu's "Climbing lists" tile opens the curated lists directly: a new stamp opens them, whether or not this tab was already showing. */
  useEffect(()=>{/* A stamp opens the lists ONCE: this component remounts every time the Logbook tab is opened, and the stamp outlives it in App, so without the check the dialog reopened on every later visit. */if(listsAt&&listsAt!==_listsAtSeen){_listsAtSeen=listsAt;setScopeF("All");setShowLists(true);/* Home's tracked-list rows hand the list they name, so it opens expanded. */if(typeof listsAt==="object"&&listsAt.key)setOpen(listsAt.key);}},[listsAt]);const LDESC: Record<string, string>={crag_lcc:"Tick every route in Little Cottonwood Canyon — the Wasatch granite crucible, from the Schoolroom slabs to the Hellgate testpieces.",classics:"The must-do routes in your home region — the lines locals send first and recommend to every visitor.",quiver:"Send at least one route in every discipline — rock, ice, alpine, boulder and more — to round out your skills.",summits:"Stand on top: the notable peaks and summits reachable from your area.",winter:"Cold-season objectives — ice and mixed lines that come into condition when the temperature drops.",bulgers:"Washington's 100 highest peaks — a serious, decades-long mountaineering tick list.",co14:"Colorado's ranked peaks over 14,000 feet — the most popular high-altitude list in the US. The standard list counts 53. Mount Bross is not one of the 52 here: its summit is privately owned and closed to the public, so this list tops out at 52.",co_cent:"Colorado's hundred highest ranked summits: the fourteeners and the next forty-seven thirteeners, a long step beyond the 14ers. The standard list counts 100. Mount Bross is not one of the 99 here: its summit is privately owned and closed to the public.",sps:"The Sierra Club's list of 247 Sierra Nevada summits, from the desert peaks above Walker Pass to Mount Rose above Lake Tahoe, numbered as the list numbers them. Most are cross-country scrambles; a few, such as Clarence King and Starr King, need a rope.",adk46:"The 46 High Peaks of New York's Adirondacks, the list climbers have worked through since the 1920s. About twenty are reached by unmarked herd paths rather than trails.",cascade:"The major glaciated volcanoes of the Cascade Range, from Rainier and Baker down to Shasta.",ca14:"California's peaks over 14,000 feet, including Mt. Whitney, the highest in the lower 48.",fifty:"Steck & Roper's legendary Fifty Classic Climbs of North America — a benchmark for all-around mountaineers.",desert:"The iconic sandstone towers of Moab and Castle Valley, including Castleton and the Fisher Towers.",yose_floor:"The finest single- and multi-pitch crack climbs on the Yosemite Valley floor — beyond the big walls — including Nutcracker (5.8) and Outer Limits (5.10c)."};
  const {lists,got,discsSent,allDiscs}: ChallengeLists=useCuratedLists(logs,routeById);
  const allBadges: ChallengeBadge[]=useBadges(logs,routeById);
  /* Yours: every badge, so you can see what is next -- a list's finisher once you have started that list, or every list would add a grey badge. Another climber's: what they EARNED, since a badge their logs cannot show (a first ascent their log row does not carry) must not read as one they lack. */
  const badges=mine?allBadges.filter(b=>b.got||!b.list||b.started):allBadges.filter(b=>b.got);
  const SCOPES=["Your region","State","Regional","National","Global"];const LTYPE: Record<string, string>={summits:"peak",bulgers:"peak",co14:"peak",co_cent:"peak",adk46:"peak",sps:"peak",cascade:"peak",ca14:"peak"};const typeOf=(L: ChallengeList)=>LTYPE[L.key]||"route";const TYPES: [string, string][]=[["peak","Peak lists"],["route","Route ticklists"],["trail","Trails & thru-hikes"]];
  return <div style={{marginBottom:14}}>{/* The Logbook header already says "Challenges" -- it passes titled={false}. */}{titled===false?null:<MeH>Challenges & Lists</MeH>}{/* ANOTHER CLIMBER'S CHALLENGES too, not only yours (Strava shows a profile's challenge trophies, Peakbagger a climber's list progress). Theirs are built from the logs their trip-report visibility lets you read, so the block is drawn only once there is one. The vouch and catch rows are YOURS alone: nothing here can read another climber's given vouches or catch ledger, and a row nobody measured must not read as 0 -- so they appear only where the caller passed them. */}{(mine||logs.length)?(()=>{const yr=String(new Date().getFullYear());const climbsYr=logs.filter(function(l){return (l.date||"").slice(0,4)===yr;}).length;const pitches=pitchesClimbed(logs,routeById);/* Conditions are logged two ways: on a climb (its tags or write-up) and as a "Conditions only" report, which App keeps in condReports, not logs -- so the row counts both, and a climber who reported five routes without climbing them reads 5, not 0. */const condCnt=Array.from(new Set(logs.filter(function(l){return l.text||(l.condTags&&l.condTags.length);}).concat(condReports||[]).map(function(l){return l.routeId;}))).length;const vouchG=(givenVouches&&givenVouches.length)||0;const catchN=(catchTotal!=null?catchTotal:((ME.catchLedger&&ME.catchLedger.totalCatches)||0)+((catches||[]).filter(function(c){return c.dir==="you-caught";}).length));const sm: Record<string, number>={};logs.forEach(function(l){const k=(l.date||"").slice(0,7);if(k)sm[k]=1;});const sk=Object.keys(sm).sort();let streak=0;if(sk.length){const nowD=new Date();const nowKey=nowD.getFullYear()+"-"+(nowD.getMonth()+1<10?"0":"")+(nowD.getMonth()+1);const pmD=new Date(nowD.getFullYear(),nowD.getMonth()-1,1);const pmKey=pmD.getFullYear()+"-"+(pmD.getMonth()+1<10?"0":"")+(pmD.getMonth()+1);let cur=sk[sk.length-1];if(cur===nowKey||cur===pmKey){while(sm[cur]){streak++;let yy=parseInt(cur.slice(0,4),10),mm=parseInt(cur.slice(5,7),10)-1;if(mm<1){mm=12;yy--;}cur=yy+"-"+(mm<10?"0"+mm:""+mm);}}}const CH: ChallengeRow[]=[{icon:"doc",label:"Log 50 climbs this year",cur:climbsYr,tgt:50,col:C.blue},{icon:"flag",label:"Climb 100 pitches",cur:pitches,tgt:100,col:C.purple},/* Yours alone, like the vouch and catch rows: another climber's logs reach this sheet without their tags, write-up or Conditions-only reports, so theirs would read 0 whatever they filed. */mine?{icon:"snowflake",label:"Log conditions on 5 routes",cur:condCnt,tgt:5,col:C.teal}:null,mine&&givenVouches!=null?{icon:"partners",label:"Vouch for 5 partners",cur:vouchG,tgt:5,col:C.green}:null,mine&&(catchTotal!=null||catches!=null)?{icon:"shield",label:"Log 10 belay catches",cur:catchN,tgt:10,col:C.amber}:null].filter((c): c is ChallengeRow=>!!c);return <div style={{marginBottom:11}}>{streak>=2?<div style={{display:"inline-flex",alignItems:"center",gap:6,background:C.amberBg,border:"1px solid "+C.amber,borderRadius:20,padding:"9px 12px",marginBottom:11,fontSize:12.5,fontWeight:700,color:C.amber}}><span><CountUp value={streak}/>-mo logging streak</span></div>:null}<div style={{fontSize:13,fontWeight:800,color:C.text,textTransform:"uppercase",letterSpacing:0.4,margin:"2px 2px 8px",borderLeft:"3px solid "+C.blue,paddingLeft:9}}>{mine?"Your challenges":"Their challenges"}</div><div style={{display:"flex",flexDirection:"column",gap:10}}>{CH.map(function(c){const cpl=c.cur>=c.tgt;const pct=Math.min(100,Math.round(c.cur/c.tgt*100));return <div key={c.label} style={{background:C.card,border:"1px solid "+(cpl?c.col:C.border),borderRadius:12,padding:"13px 14px"}}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:11}}><span style={{fontSize:16,display:"inline-flex"}}><ActionIcon name={c.icon||"target"} size={16} color={c.col}/></span><span style={{flex:1,minWidth:0,fontSize:13,fontWeight:600,color:C.text}}>{c.label}</span><span style={{fontSize:12,fontWeight:700,color:cpl?c.col:C.textMuted}}>{cpl?"✓ Done":Math.min(c.cur,c.tgt)+" / "+c.tgt}</span></div><div style={{height:8,background:C.surface,borderRadius:5,overflow:"hidden"}}><div style={{width:Math.max(pct,3)+"%",height:"100%",background:c.col,borderRadius:4}}/></div></div>;})}</div></div>;})():null}<div style={{fontSize:13,fontWeight:800,color:C.text,textTransform:"uppercase",letterSpacing:0.4,margin:"20px 2px 11px",borderLeft:"3px solid "+C.blue,paddingLeft:9}}>{"Curated lists"}</div><div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:13}}>{lists.map(L=>{const t=L.total||(L.quiver?allDiscs.length:L.routes.length);const d=L.quiver?discsSent.length:L.routes.filter(L.doneBy||(r=>got(r.id))).length;/* A peak list supplies its own test: `got(id)` matches a LOGGED ROUTE id, and a peak
   objective carries an AREA id, so the default would count zero forever. */const cpl=t&&d>=t;/* Was `if(!d) return null` — a list you have not started was hidden, so the tick-list
   only appeared once you no longer needed telling it existed. Show it when it HAS
   members; still hide the ones the catalog cannot populate at all, which would
   otherwise be a row of permanent 0-of-N chips. */if(!d&&!(L.routes&&L.routes.length))return null;return <span key={L.key} {...clickable(()=>{setScopeF(L.scope);setShowLists(true);})} style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11.5,fontWeight:600,padding:"6px 11px",borderRadius:20,cursor:"pointer",background:cpl?`${L.col}1a`:C.surface,color:cpl?L.col:C.textSub,border:`1px solid ${cpl?L.col:C.border}`}}><><ActionIcon name={L.icon||"target"} size={12} color={cpl?L.col:C.textSub}/>{" "+L.label+" "+d+"/"+t}</></span>;})}</div><button onClick={()=>{setScopeF("All");setShowLists(true);}} style={{width:"100%",padding:"9px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:9,color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer",marginBottom:4}}>{"Browse all "+lists.length+" curated lists →"}</button>{showLists?createPortal(<div style={{position:"fixed",inset:0,zIndex:97000,background:C.bg,display:"flex",flexDirection:"column",maxWidth:520,margin:"0 auto",boxSizing:"border-box"}} role="dialog" aria-modal="true" aria-label="Challenges and lists"><div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 16px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}><div style={{fontSize:16,fontWeight:800,flex:1}}>Challenges & Lists</div><button onClick={()=>setShowLists(false)} style={POP_CLOSE} aria-label="Close">✕</button></div><div style={{display:"flex",gap:7,flexWrap:"wrap",padding:"11px 16px",borderBottom:`1px solid ${C.borderLight}`,flexShrink:0}}>{["All"].concat(SCOPES).map(sc=>{const on=scopeF===sc;return <span key={sc} {...clickable(()=>setScopeF(sc))} style={{fontSize:12,fontWeight:700,padding:"6px 12px",borderRadius:20,cursor:"pointer",whiteSpace:"nowrap",background:on?C.blueSolid:C.surface,color:on?"#fff":C.textSub,border:`1px solid ${on?C.blue:C.border}`}}>{sc}</span>;})}</div><div style={{minHeight:0,flex:1,overflowY:"auto",overscrollBehavior:"contain",WebkitOverflowScrolling:"touch",padding:"12px 16px 40px"}}>{TYPES.map(TY=>lists.some(L=>typeOf(L)===TY[0]&&(scopeF==="All"||L.scope===scopeF))?<div key={TY[0]} style={{marginBottom:6}}><div style={{fontSize:13,fontWeight:800,color:C.text,textTransform:"uppercase",letterSpacing:0.4,margin:"20px 2px 8px",borderLeft:"3px solid "+C.blue,paddingLeft:9}}>{TY[1]}</div><div style={{display:"flex",flexDirection:"column",gap:9}}>
    {lists.filter(L=>typeOf(L)===TY[0]&&(scopeF==="All"||L.scope===scopeF)).map(L=>{const inCat=L.quiver?0:L.routes.length;const d=L.quiver?discsSent.length:L.routes.filter(L.doneBy||(r=>got(r.id))).length;/* A peak list supplies its own test: `got(id)` matches a LOGGED ROUTE id, and a peak
   objective carries an AREA id, so the default would count zero forever. */const t=L.total||(L.quiver?allDiscs.length:L.routes.length);const pct=t?Math.round(d/t*100):0;const cpl=t&&d>=t;const isOpen=open===L.key;const extra=L.total?L.total-inCat:0;
      return <div key={L.key} style={{background:C.card,borderRadius:12,border:`1px solid ${cpl?L.col:C.border}`,overflow:"hidden"}}>
        <div {...clickable(()=>setOpen(isOpen?null:L.key))} style={{padding:"11px 13px",cursor:"pointer"}}>
          <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:8}}><span style={{fontSize:17,display:"inline-flex"}}><ActionIcon name={L.icon||"target"} size={17} color={L.col}/></span><div style={{flex:1,minWidth:0}}><div style={{fontSize:13.5,fontWeight:700}}>{L.label}</div>{L.blurb?<div style={{fontSize:12,color:C.textMuted,marginTop:1}}>{L.blurb}</div>:null}</div><span style={{fontSize:12,fontWeight:700,color:cpl?L.col:C.textMuted}}>{cpl?"✓ Complete":d+" / "+t}</span><span aria-hidden="true" style={{marginLeft:6,display:"flex"}}><Chevron open={isOpen} size={14} color={C.textMuted}/></span></div>
          <div style={{height:8,background:C.surface,borderRadius:5,overflow:"hidden"}}><div style={{width:Math.max(pct,3)+"%",height:"100%",background:L.col,borderRadius:4}}/></div></div>
        {isOpen?<div style={{borderTop:`1px solid ${C.borderLight}`,padding:"3px 7px 7px"}}>{LDESC[L.key]?<div style={{fontSize:12,color:C.textSub,lineHeight:1.55,padding:"9px 6px 5px"}}>{LDESC[L.key]}</div>:null}{/* SHOW ON HOME: which lists Home follows. Every list counts every log either way -- this only decides what Home shows (Strava shows the challenges you joined; theCrag lets you star a list). Drawn only where the caller can save the choice: your own Logbook, signed in. */}{mine&&onToggleTrack?(()=>{const on=(tracked||[]).indexOf(L.key)>=0;return <button onClick={e=>{e.stopPropagation();onToggleTrack(L.key);}} role="switch" aria-checked={on} aria-label={"Show "+L.label+" on Home"} style={{display:"flex",alignItems:"center",gap:7,margin:"4px 6px 6px",padding:"7px 11px",borderRadius:9,border:"1px solid "+(on?L.col:C.border),background:on?L.col+"1a":C.surface,color:on?L.col:C.textSub,fontSize:12.5,fontWeight:700,cursor:"pointer"}}><ActionIcon name="home" size={14} color={on?L.col:C.textSub}/>{on?"Showing on Home":"Show on Home"}</button>;})():null}{!L.quiver&&L.routes.some(r=>got(r.id))&&L.routes.some(r=>!got(r.id))?<div {...clickable((e: { stopPropagation(): void })=>{e.stopPropagation();setHideDone(h=>!h);})} style={{display:"flex",alignItems:"center",gap:7,padding:"8px 6px 5px",cursor:"pointer",fontSize:11.5,color:C.textSub,fontWeight:600}}><span style={{width:15,height:15,borderRadius:4,border:`1px solid ${hideDone?C.blue:C.border}`,background:hideDone?C.blueSolid:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:C.bg}}>{hideDone?"✓":""}</span>Hide completed</div>:null}
          {L.quiver?<div style={{display:"flex",gap:6,flexWrap:"wrap",padding:"9px 0"}}>{allDiscs.map(dc=>{const on=discsSent.includes(dc);const ct=CAT[dc]||{};return <span key={dc} style={{fontSize:11.5,fontWeight:600,padding:"4px 9px",borderRadius:20,border:`1px solid ${on?L.col:C.border}`,color:on?L.col:C.textMuted,background:on?`${L.col}1a`:"transparent"}}><span style={{display:"inline-flex",alignItems:"center",gap:4}}><DiscIcon d={dc} size={12}/>{(ct.label||dc)+(on?" ✓":"")}</span></span>;})}</div>
          :<div>{L.routes.length?L.routes.slice().sort((a,b)=>((got(a.id)?1:0)-(got(b.id)?1:0))||((a.driveMinSLC||999)-(b.driveMinSLC||999))).filter(r=>!hideDone||!got(r.id)).map(r=>{const on=L.doneBy?L.doneBy(r):got(r.id);const ct=CAT[catOf(r)]||{};const aa=(r.activity||[]).find(x=>x.user===who)||(logs?logs.find(l=>l.routeId===r.id):null);const asc=on&&aa?{route:r,mtn:MOUNTAINS.find(m=>m.id===r.mountainId)||{},user:who,avatar:aa.avatar,date:aa.date,tickType:aa.tickType,stars:aa.stars,condTags:aa.condTags,text:aa.text,partners:aa.partners,cond:aa.cond,photos:aa.photos,photoAlts:aa.photoAlts,gpxName:aa.gpxName}:null;const _canOpen=r._noOpen?false:r._peak?!!onOpenArea:((asc&&onOpenReport)||onOpen);return <div key={r.id} {...(_canOpen?clickable((e: { stopPropagation(): void })=>{e.stopPropagation();if(r._peak){if(onOpenArea)onOpenArea(r.id,r.name);return;}if(onOpen){onOpen(r);}else if(asc&&onOpenReport){onOpenReport(asc);}}):{})} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 6px",cursor:_canOpen?"pointer":"default"}}><span style={{width:18,height:18,borderRadius:9,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,background:on?L.col:"transparent",color:on?C.bg:C.textMuted,border:on?"none":`1px solid ${C.border}`}}>{on?"✓":""}</span>{/* The name owns the row and may wrap; the facts on the right may wrap too, capped at 45%, so neither can run under the other on a narrow phone. A missing grade is left out, never printed as "null". */}<span style={{flex:1,minWidth:0,overflowWrap:"anywhere"}}><span style={{display:"block",fontSize:13.5,fontWeight:700,color:on?C.text:C.textSub,lineHeight:1.3}}>{r._n?<span style={{color:C.textMuted,fontWeight:600}}>{r._n+". "}</span>:null}{r.name}</span>{r._sub?<span style={{display:"block",fontSize:12,color:C.textMuted,lineHeight:1.35,marginTop:1}}>{r._sub}</span>:null}</span><span style={{fontSize:12,color:C.textMuted,flexShrink:1,minWidth:0,maxWidth:"45%",textAlign:"right",lineHeight:1.35}}>{r._peak?uElev(r.ft):r._noOpen?"Not in the catalog yet":<><span style={{display:"inline-block",verticalAlign:-1,marginRight:4}}><DiscIcon d={catOf(r)} size={11}/></span>{[ct.label||catOf(r),r.grade].filter(Boolean).join(" · ")}</>}</span>{asc&&onOpenReport?<button onClick={e=>{e.stopPropagation();onOpenReport(asc);}} title="View trip report" style={{flexShrink:0,border:`1px solid ${C.border}`,background:C.surface,color:C.blue,borderRadius:7,padding:"3px 8px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Report</button>:null}<span aria-hidden="true" style={{display:"flex",flexShrink:0}}><Chevron size={16} color={C.textMuted}/></span></div>;}):null}{/* Only for a gap the catalog really can close. A list whose remaining objective can NEVER be
             added — Colorado's Mount Bross, whose summit is closed to the public — must not advertise a
             total it cannot reach: `cpl` is `d>=t`, so the card could never read Complete, and this line
             promised the peak was on its way. Such a list carries the achievable total and states the
             exclusion in LDESC instead. */}
          {extra>0?<div style={{fontSize:11.5,color:C.textMuted,padding:"8px 6px 4px",lineHeight:1.4}}>{"+ "+extra+" more on the full list — fills in as the catalog grows."}</div>:null}</div>}</div>:null}
      </div>;})}</div></div>:null)}</div></div>,document.body):null}
    {hideBadges||!badges.length?null:<><div style={{fontSize:13,fontWeight:800,color:C.text,textTransform:"uppercase",letterSpacing:0.4,margin:"20px 2px 14px",borderLeft:"3px solid "+C.blue,paddingLeft:9}}>{"Badges"+(mine?" · "+badges.filter(b=>b.got).length+" earned":"")}</div><BadgeGrid badges={badges}/></>}</div>;
}
