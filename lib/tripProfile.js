// The TRIP PROFILE: every leg of a route between its own waypoints, timed, measured and
// reconciled with the route's totals (owner note, 2026-10-25: "each leg of the route in the plan
// section to be detailed on timing ... it also must match up among sections").
//
// WHERE EACH NUMBER COMES FROM. A waypoint has a place but no distance or climb between it and the
// next, so the legs are measured on the route's own recorded track: each waypoint snaps to its
// nearest vertex, and the track between two snapped vertices is that leg. Its distance is the
// track length between them. Its climb is the rises of the track's own elevations when the track
// carries them, else the change in height between the two pins when both store one. Nothing is
// invented: a leg with no track under it has no row at all, and a leg whose climb cannot be
// measured shows its distance and time only.
//
// THE TOTALS ARE THE ROUTE'S OWN. The legs carry no totals of their own. The trailhead-to-summit
// figures (distance, gain, time up) and the summit-to-trailhead figures (distance, drop, time down)
// are the ones GETTING THERE and the DESCENT strip print, and the legs are a SPLIT of them:
// distance and climb by the measurement above, time by the walk model applied leg by leg. So the
// legs always add up to the figures on the other sections, and a leg can never disagree with them.
import { scarfHrs } from "../ClimbMatchCore.jsx";
import { metresBetween, pointOf, recordedTrackPts } from "./track.js";

/* A pin further than this from the track is not on it. Same as the default in lib/track.js
   (pinTolerance), so the trip profile and the track caveats agree on what "on the line" means. */
export const PROFILE_SNAP_M = 300;

const isTrailhead = w => /trailhead/i.test(String((w && w.type) || ""));
const isSummit = w => /summit|topout/i.test(String((w && w.type) || ""));
const heightOf = w => { const e = w && w.elev; if (e == null || e === "") return null; const n = Number(e); return Number.isFinite(n) ? n : null; };

// A pin's nearest vertex on the track, and how far away that vertex is.
function snap(line, p) {
  let best = Infinity, idx = -1;
  for (let i = 0; i < line.length; i++) { const d = metresBetween(p, line[i]); if (d < best) { best = d; idx = i; } }
  return { idx, m: best };
}

// Shares of a total in proportion to a list of weights. An all-zero list splits evenly.
function shareOf(ws) {
  const s = ws.reduce((a, b) => a + b, 0);
  return ws.map(w => (s > 0 ? w / s : 1 / ws.length));
}

/* Returns { legs: { up, down }, totals, climbBy, measuredBy, offTrack, unplaced, reason }. `legs` is
   null, and `reason` says why, when the route has no profile: neither a recorded track with the
   trailhead and summit pins on it nor waypoints with published distances from the trailhead, a loop
   or a point-to-point (their whole outing is one number, with no split to print), or a car-to-car day.
   `measuredBy` is "track" or "distances" (the waypoints' own distMi, see measureByPins).
   `climbBy` is "track" (the track's own elevations), "pins" (the heights the waypoints store), or
   null: when null, no leg prints a gain or a drop, because none could be measured.
   `pt` is planTimes() at the Full trip time settings; `geo` is tripLegGeometry() in RouteDetail.
   `up` lists the approach legs trailhead-first; `down` lists the same legs in reverse, since an out
   and back walks its own track home. */
