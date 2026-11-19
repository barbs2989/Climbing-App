import { useMemo, useState } from "react";
import { clickable } from "../../lib/clickable";
import WallGradeBars from "./WallGradeBars.tsx";
import type { WallGradeRow } from "./WallGradeBars.tsx";
import ViewAreaPill from "./ViewAreaPill.tsx";
import WalkInMap from "../../lib/WalkInMap.jsx";
import type { C as Palette } from "../../ClimbMatchCore.jsx";
import { childSortOptions, sortChildren, childSortFigure, getChildSort, setChildSort, CHILD_SORT_DEFAULT } from "../../lib/areaChildSort.js";
import type { ChildDiscCounts, ChildSortPoint } from "../../lib/areaChildSort.js";
import { DISC_LABELS } from "../../lib/discLabels.js";

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
  map?: { lat: number; lng: number; zoom: number; name: string; pin: boolean } | null;
  onNear?: () => void;
  /** Child id → discipline → climbs in its subtree (0455), for the "Most sport / trad…" sorts; null hides them. */
  discCounts?: ChildDiscCounts | null;
}

// The order a child's disciplines are listed in when they tie (and when only the row's disciplines[] list is known).
const DISC_ROW_ORDER = ["sport", "trad", "bouldering", "toprope", "alpine", "ice", "mixed", "aid", "mountaineering", "scrambling"];
const FINDING = "Finding you…";

