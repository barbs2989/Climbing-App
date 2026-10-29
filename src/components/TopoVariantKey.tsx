import { C } from "../../ClimbMatchCore.jsx";
import { TOPO_VAR, varTag } from "../../lib/topoMarks.jsx";
import VarTag from "./VarTag.tsx";
import TopoSwatch from "./TopoSwatch.tsx";
import type { TopoPoint } from "./TopoLineOverlay.tsx";

export interface TopoVariantKeyProps {
  variants?: (TopoPoint[] | null)[] | null;
  /** What each variation is, aligned with `variants` by index (topo_lines.variant_labels). */
  labels?: (string | null)[] | null;
}

/** The key's rows for a topo's variations: the tag each wears on the photo, and what it is. Reads `C` at render time. Moved verbatim from RouteDetail.jsx; only the types were added. */
export default function TopoVariantKey({variants,labels}: TopoVariantKeyProps){
  const vs: number[]=[];(variants||[]).forEach(function(v,i){if(v&&v.length>=2)vs.push(i);});
  if(!vs.length)return null;
  return <div style={{marginBottom:10}}>{vs.map(function(vi,k){const t=String((labels||[])[vi]||"").trim();return <div key={k} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:5,fontSize:12.5,lineHeight:1.4}}><VarTag text={varTag(k,vs.length)} style={{marginTop:2}}/><span style={{marginTop:7,lineHeight:0}}><TopoSwatch color={TOPO_VAR} dashed/></span><div style={{minWidth:0,overflowWrap:"anywhere"}}><span style={{fontWeight:600,color:C.text}}>Variation</span>{t?<span style={{color:C.textSub}}>{" — "+t}</span>:null}</div></div>;})}</div>;
}
