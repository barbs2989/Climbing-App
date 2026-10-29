import { TOPO_RED, TOPO_VAR, pinNums, varMid, varTag } from "../../lib/topoMarks.jsx";
import TopoStroke from "./TopoStroke.tsx";
import VarTag from "./VarTag.tsx";
import GradeTag from "./GradeTag.tsx";
import PinIcon from "./PinIcon.tsx";
import PinNum from "./PinNum.tsx";

/** A point on a topo, as percentages (0..100) of the photo. */
export interface TopoPoint {
  x: number;
  y: number;
}
/** A marker on a topo. A grade marker's note is the grade it prints. */
export interface TopoPin extends TopoPoint {
  category: string;
  note?: string | null;
}
/** One drawn line on a topo photo: the route, its variations and its markers. */
export interface TopoLine {
  points?: TopoPoint[] | null;
  variants?: (TopoPoint[] | null)[] | null;
  pins?: TopoPin[] | null;
  label?: string | null;
}
export interface TopoLineOverlayProps {
  points?: TopoPoint[] | null;
  pins?: TopoPin[] | null;
  variants?: (TopoPoint[] | null)[] | null;
  /** Marker size in px (default 18). */
  pinSize?: number;
  /** Draw each marker's number and each variation's tag, to match the key. */
  numbered?: boolean;
  /** Line width in px (default by marker size). */
  lineW?: number;
}

/**
 * A topo's drawing laid over its photo: the variations dashed, the route line, and the markers (a grade marker as its
 * text). Fills its container, which must be the painted photo (see `useImgAspect`). Moved verbatim from RouteDetail.jsx; only the types were added.
 */
export default function TopoLineOverlay({points,pins,variants,pinSize,numbered,lineW}: TopoLineOverlayProps){
  const vs=(variants||[]).filter(function(v){return v&&v.length>=2;});
  if((!points||points.length<2)&&(!pins||!pins.length)&&!vs.length)return null;
  const sz=pinSize||18;const nums=pinNums(pins);const lw=lineW||(sz<16?1.6:2.5);
  return <>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}>
      {vs.map(function(v,i){return <TopoStroke key={"v"+i} points={v} color={TOPO_VAR} w={lw} dashed/>;})}
      <TopoStroke points={points} color={TOPO_RED} w={lw}/>
    </svg>
    {numbered?vs.map(function(v,i){const m=varMid(v);return <span key={"vt"+i} style={{position:"absolute",left:m.x+"%",top:m.y+"%",transform:"translate(-50%,-50%)",pointerEvents:"none",lineHeight:0}}><VarTag text={varTag(i,vs.length)}/></span>;}):null}
    {(pins||[]).map(function(pn,i){
      if(pn.category==="grade")return pn.note?<span key={i} style={{position:"absolute",left:pn.x+"%",top:pn.y+"%",transform:"translate(-50%,-50%)",pointerEvents:"none",lineHeight:0}}><GradeTag text={pn.note} size={Math.max(9,Math.round(sz*0.62))}/></span>:null;
      return <span key={i} style={{position:"absolute",left:pn.x+"%",top:pn.y+"%",width:sz,height:sz,marginLeft:-sz/2,marginTop:-sz/2,pointerEvents:"none",lineHeight:0}}><PinIcon cat={pn.category} size={sz}/>{numbered?<PinNum n={nums[i]} style={{position:"absolute",right:-8,bottom:-6}}/>:null}</span>;})}
  </>;
}
