import { C, ROUTE_GAP, RSL as SL, catOf } from "../../ClimbMatchCore.jsx";
import { EMPTY_ARR } from "../../lib/emptyArr.js";
import type { NeighbourRow } from "./WallNeighbours.tsx";

export interface BoulderNeighboursProps {
  rows?: NeighbourRow[] | null;
  routeId: string;
  /** The problem's own area (its boulder, or a sector). */
  areaName?: string | null;
  onOpen?: ((row: NeighbourRow) => void) | null;
}

const BOULDER_GROUP_RX=/\b(sector|area|boulders|blocs|field|circuit|zone|cluster|garden|park|woods|forest|hill|ridge|canyon|gulch|trail|valley)s?\b/i;

/** ON THIS BOULDER (owner's note, 2026-10-23): a boulder carries several problems and variations, so a problem page
   steps to the others on the same boulder — never "next door" or left/right, which is the wall's language. The boulder
   is the problem's own area, as Mountain Project files it ("Routes in Solitary Boulder"); an area whose NAME says it is
   a group of boulders (a sector, a field) reads "in this area" instead, so the card never calls a sector a boulder.
   Mountain Project's stored order goes first, then problems with none by name, the crag list's own convention.
 *
 * Reads `C` at render time. Moved verbatim from RouteDetail.jsx; only the types were added.
 */
export default function BoulderNeighbours({rows,routeId,areaName,onOpen}: BoulderNeighboursProps){const probs=(rows||EMPTY_ARR).filter(function(r){return catOf(r)==="bouldering";}).slice().sort(function(a,b){if(a.sort_order!=null&&b.sort_order!=null)return a.sort_order-b.sort_order;if(a.sort_order!=null)return -1;if(b.sort_order!=null)return 1;return String(a.name||"").localeCompare(String(b.name||""));});const i=probs.findIndex(function(r){return r.id===routeId;});if(i<0||probs.length<2)return null;const prev=probs[i-1],next=probs[i+1];
  const group=!areaName||BOULDER_GROUP_RX.test(areaName),where=group?"in this area":"on this boulder";
  const btn=function(r: NeighbourRow,side: "prev" | "next"){const back=side==="prev";return <button key={side} onClick={function(){if(onOpen)onOpen(r);}} aria-label={"Open "+r.name+", the "+(back?"previous":"next")+" problem "+where} style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",alignItems:back?"flex-start":"flex-end",gap:2,background:C.surface,border:"1px solid "+C.border,borderRadius:10,padding:"9px 11px",cursor:"pointer",textAlign:back?"left":"right"}}><span style={{fontSize:11,fontWeight:700,color:C.textMuted,letterSpacing:0.4}}>{back?"← PREVIOUS":"NEXT →"}</span><span style={{fontSize:13.5,fontWeight:700,color:C.text,maxWidth:"100%",overflowWrap:"anywhere"}}>{r.name}</span>{r.grade?<span style={{fontSize:12,color:C.textSub}}>{r.grade}</span>:null}</button>;};
  return <div style={{marginBottom:ROUTE_GAP}}><SL>{group?"IN THIS AREA":"ON THIS BOULDER"}</SL><div style={{background:C.card,borderRadius:12,padding:"11px 14px",border:"1px solid "+C.border}}><div style={{fontSize:12.5,color:C.textSub,marginBottom:9}}>{"Problem "+(i+1)+" of "+probs.length+(areaName?(group?" in ":" on ")+areaName:" "+where)}</div><div style={{display:"flex",gap:8}}>{prev?btn(prev,"prev"):<div style={{flex:1,fontSize:12,color:C.textMuted,alignSelf:"center"}}>First problem</div>}{next?btn(next,"next"):<div style={{flex:1,fontSize:12,color:C.textMuted,alignSelf:"center",textAlign:"right"}}>Last problem</div>}</div></div></div>;}
