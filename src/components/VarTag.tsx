import type { CSSProperties, ReactNode } from "react";
import { TOPO_VAR } from "../../lib/topoMarks.jsx";

export interface VarTagProps {
  /** "V", or V1, V2… (varTag). */
  text: ReactNode;
  style?: CSSProperties;
}

/** The tag a variation wears on the photo and in the key, so the two can be matched. Decorative (aria-hidden). Moved verbatim from RouteDetail.jsx; only the types were added. */
export default function VarTag({text,style}: VarTagProps){return <span aria-hidden="true" style={Object.assign({display:"inline-flex",alignItems:"center",justifyContent:"center",minWidth:15,height:15,padding:"0 4px",borderRadius:4,background:TOPO_VAR,color:"#111",border:"1px solid #111",fontSize:9.5,fontWeight:800,lineHeight:1,boxSizing:"border-box",pointerEvents:"none",whiteSpace:"nowrap"},style||{})}>{text}</span>;}
