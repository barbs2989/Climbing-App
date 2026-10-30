import { DISC_LABELS as DL } from "../../lib/discLabels";
import { clickable } from "../../lib/clickable";
import { rowGrade } from "../../lib/areaBrowserShared.js";

export default function RouteRow({ r, onOpen, C, areaName }) {
  const stars = r.stars ? Math.round(r.stars) : 0;
  // The PITCH COUNT sits beside the discipline, as Mountain Project's lists write it ("Trad, 5 pitches"):
  // the stored count, exactly as the route page's Pitches stat shows it. A boulder has no pitches, and neither
  // does a scramble (never roped: owner note, 2026-10-25), so a scrambling row shows none here either.
  const pitches = r.pitches > 0 && r.discipline !== "bouldering" && r.discipline !== "scrambling" ?r.pitches + " pitch" + (r.pitches !== 1 ? "es" : "") : null;
  const sub = [areaName || null, r.discipline ? (DL[r.discipline] || r.discipline) : null, pitches, r.sort_order != null ? "#" + r.sort_order + " in this area" : null].filter(Boolean).join(" · ");
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
