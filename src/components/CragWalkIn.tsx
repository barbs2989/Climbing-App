import { C } from "../../ClimbMatchCore.jsx";
import CardHead from "./CardHead.tsx";
import { walkInOf } from "../../lib/areaInherit.js";

/** The crag's own walk-in, as the area row stores it. */
export interface CragWalkInArea {
  approach?: string | null;
  /** Filed on a WALL with no walk-in of its own: the nearest crag above it that has one (lib/areaInherit.js). */
  upWalkIn?: { name?: string | null; approach?: string; approachMin?: number | null } | null;
  /** Minutes on foot; drawn only when it is a number of zero or more. */
  approachMin?: number | string | null;
}
export interface CragWalkInProps {
  /** The route; its crag is read from `_dbArea`. Nothing renders without a walk-in text. */
  route?: { _dbArea?: CragWalkInArea | null } | null;
}

/**
 * WALK-IN: the crag's own approach paragraph, with "about N min on foot" when the area stores the minutes.
 * Reads `C` at render time. Moved verbatim from RouteDetail.jsx with the props type added and ONE fix: the minutes
 * were coloured `C.dim`, which the palette does not have (they drew in the inherited colour), now `C.textMuted`.
 */
export default function CragWalkIn({route}: CragWalkInProps){const w=walkInOf(route);if(!w)return null;const t=w.approach;
  /* A wall with no walk-in of its own shows its crag's, and says whose it is (lib/areaInherit.js). A wall WITH
     its own walk-in under a crag that has one shows the crag's first, then the wall's leg (w.first). */
  const f=w.first;
  const own=w.approachMin!=null?Math.round(w.approachMin):null;
  const fm=f&&f.approachMin!=null?Math.round(f.approachMin):null;
  /* The header gives the whole walk's minutes: both legs when both are known, one leg alone when it is the only one shown. */
  const m=f?(own!=null&&fm!=null?own+fm:null):own;
  const leg=function(label: string,mins: number | null){return <div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:12,fontWeight:700,color:C.textSub,marginBottom:3}}><span>{label}</span>{mins!=null?<span style={{fontWeight:400,color:C.textMuted}}>{"about "+mins+" min"}</span>:null}</div>;};
  return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><CardHead>WALK-IN</CardHead>{m!=null?<span style={{fontSize:12,color:C.textMuted}}>{"about "+m+" min on foot"}</span>:null}</div>{f?<>{leg("To "+f.name,fm)}<div style={{fontSize:13,color:C.text,lineHeight:1.5,marginBottom:10}}>{f.approach}</div>{leg("Then to "+(w.wall||"this wall"),own)}</>:null}{w.from?<div style={{fontSize:12,color:C.textMuted,marginBottom:4}}>{"The walk in to "+w.from+", shared by every climb there."}</div>:null}<div style={{fontSize:13,color:C.text,lineHeight:1.5}}>{t}</div></div>;}
