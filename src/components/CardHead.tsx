import { useContext, type CSSProperties, type ReactNode } from "react";
import { C } from "../../ClimbMatchCore.jsx";
import { ConfChip, ConfidenceCtx, headKey } from "../../lib/confidence.jsx";

export interface CardHeadProps {
  /** The colour of the bar beside the title (default the palette's solid blue); KNOWN HAZARDS reads red at a glance. */
  tone?: string;
  /** The title text; also what the confidence level is looked up by (`headKey`). */
  children?: ReactNode;
  style?: CSSProperties;
}

/**
 * A card's heading: SL's look one size down (white, tracked, uppercase) with a coloured bar, and — when
 * the route page provides `ConfidenceCtx` — the confidence chip for the field this heading names. Reads
 * `C` and the confidence helpers at render time. Core's own line, moved by script; only types and the
 * style spread were added. `lib/DbAreaBrowser.jsx` and `EnrichmentPanels.jsx` keep their own copies on
 * purpose (they must not import core) — see the hand-off in docs/refactor-progress.md.
 */
export default function CardHead({tone,children,style}: CardHeadProps) {
const _cx=useContext(ConfidenceCtx);const _levels=_cx&&_cx.levels?_cx.levels:null;const _onFlag=_cx&&_cx.onFlag?_cx.onFlag:null;const _k=_levels?headKey(children):null;const _lv=_k&&_levels?_levels[_k]:null;return <div role="heading" aria-level={3} style={{display:"flex",alignItems:"center",gap:7,minWidth:0,fontSize:12,fontWeight:800,color:C.text,letterSpacing:0.5,textTransform:"uppercase",...style}}><span aria-hidden="true" style={{width:3,height:12,borderRadius:2,background:tone||C.blueSolid,flexShrink:0}}/><span style={{minWidth:0}}>{children}</span>{_lv?<ConfChip level={_lv} label={children} compact onFlag={_onFlag?function(){_onFlag(_k,children);}:null}/>:null}</div>;
}
