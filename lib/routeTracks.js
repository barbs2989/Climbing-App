// CLIMBERS' RECORDED TRACKS on one route: what each one measures, and the sort/filter the full page offers.
// A track is the `climb_logs.gpx_track` the log form stores: { pts: [[lat, lng, elevFt|null, secs|null], ...],
// startedAt }. `secs` is seconds since the first point, so the last point's `secs` is the recording's
// elapsed time. Pure functions only, so the panel and the maps read one answer.

// One colour per selected track, drawn the same on the 2D map, the 3D view and the row's swatch.
// Picked to stay apart from the route's own blue line and the waypoint colours on satellite imagery.
export const TRACK_COLORS = ["#ff7a1a", "#e64cff", "#21d4c4", "#ffd400", "#ff4d6d", "#9bff4d"];
export const MAX_SHOWN_TRACKS = TRACK_COLORS.length;

const R_KM = 6371;
function legKm(a, b) {
  const toR = Math.PI / 180, dLat = (b[0] - a[0]) * toR, dLng = (b[1] - a[1]) * toR;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * toR) * Math.cos(b[0] * toR) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

// The points a track draws, or null when it has fewer than two usable ones.
export function trackPoints(t) {
  const pts = t && Array.isArray(t.pts) ? t.pts.filter((p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1])) : [];
  return pts.length >= 2 ? pts : null;
}

// Distance (km), climbing (ft, summed rises over a 10 ft deadband so GPS jitter does not count as
// gain) and elapsed time (seconds) — each null when the recording does not hold what it needs.
// Elapsed time falls back to the car-to-car minutes the climber typed when the file had no times.
export function trackStats(t, carToCarMin) {
  const pts = trackPoints(t);
  if (!pts) return null;
  let km = 0, gain = 0, anyElev = false, ref = null;
  for (let i = 0; i < pts.length; i++) {
    if (i) km += legKm(pts[i - 1], pts[i]);
    const e = pts[i][2];
    if (e != null && Number.isFinite(e)) {
      anyElev = true;
      if (ref == null) ref = e;
      else if (e - ref > 10) { gain += e - ref; ref = e; }
      else if (ref - e > 10) ref = e;
    }
  }
  const last = pts[pts.length - 1][3];
  const secs = last != null && Number.isFinite(last) && last > 0 ? last : (carToCarMin != null && carToCarMin > 0 ? carToCarMin * 60 : null);
  return { km, gainFt: anyElev ? Math.round(gain) : null, secs, timed: last != null && Number.isFinite(last) && last > 0 };
}

// "5h 20m", "2d 3h": a whole-trip duration, never seconds.
export function fmtDuration(secs) {
  if (secs == null) return null;
  const m = Math.round(secs / 60), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  if (d) return d + "d " + h + "h";
  return h ? h + "h " + String(mm).padStart(2, "0") + "m" : mm + "m";
}

// Meteorological seasons for the northern hemisphere, which is every state the catalog holds.
export const SEASONS = [
  { id: "all", label: "Any time" },
  { id: "winter", label: "Winter", months: [12, 1, 2] },
  { id: "spring", label: "Spring", months: [3, 4, 5] },
  { id: "summer", label: "Summer", months: [6, 7, 8] },
  { id: "fall", label: "Fall", months: [9, 10, 11] },
];
export function inSeason(dateStr, seasonId) {
  const s = SEASONS.find((x) => x.id === seasonId);
  if (!s || !s.months) return true;
  const m = Number(String(dateStr || "").slice(5, 7));
  return s.months.includes(m);
}

// Latest first, or fastest first. A track with no time cannot be ranked by speed, so under Fastest it
// goes to the end (newest first among those) rather than being dropped: the list still shows it.
export const TRACK_SORTS = [{ id: "latest", label: "Latest" }, { id: "fastest", label: "Fastest" }];
export function sortTracks(rows, sortId) {
  const byDate = (a, b) => String(b.date || "").localeCompare(String(a.date || ""));
  const out = rows.slice();
  if (sortId === "fastest") {
    out.sort((a, b) => {
      const x = a.stats && a.stats.secs, y = b.stats && b.stats.secs;
      if (x != null && y != null) return x - y;
      if (x != null) return -1;
      if (y != null) return 1;
      return byDate(a, b);
    });
  } else out.sort(byDate);
  return out;
}

// THE FULL PAGE'S FILTERS (lib/RouteTracksPage.jsx). A row is one party: `date`, an optional `report`
// and an optional recording (`track`, or `seedPts` on a sample row).
// How it went, from what the climber logged: "back" when they gave a reason for turning around or
// ticked it that way, "summit" when they topped out, null when the log says neither or the reader
// cannot open the report. A row with no outcome is hidden only once an outcome is asked for.
const BACK_TICKS = ["Turned around", "Attempt"];
export const TRACK_OUTCOMES = [{ id: "all", label: "Any outcome" }, { id: "summit", label: "Summit" }, { id: "back", label: "Turned back" }];
export function rowOutcome(report) {
  if (!report) return null;
  if ((report.outcomeReasons && report.outcomeReasons.length) || BACK_TICKS.includes(report.tickType)) return "back";
  return report.tickType === "Summit" || report.summited ? "summit" : null;
}
export function rowYear(row) {
  const y = String((row && row.date) || "").slice(0, 4);
  return /^\d{4}$/.test(y) ? y : null;
}
// The years the loaded rows cover, newest first: the Year filter offers only years it can answer.
export function trackYears(rows) {
  return [...new Set((rows || []).map(rowYear).filter(Boolean))].sort().reverse();
}
/** @param {Array<any>} rows @param {{ season?: string, gpsOnly?: boolean, outcome?: string, year?: string }} f */
export function filterTrackRows(rows, f) {
  const o = f || {};
  return (rows || []).filter((r) =>
    inSeason(r.date, o.season || "all") &&
    (!o.gpsOnly || !!(r.track || r.seedPts)) &&
    (!o.outcome || o.outcome === "all" || rowOutcome(r.report) === o.outcome) &&
    (!o.year || o.year === "all" || rowYear(r) === o.year));
}

// ONE CLIMBER'S RECORDING as a GPX 1.1 file, so it can be downloaded into Gaia, CalTopo or a watch.
// The stored track keeps elevation in FEET (parseGpxText converts on the way in) and GPX <ele> is
// METRES, so it is converted back; each point's `secs` since the start becomes a <time> when the
// recording kept its start (`startedAt`). `name` names the file's one track, so it must say whose it
// is. A route's standard line is NOT written here: buildGpx in ClimbMatchCore.jsx is that writer.
// Returns "" when the track has fewer than two usable points.
export function trackGpx(t, name) {
  const pts = trackPoints(t);
  if (!pts) return "";
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const t0 = t && t.startedAt && !Number.isNaN(Date.parse(t.startedAt)) ? Date.parse(t.startedAt) : null;
  const seg = pts.map((p) => {
    const ele = p[2] != null && Number.isFinite(p[2]) ? `<ele>${Math.round(p[2] / 3.28084 * 10) / 10}</ele>` : "";
    const time = t0 != null && p[3] != null && Number.isFinite(p[3]) ? `<time>${new Date(t0 + p[3] * 1000).toISOString()}</time>` : "";
    return `<trkpt lat="${p[0]}" lon="${p[1]}">${ele}${time}</trkpt>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="ClimbMatch" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>${esc(name)}</name><trkseg>${seg}</trkseg></trk></gpx>`;
}
