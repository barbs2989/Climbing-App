import { useState } from "react";
import { C } from "../../ClimbMatchCore.jsx";

export interface TopoCaptionProps {
  /** The uploader's caption; nothing renders without one. */
  text?: string | null;
}

const CAPTION_FOLD=320;

/**
 * The uploader's caption under an enlarged topo, folded behind Show more past ~5 lines (`CAPTION_FOLD` characters,
 * which moved here with it — nothing else reads it). Reads `C` at render time. Moved verbatim from RouteDetail.jsx; only the types were added.
 */
export default function TopoCaption({text}: TopoCaptionProps){
  const [open,setOpen]=useState(false);
  const t=String(text||"").trim();if(!t)return null;
  const long=t.length>CAPTION_FOLD||t.split("\n").length>5;
  return <div style={{marginBottom:12}}>
    <div style={{fontSize:13,color:C.text,lineHeight:1.5,whiteSpace:"pre-wrap",overflowWrap:"anywhere",maxHeight:long&&!open?"7.5em":"none",overflow:"hidden"}}>{t}</div>
    {long?<button onClick={function(){setOpen(!open);}} aria-expanded={open} style={{minHeight:44,background:"none",border:"none",padding:"6px 0",color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>{open?"Show less":"Show more"}</button>:null}
  </div>;
}
