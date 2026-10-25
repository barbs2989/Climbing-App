import { useState, type CSSProperties } from "react";
import { C } from "../../ClimbMatchCore.jsx";
import { dbRouteToCamel, useAreaChildren, useAreaRoutes, useAreaSearch, useCountries, useStates, useSubtreeRoutes } from "../../lib/db.js";
import { countryOfArea } from "../../lib/countries.js";
import { displayGrade } from "../../lib/grade.js";
import { clickable } from "../../lib/clickable";
import { POP_BACK } from "../../lib/popupChrome.js";
import DbCountryAreaHits from "./DbCountryAreaHits.tsx";
import LoadingRows from "./LoadingRows.tsx";

/** An `areas` row as the drill-down stacks them: a country, a state, a crag — or a search hit. */
export interface PickArea {
  id: string;
  name: string;
  area_type?: string | null;
  route_count?: number | null;
  parent_name?: string | null;
}
/** A `routes` row as `useAreaRoutes({full:true})` and `useSubtreeRoutes` return it; `dbRouteToCamel` takes the whole row. */
export interface PickRouteRow {
  id: string | number;
  name: string;
  [k: string]: unknown;
}
/** The route handed back, in `dbRouteToCamel` shape; only these two fields are promised to the caller. */
export interface PickedRoute {
  id: string | number;
  name: string;
}
export interface DbClimbPickerProps {
  onPickRoute: (route: PickedRoute) => void;
  /** Routes already picked: each row draws a tick box, and the "Log →" hint is dropped. */
  selectedIds?: ReadonlyArray<string | number> | null;
  /** A Details button on each route row that opens it without picking it. */
  onViewRoute?: (route: PickedRoute) => void;
  /** Open the drill-down AT this place (a search hit the climber tapped); its first ← goes to `onExit`. */
  start?: PickArea | null;
  onExit?: () => void;
  /** The row hint when nothing is selected; "Log →" when unset. */
  pickLabel?: string;
}

