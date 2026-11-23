import { useContext } from "react";
import { DISC_LABELS as DL } from "../../lib/discLabels";
import { clickable } from "../../lib/clickable";
import { rowGrade } from "../../lib/areaBrowserShared.js";
import { ClimberCtx } from "../../lib/climberCtx.js";
import DiscIcon from "./DiscIcon.tsx";
import type { CSSProperties } from "react";
import { hlMatch, uElev } from "../../ClimbMatchCore.jsx";
import type { C as Palette } from "../../ClimbMatchCore.jsx";

export interface RouteRowRoute {
  id?: string | number;
  name?: string;
  stars?: number | null;
  pitches: number;
  /** The climb's length in metres (routes.length_m): the route page's Height stat. The row prints it after the pitches. */
  length_m?: number | null;
  discipline?: keyof typeof DL;
  /** The wall position, left to right. The row does not print it; the lists that draw these rows sort by it. */
  sort_order?: number | null;
  /** The catalog's classic flag (routes.classic / area_classics). */
  classic?: boolean | null;
  /** A list row, not the full route (lib/db.js): opening it reads the full row first. */
  _thin?: boolean;
  /** The route's own Protection fact (PG13, R, X): the grade resolver prints it beside a grade that does not already carry it. */
  prot_rating?: string | null;
}
/** Marks a thin row for lib/routePrefetch.js, which starts that full-row read on touch or hover. */
export const prefetchAttr = (r: RouteRowRoute): { "data-route-id"?: string } =>
  r._thin && r.id != null ? { "data-route-id": String(r.id) } : {};
export interface RouteRowProps {
  r: RouteRowRoute;
  onOpen: (r: RouteRowRoute) => void;
  C: typeof Palette;
  /** Names the wall/area the row sits in; null or absent shows none. */
  areaName?: string | null;
  /** ONE line — name, stars, the sub-line and the grade across one row, less padding — as Mountain Project draws a classics table (website classics). */
  dense?: boolean;
  /** Off where the list already says it: the finder's rows carry their own ★ save button, the objectives panel IS the saved list. */
  savedMark?: boolean;
  /** Off in a list of classics, where every row would carry the chip. */
  classicMark?: boolean;
  /** A search's text: the matching part of the name is drawn bold (hlMatch, as the seed search did). */
  highlight?: string;
}

/* WHAT THE SEED ROWS SHOWED AND THE REAL ONES DID NOT (seed-vs-real audit, 2026-11-11): the discipline
   glyph, a classic marker, and whether YOU have done or saved the climb. Done and saved come from
   ClimberCtx, which DbAreaBrowser already provides around every list that draws these rows (area page,
   finder, suggestions, objectives); outside it the defaults are empty and no marker shows. */
export default function RouteRow({ r, onOpen, C, areaName, dense, savedMark = true, classicMark = true, highlight }: RouteRowProps) {
  const { completedIds, wishlist } = useContext(ClimberCtx);
  const name = highlight ? hlMatch(r.name || "", highlight) : r.name;
  const stars = r.stars ? Math.round(r.stars) : 0;
  // The PITCH COUNT sits beside the discipline, as Mountain Project's lists write it ("Trad, 5 pitches"):
  // the stored count, exactly as the route page's Pitches stat shows it. A boulder has no pitches, and neither
  // does a scramble (never roped: owner note, 2026-10-25), so a scrambling row shows none here either.
  const pitches = r.pitches > 0 && r.discipline !== "bouldering" && r.discipline !== "scrambling" ?r.pitches + " pitch" + (r.pitches !== 1 ? "es" : "") : null;
  // No "#3 in this area" (owner, 2026-11-18): the wall position read as a ranking beside the stars. The area list is
  // already in wall order, and NEXT DOOR on the route page names the climbs either side.
  // The grade at the right carries its protection rating right beside it ("5.8 PG13"; owner, 2026-11-18).
  const grade = rowGrade(r);
  // The LENGTH follows the pitches ("Trad · 5 pitches · 600 ft", owner 2026-11-23: show it when searching for climbs),
  // in the climber's units through uElev, exactly as the route page's Height stat. No stored length, no text.
  const length = r.length_m != null && r.length_m > 0 ? uElev(r.length_m * 3.28084) : null;
  const sub = [areaName || null, r.discipline ? (DL[r.discipline] || r.discipline) : null, pitches, length].filter(Boolean).join(" · ");
  const id = r.id == null ? null : String(r.id);
  const done = id != null && !!completedIds && (completedIds.has(id) || completedIds.has(r.id as string | number));
  const saved = savedMark && !done && id != null && (wishlist || []).some(w => String(w) === id);
  const chip = (col: string, bg: string): CSSProperties => ({ fontSize: 10.5, fontWeight: 800, color: col, background: bg, borderRadius: 999, padding: "1px 7px", flexShrink: 0, whiteSpace: "nowrap", lineHeight: 1.5 });
  const marks = <>
    {classicMark && r.classic ? <span style={chip(C.amber, C.amberBg)}>Classic</span> : null}
    {done ? <span style={chip(C.green, C.greenBg)}>✓ Done</span> : saved ? <span style={chip(C.blue, C.blueBg)}>★ Saved</span> : null}
  </>;
  const icon = r.discipline ? <span aria-hidden="true" style={{ display: "inline-flex", flexShrink: 0 }}><DiscIcon d={r.discipline} size={dense ? 13 : 15} /></span> : null;
  if (dense) return (
    <div {...clickable(() => onOpen(r))} {...prefetchAttr(r)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", marginBottom: 4, background: C.card, border: "1px solid " + C.border, borderRadius: 10, cursor: "pointer", minWidth: 0 }}>
      {icon}
      {/* One line when it fits; when it does not, the name and its subline flow on as a paragraph and wrap, so nothing is
          cut off with "…" and the grade keeps its place at the right (owner, 2026-11-13: never cut text off). */}
      <div style={{ flex: 1, minWidth: 0, lineHeight: 1.35, overflowWrap: "anywhere" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text, marginRight: 6 }}>{name}</span>
        {stars ? <span style={{ color: C.amber, fontWeight: 700, fontSize: 11, marginRight: 6 }}>{"★".repeat(stars)}</span> : null}
        {classicMark && r.classic || done || saved ? <span style={{ display: "inline-flex", gap: 4, marginRight: 6, verticalAlign: "1px" }}>{marks}</span> : null}
        <span style={{ fontSize: 11, color: C.textMuted }}>{sub}</span>
      </div>
      <span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0, fontWeight: 700 }}>{grade}</span>
    </div>
  );
  return (
    <div {...clickable(() => onOpen(r))} {...prefetchAttr(r)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", marginBottom: 8, background: C.card, border: "1px solid " + C.border, borderRadius: 12, cursor: "pointer", flex: 1, minWidth: 0 }}>
      {icon}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", minWidth: 0 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: C.text, overflowWrap: "anywhere", minWidth: 0 }}>{name}</span>
          {marks}
        </div>
        <div style={{ fontSize: 11, color: C.textMuted, display: "flex", alignItems: "center", gap: 5 }}>
          {stars ? <span style={{ color: C.amber, fontWeight: 700, flexShrink: 0 }}>{"★".repeat(stars)}</span> : null}
          <span style={{ overflowWrap: "anywhere" }}>{sub}</span>
        </div>
      </div>
      <span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0, maxWidth: "38%", fontWeight: 700, overflowWrap: "anywhere" }}>{grade}</span>
    </div>
  );
}