export function tripProfile(route, pt, geo, opts) {
  const o = opts || {};
  const fit = o.fit || "intermediate", pack = o.pack != null ? o.pack : 10;
  const none = reason => ({ legs: null, totals: null, climbBy: null, measuredBy: null, offTrack: 0, unplaced: 0, wholeDayH: null, reason });
  /* A CAR-TO-CAR DAY still has legs: their distance and climb are measured like any other route's. Only the
     time cannot be split, because the one published figure is the whole outing (174 mountain routes drew an
     empty card for this alone, 2026-11-26), so every leg's time is null and `wholeDayH` carries the figure. */
  const wholeDay = !!pt.publishedIsWholeDay;
  if (!geo.outBack) return none("not an out and back");
  // The recorded track measures the legs when it can; the waypoints' own published distances from
  // the trailhead do when it cannot (no track, or its trailhead or summit pin is off the line).
  const m = measureOnTrack(route);
  const mm = m.raw ? m : measureByPins(route, geo.legKm);
  if (!mm.raw) return none(m.reason === "no recorded track" ? mm.reason : m.reason + "; " + mm.reason);
  const { raw, climbBy } = mm;
  // The route's own one-way figure is the total the legs split. With none stored, the measurement is that
  // figure: the summit waypoint's published distance, or the recorded track's length from trailhead to summit
  // (GETTING THERE then prints no distance to disagree with; 26 routes had a track and stated pins but no total).
  const legKm = geo.legKm != null ? geo.legKm : raw.reduce((s, l) => s + l.distM, 0) / 1000;
  const D = raw.reduce((s, l) => s + l.distM, 0);
  if (!(D > 0)) return none("no length between the trailhead and the summit");
  const C = climbBy ? raw.reduce((s, l) => s + l.climbFt, 0) : 0;

  // The split. A leg's share of the distance, and of the climb (distance when no climb is measured).
  // Shares sum to exactly 1, so the legs sum to the route's own figures.
  const sharesD = raw.map(l => l.distM / D);
  const sharesC = raw.map(l => (climbBy && C > 0 ? l.climbFt / C : l.distM / D));
  const kmUp = sharesD.map(s => legKm * s);
  // Same for the climb: the route's own gain and drop when stored, else the waypoints' published heights.
  const ownClimb = mm.measuredBy === "distances" && climbBy ? C : null;
  const gainTot = geo.gainFt != null ? geo.gainFt : ownClimb, dropTot = geo.dropFt != null ? geo.dropFt : ownClimb;
  const gainUpFt = sharesC.map(s => (climbBy && gainTot != null ? gainTot * s : null));
  const dropFt = sharesC.map(s => (climbBy && dropTot != null ? dropTot * s : null));
  /* Time, by the walk model applied leg by leg: the same scarfHrs() planTimes() charges the whole
     route with, so a steep leg takes its share of the climb. The split is a weighting: the up
     figure and the down figure stay exactly planTimes()'s. With no climb measured the weight is the
     distance alone. */
  const climbM = raw.map(l => (climbBy ? l.climbFt / 3.28084 : 0));
  const wUp = shareOf(raw.map((l, i) => scarfHrs(kmUp[i], climbM[i], 0, fit, pack)));
  const wDown = shareOf(raw.map((l, i) => scarfHrs(kmUp[i], 0, climbM[i], fit, pack)));

  const up = raw.map((l, i) => ({ from: l.from, to: l.to, km: kmUp[i], gainFt: gainUpFt[i], timeH: pt.totalH * wUp[i] }));
  // The way down walks the same legs backwards: it drops what the way up climbed.
  const down = raw.map((l, j) => {
    const i = raw.length - 1 - j;
    return { from: raw[i].to, to: raw[i].from, km: kmUp[i], dropFt: dropFt[i], timeH: pt.downH * wDown[i] };
  });
  if (wholeDay) { up.forEach(l => { l.timeH = null; }); down.forEach(l => { l.timeH = null; }); }
  return {
    wholeDayH: wholeDay ? pt.tripH : null,
    legs: { up, down },
    totals: {
      up: { km: legKm, gainFt: gainTot, timeH: wholeDay ? null : pt.totalH, floor: !pt.walkInKnown || !pt.climbKnown },
      down: { km: legKm, dropFt: dropTot, timeH: wholeDay ? null : pt.downH, floor: !pt.walkOutKnown },
    },
    climbBy,
    measuredBy: mm.measuredBy,
    offTrack: mm.offTrack || 0,
    unplaced: mm.unplaced || 0,
    reason: null,
  };
}

/* MEASURED ON THE RECORDED TRACK: each pin snaps to its nearest vertex, and the track between two
   snapped vertices is a leg. Returns { raw, climbBy, offTrack, measuredBy } or { reason }. */
