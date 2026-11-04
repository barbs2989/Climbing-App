import { C } from "../../ClimbMatchCore.jsx";
import CardHead from "./CardHead.tsx";

/** The crag's own walk-in, as the area row stores it. */
export interface CragWalkInArea {
  approach?: string | null;
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
export default function CragWalkIn({route}: CragWalkInProps){const a=route&&route._dbArea;const t=a&&String(a.approach||"").trim();if(!t)return null;
  const m=a.approachMin!=null&&+a.approachMin>=0?Math.round(+a.approachMin):null;
  return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><CardHead>WALK-IN</CardHead>{m!=null?<span style={{fontSize:12,color:C.textMuted}}>{"about "+m+" min on foot"}</span>:null}</div><div style={{fontSize:13,color:C.text,lineHeight:1.5}}>{t}</div></div>;}
