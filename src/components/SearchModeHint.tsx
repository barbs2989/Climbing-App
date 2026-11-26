import type { CSSProperties } from "react";
import type { C as Palette } from "../../ClimbMatchCore.jsx";
import ActionIcon from "./ActionIcon.tsx";
import { ATYPE } from "../../lib/areaBrowserShared.js";

/* WHICH BOX TO USE (owner note, 2026-11-26: "on the search areas and routes, for all instances we should give
   context that you need to search areas for looking for peaks ... to help users understand which search box they
   need to use"). The phone's Routes box matches a climb's OWN name only (routes_in_subtree / the device search), so
   "Rainier" there finds nothing on Mount Rainier and read as "the app has no Rainier". Two pieces, used by every
   Areas | Routes switch (Route finder, an area page's Search <area>, the Climbs tab's downloaded search):
   - the PLACEHOLDERS say what each box finds, and the Routes one says where a peak is;
   - while you type in Routes, SearchModeHint (default export) shows the areas your words name, one tap from the Areas tab.
   Mountain Project and theCrag answer a search with places and climbs side by side for the same reason; the switch
   stays (owner, 2026-11-18: "separated by routes and areas"), and this row carries the place hits across it. */
export const AREAS_PLACEHOLDER = "Search peaks, crags and areas…";
export const ROUTES_PLACEHOLDER = "Route names — for a peak, use Areas";

export interface SearchModeHintArea { id: string; name: string; area_type?: string | null }
export interface SearchModeHintProps {
  C: typeof Palette;
  /** The words typed in the Routes box. */
  q: string;
  /** Areas those same words match (the Areas tab's own search for them). */
  areas: SearchModeHintArea[] | null | undefined;
  /** The full match count when the list is cut (areaSearchTotal); the list's length otherwise. */
  total?: number;
  /** Switches the box to Areas, keeping the words. */
  onSearchAreas: () => void;
  style?: CSSProperties;
}

const typeOf = (t?: string | null) => (t && (ATYPE as Record<string, string>)[t]) || "";

/** In the Routes tab (default export, `SearchModeHint`): "Looking for a peak or crag? 2 areas named “rainier”" over the first few, a tap opens Areas. */
export default function SearchModeHint({ C, q, areas, total, onSearchAreas, style }: SearchModeHintProps) {
  const qq = q.trim();
  const list = areas || [];
  if (!qq || !list.length) return null;
  const n = Math.max(total || 0, list.length);
  const names = list.slice(0, 3).map(a => a.name + (typeOf(a.area_type) ? " (" + typeOf(a.area_type).toLowerCase() + ")" : "")).join(", ") + (n > 3 ? ", and more" : "");
  return (
    <button type="button" onClick={onSearchAreas} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, minHeight: 44, padding: "9px 12px", margin: "0 0 8px", borderRadius: 10, border: "1px solid " + C.blueDim, background: C.surface, color: C.text, textAlign: "left", cursor: "pointer", boxSizing: "border-box", ...style }}>
      <ActionIcon name="mountain" size={17} color={C.blue} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: C.blue, overflowWrap: "anywhere" }}>{"Looking for a peak or crag? " + n.toLocaleString() + (n === 1 ? " area" : " areas") + " named “" + qq + "”"}</span>
        <span style={{ display: "block", fontSize: 11.5, color: C.textMuted, overflowWrap: "anywhere" }}>{names}</span>
      </span>
      <span aria-hidden="true" style={{ color: C.blue, fontWeight: 700, flexShrink: 0 }}>→</span>
    </button>
  );
}

/** Under "No areas match": a climb's own name lives in the Routes tab. */
export function RoutesInsteadHint({ C, onSearchRoutes }: { C: typeof Palette; onSearchRoutes: () => void }) {
  return <button type="button" onClick={onSearchRoutes} style={{ minHeight: 40, padding: "6px 14px", borderRadius: 20, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Looking for a climb by name? Search Routes</button>;
}

/** Under "No routes match": a peak, crag or area lives in the Areas tab. */
export function AreasInsteadHint({ C, onSearchAreas }: { C: typeof Palette; onSearchAreas: () => void }) {
  return <button type="button" onClick={onSearchAreas} style={{ minHeight: 40, padding: "6px 14px", borderRadius: 20, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Looking for a peak or crag? Search Areas</button>;
}
