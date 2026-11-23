// RECENT TRACKS & TRIP REPORTS (Plan tab; crag Overview): ONE list of the parties that have been on this route.
// Each row is a party: its trip report, and, when the climber attached one to the same log, their GPS track.
// Before 2026-11-18 these were two lists that contradicted each other on one page: this section (reports,
// headed "tracks", offering "See 1 older track" over rows that all said "no recorded track", each with a
// per-row "Download standard route line" that saved the route's own line under the CLIMBER'S name), and
// CLIMBERS' TRACKS under the map (the real recordings, which could be drawn but never downloaded).
// A report and its track are joined on the climb_logs id (`_dbId` on the report, `id` on the track row);
// a track whose report this reader cannot open still gets a row of its own, as it did under the map.
// THE ROUTE PAGE SHOWS THE THREE LATEST; every other row is on the full page (lib/RouteTracksPage.jsx,
// owner 2026-11-19: unrolled in place, a list with many uploads got crowded), which sorts Latest /
// Fastest and filters by season, GPS track, outcome and year. Both draw ONE row (TrackRow) from ONE
// list (useTrackRows). Show draws a track over the route on the map and in the 3D view, in the colour
// of its row's swatch, up to MAX_SHOWN_TRACKS at once. On a CRAG (`crag`) a recording is the walk in, so
// there is no Fastest and no row prints a time: a walk-in time is not a send time.
import { useMemo, useState } from "react";
import { C, pubName, shortDate, uDistMi, uElev } from "../ClimbMatchCore.jsx";
import { CHIP } from "./buttonStyles.js";
import { MAX_SHOWN_TRACKS, fmtDuration, sortTracks, trackGpx } from "./routeTracks.js";
import { seasonName } from "./seasonName.js";
import { clickable } from "./clickable";
import LoadingRows from "../src/components/LoadingRows.tsx";
import Av from "../src/components/Av.tsx";
import Chevron from "../src/components/Chevron.tsx";
import Stars from "../src/components/Stars.tsx";

/* A sport, trad, top-rope, aid or boulder line has no recorded walk and no trip to report: what a climber leaves
   on it is a LOGGED CLIMB (owner, 2026-11-18). So its list is "Recent logged climbs", built from the logs
   alone: no seed tracks, no scout reports, each row naming its tick. Aid joined them the same day (owner:
   "do the rest"). A walk-in recording a climber attached
   to their log still shows on that log's row. */
export const LOGGED_ONLY_CATS = ["sport", "trad", "toprope", "aid", "bouldering"];
/* A conditions-only report (LogAscent's "I only scouted it") is not a climb. Its tick type is "Conditions";
   A seed scout report carries `scoutOnly` and no tick. Same rule as isScoutRow (lib/tripReportRow.js). */
export function isScoutReport(a) { return a.tickType === "Conditions" || (!!a.scoutOnly && !a.tickType); }

// The rows the route page shows; the rest are on the full page, behind "See all".
const FIRST = 3;
const SEASON_TONE = { Winter: C.blue, Spring: C.green, Summer: C.amber, Fall: C.orange };
export const TRACK_LINK = { background: "none", border: "none", padding: 0, color: C.blue, fontSize: 12.5, fontWeight: 700, cursor: "pointer", minHeight: 44 };
export const trackChip = (on) => ({ ...CHIP, border: "1px solid " + (on ? C.blue : C.border), background: on ? C.blueBg : "transparent", color: on ? C.text : C.textSub });
const btn = (on) => ({ ...trackChip(on), minHeight: 36, fontWeight: 700 });

function saveFile(name, text) {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: "application/gpx+xml" }));
    const a = document.createElement("a");
    a.href = url; a.download = name.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") + ".gpx";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch { /* a browser that refuses the download leaves the page as it was */ }
}

// What the collapsed row says about how it went: the outcome, then the car-to-car time the climber typed.
function outcomeOf(a) {
  if (!a) return null;
  if (a.outcomeReasons && a.outcomeReasons.length) return "Turned back";
  if (a.tickType) return a.tickType;
  return a.summited ? "Summit" : null;
}

