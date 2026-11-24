// ALL TRACKS & TRIP REPORTS: the full page behind the route page's "See all" row (owner, 2026-11-19: "after
// many uploads it will get crowded", so the list no longer unrolls in place). The route page keeps the
// three latest parties (lib/RouteTracksPanel.jsx); this page holds every one that has been read, with a
// sort and four filters to find the one you want: season, GPS track only, outcome and year.
// It COVERS THE MAP, so Show on map does not leave: a climber switches on up to MAX_SHOWN_TRACKS here and
// the bar at the bottom ("View 2 tracks on the map") closes the page and goes to the route map.
// The reads are capped (30 tracks, 60 reports); Load more raises both, and the sort and filters work on
// what has been loaded, which the page says rather than passing a part off as the whole.
// The dialog, its header and ← Back are drawn by RouteDetail.jsx, which owns the `tracksOpen` flag; this
// is the two flex children under that header: the scroll pane and the bottom bar.
import { useMemo, useState } from "react";
import { C } from "../ClimbMatchCore.jsx";
import { BTN_PRIMARY, BTN_SECONDARY } from "./buttonStyles.js";
import { SEASONS, TRACK_OUTCOMES, TRACK_SORTS, filterTrackRows, sortTracks, trackYears } from "./routeTracks.js";
import { TRACK_LINK, TrackFootnote, TrackRow, TracksEmpty, TracksFailedNotes, trackChip, useTrackRows } from "./RouteTracksPanel.jsx";

const SEL = { width: "100%", boxSizing: "border-box", minWidth: 0, minHeight: 44, padding: "8px 11px", borderRadius: 9, border: "1px solid " + C.field, background: C.surface, color: C.text, fontSize: 12.5, cursor: "pointer" };
const GROUP = { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 };

/**
 * @param {{ reports: Array<any>, seedTracks?: Array<any> | null, tracks: Array<any>, profiles: Record<string, any>,
 *   tracksLoading: boolean, tracksFailed: boolean, reportsFailed: boolean,
 *   shown: string[], colorOf: (id: string) => string|null, onToggle: (id: string) => void,
 *   onOpenReport?: ((report: any) => void) | null, onLog?: (() => void) | null,
 *   onViewMap: () => void, onClear: () => void, onLoadMore: () => void, canLoadMore: boolean, loadingMore: boolean,
 *   routeName: string, crag?: boolean, loggedOnly?: boolean }} props
 */
export default function RouteTracksPage({ reports, seedTracks, tracks, profiles, tracksLoading, tracksFailed, reportsFailed, shown, colorOf, onToggle, onOpenReport, onLog, onViewMap, onClear, onLoadMore, canLoadMore, loadingMore, routeName, crag, loggedOnly }) {
  const [sort, setSort] = useState("latest");
  const [season, setSeason] = useState("all");
  const [gpsOnly, setGpsOnly] = useState(false);
  const [outcome, setOutcome] = useState("all");
  const [year, setYear] = useState("all");
  const [openKey, setOpenKey] = useState(null);

  const rows = useTrackRows({ reports, tracks, seedTracks, profiles, loggedOnly });
  const sorts = crag ? TRACK_SORTS.filter((s) => s.id === "latest") : TRACK_SORTS;
  const sortNow = sorts.some((s) => s.id === sort) ? sort : "latest";
  const years = useMemo(() => trackYears(rows), [rows]);
  const anyTrack = rows.some((r) => r.track || r.seedPts);
  // A filter this page is not offering cannot be left switched on behind the climber's back.
  const f = { season, gpsOnly: gpsOnly && anyTrack, outcome: loggedOnly ? "all" : outcome, year: years.includes(year) ? year : "all" };
  const list = sortTracks(filterTrackRows(rows, f), sortNow);
  const filtered = f.season !== "all" || f.gpsOnly || f.outcome !== "all" || f.year !== "all";
  const clearFilters = () => { setSeason("all"); setGpsOnly(false); setOutcome("all"); setYear("all"); };
  const what = loggedOnly ? "logged climbs" : "tracks & trip reports";
  const n = shown.length;

  return <>
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", padding: "12px 14px 20px" }}>
      {!rows.length ? <TracksEmpty reportsFailed={reportsFailed} tracksLoading={tracksLoading} tracksFailed={tracksFailed} loggedOnly={loggedOnly} onLog={onLog}/> : <>
        <TracksFailedNotes reportsFailed={reportsFailed} tracksFailed={tracksFailed}/>
        {sorts.length > 1 ? <div role="group" aria-label="Sort" style={GROUP}>
          {sorts.map((s) => <button key={s.id} onClick={() => setSort(s.id)} aria-pressed={sortNow === s.id} style={trackChip(sortNow === s.id)}>{s.label}</button>)}
        </div> : null}
        <div role="group" aria-label="Season" style={GROUP}>
          {SEASONS.map((s) => <button key={s.id} onClick={() => setSeason(s.id)} aria-pressed={season === s.id} style={trackChip(season === s.id)}>{s.label}</button>)}
          {anyTrack ? <button onClick={() => setGpsOnly(!gpsOnly)} aria-pressed={gpsOnly} style={trackChip(gpsOnly)}>GPS track only</button> : null}
        </div>
        {!loggedOnly || years.length > 1 ? <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginBottom: 10 }}>
          {!loggedOnly ? <select aria-label="Filter by outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} style={SEL}>{TRACK_OUTCOMES.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select> : null}
          {years.length > 1 ? <select aria-label="Filter by year" value={f.year} onChange={(e) => setYear(e.target.value)} style={SEL}><option value="all">Any year</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select> : null}
        </div> : null}
        <div aria-live="polite" style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>{filtered ? list.length + " of " + rows.length + " match" : rows.length + " " + what}{filtered ? <> · <button onClick={clearFilters} style={{ ...TRACK_LINK, minHeight: 0 }}>Clear filters</button></> : null}</div>
        {!list.length ? <div style={{ fontSize: 12.5, color: C.textSub, marginBottom: 8 }}>Nothing matches these filters.</div> : null}
        {list.map((r) => <TrackRow key={r.key} r={r} op={openKey === r.key} onOpen={() => setOpenKey(openKey === r.key ? null : r.key)} shown={shown} colorOf={colorOf} onToggle={onToggle} onOpenReport={onOpenReport} routeName={routeName} crag={crag} loggedOnly={loggedOnly}/>)}
        {canLoadMore ? <div style={{ marginTop: 4 }}>
          <button onClick={onLoadMore} disabled={loadingMore} style={{ ...BTN_SECONDARY(C), minHeight: 44, opacity: loadingMore ? 0.6 : 1 }}>{loadingMore ? "Loading…" : "Load more"}</button>
          <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 6, lineHeight: 1.45 }}>These are the most recent {rows.length}. The sort and filters work on what is loaded.</div>
        </div> : null}
        {anyTrack ? <TrackFootnote crag={crag}/> : null}
      </>}
    </div>
    {n ? <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 10, padding: "10px 14px calc(10px + env(safe-area-inset-bottom))", borderTop: "1px solid " + C.border, background: C.surface }}>
      <button onClick={onViewMap} style={{ ...BTN_PRIMARY(C), flex: 1, minHeight: 44 }}>{"View " + n + (n === 1 ? " track" : " tracks") + " on the map"}</button>
      <button onClick={onClear} aria-label="Take every track off the map" style={{ ...BTN_SECONDARY(C), minHeight: 44 }}>Clear</button>
    </div> : null}
  </>;
}
