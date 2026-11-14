import type { CSSProperties } from "react";
import { C } from "../../ClimbMatchCore.jsx";
import { useAreaChildren } from "../../lib/db.js";
import LoadingRows from "./LoadingRows.tsx";

/** The columns of an `areas` row this level reads (`useAreaChildren` selects every column). */
export interface DbArea { id: string; name: string; route_count?: number | null; }
/** The slice of a `useAreaChildren` result this component reads. */
interface AreaQuery { data?: DbArea[] | null; isLoading?: boolean; isError?: boolean; }

export interface DbAreaLevelProps {
  /** The area whose children fill this select; nothing renders without one. */
  parentId?: string | null;
  value?: string | null;
  placeholder: string;
  /** The picked child row, or null when the placeholder is chosen. */
  onPick: (area: DbArea | null) => void;
  /** The picker's select style. */
  sel?: CSSProperties;
}

/**
 * One level of the add-a-climb area picker: a select over the children of the level above. A loading read says
 * so, a failed read says it failed (never "this area holds nothing"), and a childless area renders nothing —
 * the picker keeps offering levels until the chosen area has no children (only a leaf can hold a route).
 */
export default function DbAreaLevel({parentId,value,placeholder,onPick,sel}: DbAreaLevelProps){
  const q: AreaQuery=useAreaChildren(parentId,{enabled:!!parentId});
  const kids=q.data||[];
  if(!parentId)return null;
  if(q.isLoading)return <LoadingRows C={C} label="Loading areas…" style={{padding:"6px 2px"}}/>;
  /* A failed children read must not read as "this area holds nothing" — the same sentence
     DbAreaTreeNode says one screen over. Silence is worse here than there: the climber would
     conclude they had reached a leaf and try to file a route against a container. */
  if(q.isError)return <div style={{fontSize:12,color:C.amber,padding:"6px 2px",lineHeight:1.45}}>{"Couldn’t load what’s inside this area — this is not a claim it holds nothing. Try again in a moment."}</div>;
  if(!kids.length)return null;
  return <div style={{position:"relative",marginBottom:7}}><select aria-label={placeholder} value={value||""} onChange={e=>{const v=e.target.value;onPick(v?(kids.find(k=>k.id===v)||null):null);}} style={sel}><option value="">{placeholder}</option>{kids.map(k=><option key={k.id} value={k.id}>{k.name+(k.route_count?(" · "+k.route_count+" climb"+(k.route_count===1?"":"s")):"")}</option>)}</select></div>;
}
