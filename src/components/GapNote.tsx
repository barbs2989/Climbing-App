import { C } from "../../ClimbMatchCore.jsx";

export interface GapNoteProps {
  /** What is missing, in a few words ("No approach description"). */
  what: string;
  /** Why it matters; joined to `what` with a dash. */
  why?: string | null;
  /** The fix button's words (default "Add what you know"). */
  cta?: string | null;
  /** Opens the editor for the missing field; without it there is no button. */
  onFix?: (() => void) | null;
  /** Extra space above, in px. */
  mt?: number | null;
}

/**
 * The muted line a section draws in place of a field the route does not have yet, with a button to add it.
 * Reads `C` at render time. Moved verbatim from RouteDetail.jsx; only the types were added.
 */
export default function GapNote({what,why,cta,onFix,mt}: GapNoteProps){return <div style={{marginTop:(mt||0)+2,marginBottom:11,paddingLeft:9,borderLeft:"2px solid "+C.borderLight}}><span style={{fontSize:11.5,color:C.textMuted,lineHeight:1.55}}>{what}{why?" — "+why:""}</span>{onFix?<button onClick={onFix} style={{display:"block",marginTop:1,padding:"5px 0",border:"none",background:"none",color:C.blue,fontSize:11.5,fontWeight:700,cursor:"pointer",textAlign:"left"}}>{(cta||"Add what you know")+" →"}</button>:null}</div>;}
