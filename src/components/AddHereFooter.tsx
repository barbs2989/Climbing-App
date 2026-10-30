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
  C: typeof Palette;
}
export default function AddHereFooter({ area, onAddClimb, onAddArea, C }: AddHereFooterProps) {
  const { data: kids } = useAreaChildren(onAddArea && area ? area.id : null);
  if (!area || (!onAddClimb && !onAddArea)) return null;
  const holdsClimbs = Array.isArray(kids) && kids.length === 0 && area.route_count > 0;
  const canArea = !!onAddArea && Array.isArray(kids) && !holdsClimbs && !["world", "country"].includes(area.area_type);
  const btn = { ...BTN_LG, flex: 1, minWidth: 0, border: "1px dashed " + C.border, background: C.surface, color: C.blue, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 };
  return (
    <div style={{ marginTop: 10, marginBottom: 14 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, marginBottom: 8 }}>{canArea && onAddClimb ? "Don’t see a climb or area here?" : canArea ? "Don’t see an area here?" : "Don’t see a climb here?"}</div>
      <div style={{ display: "flex", gap: 8 }}>
        {onAddClimb ? <button onClick={() => onAddClimb(area)} aria-label={"Add a climb to " + area.name} style={btn}>{"Add a climb"}<span aria-hidden="true" style={{display:"flex",flexShrink:0}}><Chevron size={14} color={"currentColor"}/></span></button> : null}
        {canArea ? <button onClick={() => onAddArea(area)} aria-label={"Add an area to " + area.name} style={btn}>{"Add an area"}<span aria-hidden="true" style={{display:"flex",flexShrink:0}}><Chevron size={14} color={"currentColor"}/></span></button> : null}
      </div>
    </div>
  );
}
