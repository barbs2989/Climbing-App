import { useAreaClassics, useSubtreeRoutes } from "../../lib/db";
import { BTN } from "../../lib/buttonStyles.js";
import RouteRow from "./RouteRow.tsx";
import LoadingRows from "./LoadingRows.tsx";
import type { RouteRowRoute } from "./RouteRow.tsx";
import type { C as Palette } from "../../ClimbMatchCore.jsx";

export interface MapAreaClimbsArea { id: string; name: string; route_count: number }
export interface MapAreaClimbsProps {
  area: MapAreaClimbsArea;
  onOpenRoute: (r: RouteRowRoute) => void;
  onOpenArea: (a: MapAreaClimbsArea) => void;
  C: typeof Palette;
}

const SHOW = 8;

/* CLIMBS FROM THE MAP (seed-vs-real audit, 2026-11-11). The seed map pinned and opened individual
   climbs; the real one only ever opened an AREA. Without a route-by-viewport read (the routes table
   times out on any scan), a tapped crag lists its climbs here, under the map: its classics first
   (area_classics, the cached read the area page's Classics section already makes), else the first
   climbs in wall order (routes_in_subtree, the area page's own read). A climb opens straight from the
   map; "See all" opens the area. */
export default function MapAreaClimbs({ area, onOpenRoute, onOpenArea, C }: MapAreaClimbsProps) {
  const classicsQ = useAreaClassics(area.id);
  const poolQ = useSubtreeRoutes(area.id, { sortBy: "lr", pageSize: SHOW });
  const classics = (classicsQ.data || []) as RouteRowRoute[];
  const pool = (poolQ.data || []) as RouteRowRoute[];
  const fromClassics = classics.length > 0;
  const rows = (fromClassics ? classics : pool).slice(0, SHOW);
  const loading = !rows.length && (classicsQ.isLoading || poolQ.isLoading);
  const failed = !rows.length && !loading && !!classicsQ.isError && !!poolQ.isError;
  const retry = () => { classicsQ.refetch(); poolQ.refetch(); };
  const lbl = { fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase" as const, letterSpacing: 0.3, margin: "4px 2px 6px" };
  return (
    <div style={{ padding: "2px 2px 8px" }}>
      {loading ? <LoadingRows C={C} label={"Loading climbs at " + area.name + "…"} rows={3} style={{ padding: "6px 0" }} /> : null}
      {failed ? <div role="alert" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "8px 10px", borderRadius: 10, border: "1px solid " + C.border, background: C.card, fontSize: 12.5, color: C.text }}>
        <span style={{ flex: "1 1 180px", minWidth: 0 }}>{"Couldn’t load the climbs at " + area.name + "."}</span>
        <button onClick={retry} style={{ ...BTN, border: "1px solid " + C.border, background: C.surface, color: C.blue }}>Retry</button>
      </div> : null}
      {rows.length ? <>
        <div style={lbl}>{fromClassics ? "Classics here" : "Climbs here"}</div>
        {rows.map(r => <RouteRow key={String(r.id)} r={r} onOpen={onOpenRoute} C={C} />)}
      </> : null}
      {!loading && !failed && !rows.length ? <div style={{ fontSize: 12.5, color: C.textMuted, padding: "4px 2px 8px" }}>No climbs listed here yet.</div> : null}
      {area.route_count > rows.length ? <button onClick={() => onOpenArea(area)} style={{ ...BTN, width: "100%", border: "1px solid " + C.border, background: C.surface, color: C.blue }}>{"See all " + area.route_count + " climbs at " + area.name + " ›"}</button> : null}
    </div>
  );
}
