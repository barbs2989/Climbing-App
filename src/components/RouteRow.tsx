import { DISC_LABELS as DL } from "../../lib/discLabels";
import { clickable } from "../../lib/clickable";
import { rowGrade } from "../../lib/areaBrowserShared.js";
import type { C as Palette } from "../../ClimbMatchCore.jsx";

export interface RouteRowRoute {
  id?: string | number;
  name?: string;
  stars?: number | null;
  pitches: number;
  discipline?: keyof typeof DL;
  sort_order?: number | null;
}
export interface RouteRowProps {
  r: RouteRowRoute;
  onOpen: (r: RouteRowRoute) => void;
  C: typeof Palette;
  /** Names the wall/area the row sits in; null or absent shows none. */
  areaName?: string | null;
  /** ONE line — name, stars, the sub-line and the grade across one row, less padding — as Mountain Project draws a classics table (website classics). */
  dense?: boolean;
}

export default function RouteRow({ r, onOpen, C, areaName, dense }: RouteRowProps) {
  const stars = r.stars ? Math.round(r.stars) : 0;
  // The PITCH COUNT sits beside the discipline, as Mountain Project's lists write it ("Trad, 5 pitches"):
  // the stored count, exactly as the route page's Pitches stat shows it. A boulder has no pitches, and neither
  // does a scramble (never roped: owner note, 2026-10-25), so a scrambling row shows none here either.
  const pitches = r.pitches > 0 && r.discipline !== "bouldering" && r.discipline !== "scrambling" ?r.pitches + " pitch" + (r.pitches !== 1 ? "es" : "") : null;
  const sub = [areaName || null, r.discipline ? (DL[r.discipline] || r.discipline) : null, pitches, r.sort_order != null && r.discipline !== "bouldering" ? "#" + r.sort_order + " in this area" : null].filter(Boolean).join(" · ");
  if (dense) return (
    <div {...clickable(() => onOpen(r))} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", marginBottom: 4, background: C.card, border: "1px solid " + C.border, borderRadius: 10, cursor: "pointer", minWidth: 0 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: "0 1 auto", minWidth: 0 }}>{r.name}</span>
      {stars ? <span style={{ color: C.amber, fontWeight: 700, flexShrink: 0, fontSize: 11 }}>{"★".repeat(stars)}</span> : null}
      <span style={{ fontSize: 11, color: C.textMuted, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</span>
      <span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0, fontWeight: 700 }}>{rowGrade(r)}</span>
    </div>
  );
  return (
    <div {...clickable(() => onOpen(r))} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", marginBottom: 8, background: C.card, border: "1px solid " + C.border, borderRadius: 12, cursor: "pointer", flex: 1, minWidth: 0 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, overflowWrap: "anywhere" }}>{r.name}</div>
        <div style={{ fontSize: 11, color: C.textMuted, display: "flex", alignItems: "center", gap: 5 }}>
          {stars ? <span style={{ color: C.amber, fontWeight: 700, flexShrink: 0 }}>{"★".repeat(stars)}</span> : null}
          <span style={{ overflowWrap: "anywhere" }}>{sub}</span>
        </div>
      </div>
      <span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0, maxWidth: "38%", fontWeight: 700, overflowWrap: "anywhere" }}>{rowGrade(r)}</span>
    </div>
  );
}
