import type { CSSProperties } from "react";
import { C } from "../../ClimbMatchCore.jsx";
import { useAreaSearch } from "../../lib/db.js";
import { clickable } from "../../lib/clickable";
import EmptyState from "./EmptyState.tsx";

/** One area hit of `areas_in_subtree`: the area, its parent's name for disambiguation, and its climb count. */
export interface AreaHit { id: string; name: string; parent_name?: string | null; route_count: number; }
/** The slice of a `useAreaSearch` result this component reads. */
interface SearchQuery { data?: AreaHit[] | null; isLoading?: boolean; error?: unknown; }

export interface DbCountryAreaHitsProps {
  country: { id: string; name: string };
  /** The typed query; the hook debounces it. */
  q?: string | null;
  /** Head the list with the country's name (when more than one country is searched). */
  showName?: boolean;
  rowStyle?: CSSProperties;
  onOpen: (area: AreaHit) => void;
}

/* One country's area hits for DbClimbPicker's root search. A component per country because
   `areas_in_subtree` takes one root and a hook cannot be called in a loop. Each country states
   its own "no match", so a miss in Canada is never read as a miss everywhere. */
export default function DbCountryAreaHits({country,q,showName,rowStyle,onOpen}: DbCountryAreaHitsProps){
  const _q=(q||"").trim();
  const searchQ: SearchQuery=useAreaSearch(country.id,q);
  const hits=searchQ.data||[];
  return <div style={{marginBottom:showName?10:0}}>{showName?<div style={{fontSize:11,fontWeight:800,letterSpacing:0.5,textTransform:"uppercase",color:C.textMuted,padding:"6px 4px 2px"}}>{country.name}</div>:null}{searchQ.isLoading?<div style={{fontSize:13,color:C.textMuted,padding:"12px 4px",textAlign:"center"}}>Searching…</div>:null}{searchQ.error?<div style={{fontSize:12.5,color:C.red,padding:"12px 4px",textAlign:"center"}}>Couldn't run that search — check your connection.</div>:null}{hits.map(function(a){return <div key={a.id} {...clickable(function(){onOpen(a);})} aria-label={"Open "+a.name+(a.parent_name?" in "+a.parent_name:"")} style={rowStyle}><div style={{flex:1,minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,color:C.text,overflowWrap:"anywhere"}}>{a.name}</div><div style={{fontSize:10.5,color:C.textMuted,overflowWrap:"anywhere"}}>{a.parent_name||""}</div></div>{a.route_count>0?<span style={{fontSize:12,color:C.textMuted,flexShrink:0,whiteSpace:"nowrap"}}>{a.route_count+" ›"}</span>:null}</div>;})}{(!searchQ.isLoading&&!searchQ.error&&!hits.length)?<EmptyState C={C} icon="search">{"No area"+(showName?" in "+country.name:"")+" matches “"+_q+"”."}</EmptyState>:null}</div>;
}
