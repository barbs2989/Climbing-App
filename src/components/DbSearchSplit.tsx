import { useState, useMemo, useEffect } from "react";
import { usePinnedBar } from "../../lib/usePinnedBar.js";
import { useAreaSearch, useSubtreeRoutes, useAreaNamesByIds, areaSearchTotal } from "../../lib/db";
import { clickable } from "../../lib/clickable";
import LoadingRows from "./LoadingRows.tsx";
import EmptyState from "./EmptyState.tsx";
import { ATYPE } from "../../lib/areaBrowserShared.js";
import type { CSSProperties, RefObject } from "react";
import { hlMatch } from "../../ClimbMatchCore.jsx";
import RouteRow from "./RouteRow.tsx";
import ViewAreaPill from "./ViewAreaPill.tsx";
import type { RouteRowRoute } from "./RouteRow.tsx";
import type { C as Palette } from "../../ClimbMatchCore.jsx";

export interface DbSearchSplitRoute { id: string; name: string; area_id: string; [column: string]: unknown }
export interface DbSearchSplitArea { id: string; name: string; area_type: keyof typeof ATYPE; parent_name?: string | null; route_count: number }
export interface DbSearchSplitProps {
  /** The area whose subtree is searched. */
  scope: { id: string; name: string };
  onJumpToArea: (a: DbSearchSplitArea) => void;
  onOpenRoute: (r: DbSearchSplitRoute) => void;
  C: typeof Palette;
  onModeChange?: (mode: string) => void;
  /** Marker the page puts after the list; the pinned bar lets go once it scrolls past. */
  endRef?: RefObject<HTMLElement | null>;
}

