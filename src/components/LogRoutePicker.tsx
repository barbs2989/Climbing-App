import { useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { C, MOUNTAINS, ROUTES, inArea } from "../../ClimbMatchCore.jsx";
import DbClimbPicker from "./DbClimbPicker.tsx";
import { USE_DB } from "../../lib/supabase.js";
import { clickable } from "../../lib/clickable";
import { POP_BACK, POP_CLOSE } from "../../lib/popupChrome.js";
import SearchSplit, { type SeedRoute } from "./SearchSplit.tsx";
import type { SeedArea } from "./AreaRegionSelect.tsx";
import EmptyState from "./EmptyState.tsx";

/** What the picker hands back: a seed route, or a DB route from `DbClimbPicker` (`dbRouteToCamel` shape); only these two fields are promised. */
export interface PickedClimb {
  id: string | number;
  name: string;
}
export interface LogRoutePickerProps {
  onClose: () => void;
  onPick: (r: PickedClimb) => void;
}

/* PLACES ABOVE ROUTES in a route picker. A place name is how climbers think of where a climb
   is — "the Main Wall at Erie" — and the common ones name a hundred places, so a flat list of
   routes labelled "Main Wall (Washington)" cannot be told apart. Each place row says where it is
   and how big it is; tapping one opens the drill-down AT it, whose ← returns here. When more share
   the name than fit, the hint says what to type instead, using a real parent as the example. */
export default function LogRoutePicker({onClose,onPick}: LogRoutePickerProps){
  const [pArea,setPArea]=useState<SeedArea | null>(null);const [pq,setPq]=useState("");
  const ac=function(aid: string | number){return ROUTES.filter(function(r){return inArea(r.mountainId,aid);}).length;};
  const cragOf=function(r: SeedRoute){const m=MOUNTAINS.find(function(x){return x.id===r.mountainId;});return m?m.name:"";};
  const stId=pArea?(function(a: SeedArea){let m: SeedArea | undefined=a;while(m&&m.areaType!=="state"&&m.parentId){const pid: SeedArea["parentId"]=m.parentId;m=MOUNTAINS.find(function(x){return x.id===pid;});}return m?m.id:a.id;})(pArea):null;
  const parent=pArea&&pArea.parentId?MOUNTAINS.find(function(x){return x.id===pArea.parentId;}):null;
  const up=function(){if(!pArea)return;if(pArea.areaType==="state"){setPArea(null);}else{setPArea(parent&&parent.areaType!=="country"&&parent.areaType!=="world"?parent:null);}setPq("");};
  const kids=pArea?MOUNTAINS.filter(function(m){return m.parentId===pArea.id&&ac(m.id)>0;}):[];
  const here=pArea?ROUTES.filter(function(r){return r.mountainId===pArea.id;}):[];
  const states=MOUNTAINS.filter(function(m){return m.areaType==="state"&&ac(m.id)>0;}).sort(function(a,b){return String(a.name||"").localeCompare(String(b.name||""));});
  const rowStyle: CSSProperties={display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"11px 12px",borderRadius:10,marginBottom:8,background:C.card,border:"1px solid "+C.border,cursor:"pointer"};
  const climbRow: CSSProperties={display:"flex",alignItems:"center",gap:10,padding:"9px 4px",cursor:"pointer",borderBottom:"1px solid "+C.borderLight};
  return createPortal((<div onClick={onClose} role="dialog" aria-label="Log a climb" aria-modal="true" style={{position:"fixed",inset:0,background:C.scrimStrong,zIndex:1100,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"24px 12px",overscrollBehavior:"contain"}}>{/* The backdrop used to scroll as well as the list inside it, so on any screen shorter than the dialog the whole card slid up and took its own header with it — the Back button and the close X scrolled away and could not be reached without scrolling back. One scroller only: the card is capped to the viewport, the header never moves, and the list below it is the single thing that scrolls. */}<div onClick={e=>e.stopPropagation()} style={{background:C.bg,width:"100%",maxWidth:480,borderRadius:16,border:"1px solid "+C.border,overflow:"hidden",maxHeight:"calc(100dvh - 48px)",display:"flex",flexDirection:"column"}}><div style={{padding:"14px 16px",borderBottom:"1px solid "+C.border,background:C.surface,flexShrink:0}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><div style={{fontSize:16,fontWeight:700,color:C.text}}>Log a past climb</div><div style={{fontSize:11.5,color:C.textSub,marginTop:1,lineHeight:1.5}}>Search, or drill into a country and state, to find the route, peak, boulder or hike you did. Includes climbs from before you joined.</div></div><button onClick={onClose} style={POP_CLOSE} aria-label="Close">✕</button></div></div><div style={{padding:16,flex:"1 1 auto",minHeight:0,overflowY:"auto",overscrollBehavior:"contain",WebkitOverflowScrolling:"touch"}}>{USE_DB?<DbClimbPicker onPickRoute={function(r){onPick(r);}}/>:(!pArea?<div><div style={{fontSize:12,color:C.textMuted,marginBottom:9,lineHeight:1.5}}>Pick a state to drill into its crags &amp; climbs.</div>{states.map(function(st){return <div key={st.id} {...clickable(function(){setPArea(st);setPq("");})} style={rowStyle}><span style={{fontSize:13.5,fontWeight:700,color:C.text}}>{st.name}</span><span style={{fontSize:12,color:C.textMuted}}>{ac(st.id)+(ac(st.id)===1?" climb ›":" climbs ›")}</span></div>;})}</div>:<div><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:9}}><button onClick={up} style={POP_BACK}>{"← "+(pArea.areaType==="state"?"States":((parent&&parent.name)||"Back"))}</button><span style={{flex:1,minWidth:0,fontSize:13.5,fontWeight:700,color:C.text,overflowWrap:"anywhere"}}>{pArea.name}</span></div><SearchSplit defaultMode="routes" scope={stId} query={pq} onQuery={setPq} onArea={function(a){setPArea(a);setPq("");}} onRoute={function(r){onPick(r);}}/>{!pq.trim()?<div style={{marginTop:6}}>{kids.map(function(ch){return <div key={ch.id} {...clickable(function(){setPArea(ch);setPq("");})} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"10px 4px",cursor:"pointer",borderBottom:"1px solid "+C.borderLight}}><span style={{fontSize:13.5,fontWeight:700,color:C.text}}>{ch.name}</span><span style={{fontSize:12,color:C.textMuted}}>{ac(ch.id)+" ›"}</span></div>;})}{here.map(function(r){return <div key={r.id} {...clickable(function(){onPick(r);})} style={climbRow}><div style={{flex:1,minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,color:C.text,overflowWrap:"anywhere"}}>{r.name}</div><div style={{fontSize:10.5,color:C.textMuted}}>{cragOf(r)+" · "+(r.grade||"")}</div></div><span style={{color:C.blue,fontSize:12,fontWeight:700,flexShrink:0}}>{"Log →"}</span></div>;})}{!kids.length&&!here.length?<EmptyState C={C} icon="info">Nothing here.</EmptyState>:null}</div>:null}</div>)}</div></div></div>),document.body);
}
