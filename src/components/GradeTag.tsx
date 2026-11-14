import type { CSSProperties } from "react";
import { C } from "../../ClimbMatchCore.jsx";

export interface GradeTagProps {
  /** The grade to print; "?" when there is none. */
  text?: string | null;
  /** Font size in px (default 12). */
  size?: number;
  /** The tag belongs to the line being edited: a blue wash and a white outline. */
  on?: boolean;
  /** Merged over the tag's own style (position it on the photo). */
  style?: CSSProperties;
}

/**
 * The grade printed beside a line on a topo photo: heavy white text with a dark halo so it reads on any rock.
 * Decorative (aria-hidden): the topo's key states the same grade in text. Reads `C` at render time.
 * Moved verbatim from RouteDetail.jsx; only the props type was added.
 */
export default function GradeTag({text,size,on,style}: GradeTagProps){
  return <span aria-hidden="true" style={Object.assign({display:"inline-block",whiteSpace:"nowrap",fontSize:size||12,fontWeight:800,lineHeight:1.1,color:C.onSolid,padding:"1px 3px",borderRadius:4,
    textShadow:"0 0 2px #000,0 0 3px #000,1px 1px 1px #000",background:on?"rgba(59,137,247,0.45)":"transparent",outline:on?"1.5px solid #fff":"none",pointerEvents:"none"},style||{})}>{text||"?"}</span>;
}
