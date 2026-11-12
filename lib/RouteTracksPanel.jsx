// CLIMBERS' TRACKS: every GPS recording climbers attached to a report on this route, under the route map.
// Sort by Latest or Fastest and filter by season, the way Strava's segment leaderboard filters by date
// and ranks by time (Gaia GPS's public-track layer has no filter at all, and its users ask for one);
// switch a track on and it is drawn over the route on the map above and in the 3D view, in the colour
// of its row. Up to MAX_SHOWN_TRACKS at once, one colour each, so the lines can be told apart.
// A track reaches this list only with its report (same visibility, same policy): see useRouteTracks.
// On a CRAG route (`crag`) a recording of "the route" is a 20 m vertical line; what a climber records is the
// walk in. So the panel is "Climbers' walk-in recordings", sorts by date only, and with nothing to list draws
// NOTHING: the crag map's own empty state (No trail to the crag yet → Add the trail) is the one invitation
// to add a trail, drawn or recorded, and this panel used to repeat it as "share a GPS track of this route".
import { useMemo, useState } from "react";
import { C, pubName, shortDate, uDistMi, uElev } from "../ClimbMatchCore.jsx";
import { CHIP } from "./buttonStyles.js";
import { ROUTE_TRACKS_CAP } from "./db";
import { MAX_SHOWN_TRACKS, SEASONS, TRACK_SORTS, fmtDuration, inSeason, sortTracks } from "./routeTracks.js";
import LoadingRows from "../src/components/LoadingRows.tsx";

const SH = { fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: C.label, marginBottom: 8 };

/**
 * @param {{ rows: Array<{id:string,user_id:string,date:string,stats:{km:number,gainFt:number|null,secs:number|null,timed:boolean}}>,
 *   profiles: Record<string, any>, loading: boolean, failed: boolean, shown: string[], colorOf: (id: string) => string|null,
 *   onToggle: (id: string) => void, onOpenReport?: ((id: string) => void) | null, canOpen: (id: string) => boolean, onLog?: (() => void) | null,
 *   crag?: boolean, cragHasTrail?: boolean }} props
 */
