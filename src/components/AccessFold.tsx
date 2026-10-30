import { useState } from "react";
import type { ReactNode } from "react";
import { C, FOLD_GAP, ROUTE_GAP } from "../../ClimbMatchCore.jsx";
import CardHead from "./CardHead.tsx";
import Chevron from "./Chevron.tsx";
import EditIconButton from "./EditIconButton.tsx";

export interface AccessFoldProps {
  /** What the closed row says it holds (the labels of the rows on file); shown under the heading and in the toggle's name. */
  summary?: string | null;
  /** Opens the access editor; the pencil sits beside the toggle. */
  onEdit?: (() => void) | null;
  /** The access details; drawn hidden while closed, never unmounted. */
  children?: ReactNode;
}

/** ACCESS & REGULATIONS is a DROPDOWN, closed by default (owner, 2026-10-21: "it's too large").
   With a permit, its details, fees, closures, rules, a group limit, the land manager, a pass, parking,
   how to apply and two permit links it ran to a full phone screen on most alpine routes, ahead of
   the approach a climber came to read. Closed, it is one row: the heading, then WHAT it holds (the
   labels of the rows on file) so a climber can tell a permit is involved without opening it.
   The body is HIDDEN, not unmounted: the text stays in the markup, so check:field-renders still
   proves every access sub-key reaches the page. The edit pencil sits beside the toggle, not inside
   it — a button inside a button is invalid and swallows the pencil's tap.
   FOLD_GAP above it (owner, 2026-10-24: "clumping against box above"): closed, it is one row on its own
   topic under the trailhead cards, and at the card gap it read as part of them. Only the card gap
   below: a section rule always follows it, and that rule carries its own wide gap.
 *
 * Reads `C` at render time. Moved verbatim from RouteDetail.jsx; only the types were added.
 */
export default function AccessFold({summary,onEdit,children}: AccessFoldProps){const [open,setOpen]=useState(false);
  return <div style={{background:C.card,borderRadius:10,padding:"11px 12px",margin:FOLD_GAP+"px 0 "+ROUTE_GAP+"px",border:`1px solid ${C.border}`}}>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      {/* The toggle is STRETCHED BEHIND the row, not wrapped around it: CardHead carries the confidence
          chip's Flag button, and a button inside a button is invalid HTML (React warns validateDOMNesting)
          and leaves the Flag's tap to the browser. The title and summary sit above it and let taps fall
          through to the toggle; the Flag takes its own (pointer-events in ConfChip). */}
      <div style={{flex:1,minWidth:0,minHeight:44,position:"relative",display:"flex",alignItems:"center",gap:8}}>
        <button onClick={function(){setOpen(!open);}} aria-expanded={open} aria-label={(open?"Hide":"Show")+" access & regulations"+(!open&&summary?": "+summary:"")} style={{minHeight:44,position:"absolute",left:0,top:0,width:"100%",height:"100%",padding:0,background:"transparent",border:"none",cursor:"pointer"}}/>
        <span style={{flex:1,minWidth:0,position:"relative",pointerEvents:"none"}}><CardHead style={{marginBottom:open?0:3}}>ACCESS & REGULATIONS</CardHead>{open?null:<span aria-hidden="true" style={{display:"block",fontSize:12,color:C.textMuted,overflowWrap:"anywhere"}}>{summary}</span>}</span>
        <span aria-hidden="true" style={{position:"relative",pointerEvents:"none",display:"inline-flex"}}><Chevron open={open} size={16} color={C.blue}/></span>
      </div>
      <EditIconButton onClick={onEdit} title="Edit access & permit information"/>
    </div>
    <div hidden={!open} style={{marginTop:9}}>{children}</div>
  </div>;
}
