import { useMemo, useState, type CSSProperties } from "react";
import { ATYPE, C, MOUNTAINS, ROUTES, areaPathNames, fuzzyMatch, fuzzyMatchAny, inArea } from "../../ClimbMatchCore.jsx";
import { clickable } from "../../lib/clickable";
import Lbl from "./Lbl.tsx";
import type { SeedArea } from "./AreaRegionSelect.tsx";
import EmptyState from "./EmptyState.tsx";

/** A seed route (`ROUTES` row) as the results list names it. */
export interface SeedRoute {
  id: string | number;
  name: string;
  grade?: string | null;
  mountainId?: string | number | null;
}
export interface SearchSplitProps {
  onArea?: (a: SeedArea) => void;
  onRoute?: (r: SeedRoute) => void;
  /** Route ids already picked: the routes list draws a tick box when this is given. */
  selected?: ReadonlyArray<string | number> | null;
  defaultMode?: "areas" | "routes";
  /** Areas mode offers "+ Add all" on each hit. */
  addArea?: boolean;
  /** A shorter results pane (34vh instead of 46vh). */
  compact?: boolean;
  /** Limit hits to this area's subtree (`inArea`). */
  scope?: string | number | null;
  /** Controlled query; uncontrolled when absent. */
  query?: string;
  onQuery?: (q: string) => void;
  /** Routes mode shows a Details button that opens the route without picking it. */
  onView?: (r: SeedRoute) => void;
}

/** The seed catalog's two-mode search (Areas · Routes) with a results pane: the Climbs tab's fallback, the lists manager's picker and core's log picker all render it. */
export default function SearchSplit({onArea,onRoute,selected,defaultMode,addArea,compact,scope,query,onQuery,onView}: SearchSplitProps){
  /* `ATYPE` keyed by area type, for the hit's sub-line. Read HERE, at render time, never at module scope: core imports
     this component back, so a module-scope read runs before core has evaluated (the 2026-10-23 outage). */
  const atype: Record<string, string> = ATYPE;
  const [mode,setMode]=useState(defaultMode||"areas");
  const [iq,setIq]=useState("");const q=query!==undefined?query:iq;const setQ=onQuery||setIq;
  const qq=q.trim();const sel=selected||[];
  const tab=(on: boolean): CSSProperties=>({flex:1,padding:"7px 0",textAlign:"center",fontSize:12.5,fontWeight:700,cursor:"pointer",borderRadius:7,background:on?C.blueSolid:"transparent",color:on?"#fff":C.textSub});
  const fld: CSSProperties={width:"100%",padding:"10px 12px",borderRadius:9,border:"1px solid "+C.border,background:C.surface,color:C.text,fontSize:14,boxSizing:"border-box",outline:"none"};
  const row: CSSProperties={display:"flex",alignItems:"center",gap:10,padding:"9px 4px",cursor:"pointer",borderBottom:"1px solid "+C.borderLight};
  const sub: CSSProperties={fontSize:11,color:C.textMuted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"};
  const nm: CSSProperties={fontSize:13.5,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"};
  const parentName=(a: SeedArea)=>{const p=a.parentId?MOUNTAINS.find(x=>x.id===a.parentId):null;return p?p.name:"";};
  const cragName=(r: SeedRoute)=>{const m=MOUNTAINS.find(x=>x.id===r.mountainId);return m?m.name:"";};
  const areas=useMemo(()=>qq?MOUNTAINS.filter(m=>m.areaType&&["world","country"].indexOf(m.areaType)<0&&fuzzyMatch(qq,m.name)&&(!scope||inArea(m.id,scope))).slice(0,40):[],[qq,scope]);
  const routes=useMemo(()=>qq?ROUTES.filter(r=>(fuzzyMatchAny(qq,r.name,areaPathNames(r.mountainId)))&&(!scope||inArea(r.mountainId,scope))).slice(0,60):[],[qq,scope]);
  return <div><div style={{display:"flex",gap:4,background:C.surface,border:"1px solid "+C.border,borderRadius:9,padding:3,marginBottom:8}}><div {...clickable(()=>setMode("areas"))} style={tab(mode==="areas")}>{<Lbl s={"📍 Areas"}/>}</div><div {...clickable(()=>setMode("routes"))} style={tab(mode==="routes")}>{<Lbl s={"Routes"}/>}</div></div><input aria-label={mode==="areas"?"Search areas, crags, peaks":"Search routes & boulders"} value={q} onChange={e=>setQ(e.target.value)} placeholder={mode==="areas"?"Search areas, crags, peaks…":"Search routes & boulders…"} style={fld}/>{qq?<div style={{marginTop:6,maxHeight:compact?"34vh":"46vh",overflowY:"auto",overscrollBehavior:"contain"}}>{mode==="areas"?(areas.length?areas.map(a=><div key={a.id} {...clickable(()=>onArea&&onArea(a))} style={row}><span style={{fontSize:16,flexShrink:0}}>{<Lbl s={"📍"}/>}</span><div style={{flex:1,minWidth:0}}><div style={nm}>{a.name}</div><div style={sub}>{(atype[a.areaType||""]||a.areaType)+(parentName(a)?" · "+parentName(a):"")}</div></div>{addArea?<span style={{fontSize:12,fontWeight:700,color:C.blue,flexShrink:0}}>{"+ Add all"}</span>:null}</div>):<EmptyState C={C} icon="search">{"No areas match."}</EmptyState>):(routes.length?routes.map(r=>{const on=sel.indexOf(r.id)>=0;return <div key={r.id} {...clickable(()=>onRoute&&onRoute(r))} style={row}>{selected?<span style={{width:18,height:18,borderRadius:5,border:"1.5px solid "+(on?C.blue:C.border),background:on?C.blueSolid:"transparent",color:"#fff",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{on?"✓":""}</span>:null}<div style={{flex:1,minWidth:0}}><div style={nm}>{r.name}</div><div style={sub}>{cragName(r)}</div></div>{onView?<button onClick={e=>{e.stopPropagation();onView(r);}} style={{flexShrink:0,fontSize:10.5,fontWeight:700,color:"#fff",background:C.blueBg,border:"1px solid "+C.blueDim,borderRadius:7,padding:"3px 8px",cursor:"pointer"}}>{"Details"}</button>:null}<span style={{fontSize:12,color:C.textMuted,flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.grade}</span></div>;}):<EmptyState C={C} icon="search">{"No routes match."}</EmptyState>)}</div>:null}</div>;
}
