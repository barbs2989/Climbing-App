import { C } from "../../ClimbMatchCore.jsx";
import { EMPTY_ARR } from "../../lib/emptyArr.js";

/** A climb in the crag's own list, as the neighbour strip reads it. */
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

/** NEXT DOOR ON THE WALL: the climbs either side of this one, by `sort_order`, the wall's left-to-right position.
   A thin strip right under the header's Grade / Reports facts (owner, 2026-11-12: "right under the header grade and
   number of reports header in a thin strip so users can easily go to the right or left climb without having to
   scroll"); before that it was a card under BASE OF THE CLIMB (2026-10-21), which needed a scroll to reach.
   Never on a boulder problem (owner, 2026-10-21): problems are not climbed along a wall in an order; a problem gets
   BoulderNeighbours (ON THIS BOULDER) instead.
   `rows` are the crag's own rows (cragSibs, useAreaRoutes already converted), so it costs no query. A climb
   with no position draws nothing: guessing a neighbour would send a climber to the wrong line.
 *
 * Reads `C` at render time.
 */
export default function WallNeighbours({rows,routeId,onOpen}: WallNeighboursProps){const placed=(rows||EMPTY_ARR).filter(function(r){return r.sort_order!=null&&r.discipline!=="bouldering";}).sort(function(a,b){return a.sort_order-b.sort_order;});const i=placed.findIndex(function(r){return r.id===routeId;});if(i<0||placed.length<2)return null;const left=placed[i-1],right=placed[i+1];
  const one={overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"} as const;
  /* A row with no name still opens; it says so instead of "null" (the screen reader read "Open null"). */
  const nameOf=function(r: NeighbourRow){return (r.name||"").trim()||"Unnamed climb";};
  const btn=function(r: NeighbourRow,side: "left" | "right"){const L=side==="left";return <button key={side} onClick={function(){if(onOpen)onOpen(r);}} aria-label={"Open "+nameOf(r)+(r.grade?", "+r.grade:"")+", the climb to the "+side} style={{minWidth:0,minHeight:40,display:"flex",alignItems:"center",justifyContent:L?"flex-start":"flex-end",gap:6,background:"transparent",border:"none",padding:L?"4px 6px 4px 10px":"4px 10px 4px 6px",cursor:"pointer",textAlign:L?"left":"right",color:C.text}}>{L?<span aria-hidden="true" style={{fontSize:16,fontWeight:700,color:C.blue,flexShrink:0}}>‹</span>:null}<span style={{minWidth:0,display:"flex",flexDirection:"column",alignItems:L?"flex-start":"flex-end"}}><span style={{...one,maxWidth:"100%",fontSize:13,fontWeight:700,color:C.text}}>{nameOf(r)}</span>{r.grade?<span style={{...one,maxWidth:"100%",fontSize:11.5,color:C.textSub}}>{r.grade}</span>:null}</span>{L?null:<span aria-hidden="true" style={{fontSize:16,fontWeight:700,color:C.blue,flexShrink:0}}>›</span>}</button>;};
  const edge=function(t: string,L: boolean){return <div style={{alignSelf:"center",padding:"0 10px",fontSize:11.5,color:C.textMuted,textAlign:L?"left":"right"}}>{t}</div>;};
  return <nav aria-label="Next door on the wall" data-cm-next-door="" style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto minmax(0,1fr)",alignItems:"center",background:C.surface,borderBottom:"1px solid "+C.border}}>{left?btn(left,"left"):edge("Leftmost",true)}<div style={{textAlign:"center",padding:"0 4px",lineHeight:1.15}}><div style={{fontSize:10,fontWeight:800,letterSpacing:0.5,color:C.textMuted}}>NEXT DOOR</div><div style={{fontSize:11,color:C.textSub}} title={"#"+(i+1)+" of "+placed.length+" from the left on this wall"}>{(i+1)+" of "+placed.length}</div></div>{right?btn(right,"right"):edge("Rightmost",false)}</nav>;}
