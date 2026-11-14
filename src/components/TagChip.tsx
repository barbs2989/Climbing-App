import { C } from "../../ClimbMatchCore.jsx";
import { clickable } from "../../lib/clickable";
import type { routeTags } from "../../lib/routeTags.js";
import ActionIcon from "./ActionIcon.tsx";

/** One tag as routeTags() builds it (a list the route is on, or a style). */
export type RouteTag = ReturnType<typeof routeTags>[number];
export interface TagChipProps {
  t: RouteTag;
  /** This chip's blurb is the one shown under the row. */
  open?: boolean;
  onToggle: () => void;
}

/**
 * One route tag chip: its icon, short name and detail, in the tag's own colour; it toggles the tag's blurb
 * (aria-expanded), and its tap target is 44px tall around a 26px chip. Reads `C` at render time. Moved verbatim
 * from RouteDetail.jsx with the props type added; the palette lookup by the tag's colour NAME goes through a
 * `Record` view of `C` (`pal`) so an unknown name reads as missing, as it always did, instead of failing to type-check.
 */
export default function TagChip({t,open,onToggle}: TagChipProps){const pal: Record<string,string|undefined>=C;const col=pal[t.color]||C.textSub;const bg=pal[t.color+"Bg"]||C.surface;
  const name=(t.label||t.short)+(t.detail?", "+t.detail:"")+(t.blurb?" - "+t.blurb:"");
  /* The chip is drawn 26px tall; the control around it is 44 (check:dropdown-targets), transparent, so the row keeps its look. */
  return <span {...clickable(onToggle)} aria-expanded={!!open} aria-label={name} title={(t.blurb||t.label)+(t.detail?" ("+t.detail+")":"")} style={{minHeight:44,display:"inline-flex",alignItems:"center",cursor:"pointer"}}><span style={{display:"inline-flex",alignItems:"center",gap:4,background:bg,border:"1px solid "+col+(open?"":"55"),borderRadius:20,padding:"4px 10px",fontSize:12,fontWeight:700,color:col,whiteSpace:"nowrap"}}><span aria-hidden="true" style={{display:"inline-flex"}}><ActionIcon name={t.icon} size={13} color={col}/></span>{t.short||t.label}{t.detail?<b style={{fontWeight:800,opacity:0.8,marginLeft:1}}>{t.detail}</b>:null}</span></span>;}
