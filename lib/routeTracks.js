// CLIMBERS' RECORDED TRACKS on one route: what each one measures, and the sort/filter the list offers.
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
