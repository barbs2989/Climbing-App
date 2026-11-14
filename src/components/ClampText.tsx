import { useState, type CSSProperties } from "react";
import { C } from "../../ClimbMatchCore.jsx";

export interface ClampTextProps {
  text?: string | null;
  style?: CSSProperties;
}

const COMMENT_CLAMP_CHARS=240;

/**
 * A comment clamped to three lines with Read more / Show less once it runs past `COMMENT_CLAMP_CHARS` (moved here
 * with it — nothing else on the page reads it). Reads `C` at render time. Moved verbatim from RouteDetail.jsx; only the types were added.
 */
export default function ClampText({text,style}: ClampTextProps){const [open,setOpen]=useState(false);const t=String(text||"");const long=t.length>COMMENT_CLAMP_CHARS;
  return <div style={style}>
    <div style={long&&!open?{display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden",whiteSpace:"pre-wrap",wordBreak:"break-word"}:{whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{t}</div>
    {long?<button onClick={function(){setOpen(!open);}} aria-expanded={open} style={{minHeight:44,background:"none",border:"none",padding:"4px 0 0",color:C.blue,fontSize:12,fontWeight:700,cursor:"pointer"}}>{open?"Show less":"Read more"}</button>:null}
  </div>;}