function measureOnTrack(route) {
  // recordedTrackPts() is the one test for a track a walker actually took: a line made of the
  // route's own pins joined up is not one, and measuring legs along it would time the pins.
  const track = recordedTrackPts(route && route.gpxPts, route && route.waypoints);
  if (!track) return { reason: "no recorded track" };
  const line = track.map(pointOf);
  if (line.some(v => !v)) return { reason: "track has unreadable points" };
  // A dot-sized line is a placeholder, not a walk (the same 500 m floor lib/track.js applies).
  const lats = line.map(v => v.lat), lngs = line.map(v => v.lng);
  if (metresBetween({ lat: Math.min(...lats), lng: Math.min(...lngs) }, { lat: Math.max(...lats), lng: Math.max(...lngs) }) < 500) return { reason: "track is a placeholder" };
  const ft = Array.isArray(route.elevPts) && route.elevPts.length === line.length ? route.elevPts.map(Number) : null;
  const trackHasHeights = !!ft && ft.every(v => Number.isFinite(v));

  const pins = (route.waypoints || []).filter(w => w && pointOf(w));
  const placed = pins.map(w => Object.assign({ w }, snap(line, pointOf(w)))).filter(p => p.m <= PROFILE_SNAP_M);
  const offTrack = pins.length - placed.length;
  const th = placed.filter(p => isTrailhead(p.w)).sort((a, b) => a.m - b.m)[0];
  const sum = placed.filter(p => isSummit(p.w)).sort((a, b) => a.m - b.m)[0];
  if (!th) return { reason: "no trailhead pin on the track" };
  if (!sum || sum.idx <= th.idx) return { reason: "no summit pin on the track, after the trailhead" };

  // The waypoints between the two, in the order the track reaches them. A pin on the same vertex
  // as the one before it is the same place, so the first keeps the leg.
  const mids = placed.filter(p => !isTrailhead(p.w) && !isSummit(p.w) && p.idx > th.idx && p.idx < sum.idx).sort((a, b) => a.idx - b.idx);
  const bounds = [th];
  mids.forEach(p => { if (p.idx > bounds[bounds.length - 1].idx) bounds.push(p); });
  bounds.push(sum);

  // Each leg's length along the track, and its climb by whichever source exists.
  const raw = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const a = bounds[i].idx, b = bounds[i + 1].idx;
    let distM = 0;
    for (let k = a; k < b; k++) distM += metresBetween(line[k], line[k + 1]);
    raw.push({ from: bounds[i].w, to: bounds[i + 1].w, distM, climbFt: null });
  }
  let climbBy = null;
  if (trackHasHeights) {
    climbBy = "track";
    for (let i = 0; i < raw.length; i++) {
      let rises = 0;
      for (let k = bounds[i].idx; k < bounds[i + 1].idx; k++) { const r = ft[k + 1] - ft[k]; if (r > 0) rises += r; }
      raw[i].climbFt = rises;
    }
  } else if (bounds.every(p => heightOf(p.w) != null)) {
    climbBy = "pins";
    for (let i = 0; i < raw.length; i++) raw[i].climbFt = Math.max(0, heightOf(bounds[i + 1].w) - heightOf(bounds[i].w));
  }
  if (!(raw.reduce((s, l) => s + l.distM, 0) > 0)) return { reason: "track has no length between its pins" };
  return { raw, climbBy, offTrack, unplaced: 0, measuredBy: "track" };
}

/* A waypoint's PUBLISHED distance from the trailhead (`distMi`, the waypoint editor's distance box),
   or null. A trailhead is the start by definition, so a trailhead with no figure is at 0. */
export const wpDistMi = w => { const d = w && w.distMi; if (d == null || d === "") return isTrailhead(w) ? 0 : null; const n = Number(d); return Number.isFinite(n) && n >= 0 ? n : null; };

