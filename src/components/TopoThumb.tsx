import { C, photoAlt } from "../../ClimbMatchCore.jsx";
import { clickable } from "../../lib/clickable";
import { useImgAspect, TOPO_IMG } from "../../lib/topoMarks.jsx";
import MediaImg from "./MediaImg.tsx";
import TopoLineOverlay, { type TopoLine } from "./TopoLineOverlay.tsx";

/** A topo photo as the strip lists it. */
export interface TopoThumbPhoto {
  url: string;
  alt?: string | null;
  /** Its drawn lines; the first is the one shown. */
  lines: TopoLine[];
}
export interface TopoThumbProps {
  p: TopoThumbPhoto;
  onOpen: () => void;
}

/** One topo in the strip: the photo at its own shape, its first line drawn over it, how many lines, and the line's label. Reads `C` at render time. Moved verbatim from RouteDetail.jsx; only the types were added. */
export default function TopoThumb({p,onOpen}: TopoThumbProps){
  const [ar,arOnLoad]=useImgAspect();
  const canonical=p.lines[0];
  return <div {...clickable(onOpen)} aria-label={(canonical?"Open topo photo":"Open topo photo — no line drawn yet")+(p.alt?": "+p.alt:"")} style={{flexShrink:0,width:132,aspectRatio:ar||"1 / 1",position:"relative",borderRadius:12,overflow:"hidden",border:"1px solid "+C.border,cursor:"pointer",background:C.card}}>
    <MediaImg loading="lazy" decoding="async" src={p.url} alt={photoAlt(p.alt,"Topo photo")} onLoad={arOnLoad} style={TOPO_IMG}/>
    {canonical?<TopoLineOverlay points={canonical.points} variants={canonical.variants} pins={canonical.pins} pinSize={12}/>:null}
    {!canonical?<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.45)",color:C.onSolid,fontSize:11,fontWeight:700,textAlign:"center",padding:8}}>No line drawn</div>:null}
    {p.lines.length>1?<span style={{position:"absolute",top:5,right:5,background:"rgba(0,0,0,0.65)",color:C.onSolid,fontSize:10,fontWeight:700,borderRadius:10,padding:"2px 6px"}}>{p.lines.length+" lines"}</span>:null}
    {canonical&&canonical.label?<span style={{position:"absolute",left:5,right:5,bottom:5,background:"rgba(0,0,0,0.65)",color:C.onSolid,fontSize:10,fontWeight:700,borderRadius:6,padding:"2px 6px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{canonical.label}</span>:null}
  </div>;
}
