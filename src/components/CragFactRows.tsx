import type { ReactNode } from "react";
import { C } from "../../ClimbMatchCore.jsx";
import { AREA_FACT_FIELD, FACT_FIELD } from "../../lib/cragFactField.js";

/** One fact row: its label, its value, and (third) whether it is still missing. `true` is missing on the
    route; a string is missing on the route's AREA and names it ("crag", "wall", "peak"), so its Add edits
    the area once for every route there. */
export type CragFact = [string, ReactNode, unknown?];
export interface CragFactRowsProps {
  rows: CragFact[];
  /** Opens the route editor at a field; without it no Add is drawn for a route fact. */
  onEdit?: ((field: string) => void) | null;
  /** Opens the AREA editor at a field (AREA_FACT_FIELD); without it an area fact's Add opens the route editor. */
  onEditArea?: ((field: string) => void) | null;
}

/** The facts still missing, as ONE line rather than a "Not on file yet" row each (owner, 2026-11-13). A crag
    route lacked 8 to 11 of its facts on 95% of 303,571 routes, so the card was mostly placeholder rows. Each
    name stays its own button, opening the editor AT that field: one tap per gap, as before. */
export function MissingFactsLine({rows,onEdit,onEditArea,first}: CragFactRowsProps&{first?: boolean}){if(!rows.length)return null;
  return <div style={{display:"flex",gap:12,alignItems:"baseline",padding:"10px 0",borderTop:first?"none":"1px solid "+C.borderLight}}><span style={{fontSize:10.5,fontWeight:700,color:C.label,textTransform:"uppercase",letterSpacing:0.4,lineHeight:1.35,width:92,flexShrink:0}}>Not on file yet</span><span style={{display:"flex",flexWrap:"wrap",gap:6,flex:1,minWidth:0}}>{rows.map(function(f){const area=typeof f[2]==="string"?f[2]:null;const aKey=area&&onEditArea?AREA_FACT_FIELD[f[0]]:null;const rKey=onEdit?FACT_FIELD[f[0]]:null;const go=aKey?function(){(onEditArea as (k: string)=>void)(aKey);}:rKey?function(){(onEdit as (k: string)=>void)(rKey);}:null;const lbl=f[0]+(aKey?" · "+area:"");
    return go?<button key={f[0]} onClick={go} aria-label={"Add "+f[0].toLowerCase()+(aKey?" for the whole "+area:"")} title={aKey?"Fills every route on this "+area:undefined} style={{padding:"3px 9px",borderRadius:8,border:"1px solid "+C.border,background:C.surface,color:C.blue,fontSize:12,fontWeight:700,cursor:"pointer"}}>{"+ "+lbl}</button>:<span key={f[0]} style={{fontSize:12.5,color:C.textMuted,fontStyle:"italic"}}>{f[0]}</span>;})}</span></div>;}

/** The rows of one crag fact section: what is on file, then the missing ones on one line. Reads `C` at render time. */
export default function CragFactRows({rows,onEdit,onEditArea}: CragFactRowsProps){const have=rows.filter(function(f){return !f[2];}),miss=rows.filter(function(f){return f[2];});
  return <>{have.map(function(f,i){return <div key={f[0]} style={{display:"flex",gap:12,alignItems:"center",padding:"10px 0",borderTop:i===0?"none":"1px solid "+C.borderLight}}><span style={{fontSize:10.5,fontWeight:700,color:C.label,textTransform:"uppercase",letterSpacing:0.4,lineHeight:1.35,width:92,flexShrink:0}}>{f[0]}</span><span style={{fontSize:13,color:C.text,lineHeight:1.5,flex:1,minWidth:0,overflowWrap:"anywhere"}}>{f[1]}</span></div>;})}<MissingFactsLine rows={miss} onEdit={onEdit} onEditArea={onEditArea} first={!have.length}/></>;}
