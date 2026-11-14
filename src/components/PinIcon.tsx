import type { ReactNode } from "react";
import { C } from "../../ClimbMatchCore.jsx";
import { PIN_GLYPHS, pinColor } from "../../lib/topoMarks.jsx";
import GradeTag from "./GradeTag.tsx";

export interface PinIconProps {
  /** The marker's category (belay, rappel, grade, hazard…). */
  cat: string;
  /** Size in px (default 18). */
  size?: number;
  /** The marker being edited: a blue ring. */
  on?: boolean;
}

/**
 * A topo marker's icon: its category's glyph on its colour, a red warning triangle for a hazard, and for a grade the
 * grade text itself. Decorative (aria-hidden). Reads `C` at render time. Moved verbatim from RouteDetail.jsx with the
 * props type added; the glyph is looked up by category NAME through a `Record` view of `PIN_GLYPHS` (`glyphs`), so an
 * unknown category still falls back to the plain dot.
 */
export default function PinIcon({cat,size,on}: PinIconProps){
  const sz=size||18;const glyphs: Record<string,ReactNode>=PIN_GLYPHS;
  if(cat==="grade")return <GradeTag text="5.9" size={Math.max(10,Math.round(sz*0.62))} on={on}/>;
  if(cat==="hazard")return <span aria-hidden="true" style={{display:"inline-block",width:sz,height:sz,flexShrink:0,pointerEvents:"none",lineHeight:0,filter:on?"drop-shadow(0 0 3px "+C.blue+")":"drop-shadow(0 1px 2px rgba(0,0,0,0.8))"}}>
    <svg viewBox="0 0 16 16" width={sz} height={sz} style={{display:"block",overflow:"visible"}}><path d="M8 1.2 L15.2 14.6 L0.8 14.6 Z" fill={C.red} stroke="#fff" strokeWidth={on?1.6:1.2} strokeLinejoin="round"/>{PIN_GLYPHS.hazard}</svg>
  </span>;
  return <span aria-hidden="true" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:sz,height:sz,borderRadius:"50%",background:pinColor(cat),border:(on?2:1.5)+"px solid #fff",boxShadow:on?"0 0 0 3px "+C.blue+"66":"0 1px 3px rgba(0,0,0,0.7)",boxSizing:"border-box",flexShrink:0,pointerEvents:"none"}}>
    <svg viewBox="0 0 16 16" width={Math.round(sz*0.74)} height={Math.round(sz*0.74)} style={{display:"block"}}>{glyphs[cat]||<circle cx="8" cy="8" r="2.5" fill="#fff"/>}</svg>
  </span>;
}
