// CLIMBERS' TRACKS: every GPS recording climbers attached to a report on this route, under the route map.
// Sort by Latest or Fastest and filter by season, the way Strava's segment leaderboard filters by date
// and ranks by time (Gaia GPS's public-track layer has no filter at all, and its users ask for one);
// switch a track on and it is drawn over the route on the map above and in the 3D view, in the colour
// of its row. Up to MAX_SHOWN_TRACKS at once, one colour each, so the lines can be told apart.
// A track reaches this list only with its report (same visibility, same policy): see useRouteTracks.
import { useMemo, useState } from "react";
import { C, pubName, shortDate, uDistMi, uElev } from "../ClimbMatchCore.jsx";
import { CHIP } from "./buttonStyles.js";
import { ROUTE_TRACKS_CAP } from "./db";
import { MAX_SHOWN_TRACKS, SEASONS, TRACK_SORTS, fmtDuration, inSeason, sortTracks } from "./routeTracks.js";
import LoadingRows from "../src/components/LoadingRows.tsx";

const SH = { fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: C.textMuted, marginBottom: 8 };

/**
 * @param {{ rows: Array<{id:string,user_id:string,date:string,stats:{km:number,gainFt:number|null,secs:number|null,timed:boolean}}>,
 *   profiles: Record<string, any>, loading: boolean, failed: boolean, shown: string[], colorOf: (id: string) => string|null,
 *   onToggle: (id: string) => void, onOpenReport?: ((id: string) => void) | null, canOpen: (id: string) => boolean, onLog?: (() => void) | null }} props
 */
export default function RouteTracksPanel({ rows, profiles, loading, failed, shown, colorOf, onToggle, onOpenReport, canOpen, onLog }) {
  const [sort, setSort] = useState("latest");
  const [season, setSeason] = useState("all");
  const list = useMemo(() => sortTracks(rows.filter((r) => inSeason(r.date, season)), sort), [rows, season, sort]);
  const nameOf = (r) => { const p = profiles[r.user_id]; return (p && pubName(p)) || "A climber"; };
  const full = shown.length >= MAX_SHOWN_TRACKS;
  const chip = (on) => ({ ...CHIP, border: "1px solid " + (on ? C.blue : C.border), background: on ? C.blueBg : "transparent", color: on ? C.text : C.textSub });
  return (
    <section aria-label="Climbers' tracks" style={{ marginTop: 12 }}>
      <div style={SH}>Climbers' tracks{rows.length ? " · " + rows.length : ""}</div>
      {failed ? <div style={{ fontSize: 12.5, color: C.amber, lineHeight: 1.5 }}>Climbers' tracks couldn’t load. Pull to refresh, or try again later.</div>
        : loading ? <LoadingRows C={C} label="Loading climbers' tracks…"/>
        : !rows.length ? <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.5 }}>No climber has shared a GPS track of this route yet. Attach your GPX when you log it, and it shows here for anyone who can read your report.{onLog ? <> <button onClick={onLog} style={{ background: "none", border: "none", padding: 0, color: C.blue, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>Log this climb</button></> : null}</div>
        : <>
          <div role="group" aria-label="Sort tracks" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
            {TRACK_SORTS.map((s) => <button key={s.id} onClick={() => setSort(s.id)} aria-pressed={sort === s.id} style={chip(sort === s.id)}>{s.label}</button>)}
          </div>
          <div role="group" aria-label="Season" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {SEASONS.map((s) => <button key={s.id} onClick={() => setSeason(s.id)} aria-pressed={season === s.id} style={chip(season === s.id)}>{s.label}</button>)}
          </div>
          {!list.length ? <div style={{ fontSize: 12.5, color: C.textSub }}>No tracks from {(SEASONS.find((s) => s.id === season) || {}).label.toLowerCase()} yet.</div> : null}
          {list.map((r) => {
            const on = shown.includes(r.id), col = colorOf(r.id), st = r.stats;
            const facts = [st.secs != null ? fmtDuration(st.secs) + (st.timed ? "" : " car to car") : null, uDistMi(st.km * 0.621371), st.gainFt != null ? uElev(st.gainFt) + " up" : null].filter(Boolean);
            return (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid " + C.border }}>
                <span aria-hidden="true" style={{ width: 14, height: 14, borderRadius: 7, flexShrink: 0, background: on && col ? col : "transparent", border: "2px solid " + (on && col ? col : C.border) }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nameOf(r)}<span style={{ fontWeight: 400, color: C.textMuted }}>{r.date ? " · " + shortDate(r.date) : ""}</span></div>
                  <div style={{ fontSize: 12, color: C.textSub }}>{facts.join(" · ")}</div>
                  {onOpenReport && canOpen(r.id) ? <button onClick={() => onOpenReport(r.id)} style={{ background: "none", border: "none", padding: "2px 0 0", color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Read the report</button> : null}
                </div>
                <button onClick={() => onToggle(r.id)} disabled={!on && full} aria-pressed={on} aria-label={(on ? "Hide " : "Show ") + nameOf(r) + "'s track" + (r.date ? " from " + shortDate(r.date) : "") + " on the map"} style={{ ...chip(on), flexShrink: 0, opacity: !on && full ? 0.5 : 1, cursor: !on && full ? "default" : "pointer" }}>{on ? "On map" : "Show"}</button>
              </div>
            );
          })}
          {full ? <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 6 }}>Up to {MAX_SHOWN_TRACKS} tracks on the map at once. Hide one to show another.</div> : null}
          {rows.length >= ROUTE_TRACKS_CAP ? <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 6 }}>Showing the {ROUTE_TRACKS_CAP} most recent tracks.</div> : null}
          <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 6, lineHeight: 1.45 }}>Each line is one climber's own recording. Times run from the first point to the last, so a long stop counts.</div>
        </>}
    </section>
  );
}