// ── in-page area/route search — the DB-catalog equivalent of the static
// catalog's SearchSplit, embedded on any non-leaf area page so you can jump
// straight to a sub-area or route anywhere in this subtree instead of
// drilling down one level at a time. Area hits can be at any depth, so they
// navigate via onJumpToArea (rebuilds the real breadcrumb from the area's
// path) rather than onDrill (which assumes a direct child). ──
//
// THE BAR STAYS PUT while you scroll the list under it (owner, 2026-10-23: "the search function for
// areas and routes ... sticky to the top of the view as they scroll down"), as the route finder's
// has since 2026-10-21 — and lets go once the list (`endRef`, a marker AreaPage puts after it) has
// scrolled past, so it does not ride over the rest of the page.
export default function DbSearchSplit({ scope, onJumpToArea, onOpenRoute, C, onModeChange, endRef }: DbSearchSplitProps) {
  const [mode, setMode] = useState("areas");
  const [q, setQ] = useState("");
  const { wrapRef, barRef, pin } = usePinnedBar(endRef);
  const qq = q.trim();
  const { data: areaHits, isLoading: la, error: ea, isPlaceholderData: ha } = useAreaSearch(scope.id, qq);
  // Asked only for typed words on the Routes tab: the list shows nothing else. With no words it read a whole
  // state's climbs unfiltered, which times out (HTTP 500, statement timeout) on every visit to a state's page
  // (2026-11-18), and on the Areas tab it ran a route search per keystroke that nobody saw.
  const { data: routeHits, isLoading: lr, error: er, isPlaceholderData: hr } = useSubtreeRoutes(qq && mode === "routes" ? scope.id : null, { q: qq, page: 0, pageSize: 40 });
  // HELD ROWS SAY SO (walkthrough 2026-11-18): while the new words' search runs, the last words' hits
  // stayed on screen at full strength ("st helens" showing "Iron Cap Mountain" from "el cap"). They
  // dim, and the list says it is busy, until the answer for these words lands — as the top bar's do.
  const held = mode === "areas" ? !!ha : !!hr;
  // Which crag each hit is on, as the Route finder's rows say: two "Beckey Route"s read as one
  // climb listed twice. A failed read leaves the line off, never empty.
  const hitAreaIds = useMemo(() => [...new Set((routeHits || []).map((r: DbSearchSplitRoute) => r.area_id).filter(Boolean))], [routeHits]);
  const { data: hitAreaNames } = useAreaNamesByIds(hitAreaIds);
  useEffect(() => { if (onModeChange) onModeChange(mode); }, [mode, onModeChange]);
  const tab = (on: boolean): CSSProperties => ({ flex: 1, padding: "7px 0", textAlign: "center", fontSize: 12.5, fontWeight: 700, cursor: "pointer", borderRadius: 7, background: on ? C.blueSolid : "transparent", color: on ? C.onSolid : C.textSub });
  const row = { display: "flex", alignItems: "center", gap: 10, padding: "9px 4px", cursor: "pointer", borderBottom: "1px solid " + C.borderLight };
  return (
    // A CARD OF ITS OWN on the area page (owner, 2026-11-18): headed like the page's other cards (Classic climbs,
    // Photos), with no outer margin -- the card's own gap spaces it -- and the bar painted with the page colour only
    // while it is pinned, so at rest it does not draw a dark band across the card.
    <div>
      <h2 style={{ margin: 0, fontSize: 12, fontWeight: 800, color: C.text, letterSpacing: 0.4, textTransform: "uppercase" }}>{"Search " + scope.name}</h2>
      <div ref={wrapRef} style={{ margin: "0 -14px", height: pin ? pin.height : undefined }}>
      <div ref={barRef} style={{ ...(pin ? { position: "fixed", top: pin.top, left: pin.left, width: pin.width, zIndex: 25, boxShadow: "0 6px 12px rgba(0,0,0,0.25)", borderBottom: "1px solid " + C.borderLight } : {}), boxSizing: "border-box", background: pin ? C.bg : "transparent", padding: "8px 14px 8px" }}>
      <div style={{ display: "flex", gap: 4, background: C.surface, border: "1px solid " + C.border, borderRadius: 9, padding: 3, marginBottom: 8 }}>
        <div {...clickable(() => setMode("areas"))} aria-pressed={mode === "areas"} style={tab(mode === "areas")}>Areas</div>
        <div {...clickable(() => setMode("routes"))} aria-pressed={mode === "routes"} style={tab(mode === "routes")}>Routes</div>
      </div>
      <input aria-label={mode === "areas" ? "Search areas, crags, peaks" : "Search routes"} value={q} onChange={e => setQ(e.target.value)} placeholder={mode === "areas" ? "Search areas, crags, peaks…" : "Search routes…"} style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid " + C.border, background: C.surface, color: C.text, fontSize: 14, boxSizing: "border-box", outline: "none" }} />
      </div>
      </div>
      {qq ? (
        // No maxHeight/overflow: the hits used to scroll inside a 46vh box of their own, so most
        // of them were hidden behind a second scrollbar. They run down the page instead.
        <div style={{ marginTop: 6, opacity: held ? 0.5 : 1, transition: "opacity 120ms" }} aria-busy={held || undefined}>
          {mode === "areas" ? (
            la ? <LoadingRows C={C} label="Loading…" style={{padding: "14px 4px"}}/>
            : ea ? <div style={{ fontSize: 13, color: C.red, padding: "14px 4px", textAlign: "center" }}>Couldn't search areas.</div>
            : !areaHits || !areaHits.length ? <EmptyState C={C} icon="search">No areas match.</EmptyState>
            : <>
              {areaHits.map((a: DbSearchSplitArea) => (
                <div key={a.id} {...clickable(() => onJumpToArea(a))} style={row}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.3, overflowWrap: "anywhere" }}>{hlMatch(a.name, qq)}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, overflowWrap: "anywhere" }}>{(ATYPE[a.area_type] || a.area_type) + (a.parent_name ? " · " + a.parent_name : "") + (a.route_count > 0 ? " · " + a.route_count.toLocaleString() + " climb" + (a.route_count !== 1 ? "s" : "") : "")}</div>
                  </div>
                  <ViewAreaPill C={C} />
                </div>
              ))}
              {areaSearchTotal(areaHits) > areaHits.length ? <div style={{ fontSize: 11.5, color: C.textMuted, padding: "10px 4px", textAlign: "center" }}>{"Closest " + areaHits.length + " of " + areaSearchTotal(areaHits).toLocaleString() + " — keep typing to narrow."}</div> : null}
            </>
          ) : (
            lr ? <LoadingRows C={C} label="Loading…" style={{padding: "14px 4px"}}/>
            : er ? <div style={{ fontSize: 13, color: C.red, padding: "14px 4px", textAlign: "center" }}>Couldn't search routes.</div>
            : !routeHits || !routeHits.length ? <EmptyState C={C} icon="search">No routes match.</EmptyState>
            // The same row every other route list draws (discipline glyph, Classic, your Done/Saved, grade),
            // with the hit's crag as its place and the typed text in bold, as the seed search showed it.
            : routeHits.map((r: DbSearchSplitRoute) => (
              <RouteRow key={r.id} r={r as DbSearchSplitRoute & RouteRowRoute} onOpen={() => onOpenRoute(r)} C={C} highlight={qq} areaName={hitAreaNames ? hitAreaNames[r.area_id] || null : null} />
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
