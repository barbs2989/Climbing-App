import type { CSSProperties, ReactNode } from "react";
import { C } from "../../ClimbMatchCore.jsx";

export interface PinNumProps {
  /** The number the pin carries (its order among the topo's pins). */
  n: ReactNode;
  /** Merged over the badge's own style (position it on the photo). */
  style?: CSSProperties;
}

/**
 * The small numbered badge beside a pin on a topo photo, so the key below can say which pin is which.
 * Decorative (aria-hidden). Reads `C` at render time. Moved verbatim from RouteDetail.jsx; only the props type was added.
 */
export default function PinNum({n,style}: PinNumProps){
  return <span aria-hidden="true" style={Object.assign({display:"inline-flex",alignItems:"center",justifyContent:"center",minWidth:14,height:14,padding:"0 3px",borderRadius:7,background:"#111",color:C.onSolid,border:"1px solid #fff",fontSize:9,fontWeight:800,lineHeight:1,boxSizing:"border-box",pointerEvents:"none"},style||{})}>{n}</span>;
}
