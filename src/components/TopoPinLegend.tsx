import type { CSSProperties } from "react";
import { C } from "../../ClimbMatchCore.jsx";
import { TOPO_RED, TOPO_VAR, PIN_CATEGORIES } from "../../lib/topoMarks.jsx";
import TopoSwatch from "./TopoSwatch.tsx";
import PinIcon from "./PinIcon.tsx";

export interface TopoPinLegendProps {
  style?: CSSProperties;
}

/** Every line style and marker a topo can show, and what each means. Reads `C` at render time. Moved verbatim from RouteDetail.jsx; only the types were added. */
export default function TopoPinLegend({style}: TopoPinLegendProps){
  return <div role="list" aria-label="Topo marker key" style={Object.assign({display:"flex",flexWrap:"wrap",gap:"6px 12px"},style||{})}>{[["Route line",TOPO_RED],["Variation",TOPO_VAR]].map(function(l){return <span key={l[0]} role="listitem" style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11.5,color:C.textSub}}><TopoSwatch color={l[1]} dashed={l[1]===TOPO_VAR}/>{l[0]}</span>;})}{PIN_CATEGORIES.map(function(c){return <span key={c[0]} role="listitem" style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11.5,color:C.textSub}}><PinIcon cat={c[0]} size={16}/>{c[1]}</span>;})}</div>;
}
