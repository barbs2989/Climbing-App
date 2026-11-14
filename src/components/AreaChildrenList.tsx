import { clickable } from "../../lib/clickable";
import WallGradeBars from "./WallGradeBars.tsx";
import type { WallGradeRow } from "./WallGradeBars.tsx";
import Chevron from "./Chevron.tsx";
import WalkInMap from "../../lib/WalkInMap.jsx";
import type { C as Palette } from "../../ClimbMatchCore.jsx";

export interface AreaChildRow { id: string | number; name: string; route_count: number; path?: string | null; [column: string]: unknown }
export interface AreaChildrenListProps<T extends AreaChildRow> {
  rows: T[];
  /** The heading: "Areas", "Peaks", "Walls"… */
  noun: string;
  onDrill: (a: T) => void;
  C: typeof Palette;
  /** Child id → its grade rows (website mini chart); null draws none. */
  grades?: Record<string, WallGradeRow[]> | null;
  /** Child id → how many of the climber's objectives are inside it. */
  objectives?: Record<string, number> | null;
  /** "sidebar": the website's left column. "section": a section of the phone's area sheet. */
  variant: "sidebar" | "section";
  /** Sidebar: the "All areas" tree link in the heading. */
  onAllAreas?: () => void;
  /** Sidebar: the map thumbnail at the top, and where tapping it goes. */
  map?: { lat: number; lng: number; zoom: number; name: string } | null;
  onNear?: () => void;
}

// THE SUB-AREAS, near the top of the page (owner, 2026-11-11: "you have to scroll too far to look at the areas
// below"). On the website they are a left column beside the page, as Mountain Project's area pages have them; on
// a phone they are the section right after the Route finder row. EVERY child is listed -- no "show more" cap
// (owner: "i dont want to cap areas at 6, show all"). Each row carries what MP's does not: the mini grade chart
// (website) and a ★N badge when the climber's own objectives are inside it.
export default function AreaChildrenList<T extends AreaChildRow>({ rows, noun, onDrill, C, grades, objectives, variant, onAllAreas, map, onNear }: AreaChildrenListProps<T>) {
  const side = variant === "sidebar";
  const head = <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: side ? 6 : 4 }}>
    <h2 style={{ margin: 0, fontSize: 12, fontWeight: 800, color: C.text, letterSpacing: 0.4, textTransform: "uppercase" }}>{noun + " (" + rows.length.toLocaleString() + ")"}</h2>
    {side && onAllAreas ? <button onClick={onAllAreas} style={{ background: "none", border: "none", padding: "4px 0", color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>All areas</button> : null}
  </div>;
  const badge = (id: string | number) => { const n = objectives ? objectives[String(id)] || 0 : 0; return n ? <span aria-label={n + " of your objectives"} title={n + " of your objectives"} style={{ flexShrink: 0, fontSize: 11, fontWeight: 800, color: C.amber }}>{"★" + n}</span> : null; };
  const count = (n: number) => n.toLocaleString() + (side ? "" : " climb" + (n !== 1 ? "s" : ""));
  return <div>
    {side && map ? <div style={{ position: "relative", marginBottom: 10 }}>
      <WalkInMap pts={[]} park={null} crag={{ lat: map.lat, lng: map.lng }} height={120} zoom={map.zoom} label={"Map of " + map.name} />
      {onNear ? <button onClick={onNear} aria-label={"Open the map of " + map.name} style={{ position: "absolute", inset: 0, background: "transparent", border: "none", cursor: "pointer", borderRadius: 9, padding: 0, zIndex: 500 /* over Leaflet's own panes (400) */ }}>
        {/* A visible EXPAND chip (owner, 2026-11-14): the whole thumbnail opens the map, but nothing said so. */}
        <span aria-hidden="true" style={{ position: "absolute", top: 6, right: 6, display: "inline-flex", alignItems: "center", gap: 5, background: C.card, color: C.text, border: "1px solid " + C.border, borderRadius: 8, padding: "4px 8px", fontSize: 12, fontWeight: 700, boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
          {"Expand"}
        </span>
      </button> : null}
      {onNear ? <button onClick={onNear} style={{ display: "block", width: "100%", background: "none", border: "none", padding: "5px 0 0", color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "center" }}>Area map</button> : null}
    </div> : null}
    {head}
    <div>
      {rows.map((a, i) => {
        const g = grades ? grades[String(a.id)] : null;
        return <div key={a.id} {...clickable(() => onDrill(a))} style={{ cursor: "pointer", padding: side ? "7px 2px" : "9px 0", minHeight: side ? 36 : 44, boxSizing: "border-box", borderTop: i ? "1px solid " + C.border : "none", display: "flex", flexDirection: "column", justifyContent: "center", gap: 3 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: side ? 13 : 14.5, fontWeight: 700, color: side ? C.blue : C.text, overflowWrap: "anywhere", lineHeight: 1.3 }}>{a.name}</span>
            {badge(a.id)}
            <span style={{ flexShrink: 0, fontSize: 12, color: C.textMuted, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{count(a.route_count)}</span>
            {side ? null : <Chevron size={16} color={C.textMuted} />}
          </div>
          {g && g.length ? <WallGradeBars rows={g} name={a.name} total={a.route_count} C={C} /> : null}
        </div>;
      })}
    </div>
  </div>;
}
