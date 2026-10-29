import type { ReactNode } from "react";
import { C } from "../../ClimbMatchCore.jsx";
import { FACT_FIELD } from "../../lib/cragFactField.js";

/** One fact row: its label, its value, and (third) whether it is still missing, which draws an Add. */
export type CragFact = [string, ReactNode, unknown?];
export interface CragFactRowsProps {
  rows: CragFact[];
  /** Opens the editor at a field; without it no Add is drawn. */
  onEdit?: ((field: string) => void) | null;
}

/** The rows of one crag fact section: what is on file first, then each missing fact with its own Add. Reads `C` at render time. Moved verbatim from RouteDetail.jsx; only the types were added. */
export default function CragFactRows({rows,onEdit}: CragFactRowsProps){const have=rows.filter(function(f){return !f[2];}),miss=rows.filter(function(f){return f[2];});
  return <>{have.concat(miss).map(function(f,i){const add=f[2]&&onEdit&&FACT_FIELD[f[0]];return <div key={f[0]} style={{display:"flex",gap:12,alignItems:"center",padding:"10px 0",borderTop:i===0?"none":"1px solid "+C.borderLight}}><span style={{fontSize:10.5,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:0.4,lineHeight:1.35,width:92,flexShrink:0}}>{f[0]}</span><span style={{fontSize:13,color:C.text,lineHeight:1.5,flex:1,minWidth:0,overflowWrap:"anywhere"}}>{f[1]}</span>{add?<button onClick={function(){onEdit(FACT_FIELD[f[0]]);}} aria-label={"Add "+f[0].toLowerCase()} style={{flexShrink:0,padding:"4px 10px",borderRadius:8,border:"1px solid "+C.border,background:C.surface,color:C.blue,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Add</button>:null}</div>;})}</>;}