// One row per party. Reports first; a DB track joins its own report by log id; a seed track joins
// by climber and date (the seed rows have no id), the same de-duplication this section always used.
// `stats.secs` is what sortTracks ranks by: a report's typed car-to-car counts as its time, as it does
// for a track with no clock.
/** @param {{ reports: Array<any>, tracks: Array<any>, seedTracks?: Array<any> | null, profiles: Record<string, any>, loggedOnly?: boolean }} p */
export function useTrackRows({ reports, tracks, seedTracks, profiles, loggedOnly }) {
  return useMemo(() => {
    const out = [], byLog = {}, byWho = {};
    (reports || []).forEach((a, i) => {
      if (!a || a._anon || !a.date || (loggedOnly && isScoutReport(a))) return;
      const c2c = a.cond && a.cond.carToCarMin != null && a.cond.carToCarMin > 0 ? a.cond.carToCarMin * 60 : null;
      const row = { key: a._dbId != null ? "d" + a._dbId : a.id != null ? "s" + a.id : "i" + i, who: a.user || "A climber", avatar: a.avatar || "", date: a.date, report: a, c2cText: a.cond && a.cond.carToCar, secs: c2c, track: null, seedPts: null };
      out.push(row);
      if (a._dbId != null) byLog[a._dbId] = row;
      byWho[(a.user || "") + "|" + a.date] = row;
    });
    (tracks || []).forEach((t) => {
      const mine = byLog[t.id];
      if (mine) { mine.track = t; if (t.stats.secs != null) mine.secs = t.stats.secs; return; }
      const p = profiles[t.user_id];
      out.push({ key: "t" + t.id, who: (p && pubName(p)) || "A climber", avatar: (p && p.avatar) || "", date: t.date, report: null, c2cText: null, secs: t.stats.secs, track: t, seedPts: null });
    });
    (loggedOnly ? [] : seedTracks || []).forEach((t, i) => {
      if (!t || !t.date) return;
      const pts = Array.isArray(t.gpxPts) && t.gpxPts.length >= 2 ? t.gpxPts : null;
      const mine = byWho[(t.who || "") + "|" + t.date];
      if (mine) { if (pts) mine.seedPts = pts; return; }
      out.push({ key: "c" + i, who: t.who || "A climber", avatar: t.avatar || "", date: t.date, report: t.report ? { user: t.who, avatar: t.avatar, date: t.date, text: t.report } : null, seedOnly: true, c2cText: null, secs: null, track: null, seedPts: pts });
    });
    return out.map((r) => ({ ...r, stats: { secs: r.secs } }));
  }, [reports, tracks, seedTracks, profiles, loggedOnly]);
}

/* NOTHING TO LIST, in the three ways that can be true: the read failed (say so, never "none yet"), it is
   still loading, or there really are none. One answer for the route page and the full page. */
/** @param {{ reportsFailed: boolean, tracksLoading: boolean, tracksFailed: boolean, loggedOnly?: boolean, onLog?: (() => void) | null }} p */
export function TracksEmpty({ reportsFailed, tracksLoading, tracksFailed, loggedOnly, onLog }) {
  if (reportsFailed) return <div style={{ fontSize: 12.5, color: C.amber, lineHeight: 1.5 }}>Trip reports couldn’t load. Pull to refresh, or try again later.</div>;
  if (tracksLoading) return <LoadingRows C={C} label={loggedOnly ? "Loading recent logged climbs…" : "Loading recent tracks and trip reports…"}/>;
  return <div style={{ fontSize: 12.5, color: C.textSub, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "11px 13px" }}>{loggedOnly ? "No logged climbs yet — log yours after you climb it." : "No recent tracks or trip reports yet — share one after you climb it."}{onLog ? <> <button onClick={onLog} style={{ ...TRACK_LINK, minHeight: 0 }}>Log this climb</button></> : null}{tracksFailed ? <div style={{ color: C.amber, marginTop: 6 }}>GPS tracks couldn’t load, so there may be some.</div> : null}</div>;
}

/* The failed-read lines above a list that still has rows. */
/** @param {{ reportsFailed: boolean, tracksFailed: boolean }} p */
export function TracksFailedNotes({ reportsFailed, tracksFailed }) {
  return <>
    {reportsFailed ? <div style={{ fontSize: 12, color: C.amber, lineHeight: 1.5, marginBottom: 8 }}>Some trip reports couldn’t load. Pull to refresh, or try again later.</div> : null}
    {tracksFailed ? <div style={{ fontSize: 12, color: C.amber, lineHeight: 1.5, marginBottom: 8 }}>GPS tracks couldn’t load. Pull to refresh, or try again later.</div> : null}
  </>;
}
/* ...and the line under one that holds a recording. */
/** @param {{ crag?: boolean }} p */
export function TrackFootnote({ crag }) {
  return <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 4, lineHeight: 1.45 }}>{crag ? "Each GPS track is one climber's recording of the walk in." : "Each GPS track is one climber's own recording; its time includes stops."}</div>;
}

