import { C } from "../../ClimbMatchCore.jsx";
import { pinNums, pinLabel } from "../../lib/topoMarks.jsx";
import PinNum from "./PinNum.tsx";
import PinIcon from "./PinIcon.tsx";
import type { TopoPin } from "./TopoLineOverlay.tsx";

export interface TopoPinKeyProps {
  pins?: TopoPin[] | null;
}

/** The key's rows for a topo's stations: the number each wears on the photo, its icon, its kind and its note. Reads `C` at render time. Moved verbatim from RouteDetail.jsx; only the types were added. */
export default function TopoPinKey({pins}: TopoPinKeyProps){
  /* Grade labels are already readable on the photo itself; the key lists the stations. */
  const nums=pinNums(pins);
  if(!pins||!pins.some(function(p){return p.category!=="grade";}))return null;
  return <div style={{marginBottom:10}}>{pins.map(function(pn,i){if(pn.category==="grade")return null;return <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:5,fontSize:12.5,lineHeight:1.4}}><PinNum n={nums[i]} style={{marginTop:2}}/><PinIcon cat={pn.category} size={18}/><div style={{minWidth:0}}><span style={{fontWeight:600,color:C.text}}>{pinLabel(pn.category)}</span>{pn.note?<span style={{color:C.textSub}}>{" — "+pn.note}</span>:null}</div></div>;})}</div>;
}
