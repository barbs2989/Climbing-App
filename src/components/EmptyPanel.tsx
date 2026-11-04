import Head from "./Head.tsx";
import type { C as Palette } from "../../ClimbMatchCore.jsx";
import type ActionIconType from "./ActionIcon.tsx";

export interface EmptyPanelProps {
  C: typeof Palette;
  ActionIcon: typeof ActionIconType;
  /** ActionIcon name drawn beside the title. */
  icon: string;
  title: string;
  /** The sentence saying what is missing. */
  what: string;
  /** The button label that invites filling the gap. */
  cta: string;
  onAdd: () => void;
}

// The empty state of a section that pertains to the route: the same card and heading, with a prompt
// to fill it, so a gap reads as a gap a climber can close rather than a missing section.
export default function EmptyPanel({C, ActionIcon, icon, title, what, cta, onAdd}: EmptyPanelProps) {
  return <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:12,padding:"13px 15px",marginBottom:13}}><Head C={C} style={{marginBottom:8}}><span style={{display:"inline-flex",alignItems:"center",gap:7}}><ActionIcon name={icon} size={14} color={C.text}/>{title}</span></Head><div style={{paddingLeft:9,borderLeft:"2px solid "+C.borderLight}}><span style={{fontSize:11.5,color:C.textMuted,lineHeight:1.55}}>{what}</span><button onClick={onAdd} style={{display:"block",marginTop:1,padding:"5px 0",border:"none",background:"none",color:C.blue,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{cta}</button></div></div>;
}