// THE SUB-AREAS, near the top of the page (owner, 2026-11-11: "you have to scroll too far to look at the areas
// below"). On the website they are a left column beside the page, as Mountain Project's area pages have them; on
// a phone they are the section right after the Route finder row. EVERY child is listed -- no "show more" cap
// (owner: "i dont want to cap areas at 6, show all"). Each row carries what MP's does not: the mini grade chart
// (website) and a ★N badge when the climber's own objectives are inside it.
//
// THE SORT (owner, 2026-11-18): A → Z by default; Z → A, most / fewest climbs, most of each discipline the
// children hold, and the extras the rows can answer (lib/areaChildSort.js). Under a discipline sort the row's
// figure is THAT discipline's count, so the number matches the order. The choice lasts for the visit, so
// drilling down keeps it; a key a level cannot answer reads A → Z.
export default function AreaChildrenList<T extends AreaChildRow>({ rows: given, noun, onDrill, C, grades, objectives, variant, onAllAreas, map, onNear, discCounts }: AreaChildrenListProps<T>) {
  const side = variant === "sidebar";
  const [sortKey, setSortKey] = useState<string>(getChildSort);
  const [here, setHere] = useState<ChildSortPoint | null>(null);
  const [locMsg, setLocMsg] = useState("");
  const options = useMemo(() => childSortOptions(given, { discCounts, objectives }), [given, discCounts, objectives]);
  const key = options.some(o => o.key === sortKey) && (sortKey !== "near" || here) ? sortKey : CHILD_SORT_DEFAULT;
  const rows = useMemo(() => sortChildren(given, key, { discCounts, objectives, here }), [given, key, discCounts, objectives, here]);
  const pick = (k: string) => {
    setLocMsg("");
    if (k === "near" && !here) {
      if (typeof navigator === "undefined" || !navigator.geolocation) { setLocMsg("Location isn’t available on this device."); return; }
      setLocMsg(FINDING);
      navigator.geolocation.getCurrentPosition(
        pos => { setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocMsg(""); setSortKey("near"); setChildSort("near"); },
        e => setLocMsg(e && e.code === 1 ? "Location is turned off for this site — allow it to sort by distance." : "Couldn’t find your location — try again."),
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
      return;
    }
    setSortKey(k); setChildSort(k);
  };
  const groups = [...new Set(options.map(o => o.group))];

  // Phone: the sort sits on the heading's line, compact, so the first area is not pushed down a row. The website's
  // sidebar is too narrow for that and gives it its own line under the heading.
  const select = given.length > 1 ? <label style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: side ? 1 : "0 1 auto" }}>
    <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: C.textMuted }}>Sort</span>
    <select value={key} onChange={e => pick(e.target.value)} aria-label={"Sort " + noun.toLowerCase()} style={{ flex: 1, minWidth: 0, maxWidth: side ? "none" : 210, minHeight: 40, background: C.card, color: C.text, border: "1px solid " + C.border, borderRadius: 9, padding: "0 8px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
      {groups.map(g => <optgroup key={g} label={g}>{options.filter(o => o.group === g).map(o => <option key={o.key} value={o.key}>{o.label}</option>)}</optgroup>)}
    </select>
  </label> : null;
  const head = <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: side ? 6 : 4, minHeight: 40 }}>
    <h2 style={{ margin: 0, flexShrink: 0, fontSize: 12, fontWeight: 800, color: C.text, letterSpacing: 0.4, textTransform: "uppercase" }}>{noun + " (" + given.length.toLocaleString() + ")"}</h2>
    {side ? (onAllAreas ? <button onClick={onAllAreas} aria-haspopup="dialog" style={{ background: C.surface, border: "1px solid " + C.blue, borderRadius: 8, padding: "5px 10px", color: C.blue, fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}>Area tree</button> : null) : select}
  </div>;
  const sortSel = <>
    {side && select ? <div style={{ display: "flex", marginBottom: 6 }}>{select}</div> : null}
    {locMsg ? <div role="status" style={{ fontSize: 11.5, color: locMsg === FINDING ? C.textMuted : C.amber, margin: "0 0 6px", lineHeight: 1.4 }}>{locMsg}</div> : null}
  </>;

  const badge = (id: string | number) => { const n = objectives ? objectives[String(id)] || 0 : 0; return n ? <span aria-label={n + " of your objectives"} title={n + " of your objectives"} style={{ flexShrink: 0, fontSize: 11, fontWeight: 800, color: C.amber }}>{"★" + n}</span> : null; };
  const disc = key.startsWith("disc:");
  const count = (a: T) => {
    const f = childSortFigure(a, key, { discCounts });
    if (f) return f.n.toLocaleString() + (side ? "" : " " + f.noun);
    const n = a.route_count;
    return n.toLocaleString() + (side ? "" : " climb" + (n !== 1 ? "s" : ""));
  };
  // What kind of climbing is in a child, as a muted line of words under its name (phone), so a climber can
  // tell a boulder field from a sport crag before tapping: "Alpine 820 · Trad 310 · Sport 110", largest
  // first, each with its own count. No colour dots (owner, 2026-11-18: "the discipline dots can be removed
  // ... we need a better ui for listing the disciplines") -- a dot said a discipline was present, never how
  // much of it. A child of one discipline reads the word alone, since the count above is already that number;
  // under a "Most sport" sort the sorted discipline is left out, since the figure above is its count. Before
  // the counts load (or when that read fails) the row's own disciplines[] list gives the words, no numbers.
  const discLine = (a: T) => {
    const c = discCounts ? discCounts[String(a.id)] : null;
    const all = c ? Object.keys(c).filter(d => c[d] > 0 && d in DISC_LABELS).sort((x, y) => c[y] - c[x] || DISC_ROW_ORDER.indexOf(x) - DISC_ROW_ORDER.indexOf(y))
      : (Array.isArray(a.disciplines) ? (a.disciplines as string[]) : []).filter(d => d in DISC_LABELS).sort((x, y) => DISC_ROW_ORDER.indexOf(x) - DISC_ROW_ORDER.indexOf(y));
    const ds = disc ? all.filter(d => d !== key.slice(5)) : all;
    if (!ds.length) return null;
    const shown = ds.slice(0, 3); // three fit one line at 390px; the rest fold into "+N more"
    const withN = all.length > 1;
    // A label and its count never split across lines (no-break space); the line wraps only AFTER a "·", so no
    // line starts with one. It is drawn under the name-and-button row, at the row's full width: beside the
    // View area button three counts wrapped on most rows at 390px.
    const parts = shown.map(d => ((DISC_LABELS as Record<string, string>)[d] + (c && withN ? " " + c[d].toLocaleString() : "")).replace(/ /g, " "));
    if (ds.length > shown.length) parts.push("+" + (ds.length - shown.length) + " more");
    return <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600, lineHeight: 1.4, fontVariantNumeric: "tabular-nums" }}>{parts.join(" · ")}</span>;
  };
  return <div>
    {side && map ? <div style={{ position: "relative", marginBottom: 10 }}>
      <WalkInMap pts={[]} park={null} crag={map.pin ? { lat: map.lat, lng: map.lng } : null} center={{ lat: map.lat, lng: map.lng }} height={120} zoom={map.zoom} label={"Map of " + map.name} />
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
    {sortSel}
    <div>
      {rows.map((a, i) => {
        const g = grades ? grades[String(a.id)] : null;
        const dl = side ? null : discLine(a);
        return <div key={a.id} {...clickable(() => onDrill(a))} style={{ cursor: "pointer", padding: side ? "7px 2px" : "11px 0", minHeight: side ? 36 : 52, boxSizing: "border-box", borderTop: i ? "1px solid " + C.border : "none", display: "flex", flexDirection: "column", justifyContent: "center", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontSize: side ? 13 : 15, fontWeight: 700, color: side ? C.blue : C.text, overflowWrap: "anywhere", lineHeight: 1.3 }}>{a.name}</span>
              {side ? null : <span style={{ fontSize: 12, color: disc ? C.text : C.textMuted, fontWeight: disc ? 700 : 600, fontVariantNumeric: "tabular-nums" }}>{count(a)}</span>}
            </span>
            {badge(a.id)}
            {side ? <span style={{ flexShrink: 0, fontSize: 12, color: disc ? C.text : C.textMuted, fontWeight: disc ? 700 : 600, fontVariantNumeric: "tabular-nums" }}>{count(a)}</span> : <ViewAreaPill C={C} />}
          </div>
          {dl}
          {g && g.length ? <WallGradeBars rows={g} name={a.name} total={a.route_count} C={C} /> : null}
        </div>;
      })}
    </div>
  </div>;
}