/* MEASURED BY THE WAYPOINTS' OWN DISTANCES (owner note, 2026-11-26: "Is trip profile on all routes
   that it should be on?"). Most routes have no recorded track, and the app may not make one (a map
   line is a recorded track or nothing), but a waypoint carries a published distance from the
   trailhead and a height. The legs are then the waypoints in the order of those distances, trailhead
   to summit: a leg's length is the difference of two published distances, its climb the difference
   of two published heights. No coordinate is measured and nothing is drawn, so a camp whose distance
   and height a guidebook states is a leg end even with no pin on the map.
   Returns { raw, climbBy, unplaced, measuredBy } or { reason }. */
function measureByPins(route, legKm) {
  const wps = (route && Array.isArray(route.waypoints) ? route.waypoints : []).filter(w => w && typeof w === "object");
  if (!wps.length) return { reason: "no waypoints" };
  const placed = wps.map(w => ({ w, d: wpDistMi(w) })).filter(p => p.d != null);
  const th = placed.filter(p => isTrailhead(p.w)).sort((a, b) => a.d - b.d)[0];
  if (!th) return { reason: "no trailhead waypoint" };
  let sum = placed.filter(p => isSummit(p.w) && p.d > th.d).sort((a, b) => a.d - b.d)[0];
  /* THE SUMMIT IS THE END OF THE ROUTE'S OWN TRAILHEAD-TO-SUMMIT LEG. A summit pin with no distance of its
     own sits at the route's one-way distance (the figure GETTING THERE prints), so the waypoints between
     with stated distances still split the way up. Not a new number: it is the route's own, and only used
     when it lies beyond every stated distance on the way (2026-11-26: 240 mountain routes lacked just this). */
  if (!sum && legKm != null && legKm > 0) {
    const atMi = legKm / 1.609344;
    const top = wps.find(w => isSummit(w) && wpDistMi(w) == null);
    const beyond = placed.filter(p => !isTrailhead(p.w) && !isSummit(p.w)).every(p => p.d < atMi || p.d > atMi * 1.5);
    if (top && atMi > th.d && beyond) sum = { w: top, d: atMi };
  }
  if (!sum) return { reason: "no summit waypoint with a distance from the trailhead" };
  const mids = placed.filter(p => !isTrailhead(p.w) && !isSummit(p.w) && p.d > th.d && p.d < sum.d).sort((a, b) => a.d - b.d);
  const bounds = [th];
  // Two waypoints at one stated distance are one place: the first keeps the leg.
  mids.forEach(p => { if (p.d > bounds[bounds.length - 1].d) bounds.push(p); });
  bounds.push(sum);
  // Waypoints with no stated distance have no leg of their own; the card says how many.
  const unplaced = wps.filter(w => wpDistMi(w) == null && !isSummit(w)).length;
  // (pins past the summit's distance are the way down or a side trip: they are not on the way up, so they are not counted)
  const raw = [];
  for (let i = 0; i < bounds.length - 1; i++) raw.push({ from: bounds[i].w, to: bounds[i + 1].w, distM: (bounds[i + 1].d - bounds[i].d) * 1609.344, climbFt: null });
  let climbBy = null;
  if (bounds.every(p => heightOf(p.w) != null)) {
    climbBy = "pins";
    for (let i = 0; i < raw.length; i++) raw[i].climbFt = Math.max(0, heightOf(bounds[i + 1].w) - heightOf(bounds[i].w));
  }
  return { raw, climbBy, unplaced, measuredBy: "distances" };
}

/* Rounds a list of numbers to a step so that the rounded list sums to the rounded total: the
   largest-remainder method. Each leg is shown to the same precision as the route's own figure, and
   the legs read as adding up to it. Returns the rounded values in the same order. */
export function apportion(values, step) {
  const raw = values.map(v => v / step);
  const target = Math.round(raw.reduce((a, b) => a + b, 0));
  const fl = raw.map(Math.floor);
  const rem = target - fl.reduce((a, b) => a + b, 0);
  raw.map((r, i) => ({ i, f: r - fl[i] })).sort((a, b) => b.f - a.f).slice(0, Math.max(0, rem)).forEach(x => { fl[x.i] += 1; });
  return fl.map(n => n * step);
}