/** THE CLIMB PICKER for the log form, the lists manager, the partner search and the catch sheet: search every area, or drill country → state → crag → climb; a tapped climb comes back as a `dbRouteToCamel` row. */
export default function DbClimbPicker({onPickRoute,selectedIds,onViewRoute,start,onExit,pickLabel}: DbClimbPickerProps){
  /* `start` opens the drill-down AT a place (a search hit the climber tapped), and `onExit` is
     where its first ← goes: back to the results they tapped it from, not to the country list. */
  const [pStack,setPStack]=useState<PickArea[]>(start?[start]:[]);const [pq,setPq]=useState("");
  const pArea=pStack.length?pStack[pStack.length-1]:null;
  /* COUNTRY FIRST. The root used to be useStates() — every child of every root in one
     alphabetical list, so British Columbia sat between Arkansas and California — and the root
     search was scoped to the literal "usa", so no Canadian crag could be found from here at all.
     The root now lists the countries, and a country is an ordinary level of the drill-down
     (country → state/province → …). useStates is kept ONLY as the offline fallback: useCountries
     has none, and a downloaded state must stay reachable with no signal. */
  const countriesQ=useCountries();
  const statesQ=useStates();
  const countries: PickArea[]=(countriesQ.data||[]).filter(function(c: PickArea){return (c.route_count||0)>0;});
  const childrenQ=useAreaChildren(pArea?pArea.id:null,{enabled:!!pArea});
  const routesQ=useAreaRoutes(pArea?pArea.id:null,{full:true});/* full rows: a picked route goes to the log form, not through openRoute's hydration */
  const atCountry=!!pArea&&pArea.area_type==="country";
  const areaSearchQ=useAreaSearch(pArea?pArea.id:null,pq);
  /* Route search is scoped to an area on purpose, and the null root is not a tidy-up: at
     root_id "usa" `routes_in_subtree` exceeds the 3s anon statement_timeout every time —
     measured at 3.1s/3.8s/6.7s, always 57014, never a result. This hook took `scopeId`,
     which is "usa" until you pick a state, so the picker fired a guaranteed-failing query
     on mount (q null, so it was asking for "the first 40 routes in the United States") and
     again on every keystroke. Nothing showed, because its output only renders inside the
     pArea branch. Areas ARE searchable nationwide — `areas_in_subtree` over 47k rows
     answers in ~0.5s — so that is what the root offers. A COUNTRY is the same case as the old
     root (it IS a root), so route search stays off there too and only areas are searched. */
  const routeSearchQ=useSubtreeRoutes(pArea&&!atCountry?pArea.id:null,{q:pq.trim()||undefined,pageSize:40});
  const up=function(){if(pStack.length===1&&onExit){onExit();return;}setPStack(function(s){return s.slice(0,-1);});setPq("");};
  /* A country's children are its STATES, and someone logging a past climb is looking for one they
     already know by name — so they are alphabetical here, not most-climbed first (the order
     useAreaChildren returns, which the Climbs browser keeps). */
  const kids: PickArea[]=(childrenQ.data||[]).filter(function(c: PickArea){return (c.route_count||0)>0;}).sort(atCountry?function(a: PickArea,b: PickArea){return String(a.name||"").localeCompare(String(b.name||""));}:function(){return 0;});
  const here: PickRouteRow[]=routesQ.data||[];
  const rowStyle: CSSProperties={display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"11px 12px",borderRadius:10,marginBottom:8,background:C.card,border:"1px solid "+C.border,cursor:"pointer"};
  const climbRow: CSSProperties={display:"flex",alignItems:"center",gap:10,padding:"9px 4px",cursor:"pointer",borderBottom:"1px solid "+C.borderLight};
  const climbRowItem=function(r: PickRouteRow){const on=selectedIds?selectedIds.indexOf(r.id)>=0:false;return <div key={r.id} {...clickable(function(){onPickRoute(dbRouteToCamel(r));})} style={climbRow}>{selectedIds?<span style={{width:18,height:18,borderRadius:5,border:"1.5px solid "+(on?C.blue:C.border),background:on?C.blueSolid:"transparent",color:"#fff",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{on?"✓":""}</span>:null}<div style={{flex:1,minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</div><div style={{fontSize:10.5,color:C.textMuted}}>{displayGrade(r)}</div></div>{onViewRoute?<button onClick={function(e){e.stopPropagation();onViewRoute(dbRouteToCamel(r));}} style={{flexShrink:0,fontSize:10.5,fontWeight:700,color:"#fff",background:C.blueBg,border:"1px solid "+C.blueDim,borderRadius:7,padding:"3px 8px",cursor:"pointer",marginRight:selectedIds?8:0}}>{"Details"}</button>:null}{!selectedIds?<span style={{color:C.blue,fontSize:12,fontWeight:700,flexShrink:0}}>{pickLabel||"Log →"}</span>:null}</div>;};
  if(!pArea){
    /* Until now the only way in was to scroll fifty states and drill state → region → crag →
       route. If you knew you wanted Liberty Bell you still had to know it was in Washington.
       Searching areas from here answers that directly, and jumping to a match puts you in the
       drill-down with its climbs already listed. `areas_in_subtree` takes ONE root, so the
       search runs once per country and each country's hits are listed under its own name. */
    const _q=pq.trim();
    let _multi=countries.length>1;
    const _countryRow=function(c: PickArea){return <div key={c.id} {...clickable(function(){setPStack([c]);setPq("");})} style={rowStyle}><span style={{flex:1,minWidth:0,fontSize:13.5,fontWeight:700,color:C.text}}>{c.name}</span><span style={{fontSize:12,color:C.textMuted,flexShrink:0,whiteSpace:"nowrap"}}>{(c.route_count||0).toLocaleString()+((c.route_count||0)===1?" climb ›":" climbs ›")}</span></div>;};
    /* The countries read failed (it has no offline fallback) but the states read did not: list
       the states as before rather than show nothing with a downloaded state in IndexedDB. */
    const _offlineStates=!!countriesQ.error&&(statesQ.data||[]).length>0;
    /* ...and search those states' countries, read off their paths, so offline search still runs. */
    const _searchRoots: PickArea[]=_offlineStates?Object.keys((statesQ.data||[]).reduce(function(m: Record<string, 1>,st: PickArea){const c=countryOfArea(st);if(c)m[c]=1;return m;},{})).map(function(id){return {id:id,name:id};}):countries;
    _multi=_searchRoots.length>1;
    return <div><input aria-label="Search crags, peaks and areas" value={pq} onChange={function(e){setPq(e.target.value);}} placeholder="Search a crag, peak or area…" style={{width:"100%",padding:"10px 12px",borderRadius:9,border:"1px solid "+C.border,background:C.surface,color:C.text,fontSize:14,boxSizing:"border-box",outline:"none",marginBottom:9}}/>{_q?<div>{_searchRoots.map(function(c){return <DbCountryAreaHits key={c.id} country={c} q={pq} showName={_multi} rowStyle={climbRow} onOpen={function(a){setPStack([a]);setPq("");}}/>;})}{countriesQ.isLoading?<div style={{fontSize:13,color:C.textMuted,padding:"12px 4px",textAlign:"center"}}>Searching…</div>:null}{(countriesQ.error&&!_offlineStates)?<div style={{fontSize:12.5,color:C.red,padding:"12px 4px",textAlign:"center"}}>Couldn't run that search — check your connection.</div>:null}<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.5,padding:"8px 4px 0"}}>Searching areas. Open one to search its climbs by name.</div></div>:<div><div style={{fontSize:12,color:C.textMuted,marginBottom:9,lineHeight:1.5}}>{_offlineStates?"Or pick a state to drill into its crags & climbs.":"Or pick a country to drill into its crags & climbs."}</div>{countriesQ.isLoading?<LoadingRows C={C} label="Loading countries…" style={{padding:"12px 4px"}}/>:null}{(countriesQ.error&&!_offlineStates)?<div style={{fontSize:12.5,color:C.red,padding:"12px 4px",textAlign:"center"}}>Couldn't load countries — check your connection.</div>:null}{_offlineStates?(statesQ.data||[]).map(function(st: PickArea){return <div key={st.id} {...clickable(function(){setPStack([st]);setPq("");})} style={rowStyle}><span style={{flex:1,minWidth:0,fontSize:13.5,fontWeight:700,color:C.text}}>{st.name}</span><span style={{fontSize:12,color:C.textMuted,flexShrink:0,whiteSpace:"nowrap"}}>{(st.route_count||0)+((st.route_count||0)===1?" climb ›":" climbs ›")}</span></div>;}):countries.map(_countryRow)}</div>}</div>;
  }
  return <div><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:9}}><button onClick={up} style={POP_BACK}>{"← "+(pStack.length===1?(onExit?"Results":"Countries"):((pStack[pStack.length-2]&&pStack[pStack.length-2].name)||"Back"))}</button><span style={{flex:1,minWidth:0,fontSize:13.5,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pArea.name}</span></div><input aria-label={"Search "+pArea.name} value={pq} onChange={function(e){setPq(e.target.value);}} placeholder={"Search "+pArea.name+"…"} style={{width:"100%",padding:"10px 12px",borderRadius:9,border:"1px solid "+C.border,background:C.surface,color:C.text,fontSize:14,boxSizing:"border-box",outline:"none",marginBottom:9}}/>{pq.trim()?<div>{(areaSearchQ.data||[]).map(function(a: PickArea){return <div key={a.id} {...clickable(function(){setPStack(function(s){return s.concat(a);});setPq("");})} style={climbRow}><div style={{flex:1,minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</div><div style={{fontSize:10.5,color:C.textMuted}}>{a.parent_name||""}</div></div>{(a.route_count||0)>0?<span style={{fontSize:12,color:C.textMuted,flexShrink:0,whiteSpace:"nowrap"}}>{a.route_count+" ›"}</span>:null}</div>;})}{(routeSearchQ.data||[]).map((r: PickRouteRow)=>climbRowItem(r))}{!(areaSearchQ.data||[]).length&&!(routeSearchQ.data||[]).length?((areaSearchQ.error||routeSearchQ.error)?<div style={{fontSize:13,color:C.amber,padding:"12px 4px",textAlign:"center"}}>Couldn’t search — try again in a moment.</div>:<div style={{fontSize:13,color:C.textMuted,padding:"12px 4px",textAlign:"center"}}>No matches.</div>):null}{/* Same reasoning as the browse branch below, which already had it: both search queries yield [] on failure, so without this a failed read asserts that the climber’s search found nothing. Combining the two is right HERE and only here -- one sentence is drawn from both, so either failing makes the result set incomplete; everywhere else a flag keys on ONE query. `.error` rather than `.isError` to match the neighbour rather than introduce a second idiom two lines away. */}</div>:<div>{kids.map(function(ch){return <div key={ch.id} {...clickable(function(){setPStack(function(s){return s.concat(ch);});setPq("");})} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"10px 4px",cursor:"pointer",borderBottom:"1px solid "+C.borderLight}}><span style={{flex:1,minWidth:0,fontSize:13.5,fontWeight:700,color:C.text}}>{ch.name}</span><span style={{fontSize:12,color:C.textMuted,flexShrink:0,whiteSpace:"nowrap"}}>{(ch.route_count||0)+" ›"}</span></div>;})}{here.map(climbRowItem)}{!kids.length&&!here.length?((childrenQ.error||routesQ.error)?<div style={{fontSize:13,color:C.amber,padding:"12px 4px",textAlign:"center"}}>Couldn’t load this area.</div>:<div style={{fontSize:13,color:C.textMuted,padding:"12px 4px",textAlign:"center"}}>Nothing here yet.</div>):null}{/* the error branch is not decoration: both queries yield [] on failure, so without it a failed read asserted "Nothing here yet." about an area that may hold hundreds of climbs */}</div>}</div>;
}
