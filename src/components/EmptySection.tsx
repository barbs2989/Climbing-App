import { C, ROUTE_GAP, RSL as SL } from "../../ClimbMatchCore.jsx";
import EditIconButton from "./EditIconButton.tsx";
import GapNote from "./GapNote.tsx";

export interface EmptySectionProps {
  /** The section's heading. */
  title: string;
  /** What is missing, and why it matters (see GapNote). */
  what: string;
  why?: string | null;
  cta?: string | null;
  /** Opens the editor; it also puts a pencil on the heading. */
  onFix?: (() => void) | null;
  /** The pencil's name (default the call to action). */
  editTitle?: string | null;
}

/** A route-page section with nothing in it yet: its heading, and the note saying what to add. Reads `C` at render time. Moved verbatim from RouteDetail.jsx; only the types were added. */
export default function EmptySection({title,what,why,cta,onFix,editTitle}: EmptySectionProps){return <div style={{marginBottom:ROUTE_GAP}}><SL action={onFix?<EditIconButton onClick={onFix} title={editTitle||cta||"Add what you know"}/>:null}>{title}</SL><div style={{background:C.card,borderRadius:12,padding:"12px 14px 1px",border:`1px solid ${C.border}`}}><GapNote what={what} why={why} cta={cta} onFix={onFix}/></div></div>;}
