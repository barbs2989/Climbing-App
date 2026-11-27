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
   IN THE HEADER, top right beside ← Back (owner note, 2026-11-26: "move the route or boulder next door where the current
   share, saved, log, start a crew buttons is"), as one compact pill over the photo; Share / Save / Log / Start a crew
   moved below the header to make the room. Mountain Project, audited the same day, has no route-to-route step at all
   (its Previous / Next belong to the photo carousel): a climb's neighbours are only its "Routes in <area>" list, which
   our area page already is, so this pill is the shortcut MP lacks. Before that it was a thin strip right under the header's Grade / Reports facts (owner, 2026-11-12: "right under the header grade and
   number of reports header in a thin strip so users can easily go to the right or left climb without having to
   scroll"); before that it was a card under BASE OF THE CLIMB (2026-10-21), which needed a scroll to reach.
   Never on a boulder problem (owner, 2026-10-21): problems are not climbed along a wall in an order; a problem gets
   BoulderNeighbours (ON THIS BOULDER) instead.
   `rows` are the crag's own rows (cragSibs, useAreaRoutes already converted), so it costs no query. A climb
   with no position draws nothing: guessing a neighbour would send a climber to the wrong line.
 *
 * Reads `C` at render time.
 */
/** The header's neighbour pill, shared by NEXT DOOR (a wall) and ON THIS BOULDER: the step back on the left, where
   this climb sits in the middle, the step on on the right. Drawn dark and translucent because it sits over the cover
   photo, as ← Back does. A long name wraps rather than ending in "…" (owner, 2026-11-13: never cut text off). */
export interface NeighbourSide { row: NeighbourRow | null | undefined; aria: string; edge: string; }
export function HeaderNeighbourPill({navLabel,title,count,countTitle,back,fwd,onOpen}: {navLabel: string; title: string; count: string; countTitle?: string; back: NeighbourSide; fwd: NeighbourSide; onOpen?: ((row: NeighbourRow) => void) | null}){
  const one={overflowWrap:"anywhere",lineHeight:1.2} as const;
  const nameOf=function(r: NeighbourRow){return (r.name||"").trim()||"Unnamed climb";};
  const side=function(sd: NeighbourSide,L: boolean){const r=sd.row;if(!r)return <div style={{alignSelf:"center",padding:"0 8px",fontSize:11,color:"rgba(255,255,255,0.6)",textAlign:L?"left":"right"}}>{sd.edge}</div>;return <button onClick={function(){if(onOpen)onOpen(r);}} aria-label={"Open "+nameOf(r)+(r.grade?", "+r.grade:"")+", "+sd.aria} style={{minWidth:0,minHeight:44,display:"flex",alignItems:"center",justifyContent:L?"flex-start":"flex-end",gap:4,background:"transparent",border:"none",padding:L?"3px 4px 3px 8px":"3px 8px 3px 4px",cursor:"pointer",textAlign:L?"left":"right",color:C.onSolid}}>{L?<span aria-hidden="true" style={{fontSize:17,fontWeight:700,color:C.blue,flexShrink:0}}>‹</span>:null}<span style={{minWidth:0,display:"flex",flexDirection:"column",alignItems:L?"flex-start":"flex-end"}}><span style={{...one,maxWidth:"100%",fontSize:12,fontWeight:700,color:C.onSolid}}>{nameOf(r)}</span>{r.grade?<span style={{...one,maxWidth:"100%",fontSize:11,color:"rgba(255,255,255,0.75)"}}>{r.grade}</span>:null}</span>{L?null:<span aria-hidden="true" style={{fontSize:17,fontWeight:700,color:C.blue,flexShrink:0}}>›</span>}</button>;};
  return <nav aria-label={navLabel} data-cm-next-door="" style={{flex:"1 1 auto",minWidth:0,maxWidth:330,marginLeft:"auto",display:"grid",gridTemplateColumns:"minmax(0,1fr) auto minmax(0,1fr)",alignItems:"center",background:"rgba(18,17,15,0.85)",border:"1px solid "+C.border,borderRadius:12}}>{side(back,true)}<div style={{textAlign:"center",padding:"0 2px",lineHeight:1.15}}><div style={{fontSize:9.5,fontWeight:800,letterSpacing:0.5,color:C.label,whiteSpace:"nowrap"}}>{title}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.8)",whiteSpace:"nowrap"}} title={countTitle}>{count}</div></div>{side(fwd,false)}</nav>;}

export default function WallNeighbours({rows,routeId,onOpen}: WallNeighboursProps){const placed=(rows||EMPTY_ARR).filter(function(r){return r.sort_order!=null&&r.discipline!=="bouldering";}).sort(function(a,b){return a.sort_order-b.sort_order;});const i=placed.findIndex(function(r){return r.id===routeId;});if(i<0||placed.length<2)return null;
  return <HeaderNeighbourPill navLabel="Next door on the wall" title="NEXT DOOR" count={(i+1)+" of "+placed.length} countTitle={"#"+(i+1)+" of "+placed.length+" from the left on this wall"} back={{row:placed[i-1],aria:"the climb to the left",edge:"Leftmost"}} fwd={{row:placed[i+1],aria:"the climb to the right",edge:"Rightmost"}} onOpen={onOpen}/>;}
