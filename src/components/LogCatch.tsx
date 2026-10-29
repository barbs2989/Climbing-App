import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { C, FALLBACK_AV, MOUNTAINS, ROUTES, SZ3, catOf, fuzzyMatchAny, pubFirst, pubName, seedRoutesOn } from "../../ClimbMatchCore.jsx";
import { ROUTE_PICK_LIM, dbRouteToCamel, useClimberSearch, useRouteSearch, useRoutesByIds } from "../../lib/db.js";
import { useRecentRouteIds } from "../../lib/recent.js";
import { USE_DB } from "../../lib/supabase.js";
import { clickable } from "../../lib/clickable";
import { POP_CLOSE } from "../../lib/popupChrome.js";
import Av from "./Av.tsx";
import Chevron from "./Chevron.tsx";
import DbClimbPicker from "./DbClimbPicker.tsx";
import DiscIcon from "./DiscIcon.tsx";
import PlaceMatches, { type PlaceHit } from "./PlaceMatches.tsx";
import LoadingRows from "./LoadingRows.tsx";

/** A climber you can name as the other half of a catch: a friend, a crew-mate, or a profile-search hit (`pubName`/`pubFirst` read the naming fields). */
export interface CatchClimber {
  id: string | number;
  name?: string | null;
  username?: string | null;
  showName?: boolean | null;
  avatar?: string | null;
  location?: string | null;
}
/** The climb a catch happened on: the seed `ROUTES` shape, the caller's `routeById`, or a `dbRouteToCamel` row. */
export interface CatchRoute {
  id: string | number;
  name: string;
  grade?: string | null;
  mountainId?: string | number | null;
  _dbArea?: { name?: string | null } | null;
}
/** One of your logs, for the "climbed with <partner>" and "your recent climbs" suggestions. */
export interface CatchLog {
  routeId: string | number;
  date?: string | null;
  partnerIds?: ReadonlyArray<string | number> | null;
  partners?: ReadonlyArray<string> | null;
}
/** A crew you share with the partner, for the same suggestions. */
export interface CatchCrew {
  routeId?: string | number | null;
  members?: ReadonlyArray<{ climberId?: string | number | null }> | null;
}
/** A profiles row as useClimberSearch returns it (snake_case). */
export interface ClimberRow { id: string | number; name?: string | null; username?: string | null; avatar?: string | null; show_name?: boolean | null; location?: string | null }
/** A routes row as useRoutesByIds returns it; dbRouteToCamel takes the whole row. */
export interface DbRouteRow { id: string | number; name: string; [k: string]: unknown }
/** A catalog search hit as useRouteSearch returns it, already camel-cased, with the place it was found through. */
export interface DbSearchRow { id: string | number; name: string; _dbArea?: { name?: string | null } | null; _placeHint?: string | null }
/** What Log catch hands App: one belay catch, filed by you, awaiting the partner's confirmation (0361). */
export interface NewCatch {
  id: string;
  friendId: string | number;
  friendName: string;
  dir: string;
  routeId: string | number;
  date: string;
  filedBy: string;
}
export interface LogCatchProps {
  /** Opened from a partner's profile: that partner; from the Me tab's catch card: null, and the sheet asks who first. */
  friend?: CatchClimber | null;
  partners?: ReadonlyArray<CatchClimber> | null;
  logs?: ReadonlyArray<CatchLog> | null;
  crews?: ReadonlyArray<CatchCrew> | null;
  routeById?: (id: string | number) => CatchRoute | null | undefined;
  meId?: string | number | null;
  /** Climbers who blocked you, or you them: never offered. */
  blockedIds?: Set<string | number> | null;
  onClose: () => void;
  onSave: (c: NewCatch) => void;
}

