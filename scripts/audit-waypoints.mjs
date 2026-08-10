// Audit route waypoints against the route's own GPX track.
//
// Read-only. Prints a report and writes nothing. Run:
//   npm run audit:waypoints                 -- WA (the enriched scope)
//   npm run audit:waypoints -- --state all  -- every state that has waypoints
//   npm run audit:waypoints -- --verbose    -- list every hit, not the first 25
//   npm run audit:waypoints -- --json out.json
//
// The question it asks is the one nobody could ask by reading a row: a waypoint is a
// lat/lng and the track is a list of lat/lngs, so "is this point actually ON this line?"
// is a geometry question. Grep cannot see it and neither can a column-coverage check —
// every field is populated, every value is a plausible coordinate. Only measurement says
// that Forbidden's second trailhead sits 1.4 km off its own track.
//
// ---------------------------------------------------------------------------
// Four things that were wrong in the first draft, each of which made the report lie
// ---------------------------------------------------------------------------
//
//  1. DISTANCE TO THE LINE, NOT TO THE NEAREST VERTEX. Half these tracks are sparse —
//     `wa_forbidden_peak_east_ledges` has 7 points spanning 3 km — so a waypoint sitting
//     exactly on the drawn line can be 400 m from the closest stored vertex. Measuring
//     vertex-only reported healthy routes as broken. Distance is to the nearest point of
//     the nearest SEGMENT.
//
//  2. A TRAILHEAD NEAR THE LINE IS STILL WRONG IF IT IS NOT AT THE START. A trailhead
//     that happens to lie 3 km along the route passes a "distance to line" test and is
//     still misplaced, so the trailhead check measures BOTH: distance to the line, and
//     distance to the track's first point. They are reported separately because they mean
//     different things — see (3).
//
//  3. "OFF TRACK" AND "TRACK IS TRUNCATED" ARE DIFFERENT DEFECTS AND MUST NOT BE MERGED.
//     `wa_cathedral_peak_pasayten_se_buttress` reports its trailhead 23 km from the track.
//     The trailhead is right; the TRACK is the problem — it covers only the technical
//     climbing and omits the whole approach. Rewriting that waypoint would destroy correct
//     data. So a trailhead far from a track whose start is also far from it is reported as
//     TRUNCATED TRACK, and the fix belongs on the gpx, not the waypoint.
//
//  4. A 2-POINT GPX IS A PLACEHOLDER, NOT A TRACK. Several routes store exactly
//     [trailhead, summit] as their "track". Every waypoint then sits on one straight line
//     drawn through the mountain, so the geometry test is vacuously happy and reports a
//     clean route. Those are counted and named as UNROUTED rather than silently passing —
//     a guard that cannot see a defect must say so. Same lesson as check:overlay-discovery.
//
// A fifth thing it deliberately does NOT flag: a `Topout` waypoint instead of `Summit`.
// On a crag route (Pinto Rock, Shuksan Crag, the Wine Spires' individual lines) topping
// out IS the end of the route and there is no summit to reach. Topout is only reported
// when the route's own area is an `area_type='peak'`, where a named summit does exist.

import fs from "node:fs";
import { selectAll, SUPABASE_URL, anonKey, headers } from "./lib/supabase-env.mjs";

