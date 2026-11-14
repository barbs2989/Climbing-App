import { useState, useContext } from "react";
import { clickable } from "../../lib/clickable";
import { rowGrade } from "../../lib/areaBrowserShared.js";
import { DISC_LABELS as DL } from "../../lib/discLabels";
import { ClimberCtx } from "../../lib/climberCtx.js";
import type { RouteRowRoute } from "./RouteRow.tsx";
import type { C as Palette } from "../../ClimbMatchCore.jsx";
import Chevron from "./Chevron.tsx";

// EVERY classic, five at a time (owner, 2026-10-29: "just have a dropdown after 5 to show them all"). The first five
// always show; a toggle under them opens the rest. `total` is the whole count when the read was capped, and the open
// list says so rather than presenting the cap as all of them. `withWall` names each row's wall (areas above a wall).
//
// Drawn as a striped table inside the area sheet (owner, 2026-11-11: "a list of classic climbs with a dropdown to view
// all after 5 climbs that doesn't take too much space"): one short row per climb -- name, where, stars, grade -- as
// Mountain Project's classics table reads, plus what MP's does not show: ✓ on a climb you have logged and ★ on one
// that is in your objectives (ClimberCtx: completedIds, wishlist).
const CLASSICS_SHOWN = 5;
export interface ClassicsListRow extends RouteRowRoute { id: string | number; area_name?: string | null }
export interface ClassicsListProps {
  rows: ClassicsListRow[];
  /** The whole count when the read was capped. */
  total?: number | null;
  withWall?: boolean;
  /** Website: the where/type column sits on the row's one line; a phone puts it on a second, muted line. */
  dense?: boolean;
  onOpen: (r: RouteRowRoute) => void;
  C: typeof Palette;
  /** The heading word; "Top rated here" when a wall has no classics. */
  title?: string;
}
export default function ClassicsList({ rows, total, withWall, dense, onOpen, C, title }: ClassicsListProps) {
  const [open, setOpen] = useState(false);
  const { wishlist, completedIds } = useContext(ClimberCtx);
  const wish = new Set((wishlist || []).map(String));
  const done = new Set([...(completedIds || [])].map(String));
  const all = Math.max(total || 0, rows.length), rest = rows.length - CLASSICS_SHOWN;
  const shown = open ? rows : rows.slice(0, CLASSICS_SHOWN);
  return (
    <div style={{ padding: "12px 14px", borderTop: "1px solid " + C.border }}>
      <h2 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 800, color: C.text, letterSpacing: 0.4, textTransform: "uppercase" }}>{(title || "Classic climbs") + " · " + all.toLocaleString()}</h2>
      <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid " + C.border }}>
        {shown.map((r, i) => {
          const stars = r.stars ? Math.round(r.stars) : 0;
          const pitches = r.pitches > 1 && r.discipline !== "bouldering" && r.discipline !== "scrambling" ? r.pitches + "p" : null;
          const sub = [withWall ? r.area_name || null : null, r.discipline ? (DL[r.discipline] || r.discipline) : null, pitches].filter(Boolean).join(" · ");
          const ticked = done.has(String(r.id)), saved = wish.has(String(r.id));
          const marks = ticked || saved ? <span style={{ flexShrink: 0, display: "inline-flex", gap: 3, fontSize: 11.5, fontWeight: 800 }}>
            {ticked ? <span title="You logged this" aria-label="logged" style={{ color: C.green }}>{"✓"}</span> : null}
            {saved ? <span title="In your objectives" aria-label="objective" style={{ color: C.amber }}>{"★"}</span> : null}
          </span> : null;
          const name = <span style={{ fontSize: 13, fontWeight: 700, color: C.text, overflowWrap: "anywhere", minWidth: 0, flex: dense ? "0 1 auto" : 1 }}>{r.name}</span>;
          const starEl = stars ? <span aria-label={stars + " stars"} style={{ color: C.amber, fontWeight: 700, flexShrink: 0, fontSize: 11 }}>{"★".repeat(stars)}</span> : null;
          const grade = <span style={{ fontSize: 12, color: C.text, flexShrink: 0, fontWeight: 700, minWidth: 40, textAlign: "right" }}>{rowGrade(r)}</span>;
          return <div key={"classic-" + r.id} {...clickable(() => onOpen(r))} style={{ cursor: "pointer", padding: "6px 10px", minHeight: 36, boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "center", background: i % 2 ? "transparent" : "rgba(255,255,255,0.035)", borderTop: i ? "1px solid " + C.border : "none" }}>
            {dense
              ? <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>{marks}<div style={{ flex: 1, minWidth: 0, lineHeight: 1.35, overflowWrap: "anywhere" }}>{name}{sub ? <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 8 }}>{sub}</span> : null}</div>{starEl}{grade}</div>
              : <>
                <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>{marks}{name}{starEl}{grade}</div>
                {sub ? <div style={{ fontSize: 11, color: C.textMuted, overflowWrap: "anywhere" }}>{sub}</div> : null}
              </>}
          </div>;
        })}
      </div>
      {open && all > rows.length ? <div style={{ fontSize: 12, color: C.textMuted, margin: "6px 2px 0" }}>{"The first " + rows.length.toLocaleString() + " of " + all.toLocaleString() + " classic climbs here, best first."}</div> : null}
      {rest > 0 ? (
        <button onClick={() => setOpen(o => !o)} aria-expanded={open} style={{ minHeight: 44, width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", padding: "8px 0 0", cursor: "pointer" }}>
          <span style={{ flex: 1, textAlign: "left", fontSize: 12.5, fontWeight: 700, color: C.blue }}>{open ? "Show fewer" : "Show all " + all.toLocaleString() + (title ? "" : " classic climbs")}</span>
          <Chevron open={open} size={14} color={C.blue} />
        </button>
      ) : null}
    </div>
  );
}
