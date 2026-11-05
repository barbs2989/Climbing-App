import { useAreaChildren } from "../../lib/db";
import { BTN_LG } from "../../lib/buttonStyles.js";
import Chevron from "./Chevron.tsx";
import type { C as Palette } from "../../ClimbMatchCore.jsx";

// "Don't see a climb or area here?" — under the list on an area page AND under the route finder's
// results (owner, 2026-10-23). Add an area is Mountain Project's "Add to Page → Sub-Area", under the
// same rule MP and our trg_areas_leaf_xor share: an area holds sub-areas OR climbs, so a crag that
// already lists climbs offers only Add a climb; a country (its states are fixed) offers no new area.
export interface AddHereFooterArea { id: string; name: string; route_count: number; area_type: string }
export interface AddHereFooterProps {
  area: AddHereFooterArea | null | undefined;
  /** Absent hides "Add a climb". */
  onAddClimb?: ((area: AddHereFooterArea) => void) | null;
  /** Absent hides "Add an area". */
  onAddArea?: ((area: AddHereFooterArea) => void) | null;
  /** Desktop: drawn as one cell of AreaPage's "add / edit / wrong place" row — question on top, buttons at
   *  the cell's foot — instead of a full-width block of its own. */
  cell?: boolean;
  C: typeof Palette;
}
export default function AddHereFooter({ area, onAddClimb, onAddArea, cell, C }: AddHereFooterProps) {
  const { data: kids } = useAreaChildren(onAddArea && area ? area.id : null);
  if (!area || (!onAddClimb && !onAddArea)) return null;
  const holdsClimbs = Array.isArray(kids) && kids.length === 0 && area.route_count > 0;
  const canArea = !!onAddArea && Array.isArray(kids) && !holdsClimbs && !["world", "country"].includes(area.area_type);
  // In a cell, flexGrow/flexBasis rather than `flex: 1`: wideLayout shrinks a lone `flex: 1` button to its label.
  const btn = { ...BTN_LG, ...(cell ? { flexGrow: 1, flexBasis: 0 } : { flex: 1 }), minWidth: 0, border: "1px dashed " + C.border, background: C.surface, color: C.blue, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 };
  return (
    <div style={cell ? { flex: (canArea && onAddClimb ? "2 1 260px" : "1 1 180px"), minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" } : { marginTop: 10, marginBottom: 14 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, marginBottom: 8 }}>{canArea && onAddClimb ? "Don’t see a climb or area here?" : canArea ? "Don’t see an area here?" : "Don’t see a climb here?"}</div>
      <div style={{ display: "flex", gap: 8 }}>
        {onAddClimb ? <button onClick={() => onAddClimb(area)} aria-label={"Add a climb to " + area.name} style={btn}>{"Add a climb"}<span aria-hidden="true" style={{display:"flex",flexShrink:0}}><Chevron size={14} color={"currentColor"}/></span></button> : null}
        {canArea ? <button onClick={() => onAddArea(area)} aria-label={"Add an area to " + area.name} style={btn}>{"Add an area"}<span aria-hidden="true" style={{display:"flex",flexShrink:0}}><Chevron size={14} color={"currentColor"}/></span></button> : null}
      </div>
    </div>
  );
}
