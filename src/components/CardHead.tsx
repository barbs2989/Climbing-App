import { knotMark } from "../../lib/accents.js";
import { useContext, type CSSProperties, type ReactNode } from "react";
import { C } from "../../ClimbMatchCore.jsx";
import { FONT_DISPLAY } from "../../lib/fonts.js";
import { ConfChip, ConfidenceCtx, headKey } from "../../lib/confidence.jsx";

export interface CardHeadProps {
  /** The colour of the knot (an open ring, lib/accents.js knotMark) beside the title (default the palette's solid blue); KNOWN HAZARDS reads red at a glance. */
  tone?: string;
  /** The title text; also what the confidence level is looked up by (`headKey`). */
  children?: ReactNode;
  style?: CSSProperties;
}

/**
 * A card's heading: SL's look one size down (white, tracked, uppercase) with a coloured knot, and — when
 * the route page provides `ConfidenceCtx` — the confidence chip for the field this heading names. Reads
 * `C` and the confidence helpers at render time. Core's own line, moved by script; only types and the
 * style spread were added. `lib/DbAreaBrowser.jsx` and `EnrichmentPanels.jsx` keep their own copies on
 * purpose (they must not import core) — see the hand-off in docs/refactor-progress.md. The heading role
 * sits on the TITLE only, as SL's does: on the whole row it took the chip's text in too, and the route
 * page's old section-jump pill (it read heading text) showed "ROUTE FACTSHigh".
 * The chip WRAPS under the title when the row is too narrow, lined up with the title's first letter, instead
 * of squeezing the title: beside a chip and an Edit button, ROUTE BREAKDOWN, EMERGENCY & RESCUE, GEAR &
 * ESSENTIALS and ~10 more broke onto two lines at 320px, ACCESS & REGULATIONS onto three at 390 (owner,
 * 2026-11-18). 12px of padding + the chip's own 4px margin = the knot (9) + gap (7); the knot is pulled back 12. The knot and
 * the title are ONE unit, or a title too long for the row wrapped away and left the knot alone on a line above it. The mark was a 3px bar until 2026-11-25 (owner: no thick line on the left of boxes); it is the rope's knot now (lib/accents.js).
 */
export default function CardHead({tone,children,style}: CardHeadProps) {
const _cx=useContext(ConfidenceCtx);const _levels=_cx&&_cx.levels?_cx.levels:null;const _onFlag=_cx&&_cx.onFlag?_cx.onFlag:null;const _k=_levels?headKey(children):null;const _lv=_k&&_levels?_levels[_k]:null;return <div data-card-head="" style={{display:"flex",alignItems:"center",gap:7,minWidth:0,fontFamily:FONT_DISPLAY,fontSize:16,fontWeight:600,lineHeight:1.15,color:C.text,letterSpacing:0.7,textTransform:"uppercase",flexWrap:"wrap",rowGap:4,paddingLeft:tone?12:0,...style}}><span style={{display:"flex",alignItems:"center",gap:7,minWidth:0,marginLeft:tone?-12:0}}>{tone?<span aria-hidden="true" style={knotMark(tone)}/>:null}<span role="heading" aria-level={2} style={{minWidth:0}}>{children}</span></span>{_lv?<ConfChip level={_lv} label={children} compact onFlag={_onFlag?function(){_onFlag(_k,children);}:null}/>:null}</div>;
}
