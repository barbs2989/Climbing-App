import { C, ROUTE_GAP, RSL as SL } from "../../ClimbMatchCore.jsx";
import { FACT_FIELD } from "../../lib/cragFactField.js";
import EditIconButton from "./EditIconButton.tsx";
import CragFactRows, { type CragFact } from "./CragFactRows.tsx";

export interface CragFactSectionProps {
  title: string;
  rows: CragFact[];
  /** Opens the editor at a field. */
  onEdit?: ((field: string) => void) | null;
}

/** One section: what is on file first, then each missing fact with its own Add, which opens the editor AT
   that field — one tap per gap rather than one link for the whole card.
 *
 * Reads `C` at render time. Moved verbatim from RouteDetail.jsx; only the types were added.
 */
export default function CragFactSection({title,rows,onEdit}: CragFactSectionProps){const have=rows.filter(function(f){return !f[2];}),miss=rows.filter(function(f){return f[2];});const first=(miss[0]||have[0])[0];
  return <div style={{marginBottom:ROUTE_GAP}}><SL action={onEdit&&FACT_FIELD[first]?<EditIconButton onClick={function(){onEdit(FACT_FIELD[first]);}} title={"Edit "+title.toLowerCase()}/>:null}>{title}</SL><div style={{background:C.card,borderRadius:12,padding:"2px 14px",border:"1px solid "+C.border}}><CragFactRows rows={rows} onEdit={onEdit}/></div></div>;}