/* ONE PARTY'S ROW, drawn the same on the route page and on the full page. */
/** @param {{ r: any, op: boolean, onOpen: () => void, shown: string[], colorOf: (id: string) => string|null, onToggle: (id: string) => void,
 *   onOpenReport?: ((report: any) => void) | null, routeName: string, crag?: boolean, loggedOnly?: boolean }} props */
export function TrackRow({ r, op, onOpen, shown, colorOf, onToggle, onOpenReport, routeName, crag, loggedOnly }) {
  const full = shown.length >= MAX_SHOWN_TRACKS;
  const a = r.report, t = r.track, on = !!t && shown.includes(t.id), col = t ? colorOf(t.id) : null;
  const sn = seasonName(r.date), sc = SEASON_TONE[sn] || C.textSub;
  const outcome = outcomeOf(a);
  const c2c = !crag && r.c2cText ? r.c2cText + " car to car" : null;
  const trackFacts = t ? ["GPS track", uDistMi(t.stats.km * 0.621371), t.stats.gainFt != null ? uElev(t.stats.gainFt) + " up" : null, !crag && t.stats.secs != null && t.stats.timed ? fmtDuration(t.stats.secs) : null].filter(Boolean).join(" · ") : r.seedPts ? "GPS track" : null;
  const label = r.who + "'s" + (t || r.seedPts ? " track" : " report") + " from " + shortDate(r.date);
  // THE ROW IS NAMED BY WHAT IT SHOWS (WCAG 2.5.3, check:axe label-content-name-mismatch): the same
  // fragments, in the order drawn, joined once. It read "<who>'s report from <date>, show details",
  // which held none of the stars, outcome or season a sighted climber reads off the row, so a voice
  // user saying what they saw could not reach it. aria-expanded already says it opens. axe glues the
  // row's raw text nodes together and wants that run of WORDS inside the name, so (1) each fragment
  // below is followed by a {" "} text node, or "BarberJun" and "aroundSummer" are single words no
  // name holds, and (2) the stars, drawn as glyphs the rule drops, sit in the name in parentheses,
  // which it drops too -- between commas they would split "2026" from the outcome.
  const rowLabel = [r.who, shortDate(r.date) + (a && a.stars ? " (" + a.stars + " of 5 stars)" : ""), outcome, c2c, trackFacts ? trackFacts + (on ? " · on the map" : "") : null, sn].filter(Boolean).join(", ");
  const canRead = !!(a && onOpenReport && !r.seedOnly);
  return (
    <div style={{ background: C.card, border: `1px solid ${on && col ? col : C.border}`, borderRadius: 12, marginBottom: 8, overflow: "hidden" }}>
      <div {...clickable(onOpen)} aria-expanded={op} aria-label={rowLabel} style={{ minHeight: 44, boxSizing: "border-box", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", cursor: "pointer" }}>
        <Av src={r.avatar} size={30}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, overflowWrap: "anywhere" }}>{r.who}</div>{" "}
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 1, display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 6 }}>
            <div>{shortDate(r.date)}</div>{" "}
            {a && a.stars ? <div role="img" aria-label={a.stars + " of 5 stars"}><Stars n={a.stars} size={11}/></div> : null}{" "}
            {outcome ? <div style={{ color: outcome === "Turned back" ? C.amber : C.textSub }}>{outcome}</div> : null}{" "}
            {c2c ? <div>{c2c}</div> : null}
          </div>{" "}
          {trackFacts ? <div style={{ fontSize: 12, color: C.textSub, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
            <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 5, flexShrink: 0, background: on && col ? col : "transparent", border: "2px solid " + (on && col ? col : C.blue) }}/>
            <span>{trackFacts}{on ? " · on the map" : ""}</span>
          </div> : null}
        </div>{" "}
        <div style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: sc, background: sc + "22", border: `1px solid ${sc}55`, borderRadius: 20, padding: "2px 8px" }}>{sn}</div>
        <span style={{ display: "flex" }}><Chevron open={op} size={15} color={C.textMuted}/></span>
      </div>
      {op ? <div style={{ borderTop: `1px solid ${C.borderLight}`, padding: "9px 12px" }}>
        {a && a.text ? <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.55, fontStyle: "italic", marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 6, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{"“" + a.text + "”"}</div>
          : a ? (loggedOnly ? <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.4, marginBottom: 8 }}>No notes with this log.</div> : null) : <div style={{ fontSize: 12.5, color: C.textSub, marginBottom: 8 }}>Their trip report is not shared with you, only the track.</div>}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          {canRead ? <button onClick={() => onOpenReport(a)} style={btn(false)}>Read the full report</button> : null}
          {t ? <button onClick={() => onToggle(t.id)} disabled={!on && full} aria-pressed={on} aria-label={(on ? "Hide " : "Show ") + label + " on the map"} style={{ ...btn(on), opacity: !on && full ? 0.5 : 1, cursor: !on && full ? "default" : "pointer" }}>{on ? "On the map" : "Show on map"}</button> : null}
          {t || r.seedPts ? <button onClick={() => { const name = routeName + " — " + r.who + " " + r.date; saveFile(name, trackGpx(t ? t.gpx : { pts: r.seedPts }, name)); }} aria-label={"Download " + label + " (GPX)"} style={btn(false)}>Download GPX</button> : null}
        </div>
        {t && !on && full ? <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 6 }}>Up to {MAX_SHOWN_TRACKS} tracks on the map at once.</div> : null}
      </div> : null}
    </div>
  );
}

