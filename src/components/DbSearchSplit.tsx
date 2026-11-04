import { useState, useMemo, useEffect } from "react";
import { usePinnedBar } from "../../lib/usePinnedBar.js";
import { useAreaSearch, useSubtreeRoutes, useAreaNamesByIds, areaSearchTotal } from "../../lib/db";
import { SL } from "../../lib/areaBrowserParts.jsx";
import { clickable } from "../../lib/clickable";
import LoadingRows from "./LoadingRows.tsx";
import EmptyState from "./EmptyState.tsx";
import { ATYPE, rowGrade } from "../../lib/areaBrowserShared.js";
import type { CSSProperties, RefObject } from "react";
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
  const { data: areaHits, isLoading: la, error: ea } = useAreaSearch(scope.id, qq);
  const { data: routeHits, isLoading: lr, error: er } = useSubtreeRoutes(scope.id, { q: qq, page: 0, pageSize: 40 });
  // Which crag each hit is on, as the Route finder's rows say: two "Beckey Route"s read as one
  // climb listed twice. A failed read leaves the line off, never empty.
  const hitAreaIds = useMemo(() => [...new Set((routeHits || []).map((r: DbSearchSplitRoute) => r.area_id).filter(Boolean))], [routeHits]);
  const { data: hitAreaNames } = useAreaNamesByIds(hitAreaIds);
  useEffect(() => { if (onModeChange) onModeChange(mode); }, [mode, onModeChange]);
  const tab = (on: boolean): CSSProperties => ({ flex: 1, padding: "7px 0", textAlign: "center", fontSize: 12.5, fontWeight: 700, cursor: "pointer", borderRadius: 7, background: on ? C.blueSolid : "transparent", color: on ? C.onSolid : C.textSub });
  const row = { display: "flex", alignItems: "center", gap: 10, padding: "9px 4px", cursor: "pointer", borderBottom: "1px solid " + C.borderLight };
  return (
    <div style={{ marginBottom: 14 }}>
      <SL C={C}>{"Search " + scope.name}</SL>
      <div ref={wrapRef} style={{ margin: "0 -14px", height: pin ? pin.height : undefined }}>
      <div ref={barRef} style={{ ...(pin ? { position: "fixed", top: pin.top, left: pin.left, width: pin.width, zIndex: 25, boxShadow: "0 6px 12px rgba(0,0,0,0.25)", borderBottom: "1px solid " + C.borderLight } : {}), boxSizing: "border-box", background: C.bg, padding: "6px 14px 8px" }}>
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
        <div style={{ marginTop: 6 }}>
          {mode === "areas" ? (
            la ? <LoadingRows C={C} label="Loading…" style={{padding: "14px 4px"}}/>
            : ea ? <div style={{ fontSize: 13, color: C.red, padding: "14px 4px", textAlign: "center" }}>Couldn't search areas.</div>
            : !areaHits || !areaHits.length ? <EmptyState C={C} icon="search">No areas match.</EmptyState>
            : <>
              {areaHits.map((a: DbSearchSplitArea) => (
                <div key={a.id} {...clickable(() => onJumpToArea(a))} style={row}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, color: C.text, lineHeight: 1.3, overflowWrap: "anywhere" }}>{a.name}</div>
                    <div style={{ fontSize: 11, color: C.textMuted, overflowWrap: "anywhere" }}>{(ATYPE[a.area_type] || a.area_type) + (a.parent_name ? " · " + a.parent_name : "")}</div>
                  </div>
                  {a.route_count > 0 ? <span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0 }}>{a.route_count}</span> : null}
                </div>
              ))}
              {areaSearchTotal(areaHits) > areaHits.length ? <div style={{ fontSize: 11.5, color: C.textMuted, padding: "10px 4px", textAlign: "center" }}>{"Closest " + areaHits.length + " of " + areaSearchTotal(areaHits).toLocaleString() + " — keep typing to narrow."}</div> : null}
            </>
          ) : (
            lr ? <LoadingRows C={C} label="Loading…" style={{padding: "14px 4px"}}/>
            : er ? <div style={{ fontSize: 13, color: C.red, padding: "14px 4px", textAlign: "center" }}>Couldn't search routes.</div>
            : !routeHits || !routeHits.length ? <EmptyState C={C} icon="search">No routes match.</EmptyState>
            : routeHits.map((r: DbSearchSplitRoute) => (
              <div key={r.id} {...clickable(() => onOpenRoute(r))} style={row}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, color: C.text, overflowWrap: "anywhere" }}>{r.name}</div>
                  {hitAreaNames && hitAreaNames[r.area_id] ? <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 1, overflowWrap: "anywhere" }}>{hitAreaNames[r.area_id]}</div> : null}
                </div>
                <span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0, maxWidth: "38%", overflowWrap: "anywhere" }}>{rowGrade(r)}</span>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
