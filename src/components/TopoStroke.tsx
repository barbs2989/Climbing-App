import { topoPath } from "../../lib/topoMarks.jsx";
import type { TopoPoint } from "./TopoLineOverlay.tsx";

export interface TopoStrokeProps {
  /** The line's points, as percentages of the photo; fewer than two draws nothing. */
  points?: TopoPoint[] | null;
  color: string;
  /** Stroke width in screen pixels (default 2.5). */
  w?: number;
  /** Dashed, as a variation is drawn. */
  dashed?: boolean;
}

/** One drawn topo line: a dark edge under the colour. Moved verbatim from RouteDetail.jsx; only the types were added. */
export default function TopoStroke({points,color,w,dashed}: TopoStrokeProps){
  if(!points||points.length<2)return null;
  const d=topoPath(points);const sw=w||2.5;
  return <><path d={d} fill="none" stroke="rgba(0,0,0,0.75)" strokeWidth={sw*1.8} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"/><path d={d} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={dashed?(sw*2.6)+" "+(sw*1.6):undefined} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"/></>;
}
