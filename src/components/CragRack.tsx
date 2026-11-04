import type { ReactNode } from "react";
import { C, catOf } from "../../ClimbMatchCore.jsx";
import { routeRackFor, rackRows } from "../../lib/rack.js";
import CardHead from "./CardHead.tsx";
import GapNote from "./GapNote.tsx";
import EditIconButton from "./EditIconButton.tsx";
import RackBetaList, { type RackBetaListProps, type RackBetaReport } from "./RackBetaList.tsx";

/** The route as the rack card reads it. */
export interface RackRow { item: string; sizes?: string | null; qty?: number | null }
export type CragRackRoute = NonNullable<RackBetaListProps["route"]> & { _rackCounted?: boolean };
export interface CragRackProps {
  route: CragRackRoute;
  /** Opens the rack editor with the stored lines and the section to start on; without it there is no pencil. */
  onEditRack?: ((text: string, section: string) => void) | null;
  activity?: RackBetaReport[] | null;
  onSeeReports?: (() => void) | null;
  /** The crag's facts, drawn under the heading. */
  facts?: ReactNode;
}

/** RACK for a sport, trad or boulder route: ONLY what this route itself takes, as item + quantity
   (quickdraws x12, cams #0.5-#3 x1). `rack_items` (0247) first, then a rack already written for the
   route; NEVER the per-discipline DISC_RACK, and no ROPEWORK / "what to bring" around it. Nothing
   stated means nothing drawn. A bouldering route's rack is its crash pads.
 *
 * Reads `C` at render time. Moved verbatim from RouteDetail.jsx; only the types were added.
 */
export default function CragRack({route,onEditRack,activity,onSeeReports,facts}: CragRackProps){const disc=catOf(route);
  const own=routeRackFor(route)||[];
  /* One counted list (rackRows): rack_items' rows, with a quickdraw or pad count from its own box REPLACING the row of that kind. It used to be rack_items OR the pads OR the draws, so on the 938 sport routes carrying rack_items a corrected quickdraw count reached no screen. A counted rack edit's text lines print under its rows; an uncorrected route keeps its rows alone. */
  const rows=rackRows(route);
  const extra=rows.length?(route._rackCounted?own:[]):own;
  const sec=disc==="bouldering"?"pads":disc==="sport"?"draws":"rack";
  /* Rack beta shows on the placeholder card too: a climber who logged what they brought is the best
     answer an empty rack has. */
  const beta=disc==="bouldering"?null:<RackBetaList activity={activity} route={route} onSeeReports={onSeeReports}/>;
  if(!rows.length&&!own.length)return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`}}><CardHead style={{marginBottom:6}}>{disc==="bouldering"?"PADS":"RACK"}</CardHead>{facts}<GapNote what={disc==="bouldering"?"No pad count yet":disc==="sport"?"No quickdraw count yet":"No rack listed yet"} why={disc==="bouldering"?"Nothing says how many crash pads the landing needs.":disc==="sport"?"Nothing says how many draws to bring.":"Nothing says what gear this takes."} cta={disc==="bouldering"?"Add the pads":disc==="sport"?"Add the quickdraws":"Add the rack"} onFix={onEditRack?function(){onEditRack(own.join(" "),sec);}:null}/>{beta}</div>;
  return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><CardHead>RACK</CardHead>{onEditRack?<EditIconButton onClick={function(){onEditRack(own.join(" "),sec);}} title="Edit rack"/>:null}</div>
    {facts}{rows.length?rows.map(function(x: RackRow,i: number){return <div key={i} style={{display:"flex",justifyContent:"space-between",gap:12,padding:"5px 0",borderTop:i?`1px solid ${C.border}`:"none",fontSize:13}}><span style={{color:C.text}}>{x.item}{x.sizes?<span style={{color:C.textMuted}}> {x.sizes}</span>:null}</span>{x.qty!=null?<span style={{color:C.textMuted,fontVariantNumeric:"tabular-nums"}}>{"\u00d7"+x.qty}</span>:null}</div>;}):null}{extra.map(function(t,i){return <div key={"t"+i} style={{padding:"5px 0",borderTop:(i||rows.length)?`1px solid ${C.border}`:"none",fontSize:13,color:C.text}}>{t}</div>;})}{beta}</div>;}
