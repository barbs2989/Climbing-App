import { nearbyPeaksBounds, nearbyPeaksRows } from "../../lib/nearbyPeaks.js";
import { useNearbyPeaks } from "../../lib/db";
import { useMemo } from "react";
import { SL } from "../../lib/areaBrowserParts.jsx";
import { clickable } from "../../lib/clickable";

export default function NearbyPeaks({ area, onJumpToArea, C, uDistMi }) {
  const bounds = nearbyPeaksBounds(area);
  // Called unconditionally — the hook is gated by `enabled: !!bounds`, not by a conditional
  // call, because a hook behind an `if` is the #377 shape check:hooks exists to catch.
  const { data } = useNearbyPeaks(bounds);
  const rows = useMemo(() => nearbyPeaksRows(area, data && data.rows, 6),
    [data, area && area.id, area && area.lat, area && area.lng, area && area.area_type]); // eslint-disable-line react-hooks/exhaustive-deps -- recompute when the area identity or position changes; area is a fresh parent object each render
  if (!rows.length) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <SL C={C}>Nearby peaks</SL>
      <div style={{ fontSize: 11.5, color: C.textMuted, margin: "-4px 0 9px", lineHeight: 1.5 }}>Other peaks with routes on file, by straight-line distance from this summit — not driving distance, and not a claim they share a trailhead.</div>
      {rows.map(({ a, mi }) => (
        <div key={a.id} {...clickable(() => onJumpToArea(a))} style={{ background: C.card, borderRadius: 12, padding: "11px 14px", marginBottom: 9, border: "1px solid " + C.borderHi, cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 14.5, color: C.text, minWidth: 0, lineHeight: 1.3, overflowWrap: "anywhere" }}>{a.name}</span>
            <span style={{ fontSize: 12, color: C.blue, fontWeight: 600, flexShrink: 0 }}>{(uDistMi ? uDistMi(mi) : mi.toFixed(1) + " mi") + " · " + a.route_count + " →"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
