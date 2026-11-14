import { RSL as SL, C } from "../../ClimbMatchCore.jsx";
import EditIconButton from "./EditIconButton.tsx";
import { rappelHeaderLabel, rappelSingleRopeWarning } from "../../lib/rappels";
import { uLen } from "../../lib/uLen.js";
import RappelRow from "./RappelRow.tsx";
import type { RappelStation } from "./RappelRow.tsx";

export interface RappelTableProps {
  route: { rappelDetail?: Omit<RappelStation, "_n">[] | null; rappelCountNote?: string | null };
  /** Opens the editor at the rappels; none means the climber cannot edit them. */
  onEdit?: (() => void) | null;
}

/* Moved verbatim from RouteDetail.jsx (PR57); only the types were added. */
export default function RappelTable({route,onEdit}: RappelTableProps){
  if(!route.rappelDetail||!route.rappelDetail.length)return null;
  const raps=route.rappelDetail.map((r: Omit<RappelStation, "_n">,i: number)=>({...r,_n:r.n!=null?r.n:i+1})).sort((a,b)=>a._n-b._n);
  /* `lengthM` is legitimately null where no source publishes a per-station distance — that is the
     honest value, and writing the ROPE's capacity there instead is what made one route claim 560m
     of rappel down a 244m face. But summing with `||0` then turns "unknown" into "zero", so a
     table with 2 known rappels of 30m and 1 unknown printed "60 m total" and read as the whole
     descent. Count what is actually known and say so when it is only part of the line. */
  const known=raps.filter((r): r is typeof r & {lengthM: number}=>r.lengthM!=null);
  const total=known.reduce((a,r)=>a+r.lengthM,0);
  const partial=known.length>0&&known.length<raps.length;
  /* The SECTION heading, as the no-table branch of the rappels block already had it: a table used
     to demote RAPPELS to a card title, so the same section changed look with its data. */
  return <><SL action={onEdit?<EditIconButton onClick={onEdit} title="Edit rappel information"/>:null}>{rappelHeaderLabel(route)||"RAPPELS"}</SL><div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`}}>
    {total>0?<div style={{fontSize:12,color:C.textMuted,marginBottom:9}}>{uLen(total)+(partial?(" across "+known.length+" of "+raps.length):" total")}</div>:null}
    {(function(){const w=rappelSingleRopeWarning(route);return w?<div style={{fontSize:12,color:C.amber,lineHeight:1.5,marginBottom:9,background:C.amberBg,border:"1px solid "+C.amber,borderRadius:8,padding:"7px 9px"}}>{w}</div>:null;})()}
    {route.rappelCountNote?<div style={{fontSize:12,color:C.textSub,lineHeight:1.5,marginBottom:9,background:C.surface,borderRadius:8,padding:"7px 9px"}}>{route.rappelCountNote}</div>:null}
    {/* A rappel row answers four questions in the order you ask them on the ground:
        WHERE is the station (`station`) — the one a party actually gets stuck on, and the one
        a bare "60m, bolted" row never answered; HOW LONG and off WHAT (`lengthM`/`anchor`);
        WHAT GOES WRONG (`hazards`) — pendulum swings, a pull that jams, a station you can
        rappel straight past; and anything else (`notes`). Every key is optional and each
        block is gated on its own value, so a route carrying only the old {lengthM, anchor,
        notes} shape renders exactly as it did before. */}
    {raps.map((r,idx)=><RappelRow key={r._n+"-"+idx} r={r} first={idx===0}/>)}
  </div></>;
}
