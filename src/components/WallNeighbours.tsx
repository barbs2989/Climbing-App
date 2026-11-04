import { C, ROUTE_GAP, RSL as SL } from "../../ClimbMatchCore.jsx";
import { EMPTY_ARR } from "../../lib/emptyArr.js";

/** A climb in the crag's own list, as the neighbour cards read it. */
export interface NeighbourRow {
  id: string;
  name?: string | null;
  grade?: string | null;
  /** The wall's left-to-right position; none means the climb is not placed. */
  sort_order?: number | null;
  /** A boulder problem is never part of a wall's left-to-right line. */
  discipline?: string | null;
}
export interface WallNeighboursProps {
  rows?: NeighbourRow[] | null;
  routeId: string;
  onOpen?: ((row: NeighbourRow) => void) | null;
}

/** NEXT DOOR ON THE WALL (owner, 2026-10-21): the climbs either side of this one, by `sort_order`, the wall's
   left-to-right position. Never on a boulder problem (owner, 2026-10-21): problems are not climbed along a wall in an order;
   a problem gets BoulderNeighbours below instead.
   `rows` are the crag's own rows (cragSibs, useAreaRoutes already converted), so it costs no query. A climb
   with no position draws nothing: guessing a neighbour would send a climber to the wrong line.
 *
 * Reads `C` at render time. Moved verbatim from RouteDetail.jsx; only the types were added.
 */
export default function WallNeighbours({rows,routeId,onOpen}: WallNeighboursProps){const placed=(rows||EMPTY_ARR).filter(function(r){return r.sort_order!=null&&r.discipline!=="bouldering";}).sort(function(a,b){return a.sort_order-b.sort_order;});const i=placed.findIndex(function(r){return r.id===routeId;});if(i<0||placed.length<2)return null;const left=placed[i-1],right=placed[i+1];
  const btn=function(r: NeighbourRow,side: "left" | "right"){return <button key={side} onClick={function(){if(onOpen)onOpen(r);}} aria-label={"Open "+r.name+", the climb to the "+side} style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",alignItems:side==="left"?"flex-start":"flex-end",gap:2,background:C.surface,border:"1px solid "+C.border,borderRadius:10,padding:"9px 11px",cursor:"pointer",textAlign:side==="left"?"left":"right"}}><span style={{fontSize:11,fontWeight:700,color:C.textMuted,letterSpacing:0.4}}>{side==="left"?"← LEFT":"RIGHT →"}</span><span style={{fontSize:13.5,fontWeight:700,color:C.text,maxWidth:"100%",overflowWrap:"anywhere"}}>{r.name}</span>{r.grade?<span style={{fontSize:12,color:C.textSub}}>{r.grade}</span>:null}</button>;};
  return <div style={{marginBottom:ROUTE_GAP}}><SL>NEXT DOOR</SL><div style={{background:C.card,borderRadius:12,padding:"11px 14px",border:"1px solid "+C.border}}><div style={{fontSize:12.5,color:C.textSub,marginBottom:9}}>{"#"+(i+1)+" of "+placed.length+" from the left on this wall"}</div><div style={{display:"flex",gap:8}}>{left?btn(left,"left"):<div style={{flex:1,fontSize:12,color:C.textMuted,alignSelf:"center"}}>Leftmost climb</div>}{right?btn(right,"right"):<div style={{flex:1,fontSize:12,color:C.textMuted,alignSelf:"center",textAlign:"right"}}>Rightmost climb</div>}</div></div></div>;}
