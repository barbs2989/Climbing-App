import { C } from "../../ClimbMatchCore.jsx";
import CardHead from "./CardHead.tsx";
import Chevron from "./Chevron.tsx";

/** One researched pairing (routes.same_trip, 0379): another summit a party takes in on this route's trip. */
export interface SameTripPeak {
  area_id: string;
  name: string;
  route_id?: string | null;
  route_name?: string | null;
  note?: string | null;
}

export interface SameTripPeaksProps {
  peaks: SameTripPeak[];
  /** Opens the other peak's area page, as the breadcrumb does. Absent: the rows are text, not buttons. */
  onOpenArea?: ((a: { id: string; name: string }) => void) | null;
}

/**
 * OFTEN CLIMBED ON THE SAME TRIP (owner note 2026-10-28): the other summits parties pair with this route,
 * each with one line on how (the shared camp or col, and roughly what it adds). Peakbagger lists the other
 * peaks logged on one trip without saying how they connect; this says which camp or ridge makes the pair.
 * Renders nothing when no pairing is researched — an empty list is not a claim that a peak stands alone.
 */
export default function SameTripPeaks({ peaks, onOpenArea }: SameTripPeaksProps) {
  if (!peaks || !peaks.length) return null;
  return <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 14, padding: 14, marginTop: 12 }}>
    <CardHead style={{ marginBottom: 4 }}>Often climbed on the same trip</CardHead>
    <div style={{ fontSize: 12, color: C.textSub, marginBottom: 10, lineHeight: 1.5 }}>Other summits parties take in from this climb&apos;s approach or camp.</div>
    {peaks.map(p => {
      const body = <>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{p.name}</div>
          {p.route_name ? <div style={{ fontSize: 11.5, color: C.textSub, marginTop: 1 }}>{"Usually by " + p.route_name}</div> : null}
          {p.note ? <div style={{ fontSize: 12, color: C.textSub, marginTop: 3, lineHeight: 1.45 }}>{p.note}</div> : null}
        </div>
        {onOpenArea ? <span aria-hidden="true" style={{ display: "flex", flexShrink: 0 }}><Chevron size={16} color={C.textMuted} /></span> : null}
      </>;
      const row = { display: "flex", alignItems: "center", gap: 11, width: "100%", textAlign: "left" as const, background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "10px 12px", marginBottom: 8, color: C.text, font: "inherit" };
      return onOpenArea
        ? <button key={p.area_id} onClick={() => onOpenArea({ id: p.area_id, name: p.name })} style={{ ...row, cursor: "pointer" }}>{body}</button>
        : <div key={p.area_id} style={row}>{body}</div>;
    })}
  </div>;
}