/** LOG A BELAY CATCH: who, which way, the climb (optional — searched, suggested or browsed) and the date; portalled to body, pinned header and foot, one scrolling body. The backdrop is a mouse-only div by design (check:clickable baseline). */
export default function LogCatch({friend,partners,logs,crews,routeById,meId,blockedIds,onClose,onSave}: LogCatchProps){
  /* Opened from a partner's profile `friend` is that partner; opened from the Me tab's catch card
     it is null and the sheet asks WHO first, from `partners` -- friends plus everyone you have
     shared a crew with, past crews included -- or from a search of EVERY climber with a profile
     (owner, 2026-10-23: "you should be able to log a catch from someone who isn't your friend or was
     in past crews"). Opening it to strangers is safe because nothing counts on one side's word: a
     catch counts only once the other climber confirms it (0361), and a climber who blocked you
     cannot be named (the insert trigger refuses it). */
  const [pick,setPick]=useState<CatchClimber | null>(friend||null);
  const [whoQ,setWhoQ]=useState("");
  const climberQ=useClimberSearch(USE_DB&&!pick?whoQ:"");
  const _bl: Set<string | number>=blockedIds||new Set();
  const _pIds=new Set((partners||[]).map(p=>String(p.id)));
  const others: CatchClimber[]=(climberQ.data||[]).filter((r: ClimberRow)=>r&&r.id!==meId&&!_bl.has(r.id)&&!_pIds.has(String(r.id))).map((r: ClimberRow)=>({id:r.id,name:r.name,username:r.username,avatar:r.avatar,showName:!!r.show_name,location:r.location}));
  /* DEFAULTS TO "<partner> caught me": that is the direction the server COUNTS (0194/0203 credit a
     belayer only for catches filed by the climber who was caught). It used to default to "I caught
     <partner>", so the one-tap path filed a catch that shows on both records and counts for nobody. */
  const [dir,setDir]=useState("caught-you");
  const [routeId,setRouteId]=useState<string | number>("");
  const [routeObj,setRouteObj]=useState<CatchRoute | null>(null);
  const [routeQ,setRouteQ]=useState("");
  const [date,setDate]=useState("");
  const [openPlace,setOpenPlace]=useState<PlaceHit | null>(null);
  const [browse,setBrowse]=useState(false);
  const fn=pick?pubFirst(pick):"";
  const q=routeQ.trim();
  /* MORE WAYS TO FIND THE CLIMB (owner, 2026-10-21: "give more options to find the specific route").
     This was a bare name box returning 8 bare names, so two "North Ridge"s or two "Classic Crack"s
     could not be told apart and a climber who could not spell the route could not find it. It now
     works the way the Find partners "By Route" picker does and the way Mountain Project, KAYA and
     theCrag tick a climb: each row names its crag and grade; the box also finds the PEAK or CRAG and
     opens its climbs; Browse by area drills country -> crag; and with the box empty it offers the
     climbs this catch most likely happened on -- ones climbed with this partner (shared crews, logs
     naming them), your recent logged climbs, and climbs you opened recently. */
  const dbRouteSearch=useRouteSearch(USE_DB?q:"",ROUTE_PICK_LIM);
  const recentIds=useRecentRouteIds();
  const pid=pick?pick.id:null,pname=pick?pick.name:null;
  const localRoute=(id: string | number | null | undefined): CatchRoute | null=>(routeById&&id!=null?routeById(id):null)||ROUTES.find(r=>r.id===id)||null;
  const myLogs=(logs||[]).filter(l=>l&&l.routeId).slice().sort((x,y)=>String(y.date||"").localeCompare(String(x.date||"")));
  const withIds=(crews||[]).filter(cr=>cr.routeId&&pid!=null&&(cr.members||[]).some(m=>m.climberId===pid)).map(cr=>cr.routeId).concat(myLogs.filter(l=>pid!=null&&((l.partnerIds||[]).indexOf(pid)>=0||(!!pname&&(l.partners||[]).indexOf(pname)>=0))).map(l=>l.routeId));
  const loggedIds=myLogs.map(l=>l.routeId);
  const pickDbQ=useRoutesByIds(USE_DB&&pick&&!routeId&&!q?[...new Set(withIds.concat(loggedIds.slice(0,20),recentIds.slice(0,10)))].filter(id=>!localRoute(id)):[]);
  const pickDbById=useMemo(()=>{const m: Record<string, CatchRoute>={};(pickDbQ.data||[]).forEach((r: DbRouteRow)=>{m[r.id]=dbRouteToCamel(r);});return m;},[pickDbQ.data]);
  const _seen: Record<string, 1>={};const resolve=(ids: ReadonlyArray<string | number | null | undefined>,n: number)=>{const out: CatchRoute[]=[];for(const id of ids){if(id==null)continue;if(out.length>=n)break;if(_seen[id])continue;const r=localRoute(id)||pickDbById[id];if(r){_seen[id]=1;out.push(r);}}return out;};
  const withPicks=resolve(withIds,5),loggedPicks=resolve(loggedIds,5),recentPicks=resolve(recentIds.slice(0,10),5);
  const selRoute=routeId?((routeObj&&routeObj.id===routeId)?routeObj:localRoute(routeId)):null;
  const pickRoute=(r: CatchRoute)=>{setRouteId(r.id);setRouteObj(r);setRouteQ("");setOpenPlace(null);setBrowse(false);};
  const routeSub=(r: CatchRoute)=>[(MOUNTAINS.find(m=>m.id===r.mountainId)||r._dbArea||{name:undefined}).name,r.grade].filter(Boolean).join(" · ");
  const routeRow=(r: CatchRoute)=><div key={r.id} {...clickable(()=>pickRoute(r))} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 11px",marginBottom:6,background:C.card,border:`1px solid ${C.border}`,borderRadius:10,cursor:"pointer"}}><span style={{flexShrink:0,display:"inline-flex"}}><DiscIcon d={catOf(r)} size={18}/></span><div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:600,color:C.text}}>{r.name}</div>{routeSub(r)?<div style={{fontSize:12,color:C.textSub}}>{routeSub(r)}</div>:null}</div></div>;
  const pickHead=(t: string)=><div style={{fontSize:12,fontWeight:800,color:C.textSub,letterSpacing:0.4,textTransform:"uppercase",margin:"14px 0 7px"}}>{t}</div>;
  /* THE WHOLE SHEET FITS THE SCREEN (owner, 2026-10-23: "shows on the bottom of the screen… looks cutoff… I can't choose who I caught"). It was one 85vh box: `vh` is the TALLEST viewport, so with a phone's browser bars showing, the sheet ran past the visible screen and its foot -- the Log catch button -- sat under them; and it rendered in place, inside whatever screen opened it. Now it is portalled to <body>, capped at the screen that is actually visible (dvh), and split in three: the title and ✕ pinned at the top, one scrolling body, and Log catch pinned at the foot above the home indicator, so every step is reachable whatever the list above it holds. */
  return createPortal(<div onClick={onClose} role="dialog" aria-label="Log a belay catch" aria-modal="true" style={{position:"fixed",inset:0,background:C.scrim,zIndex:220,display:"flex",alignItems:"flex-end",justifyContent:"center"}}><div onClick={e=>e.stopPropagation()} style={{background:C.bg,width:"100%",maxWidth:440,borderRadius:"16px 16px 0 0",maxHeight:"calc(100dvh - 12px)",display:"flex",flexDirection:"column",overflow:"hidden",border:"1px solid "+C.borderHi,borderBottom:"none",boxShadow:"0 -12px 40px rgba(0,0,0,0.55)"}}><div style={{...SZ3,marginBottom:0,flexShrink:0,padding:"14px 18px 10px",borderBottom:"1px solid "+C.border}}><div style={{color:C.text,fontSize:17,fontWeight:700,borderLeft:"3px solid "+C.blue,paddingLeft:9}}>Log a belay catch</div>{/* The app's 48px POP_CLOSE (owner, 2026-10-21: "the x out button needs to be larger on this page"), outside the scrolling body so it is always in reach. */}<button onClick={onClose} style={POP_CLOSE} aria-label="Close">✕</button></div><div style={{flex:1,minHeight:0,overflowY:"auto",overscrollBehavior:"contain",padding:"14px 18px 18px"}}>{!pick?<div><div style={{fontSize:13,color:C.textSub,marginBottom:14,lineHeight:1.5}}>Who were you climbing with?</div>{(partners&&partners.length)?<div>{pickHead("Your partners")}<div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{partners.map(p=><button key={p.id} onClick={()=>setPick(p)} aria-label={"Log a catch with "+pubName(p)} style={{display:"flex",alignItems:"center",gap:7,minHeight:40,padding:"4px 12px 4px 4px",borderRadius:20,border:`1px solid ${C.border}`,background:C.card,color:C.text,fontSize:13,cursor:"pointer",fontWeight:600}}><Av src={p.avatar||FALLBACK_AV} size={30}/>{pubFirst(p)}</button>)}</div></div>:null}{USE_DB?<div>{pickHead(partners&&partners.length?"Someone else":"Find the climber")}<input aria-label="Search climbers by name or username" value={whoQ} onChange={e=>setWhoQ(e.target.value)} placeholder="Name or @username…" autoComplete="off" style={{width:"100%",padding:"10px 11px",borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,color:C.text,fontSize:13,boxSizing:"border-box"}}/><div style={{marginTop:7,fontSize:12,color:C.textMuted,lineHeight:1.5}}>Anyone with a ClimbMatch profile. They get a request to confirm it, and it counts only once they do.</div>{whoQ.trim().replace(/^@/,"").length>=2?<div style={{marginTop:9}}>{others.map(p=><div key={p.id} {...clickable(()=>setPick(p))} aria-label={"Log a catch with "+pubName(p)} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 11px",marginBottom:6,background:C.card,border:`1px solid ${C.border}`,borderRadius:10,cursor:"pointer"}}><Av src={p.avatar||FALLBACK_AV} size={32}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pubName(p)}</div>{p.location?<div style={{fontSize:12,color:C.textSub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.location}</div>:null}</div></div>)}{others.length?null:<div style={{padding:"10px 4px",textAlign:"center",color:climberQ.isError?C.amber:C.textMuted,fontSize:12,lineHeight:1.5}}>{climberQ.isFetching||climberQ.isPending?"Searching…":climberQ.isError?"Couldn’t search climbers — check your connection and try again":"No climber matches — try their @username."}</div>}</div>:null}</div>:(partners&&partners.length)?null:<div style={{fontSize:13,color:C.textMuted,lineHeight:1.5}}>Nobody to log a catch with yet — add a friend or climb with a crew first.</div>}</div>:<>{friend?null:<div style={{display:"flex",alignItems:"center",gap:9,padding:"8px 11px",borderRadius:10,border:"1px solid "+C.border,background:C.card,marginBottom:14}}><Av src={pick.avatar||FALLBACK_AV} size={30}/><span style={{flex:1,minWidth:0,fontSize:14,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pubName(pick)}</span><button onClick={()=>setPick(null)} style={{background:"none",border:"none",color:C.blue,fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0,minHeight:32}}>Change</button></div>}
<div style={{fontSize:13,color:C.textSub,marginBottom:16,lineHeight:1.5}}>{"Record a real fall caught between you and "+fn+". "+fn+" gets a request to confirm it — a catch counts only once both of you have recorded it."}</div><div style={{fontSize:13,fontWeight:800,color:C.text,textTransform:"uppercase",letterSpacing:0.4,marginBottom:8,borderLeft:"3px solid "+C.blue,paddingLeft:9}}>Who caught whom</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:15}}>{[["caught-you",fn+" caught me"],["you-caught","I caught "+fn]].map(o=><button key={o[0]} onClick={()=>setDir(o[0])} aria-current={dir===o[0]?"true":undefined} style={{padding:"10px 8px",borderRadius:10,border:`1.5px solid ${dir===o[0]?C.green:C.border}`,background:dir===o[0]?C.greenBg:C.surface,color:dir===o[0]?C.green:C.textSub,fontSize:13,fontWeight:dir===o[0]?700:500,cursor:"pointer"}}>{o[1]}</button>)}</div><div style={{fontSize:12,color:C.textMuted,margin:"-7px 0 15px",lineHeight:1.5}}>{dir==="caught-you"?("Counts toward "+fn+"’s belay record once "+fn+" confirms it."):("Counts toward your belay record once "+fn+" confirms it.")}</div><div style={{fontSize:13,fontWeight:800,color:C.text,textTransform:"uppercase",letterSpacing:0.4,marginBottom:8,borderLeft:"3px solid "+C.blue,paddingLeft:9}}>Climb (optional)</div>{selRoute?<div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 11px",borderRadius:10,border:"1px solid "+C.blueDim,background:C.blueBg,marginBottom:15}}><span style={{flex:1,minWidth:0,overflow:"hidden"}}><span style={{display:"block",fontSize:13,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{selRoute.name}</span>{routeSub(selRoute)?<span style={{display:"block",fontSize:12,color:C.textSub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{routeSub(selRoute)}</span>:null}</span><button onClick={()=>{setRouteId("");setRouteObj(null);}} style={{background:"none",border:"none",color:C.blue,fontSize:12,fontWeight:700,cursor:"pointer",flexShrink:0}}>Change</button></div>:<div style={{marginBottom:15}}><input aria-label="Search by climb, peak or crag" value={routeQ} onChange={e=>{setRouteQ(e.target.value);setOpenPlace(null);}} placeholder="Search by climb, peak or crag…" style={{width:"100%",padding:"10px 11px",borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,color:C.text,fontSize:13,boxSizing:"border-box"}}/>{!q?<div><div style={{marginTop:7,fontSize:12,color:C.textMuted,lineHeight:1.5}}>Type the climb’s name, or the peak or crag it’s on — or pick one below.</div>{USE_DB?<><button onClick={()=>setBrowse(b=>!b)} aria-expanded={browse} style={{minHeight:44,width:"100%",marginTop:10,padding:"10px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,borderRadius:10,border:`1px solid ${browse?C.blueDim:C.border}`,background:browse?C.blueBg:C.surface,color:browse?C.blue:C.text,fontSize:13.5,fontWeight:700,cursor:"pointer"}}><span>Browse by area</span><span style={{fontSize:12,color:C.textMuted,fontWeight:600}}>{browse?"Hide ":"Country → crag "}<Chevron inline open={browse} size={13} color={C.textMuted}/></span></button>{browse?<div style={{marginTop:8,padding:12,background:C.card,border:`1px solid ${C.border}`,borderRadius:10,maxHeight:360,overflowY:"auto",overscrollBehavior:"contain"}}><DbClimbPicker onPickRoute={pickRoute}/></div>:null}</>:null}{withPicks.length?<div>{pickHead("Climbed with "+fn)}{withPicks.map(routeRow)}</div>:null}{loggedPicks.length?<div>{pickHead("Your recent climbs")}{loggedPicks.map(routeRow)}</div>:null}{recentPicks.length?<div>{pickHead("Recently viewed")}{recentPicks.map(routeRow)}</div>:null}{pickDbQ.isFetching&&!pickDbQ.data?<LoadingRows C={C} label="Loading your climbs…" style={{marginTop:8}}/>:pickDbQ.isError?<div style={{fontSize:11.5,color:C.amber,marginTop:8,lineHeight:1.5}}>Couldn’t load some of your recent climbs — they may be missing above.</div>:null}</div>:<><PlaceMatches q={q} open={openPlace} setOpen={setOpenPlace} onPickRoute={pickRoute}/>{openPlace?null:(()=>{const seedM=seedRoutesOn()?ROUTES.filter(r=>fuzzyMatchAny(q,r.name,(MOUNTAINS.find(m=>m.id===r.mountainId)||{name:undefined}).name)):[];/* BY CLIMB, PEAK OR CRAG: the catalog search also expands a matched region to every route under it, so a row is kept only when its own name, its peak or crag, or the place it was found through answers the query -- the rule Find partners' By Route applies. */const m=[...seedM,...((dbRouteSearch.data||[]).filter((d: DbSearchRow)=>!seedM.some(s=>s.id===d.id)&&fuzzyMatchAny(q,d.name,(d._dbArea||{}).name,d._placeHint)))];if(!m.length)return <div style={{marginTop:8,padding:"14px",textAlign:"center",color:C.textMuted,fontSize:12,lineHeight:1.5}}>{dbRouteSearch.isFetching?"Searching…":dbRouteSearch.isError?"Couldn’t search the catalog — check your connection and try again":"No climbs match — try the peak or crag it’s on, or browse by area."}</div>;return <div style={{marginTop:8}}>{m.slice(0,ROUTE_PICK_LIM).map(routeRow)}{m.length>ROUTE_PICK_LIM?<div style={{fontSize:12,color:C.textMuted,textAlign:"center",padding:"6px 0"}}>{"+"+(m.length-ROUTE_PICK_LIM)+" more — keep typing to narrow"}</div>:null}{dbRouteSearch.isFetching?<div style={{fontSize:11.5,color:C.textMuted,textAlign:"center",padding:"6px 0"}}>Searching the full catalog…</div>:dbRouteSearch.isError?<div style={{fontSize:11.5,color:C.amber,textAlign:"center",padding:"6px 0"}}>Couldn’t search the full catalog — showing local results only</div>:null}</div>;})()}</>}</div>}<div style={{fontSize:13,fontWeight:800,color:C.text,textTransform:"uppercase",letterSpacing:0.4,marginBottom:8,borderLeft:"3px solid "+C.blue,paddingLeft:9}}>Date</div><input aria-label="Date of catch" type="date" value={date} onChange={e=>setDate(e.target.value)} style={{width:"100%",padding:"10px 11px",borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,color:C.text,fontSize:13,boxSizing:"border-box"}}/></>}</div>{pick?<div style={{flexShrink:0,padding:"12px 18px calc(12px + env(safe-area-inset-bottom))",borderTop:"1px solid "+C.border,background:C.bg}}><button onClick={()=>onSave({id:"cx"+Date.now(),friendId:pick.id,friendName:pubName(pick),dir,routeId,date:date||new Date().toISOString().slice(0,10),filedBy:"me"})} style={{width:"100%",padding:12,background:C.green,color:C.bg,border:"1px solid rgba(0,0,0,0.22)",boxSizing:"border-box",borderRadius:10,fontSize:15,fontWeight:700,cursor:"pointer"}}>Log catch</button></div>:null}</div></div>,document.body);
}