// ---------------------------------------------------------------------------
// args
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
function arg(name, dflt) {
  const eq = argv.find(a => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(name.length + 3);
  const i = argv.indexOf(`--${name}`);
  if (i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--")) return argv[i + 1];
  return dflt;
}
const STATE = String(arg("state", "wa")).toLowerCase();
const VERBOSE = argv.includes("--verbose");
const JSON_OUT = arg("json", null);

// ---------------------------------------------------------------------------
// tolerances, in metres
// ---------------------------------------------------------------------------
const TH_ON_LINE = 250;   // a trailhead further than this from the line is not on the route
const TH_AT_START = 400;  // ...and this far from the first track point is not the start
const SUMMIT_TOL = 300;   // a summit marker should sit on the track's high end
const WP_TOL = 500;       // any other waypoint further than this is not on the route
const TRUNCATED = 2000;   // track start this far from the trailhead => the track is the problem

const R = 6371000;
const rad = d => (d * Math.PI) / 180;
function haversine(aLat, aLng, bLat, bLng) {
  const dLat = rad(bLat - aLat), dLng = rad(bLng - aLng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
// Nearest distance from a point to a polyline, segment-aware — see note (1) above.
// Returns { m, seg, t } so callers can also ask WHERE along the line the point fell,
// which is what the ordering check needs.
function toPolyline(lat, lng, track) {
  if (!track.length) return null;
  if (track.length === 1) return { m: haversine(lat, lng, track[0][0], track[0][1]), seg: 0, t: 0 };
  const kx = Math.cos(rad(lat)) * 111320, ky = 110540; // local planar metres per degree
  let best = { m: Infinity, seg: 0, t: 0 };
  for (let i = 0; i < track.length - 1; i++) {
    const [y1, x1] = track[i], [y2, x2] = track[i + 1];
    const px = (lng - x1) * kx, py = (lat - y1) * ky;
    const vx = (x2 - x1) * kx, vy = (y2 - y1) * ky;
    const len2 = vx * vx + vy * vy;
    let t = len2 ? (px * vx + py * vy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const dx = px - vx * t, dy = py - vy * t;
    const m = Math.sqrt(dx * dx + dy * dy);
    if (m < best.m) best = { m, seg: i, t };
  }
  return best;
}
// Cumulative metres along the track to a (seg, t) position — used for ordering.
function alongTrack(track, seg, t) {
  let d = 0;
  for (let i = 0; i < seg; i++) d += haversine(track[i][0], track[i][1], track[i + 1][0], track[i + 1][1]);
  if (seg < track.length - 1) d += t * haversine(track[seg][0], track[seg][1], track[seg + 1][0], track[seg + 1][1]);
  return d;
}

const m0 = n => Math.round(n);
const typeOf = w => String(w?.type || "").trim();
const lc = w => typeOf(w).toLowerCase();

// ---------------------------------------------------------------------------
// load
//
// Routes are fetched by `area_id=in.(...)` in chunks, never by filtering on
// `waypoints=not.is.null`. That filter scans the whole 200k-row routes table on an
// unindexed jsonb column and dies on the anon role's statement_timeout with a 57014 —
// intermittently, which is worse than never, because it passes often enough to look fine.
// audit:distances records the same trap on dist_km.
// ---------------------------------------------------------------------------
const STATE_ALIAS = { wa: "washington", or: "oregon", ca: "california", co: "colorado", ut: "utah", mt: "montana", ak: "alaska", wy: "wyoming", id: "idaho", nv: "nevada" };
const stateArg = STATE_ALIAS[STATE] || STATE;

console.log(`Reading areas (scope: ${stateArg})…`);
// `path` is an ltree column, so PostgREST cannot LIKE it — fetch and filter here. The
// id-prefix fallback catches legacy ids (`stuart_west_ridge`) that predate state scoping.
const allAreas = await selectAll("areas", "id,name,path,area_type", null, { pageSize: 1000 });
if (!allAreas.length) {
  console.error("FAIL: read 0 areas. Refusing to report a clean result on an empty read.");
  process.exit(1);
}
const areas = stateArg === "all"
  ? allAreas
  : allAreas.filter(a => String(a.path || "").split(".").includes(stateArg) || String(a.id || "").startsWith(`${STATE}_`));
if (!areas.length) {
  console.error(`FAIL: no areas found for state "${stateArg}".`);
  process.exit(1);
}
const areaType = new Map(areas.map(a => [a.id, a]));

console.log(`Reading routes across ${areas.length} areas…`);
const COLS = "id,area_id,name,waypoints,gpx";
const routes = [];
const ids = areas.map(a => a.id);
for (let i = 0; i < ids.length; i += 80) {
  const chunk = ids.slice(i, i + 80).map(x => `"${x}"`).join(",");
  const url = `${SUPABASE_URL}/rest/v1/routes?select=${COLS}&area_id=in.(${encodeURIComponent(chunk)})&limit=2000`;
  const res = await fetch(url, { headers: headers(anonKey()) });
  if (!res.ok) throw new Error(`GET routes chunk ${i} -> ${res.status} ${(await res.text()).slice(0, 200)}`);
  routes.push(...await res.json());
}

// Fails closed. Zero rows makes every check vacuously pass, which is this guard's
// realistic failure mode — same reasoning as check:counts refusing an empty read.
if (!routes.length) {
  console.error("FAIL: read 0 routes. Refusing to report a clean result on an empty read.");
  process.exit(1);
}
const scoped = routes.filter(r => Array.isArray(r.waypoints) && r.waypoints.length);
if (!scoped.length) {
  console.error(`FAIL: 0 of ${routes.length} routes carry waypoints — the read looks broken, not clean.`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// measure
// ---------------------------------------------------------------------------
const F = {
  unrouted: [],           // gpx too sparse to measure against
  noTrack: [],            // waypoints but no gpx at all
  multiTrailhead: [],
  trailheadOffLine: [],
  trailheadNotAtStart: [],
  truncatedTrack: [],
  summitMissing: [],
  summitOffLine: [],
  trackNotEndingAtSummit: [],
  topoutOnPeak: [],
  waypointOffLine: [],
  outOfOrder: [],
  elevKeyWrong: [],
  typeCasing: [],
  typeOffVocab: [],
};

// The app's own vocabulary — RouteDetail's colour map and glyph map are keyed on exactly
// these strings, and it compares `w.type==="Trailhead"` / `"Summit"||"Topout"` directly.
const CANON = ["Trailhead", "Water", "Campsite", "Junction", "Hazard", "Summit", "Topout", "Bailout"];
const CANON_BY_LC = new Map(CANON.map(c => [c.toLowerCase(), c]));

for (const r of scoped) {
  const wps = (Array.isArray(r.waypoints) ? r.waypoints : []).filter(w => w && typeof w === "object");
  if (!wps.length) continue;
  const track = (Array.isArray(r.gpx) ? r.gpx : []).filter(p => Array.isArray(p) && p.length >= 2 && p[0] != null && p[1] != null);
  const ths = wps.filter(w => lc(w) === "trailhead");
  const summits = wps.filter(w => lc(w) === "summit");
  const topouts = wps.filter(w => lc(w) === "topout");
  const area = areaType.get(r.area_id);
  const tag = { id: r.id, name: r.name, area: area?.name || r.area_id };

  // -- schema hygiene: these are mechanical and independent of geometry ------
  if (wps.some(w => w.elevFt != null && w.elev == null)) F.elevKeyWrong.push({ ...tag, n: wps.filter(w => w.elevFt != null && w.elev == null).length });
  // Two different defects that a single "is it Capitalised?" test conflates, and conflating
  // them makes the report lie in both directions. A mis-cased CANONICAL value is a straight
  // bug — the app has a branch for it and the branch does not fire. An OFF-VOCABULARY value
  // ("landmark", "col", "crag_base") is a modelling gap: capitalising it changes nothing,
  // because there is no branch to reach either way. Fixing the first is mechanical; fixing
  // the second means deciding what the app should do with it.
  const types = [...new Set(wps.map(typeOf).filter(Boolean))];
  const miscased = types.filter(t => { const c = CANON_BY_LC.get(t.toLowerCase()); return c && c !== t; });
  const offVocab = types.filter(t => !CANON_BY_LC.has(t.toLowerCase()));
  if (miscased.length) F.typeCasing.push({ ...tag, types: miscased });
  if (offVocab.length) F.typeOffVocab.push({ ...tag, types: offVocab });

  if (ths.length > 1) F.multiTrailhead.push({ ...tag, names: ths.map(w => w.name) });
  if (!summits.length) {
    if (topouts.length && area?.area_type === "peak") F.topoutOnPeak.push({ ...tag, names: topouts.map(w => w.name) });
    else if (!topouts.length) F.summitMissing.push({ ...tag, types: [...new Set(wps.map(typeOf))] });
  }

  // -- geometry -------------------------------------------------------------
  if (!track.length) { F.noTrack.push({ ...tag, wps: wps.length }); continue; }
  if (track.length < 4) { F.unrouted.push({ ...tag, pts: track.length }); continue; }

  const start = track[0], end = track[track.length - 1];

  for (const w of ths) {
    if (w.lat == null || w.lng == null) continue;
    const line = toPolyline(w.lat, w.lng, track);
    const dStart = haversine(w.lat, w.lng, start[0], start[1]);
    // Note (3): if the track ALSO starts far from this trailhead, the track is what is
    // wrong. Reporting that as a bad waypoint would send someone to rewrite good data.
    if (line.m > TRUNCATED && dStart > TRUNCATED) {
      F.truncatedTrack.push({ ...tag, wp: w.name, offLineM: m0(line.m), fromStartM: m0(dStart) });
    } else if (line.m > TH_ON_LINE) {
      F.trailheadOffLine.push({ ...tag, wp: w.name, offLineM: m0(line.m), fromStartM: m0(dStart) });
    } else if (dStart > TH_AT_START) {
      F.trailheadNotAtStart.push({ ...tag, wp: w.name, offLineM: m0(line.m), fromStartM: m0(dStart) });
    }
  }

  for (const w of summits) {
    if (w.lat == null || w.lng == null) continue;
    const line = toPolyline(w.lat, w.lng, track);
    if (line.m > SUMMIT_TOL) F.summitOffLine.push({ ...tag, wp: w.name, offLineM: m0(line.m) });
    const dEnd = haversine(w.lat, w.lng, end[0], end[1]);
    const dStart = haversine(w.lat, w.lng, start[0], start[1]);
    // An out-and-back track legitimately ends where it started, so "the track does not
    // finish at the summit" is only a finding when the summit is not one of the ends.
    if (dEnd > SUMMIT_TOL && dStart > SUMMIT_TOL) {
      F.trackNotEndingAtSummit.push({ ...tag, wp: w.name, trackEndToSummitM: m0(dEnd), pts: track.length });
    }
  }

  const placed = [];
  for (const w of wps) {
    if (w.lat == null || w.lng == null) continue;
    const line = toPolyline(w.lat, w.lng, track);
    if (line.m > WP_TOL) F.waypointOffLine.push({ ...tag, wp: w.name, type: typeOf(w), offLineM: m0(line.m) });
    else placed.push({ name: w.name, type: typeOf(w), along: alongTrack(track, line.seg, line.t), distMi: w.distMi });
  }
  // Ordering: the stored distMi should rise the same way position along the track does.
  // Only checked for waypoints that ARE on the line — an off-line point has no meaningful
  // position, and including it manufactures an ordering error on top of a placement one.
  const withMi = placed.filter(p => typeof p.distMi === "number");
  for (let i = 1; i < withMi.length; i++) {
    const prev = withMi[i - 1], cur = withMi[i];
    if (cur.distMi > prev.distMi && cur.along + 300 < prev.along) {
      F.outOfOrder.push({ ...tag, a: prev.name, b: cur.name, aAlongM: m0(prev.along), bAlongM: m0(cur.along), aMi: prev.distMi, bMi: cur.distMi });
    }
  }
}

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------
const TITLES = {
  truncatedTrack: "TRACK IS TRUNCATED — trailhead is right, the gpx omits the approach (fix the track, not the waypoint)",
  trailheadOffLine: "TRAILHEAD IS NOT ON THE TRACK",
  trailheadNotAtStart: "TRAILHEAD IS ON THE TRACK BUT NOT AT ITS START",
  multiTrailhead: "MORE THAN ONE TRAILHEAD",
  summitMissing: "NO SUMMIT OR TOPOUT WAYPOINT",
  topoutOnPeak: "TOPOUT USED ON A NAMED PEAK (should be Summit)",
  summitOffLine: "SUMMIT IS NOT ON THE TRACK",
  trackNotEndingAtSummit: "TRACK DOES NOT REACH THE SUMMIT",
  waypointOffLine: "WAYPOINT IS NOT ON THE TRACK",
  outOfOrder: "WAYPOINTS ARE OUT OF SEQUENCE ALONG THE TRACK",
  unrouted: "UNMEASURABLE — gpx is a 2-3 point placeholder, not a track",
  noTrack: "UNMEASURABLE — waypoints but no gpx at all",
  elevKeyWrong: "elevFt SET WITHOUT elev — the app reads w.elev, so this elevation never renders",
  typeCasing: "CANONICAL type IN THE WRONG CASE — the app has a branch for it and compares exact case, so it does not fire",
  typeOffVocab: "type IS OUTSIDE THE APP'S VOCABULARY — renders with the fallback glyph; needs a decision, not capitalisation",
};
const ORDER = ["trailheadOffLine", "trailheadNotAtStart", "multiTrailhead", "summitOffLine", "trackNotEndingAtSummit",
  "summitMissing", "topoutOnPeak", "waypointOffLine", "outOfOrder", "truncatedTrack", "elevKeyWrong", "typeCasing",
  "typeOffVocab", "unrouted", "noTrack"];

console.log(`\n${scoped.length} of ${routes.length} routes in scope carry waypoints.\n`);
let actionable = 0;
for (const k of ORDER) {
  const v = F[k];
  if (!v.length) continue;
  const informational = k === "unrouted" || k === "noTrack" || k === "truncatedTrack" || k === "typeOffVocab";
  if (!informational) actionable += v.length;
  console.log(`=== ${v.length}  ${TITLES[k]} ===`);
  const show = VERBOSE ? v : v.slice(0, 25);
  for (const f of show) {
    const { id, name, area, ...rest } = f;
    console.log(`   ${id}  (${area} · ${name})`);
    const detail = Object.entries(rest).map(([a, b]) => `${a}=${Array.isArray(b) ? JSON.stringify(b) : b}`).join("  ");
    if (detail) console.log(`      ${detail}`);
  }
  if (!VERBOSE && v.length > 25) console.log(`   … ${v.length - 25} more (--verbose to list all)`);
  console.log("");
}

const clean = ORDER.every(k => !F[k].length);
if (clean) console.log("No waypoint sits off its own track.");

if (JSON_OUT) {
  fs.writeFileSync(JSON_OUT, JSON.stringify({ scope: STATE, routes: scoped.length, findings: F }, null, 2));
  console.log(`Wrote ${JSON_OUT}`);
}

console.log(`Nothing was written to the database. ${actionable} waypoint problems warrant a look;` +
  ` ${F.unrouted.length + F.noTrack.length} routes could not be measured at all.`);