export default function RouteTracksPanel({ rows, profiles, loading, failed, shown, colorOf, onToggle, onOpenReport, canOpen, onLog, crag, cragHasTrail }) {
  const [sort, setSort] = useState("latest");
  const [season, setSeason] = useState("all");
  // A sort picked on an earlier route that this one does not offer (Fastest, on a crag) does not apply.
  const sorts = crag ? TRACK_SORTS.filter((s) => s.id === "latest") : TRACK_SORTS;
  const sortNow = sorts.some((s) => s.id === sort) ? sort : "latest";
  const list = useMemo(() => sortTracks(rows.filter((r) => inSeason(r.date, season)), sortNow), [rows, season, sortNow]);
  const nameOf = (r) => { const p = profiles[r.user_id]; return (p && pubName(p)) || "A climber"; };
  const full = shown.length >= MAX_SHOWN_TRACKS;
  const chip = (on) => ({ ...CHIP, border: "1px solid " + (on ? C.blue : C.border), background: on ? C.blueBg : "transparent", color: on ? C.text : C.textSub });
  // A walk-in time is not a send time, so a crag offers no Fastest.
  const title = crag ? "Climbers' walk-in recordings" : "Climbers' tracks";
  // A crag WITHOUT its trail draws nothing while loading and nothing when there is nothing to list:
  // the crag map's own "No trail to the crag yet → Add the trail" is the one invitation, and a
  // loading row that then collapsed would shift the cards under it. Recordings that DO exist, and a
  // failed read, are shown as on any route. A crag WITH its trail draws the section as any route
  // does (loading rows, then the list), and with nothing to list the one line that says a recording
  // of the walk in is welcome, since the gap note is gone.
  if (crag && !cragHasTrail && !failed && (loading || !rows.length)) return null;
  const invite = crag && !failed && !loading && !rows.length;
  return (
    <section aria-label={title} style={{ marginTop: 12 }}>
      <div style={SH}>{title}{rows.length ? " · " + rows.length : ""}</div>
      {invite ? <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>Walked in with a watch running? Attach the GPX when you log a climb here and it shows under the crag map for anyone who can read your report.{onLog ? <> <button onClick={onLog} style={{ background: "none", border: "none", padding: 0, color: C.blue, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Log a climb</button></> : null}</div>
        : failed ? <div style={{ fontSize: 12.5, color: C.amber, lineHeight: 1.5 }}>{title} couldn’t load. Pull to refresh, or try again later.</div>
        : loading ? <LoadingRows C={C} label={"Loading " + title.toLowerCase() + "…"}/>
        : !rows.length ? <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>No climber has shared a GPS track of this route yet. Attach your GPX when you log it, and it shows here for anyone who can read your report.{onLog ? <> <button onClick={onLog} style={{ background: "none", border: "none", padding: 0, color: C.blue, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Log this climb</button></> : null}</div>
        : <>
          {sorts.length > 1 ? <div role="group" aria-label="Sort tracks" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
            {sorts.map((s) => <button key={s.id} onClick={() => setSort(s.id)} aria-pressed={sortNow === s.id} style={chip(sortNow === s.id)}>{s.label}</button>)}
          </div> : null}
          <div role="group" aria-label="Season" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {SEASONS.map((s) => <button key={s.id} onClick={() => setSeason(s.id)} aria-pressed={season === s.id} style={chip(season === s.id)}>{s.label}</button>)}
          </div>
          {!list.length ? <div style={{ fontSize: 12.5, color: C.textSub }}>No tracks from {(SEASONS.find((s) => s.id === season) || {}).label.toLowerCase()} yet.</div> : null}
          {list.map((r) => {
            const on = shown.includes(r.id), col = colorOf(r.id), st = r.stats;
            // A walk-in's time is not a fact worth a headline ("car to car" is a route-day idiom), so a crag row leaves it out.
            const facts = [st.secs != null && !crag ? fmtDuration(st.secs) + (st.timed ? "" : " car to car") : null, uDistMi(st.km * 0.621371), st.gainFt != null ? uElev(st.gainFt) + " up" : null].filter(Boolean);
            return (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid " + C.border }}>
                <span aria-hidden="true" style={{ width: 14, height: 14, borderRadius: 7, flexShrink: 0, background: on && col ? col : "transparent", border: "2px solid " + (on && col ? col : C.border) }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflowWrap: "anywhere" }}>{nameOf(r)}<span style={{ fontWeight: 400, color: C.textMuted }}>{r.date ? " · " + shortDate(r.date) : ""}</span></div>
                  <div style={{ fontSize: 12, color: C.textSub }}>{facts.join(" · ")}</div>
                  {onOpenReport && canOpen(r.id) ? <button onClick={() => onOpenReport(r.id)} style={{ background: "none", border: "none", padding: "2px 0 0", color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Read the report</button> : null}
                </div>
                <button onClick={() => onToggle(r.id)} disabled={!on && full} aria-pressed={on} aria-label={(on ? "Hide " : "Show ") + nameOf(r) + "'s track" + (r.date ? " from " + shortDate(r.date) : "") + " on the map"} style={{ ...chip(on), flexShrink: 0, opacity: !on && full ? 0.5 : 1, cursor: !on && full ? "default" : "pointer" }}>{on ? "On map" : "Show"}</button>
              </div>
            );
          })}
          {full ? <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 6 }}>Up to {MAX_SHOWN_TRACKS} tracks on the map at once. Hide one to show another.</div> : null}
          {rows.length >= ROUTE_TRACKS_CAP ? <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 6 }}>Showing the {ROUTE_TRACKS_CAP} most recent tracks.</div> : null}
          <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 6, lineHeight: 1.45 }}>{crag ? "Each line is one climber's own recording of the walk in to the crag, from their logged climb." : "Each line is one climber's own recording. Times run from the first point to the last, so a long stop counts."}</div>
        </>}
    </section>
  );
}
