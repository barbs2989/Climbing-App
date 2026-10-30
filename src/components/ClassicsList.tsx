import { useState } from "react";
import { SL } from "../../lib/areaBrowserParts.jsx";
import RouteRow from "./RouteRow.tsx";
import Chevron from "./Chevron.tsx";

// EVERY classic, five at a time (owner, 2026-10-29: "just have a dropdown after 5 to show them all"). The first five
// always show; a toggle under them opens the rest. `total` is the whole count when the read was capped, and the open
// list says so rather than presenting the cap as all of them. `withWall` names each row's wall (areas above a wall).
const CLASSICS_SHOWN = 5;
export default function ClassicsList({ rows, total, withWall, onOpen, C }) {
  const [open, setOpen] = useState(false);
  const all = Math.max(total || 0, rows.length), rest = rows.length - CLASSICS_SHOWN;
  const shown = open ? rows : rows.slice(0, CLASSICS_SHOWN);
  return (
    <>
      <SL C={C}>{"Classic climbs here · " + all.toLocaleString()}</SL>
      {shown.map(r => <RouteRow key={"classic-" + r.id} r={r} areaName={withWall ? r.area_name : undefined} onOpen={onOpen} C={C} />)}
      {open && all > rows.length ? <div style={{ fontSize: 12, color: C.textMuted, margin: "2px 2px 8px" }}>{"The first " + rows.length.toLocaleString() + " of " + all.toLocaleString() + " classic climbs here, best first."}</div> : null}
      {rest > 0 ? (
        <button onClick={() => setOpen(o => !o)} aria-expanded={open} style={{ minHeight: 44, width: "100%", display: "flex", alignItems: "center", gap: 9, background: C.surface, border: "1px solid " + C.border, borderRadius: 12, padding: "11px 13px", cursor: "pointer", marginBottom: 8 }}>
          <span style={{ flex: 1, textAlign: "left", fontSize: 13.5, fontWeight: 700, color: C.text }}>{open ? "Show fewer classic climbs" : "Show all " + all.toLocaleString() + " classic climbs"}</span>
          <Chevron open={open} color={C.blue} />
        </button>
      ) : null}
    </>
  );
}