/**
 * @param {{ reports: Array<any>, seedTracks?: Array<any> | null, tracks: Array<{id:string,user_id:string,date:string,stats:{km:number,gainFt:number|null,secs:number|null,timed:boolean},gpx:any}>,
 *   profiles: Record<string, any>, tracksLoading: boolean, tracksFailed: boolean, reportsFailed: boolean,
 *   shown: string[], colorOf: (id: string) => string|null, onToggle: (id: string) => void,
 *   onOpenReport?: ((report: any) => void) | null, onLog?: (() => void) | null, onSeeAll?: (() => void) | null, atCap?: boolean,
 *   routeName: string, crag?: boolean, loggedOnly?: boolean }} props
 */
export default function RouteTracksPanel({ reports, seedTracks, tracks, profiles, tracksLoading, tracksFailed, reportsFailed, shown, colorOf, onToggle, onOpenReport, onLog, onSeeAll, atCap, routeName, crag, loggedOnly }) {
  const [openKey, setOpenKey] = useState(null);
  const rows = useTrackRows({ reports, tracks, seedTracks, profiles, loggedOnly });
  const latest = useMemo(() => sortTracks(rows, "latest").slice(0, FIRST), [rows]);
  const anyTrack = rows.some((r) => r.track || r.seedPts);

  if (!rows.length) return <TracksEmpty reportsFailed={reportsFailed} tracksLoading={tracksLoading} tracksFailed={tracksFailed} loggedOnly={loggedOnly} onLog={onLog}/>;
  // The count is printed only when every row was read: at a read's limit (`atCap`) there are more than were counted.
  const what = loggedOnly ? "logged climbs" : "tracks & trip reports";

  return (
    <div>
      <TracksFailedNotes reportsFailed={reportsFailed} tracksFailed={tracksFailed}/>
      {latest.map((r) => <TrackRow key={r.key} r={r} op={openKey === r.key} onOpen={() => setOpenKey(openKey === r.key ? null : r.key)} shown={shown} colorOf={colorOf} onToggle={onToggle} onOpenReport={onOpenReport} routeName={routeName} crag={crag} loggedOnly={loggedOnly}/>)}
      {onSeeAll && rows.length > FIRST ? <button onClick={onSeeAll} style={{ display: "block", width: "100%", minHeight: 44, background: "none", border: "none", borderTop: `1px solid ${C.border}`, color: C.blue, fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "center" }}>{"See all " + (atCap ? "" : rows.length + " ") + what + " ›"}</button> : null}
      {anyTrack ? <TrackFootnote crag={crag}/> : null}
    </div>
  );
}
