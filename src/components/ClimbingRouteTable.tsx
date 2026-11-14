import { RSL as SL, C } from "../../ClimbMatchCore.jsx";
import EditIconButton from "./EditIconButton.tsx";

/** One section of the climbing, as the contribute form and the catalog store it. */
export interface ClimbSection {
  n?: number | null;
  label?: string | null;
  /** The section's class or grade, drawn as a chip. */
  class?: string | null;
  notes?: string | null;
}
export interface ClimbingRouteTableProps {
  route: { climbingRoute?: ClimbSection[] | null };
  /** Opens the editor at this table; none means the climber cannot edit it. */
  onEdit?: (() => void) | null;
}

/* CLIMBING ROUTE — the pitch table's counterpart for terrain that has no pitches.
   A scramble or a mountaineering line has an actual-climbing section every bit as real as a
   pitched route's, and until now there was nowhere to put it: the only structured slot was
   pitch_detail, which those routes legitimately leave empty. So that description went into
   `approach` instead, which is why approach prose on unpitched routes so often walks you past
   the base of the climb and keeps going to the summit — and why a party looking for where the
   climbing STARTS had to reverse-engineer it out of a paragraph about a trail.
   It renders wherever it is written and is drawn ABOVE ROUTE BREAKDOWN: this is the climb at a
   glance, the breakdown is the same ground pitch by pitch (owner, 2026-10-22). It used to be gated
   on isPitched() being false, which hid it on the 46 alpine routes that carry one. */
/* Moved verbatim from RouteDetail.jsx (PR57); only the types were added. */
export default function ClimbingRouteTable({route,onEdit}: ClimbingRouteTableProps){
  const segs=Array.isArray(route.climbingRoute)?route.climbingRoute:[];
  if(!segs.length)return null;
  const list=segs.map((s: ClimbSection,i: number)=>({...s,_n:s.n!=null?s.n:i+1})).sort((a,b)=>a._n-b._n);
  return <><SL action={onEdit?<EditIconButton onClick={onEdit} title="Edit the climbing route"/>:null}>{"CLIMBING ROUTE · "+list.length+" section"+(list.length!==1?"s":"")}</SL><div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`}}>
    <div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.5,marginBottom:10}}>From the base of the climbing to the top — the technical ground itself, not the walk in.</div>
    {list.map((s,idx)=><div key={s._n+"-"+idx} style={{display:"flex",gap:10,padding:"9px 11px",alignItems:"flex-start",border:"1px solid "+C.border,borderRadius:10,marginBottom:8}}>
      <div style={{width:26,height:26,borderRadius:7,background:C.surface,border:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:12,fontWeight:700,color:C.textSub}}>{s._n}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:s.notes?3:0}}>
          <span style={{fontSize:13,fontWeight:700,color:C.text,minWidth:0,wordBreak:"break-word"}}>{s.label||("Section "+s._n)}</span>
          {s.class?<span style={{flexShrink:0,fontSize:11,fontWeight:800,color:C.amber,background:C.amberBg,border:"1px solid "+C.amber+"55",borderRadius:20,padding:"2px 9px",whiteSpace:"nowrap"}}>{s.class}</span>:null}
        </div>
        {s.notes?<div style={{fontSize:12,color:C.textSub,lineHeight:1.55}}>{s.notes}</div>:null}
      </div>
    </div>)}
  </div></>;
}
