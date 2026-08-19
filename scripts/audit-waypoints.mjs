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
// SIBLING, NOT A DUPLICATE. `scripts/audit-waypoint-order.mjs` asks a different question of
// the same column; the two were written in parallel under one filename (#783 and #789). That
// one asks whether the LIST is sensible — ordering and duplicate pins (Forbidden naming the
// summit third from the end; Olympus showing two summit pins) — and needs no gpx at all. This
// one asks whether each waypoint is on the route's own TRACK. Neither subsumes the other, so
// run both.
//
// A fifth thing it deliberately does NOT flag: a `Topout` waypoint instead of `Summit`.
// On a crag route (Pinto Rock, Shuksan Crag, the Wine Spires' individual lines) topping
// out IS the end of the route and there is no summit to reach. Topout is only reported
// when the route's own area is an `area_type='peak'`, where a named summit does exist.

import fs from "node:fs";
import { selectAll, SUPABASE_URL, anonKey, headers } from "./lib/supabase-env.mjs";
import { trackIsJustTheWaypoints } from "../lib/track.js";

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
/* A track that never comes within this of the peak it is filed under is not that peak's track.
   Chosen from the measured distribution, not assumed: across the 549 WA routes that have both a
   gpx and an `area_type='peak'` parent, the closest approach of a route's own track to its own
   summit is 13 m at the median and 1,038 m at p95. 2 km is well beyond the healthy population
   and still catches Curtis Ridge at 65 km.
   See scripts/oneoff/probe-track-reaches-its-peak.mjs for the measurement. */
const PEAK_REACH = 2000;
/* Below this many decimal places a stored coordinate is a PLACEHOLDER, not a measurement, and
   this test cannot judge a track against it. Eight Northern Picket peaks carry exactly 3
   decimals while their neighbours carry 6-7 — the tell is precision, not proximity — and
   measuring a good track against an invented summit reports the track as kilometres wrong.
   3 decimals is ~110 m of latitude, far inside PEAK_REACH, so this cannot excuse a genuinely
   displaced track either.

   IT EXCLUDES ZERO WA ROUTES TODAY, and that is stated rather than left to be assumed: disabling
   it changes the result by nothing. Both routes it would catch (Luna Peak SE Slopes, Spinnaker
   Peak S Route — the only two 3-decimal peaks carrying a track) are already filtered out above as
   `unrouted`, being 4-point and 2-point placeholder gpx. So this is an unexercised guard against a
   false positive that has not happened yet, kept because those eight peaks are real and one of
   them acquiring a proper track is the case it exists for — not because anything has proven it
   works on live data. Measured, not claimed. */
const COORD_DP = 4;

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
// Decimal places as stored. Used only to tell a measured coordinate from a placeholder one —
// see COORD_DP.
const decimals = v => { const s = String(v), i = s.indexOf("."); return i < 0 ? 0 : s.length - i - 1; };
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
/* The FIRST request of a run pays connection setup — measured at 3.7s against 0.3-0.7s for the
   same query once warm — and this reads under the ANON key on purpose (an auditor that could
   write is one that can corrupt what it is checking), which carries a 3s statement_timeout. So
   the opening read intermittently died with 57014 before it had fetched anything.
   That is a cold start, NOT an expensive query, and the distinction matters because the obvious
   response is to shrink the page, which fixes nothing: measured, 1000 areas WITH lat/lng takes
   725 ms warm, and 400 still failed cold. See scripts/oneoff/probe-areas-page-cost.mjs.
   So pay the setup on a request whose result is thrown away, and leave the page size alone. */
await selectAll("areas", "id", "id=eq.__warmup_no_such_area__", { pageSize: 1 });

// lat/lng are read for the trackOffItsPeak test below — the one question here that needs an
// anchor OUTSIDE the route's own row.
const allAreas = await selectAll("areas", "id,name,path,area_type,lat,lng", null, { pageSize: 1000 });
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
/* PER-FAULT POPULATIONS, measured independently of the classification below.
   ---------------------------------------------------------------------------
   `F`'s categories are deliberately EXCLUSIVE, by two separate mechanisms, and both are
   correct for a TOTAL:

     * the `else if` chains — a trailhead that is both off-line AND not-at-start is filed
       once, under the more specific fault;
     * `reported` — #834's dedupe, which stopped one pin being counted by both its own
       category and the generic off-line loop (that double count is why the headline went
       878 -> 753 -> 646).

   Neither is a bug. But an exclusive category answers "how many findings are there", NOT
   "how many routes carry this fault", and reading it as the second understates it — badly.
   A sibling audit reported 36 routes as "trailhead not first" where the true population was
   120: the other 84 tripped an earlier gate. I quoted this file's per-category numbers as
   populations earlier and they were floors.

   So: ONE number that sums (the exclusive total, unchanged) and ONE set that populates
   (below, overlapping and labelled as such). Trying to make a single set do both is what
   produced the confusion. These are route-id sets, so a route with three bad pins counts
   once per fault, and they are printed only as context — `actionable` is untouched. */
const POP = {
  trailheadOffLine: new Set(),
  trailheadNotAtStart: new Set(),
  truncatedTrack: new Set(),
  summitOffLine: new Set(),
  trackNotEndingAtSummit: new Set(),
  waypointOffLine: new Set(),
};

const F = {
  unrouted: [],           // gpx too sparse to measure against
  trackIsThePins: [],     // the "track" is this route's own pins joined up — agrees by construction
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
  /* Waypoints carrying no coordinate at all. Every geometry test in this file begins
     `if (w.lat == null || w.lng == null) continue`, so these were skipped SILENTLY and could
     not appear in any of the 878 findings — a defect class the audit was structurally unable
     to report. Counted before any geometry runs.

     WHAT THIS IS NOT, corrected 2026-08-12 after reading the renderers: it does NOT draw a pin
     from a position that does not exist. Every renderer guards — GPXMap's marker loop opens
     `forEach(wp=>{if(wp==null||wp.lat==null)return;}`, gpxDownload emits a `<wpt>` only when
     both coordinates are non-null, WaypointMapPicker filters, and TrailheadCard has `hasCoord`.
     The waypoint is simply absent from the map and present in the itinerary list as text.

     That correction matters more than it sounds, because the overstated version invites the
     wrong repair. These 43 waypoints across 17 routes carry real, sourced itinerary information
     — "Headlee Pass", "Sunrise Mine Trailhead (Trail No. 707)", "Custer-Spickard Saddle" —
     and DELETING them to clear the finding would destroy that. The fix is to source the missing
     coordinate, or to leave the row alone; it is never to remove the waypoint. */
  noCoordinate: [],
  /* THE ONLY TEST HERE THAT IS NOT MEASURED AGAINST THE ROUTE'S OWN TRACK, which is exactly why
     it is worth having. Every other geometry category asks "is this pin on this line?" and so
     cannot say which of the two is wrong — if the TRACK is the thing that is misplaced, the
     route's pins are all faithfully reported as defective and the gpx is never suspected.
     `wa_mount_rainier_curtis_ridge` is the case: its track is five points beside Rattlesnake
     Lake, ~65 km from Rainier and 734 m from a bouldering crag, and it produced six findings
     all of which blamed the waypoints. The waypoints are correct.
     Anchoring on the AREA's coordinate settles it, because a route filed under a peak must have
     a track that goes to that peak — no pins, no prose and no judgement required.

     WHAT IT DOES NOT CLAIM, measured before shipping rather than after. 8 WA hits, and only ONE
     is a foreign track: Curtis Ridge at 65 km. The other seven all START AT THE CORRECT
     TRAILHEAD and simply stop short — Himmelhorn and West Twin Needle from Goodell Creek (the
     standard Pickets approach), Fuhrer Finger from Paradise, Barnes up the Elwha. Those are
     approach-only tracks, which is a real defect but a different one, so the title says
     "never comes within 2 km" — what is measured — rather than "is not this peak's track",
     which would be false of seven of the eight. Distinguish them by magnitude: kilometres is a
     truncated approach, tens of kilometres is somewhere else.
     Confirmed one by one with scripts/oneoff/probe-whose-track-is-it.mjs, which names the peak
     each stray track actually reaches. A hypothesis is not a defect until something says so. */
  trackOffItsPeak: [],
};

/* The app's vocabulary is READ FROM THE APP, never retyped here.

   It was an eight-name literal, and #841 made that wrong within the day: it added Base, Crag,
   Pass, Approach and Landmark to WP_STYLE and pointed ~37 raw spellings at them through
   WP_TYPE_MAP. The app then drew all five correctly while this audit went on calling 141
   waypoints "outside the app's vocabulary" — asserting a modelling gap that had just been
   closed, and inviting a data migration nobody needed. `check:wp-styles` keeps those two maps
   honest with each other; nothing kept THIS file honest with either.

   A hand-copied vocabulary cannot help but drift, because the two files are edited by
   different people for different reasons. Parsing it means this is wrong only if the app is.

   The question is also not "is this string in a list": the app resolves a raw value through
   WP_TYPE_MAP first and only then looks it up in WP_STYLE. So mirror `wpType()` and ask what
   the app asks — after canonicalisation, can WP_STYLE DRAW it? */
const CORE = fs.readFileSync(new URL("../ClimbMatchCore.jsx", import.meta.url), "utf8");
function parseBlock(name) {
  const i = CORE.indexOf(`const ${name}={`);
  if (i < 0) return null;
  let d = 0;
  for (let j = i + name.length + 7; j < CORE.length; j++) {
    const c = CORE[j];
    if (c === "{") d++;
    else if (c === "}") { if (--d === 0) return CORE.slice(i, j + 1); }
    else if (c === '"' || c === "'") { const q = c; while (++j < CORE.length && CORE[j] !== q) if (CORE[j] === "\\") j++; }
  }
  return null;
}
const styleBlock = parseBlock("WP_STYLE"), typeMapBlock = parseBlock("WP_TYPE_MAP");
if (!styleBlock || !typeMapBlock) {
  console.error("\naudit:waypoints FAILED — could not read WP_STYLE / WP_TYPE_MAP from ClimbMatchCore.jsx.");
  console.error("Refusing to judge the catalog against a vocabulary this script invented.\n");
  process.exit(1);
}
const DRAWABLE = new Set([...styleBlock.matchAll(/[\n{]\s*([A-Za-z][A-Za-z0-9_]*)\s*:\s*\{/g)].map(m => m[1]));
/* The key class MUST include `-` and the key MUST be trimmed. Both were wrong in the first
   draft and both produced a confident false report rather than an error: without the hyphen
   `"route-start"` parses as the key `start`, so 4 routes using it were reported as outside the
   vocabulary though the app draws them; without the trim a key written after a newline parses
   as `"  camp"`, which no lookup of `camp` can match. The size check below cannot catch
   either — both bugs yield the RIGHT NUMBER of entries under the wrong names. */
const TYPE_MAP = new Map([...typeMapBlock.matchAll(/["']?([A-Za-z0-9_ /-]+?)["']?\s*:\s*"([A-Za-z]+)"/g)].map(m => [m[1].trim().toLowerCase(), m[2]]));
if (DRAWABLE.size < 8 || TYPE_MAP.size < 20) {
  console.error(`\naudit:waypoints FAILED — parsed ${DRAWABLE.size} drawable types and ${TYPE_MAP.size} spellings.`);
  console.error("That is too few to be real; the parse broke rather than the app shrinking.\n");
  process.exit(1);
}
// Assert the SHAPES that broke, not just the count — a size check passes while names are wrong.
for (const probe of ["route-start", "camp", "trailhead/pass", "climbing area"]) {
  if (!TYPE_MAP.has(probe)) {
    console.error(`\naudit:waypoints FAILED — WP_TYPE_MAP parsed, but the key ${JSON.stringify(probe)} is missing.`);
    console.error("The regex is dropping a key shape (hyphen, leading space, slash), and every route");
    console.error("spelled that way would be reported as outside the app's vocabulary.\n");
    process.exit(1);
  }
}
// wpType() in ClimbMatchCore.jsx, mirrored. Keep the two in step.
const canonOf = raw => { const r = String(raw || "").trim(); if (!r) return ""; return TYPE_MAP.get(r.toLowerCase()) || (r.charAt(0).toUpperCase() + r.slice(1)); };
/* Mis-casing is measured against WP_TYPE_MAP, NOT against the drawable names, and that
   distinction is the finding. `wpType()` lowercases before it looks anything up, so a spelling
   the map contains works in ANY case — `base`, `pass`, `landmark`, `approach` all resolve and
   all draw. Testing them against the drawable names flagged 26 routes with nothing wrong with
   them and, because this category is actionable while typeOffVocab is informational, pushed the
   headline UP 763 -> 789: one false positive traded for a worse one next door.
   What remains is fragile rather than broken — a spelling the map does NOT contain that reaches
   a drawable name only via the capitalise-first-letter fallback. Correct today; silently wrong
   the moment that name gains a second word. */
const CANON_BY_LC = new Map([...DRAWABLE].map(c => [c.toLowerCase(), c]));
const fallbackOnly = t => !TYPE_MAP.has(String(t).trim().toLowerCase());

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
  const miscased = types.filter(t => { const c = CANON_BY_LC.get(t.toLowerCase()); return c && c !== t && fallbackOnly(t); });
  // "Off vocabulary" now means the app cannot DRAW it, not that it is absent from a list here.
  // A spelling WP_TYPE_MAP resolves is fully supported however it is written.
  const offVocab = types.filter(t => !DRAWABLE.has(canonOf(t)));
  if (miscased.length) F.typeCasing.push({ ...tag, types: miscased });
  if (offVocab.length) F.typeOffVocab.push({ ...tag, types: offVocab });

  if (ths.length > 1) F.multiTrailhead.push({ ...tag, names: ths.map(w => w.name) });
  if (!summits.length) {
    // ...unless the topout NAMES A SUB-FEATURE, in which case Topout is correct and Summit
    // would be a lie. Measured on all 9 hits this rule produced: NONE of them wanted the
    // rename. Five climb The Monk, a separate tower at Cathedral Peak (topout 8,300 ft, below
    // Cathedral's own summit); one is explicitly "a non-technical scramble TO THE COL between
    // Colchuck Balanced Rock and Colchuck Peak"; one tops out on Dragontail's NE Towers. Being
    // filed under a peak does not mean a route reaches that peak — subsidiary towers, cols and
    // notches are ordinary objectives, and each of these waypoints SAYS SO IN ITS OWN NAME.
    // Precision before this exemption: 0 of 9. See [[rappel-counts-are-rope-configuration-dependent]]
    // for the same lesson — the flag is a hypothesis, and the data often already answers it.
    const SUBFEATURE = /\b(tower|towers|col|notch|saddle|gendarme|spire|pinnacle|buttress|shoulder)\b/i;
    const realTopouts = topouts.filter(w => !SUBFEATURE.test(String(w.name || "")));
    if (realTopouts.length && area?.area_type === "peak") F.topoutOnPeak.push({ ...tag, names: realTopouts.map(w => w.name) });
    else if (!topouts.length) F.summitMissing.push({ ...tag, types: [...new Set(wps.map(typeOf))] });
  }

  /* Report the positionless waypoints BEFORE geometry, because geometry is exactly what
     cannot see them — every test below opens by skipping a null coordinate. */
  const noCoord = wps.filter((w) => w.lat == null || w.lng == null || isNaN(+w.lat) || isNaN(+w.lng));
  if (noCoord.length) F.noCoordinate.push({ ...tag, names: noCoord.map((w) => w.name || typeOf(w) || "(unnamed)") });

  // -- geometry -------------------------------------------------------------
  if (!track.length) { F.noTrack.push({ ...tag, wps: wps.length }); continue; }
  /* A placeholder track is one with no EXTENT, not one with few points. Guarding on point
     count alone waved through 4-point stubs that span metres: wa_luna_peak_southeast_slopes
     is 4 points covering 17 m, and being measured as a real track it manufactured 11
     findings on its own. Measure the span and treat a stub as unrouted, so it stops
     generating geometry findings it cannot possibly support. */
  const trackSpanM = track.length < 2 ? 0 : Math.max(
    ...track.map((p) => haversine(track[0][0], track[0][1], p[0], p[1])));
  if (track.length < 4 || trackSpanM < 500) {
    F.unrouted.push({ ...tag, pts: track.length, spanM: m0(trackSpanM) });
    continue;
  }
  /* A SECOND unmeasurable class the extent test above cannot reach: a track that IS this route's
     own waypoint list joined by straight lines. These have real extent (162 of the 201 span more
     than 2 km) and unremarkable point counts, so nothing here caught them.
     Every geometry test below asks whether a pin agrees with the track. When the track is a COPY
     of the pins, it agrees BY CONSTRUCTION — two records agreeing is one claim counted twice — so
     a clean verdict here is not evidence and a finding would not be either. Measured on the
     sibling audit: skipping these moved its "clean" count from 201 to 96, i.e. MORE THAN HALF ITS
     CLEAN VERDICTS WERE VACUOUS. Overstated coverage is the false-pass direction, which is why
     this is a skip-and-report rather than a footnote.
     Predicate shared from `lib/track.js` with the route-page caveat and `check:track-caveat`,
     never reimplemented — see the four-grade-parsers note in CLAUDE.md. */
  if (trackIsJustTheWaypoints(r.gpx, r.waypoints)) {
    F.trackIsThePins.push({ ...tag, pts: track.length, pins: wps.filter((w) => w.lat != null).length });
    continue;
  }

  const start = track[0], end = track[track.length - 1];

  /* Does this track go to the peak the route is filed under? Asked BEFORE the pin tests,
     because when the answer is no every one of them is measuring against the wrong line and
     their findings name the wrong culprit. Reported, not `continue`d: a displaced track and a
     genuinely stray pin can coexist, and suppressing the rest would trade one blind spot for
     another. The report says which to read first. */
  if (area && area.area_type === "peak" && area.lat != null && area.lng != null
      && decimals(area.lat) >= COORD_DP && decimals(area.lng) >= COORD_DP) {
    let closest = Infinity;
    for (const p of track) {
      const d = haversine(+area.lat, +area.lng, p[0], p[1]);
      if (d < closest) closest = d;
    }
    if (closest > PEAK_REACH) {
      F.trackOffItsPeak.push({ ...tag, closestM: m0(closest), pts: track.length,
        peak: `${area.lat},${area.lng}` });
    }
  }

  // Pins already reported by a category more specific than `waypointOffLine`. The trailhead and
  // summit loops below run over subsets of `wps`, and the generic loop then walks the SAME
  // objects, so without this the one defect is counted two or three times: Curtis Ridge has
  // three waypoints and produced six findings. Both specific tolerances (250 m, 300 m) are
  // tighter than WP_TOL (500 m), so the generic loop never has anything to add about a pin
  // these have already judged — but this keys on the pin itself rather than on that arithmetic,
  // so loosening a tolerance later cannot silently re-open the double count.
  const reported = new Set();

  for (const w of ths) {
    if (w.lat == null || w.lng == null) continue;
    const line = toPolyline(w.lat, w.lng, track);
    const dStart = haversine(w.lat, w.lng, start[0], start[1]);
    // Populations first, so each predicate is asked INDEPENDENTLY of the chain below. Same
    // thresholds, no `else` — this is the "how many routes carry this fault" half.
    if (line.m > TH_ON_LINE) POP.trailheadOffLine.add(r.id);
    if (dStart > TH_AT_START) POP.trailheadNotAtStart.add(r.id);
    if (line.m > TRUNCATED && dStart > TRUNCATED) POP.truncatedTrack.add(r.id);
    // Note (3): if the track ALSO starts far from this trailhead, the track is what is
    // wrong. Reporting that as a bad waypoint would send someone to rewrite good data.
    if (line.m > TRUNCATED && dStart > TRUNCATED) {
      reported.add(w);
      F.truncatedTrack.push({ ...tag, wp: w.name, offLineM: m0(line.m), fromStartM: m0(dStart) });
    } else if (line.m > TH_ON_LINE) {
      reported.add(w);
      F.trailheadOffLine.push({ ...tag, wp: w.name, offLineM: m0(line.m), fromStartM: m0(dStart) });
    } else if (dStart > TH_AT_START) {
      F.trailheadNotAtStart.push({ ...tag, wp: w.name, offLineM: m0(line.m), fromStartM: m0(dStart) });
    }
  }

  for (const w of summits) {
    if (w.lat == null || w.lng == null) continue;
    const line = toPolyline(w.lat, w.lng, track);
    // `trailheadNotAtStart` above is deliberately NOT in `reported`: it asserts the pin IS on
    // the line, so it makes no claim the generic loop could be duplicating.
    const dEnd = haversine(w.lat, w.lng, end[0], end[1]);
    /* The old predicate here was `dEnd > TOL && dStart > TOL`, and its comment claimed to
       exempt out-and-backs — but it exempts the summit being at an END, which is the opposite
       of the out-and-back case. An out-and-back starts and finishes at the trailhead with the
       summit in the MIDDLE, so it was flagged every single time. 100 of the 146 findings in
       this category had the summit sitting ON the track (median a few metres off the line,
       peaking at exactly 50% along it — the out-and-back signature). The track reaches those
       summits.

       What the category name actually means is "the track stops before the summit". So ask
       that: the summit is off the line AND its nearest point on the polyline is an endpoint,
       which is what "beyond the end" looks like geometrically. A summit lateral to the track
       is a different defect and is already reported as SUMMIT IS NOT ON THE TRACK. */
    const beyondEnd = line.seg >= track.length - 2 && line.t >= 0.999;
    const beyondStart = line.seg === 0 && line.t <= 0.001;
    /* The two are now EXCLUSIVE, and that is a correctness fix rather than tidying. Both used to
       fire on the same pin whenever the track stopped short — one measurement reported twice —
       and worse, "SUMMIT IS NOT ON THE TRACK" was then counting 20 routes whose summit pin is
       perfectly correct and whose GPX simply ends early. Those need the OPPOSITE repair, which
       is the same distinction note (3) draws for trailheads: a track that stops short is a track
       defect, and rewriting the waypoint would destroy good data. So the beyond-an-endpoint case
       belongs to trackNotEndingAtSummit alone, and summitOffLine keeps the lateral case its name
       actually describes. */
    // Populations, asked independently: a summit beyond the track's end is ALSO off the line,
    // and the exclusive filing below deliberately reports only the more specific of the two.
    if (line.m > SUMMIT_TOL) POP.summitOffLine.add(r.id);
    if (line.m > SUMMIT_TOL && (beyondEnd || beyondStart)) POP.trackNotEndingAtSummit.add(r.id);
    if (line.m > SUMMIT_TOL && (beyondEnd || beyondStart)) {
      reported.add(w);
      F.trackNotEndingAtSummit.push({ ...tag, wp: w.name, trackEndToSummitM: m0(dEnd), offLineM: m0(line.m), pts: track.length, past: beyondEnd ? "end" : "start" });
    } else if (line.m > SUMMIT_TOL) {
      reported.add(w);
      F.summitOffLine.push({ ...tag, wp: w.name, offLineM: m0(line.m) });
    }
  }

  const placed = [];
  for (const w of wps) {
    if (w.lat == null || w.lng == null) continue;
    const line = toPolyline(w.lat, w.lng, track);
    // `reported` suppresses the DUPLICATE only. The `placed` bookkeeping below is untouched, so
    // the ordering test still sees every on-line pin including trailheads and summits.
    // Population counts EVERY off-line pin, including the ones `reported` suppresses below.
    // That suppression is right for the total and wrong for "how many routes have a pin off
    // their own track", which is this line's question.
    if (line.m > WP_TOL) POP.waypointOffLine.add(r.id);
    if (line.m > WP_TOL) { if (!reported.has(w)) F.waypointOffLine.push({ ...tag, wp: w.name, type: typeOf(w), offLineM: m0(line.m) }); }
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
  topoutOnPeak: "TOPOUT ON A NAMED PEAK, and the waypoint name does NOT say it is a sub-feature — so it may want to be Summit. Confirm the route reaches the peak before renaming",
  summitOffLine: "SUMMIT IS NOT ON THE TRACK",
  trackNotEndingAtSummit: "TRACK DOES NOT REACH THE SUMMIT",
  trackOffItsPeak: "TRACK NEVER COMES WITHIN 2 km OF THE PEAK IT IS FILED UNDER — read this BEFORE the pin findings on the same route: they are measured against this line. Usually an approach-only track that stops short; at a large distance, a track from somewhere else entirely (informational — most of these are already counted above)",
  waypointOffLine: "WAYPOINT IS NOT ON THE TRACK",
  outOfOrder: "WAYPOINTS ARE OUT OF SEQUENCE ALONG THE TRACK",
  noCoordinate: "WAYPOINT HAS NO COORDINATE — missing from the map (every renderer guards), present in the itinerary as text; no geometry test can see it. SOURCE the coordinate, never delete the waypoint",
  unrouted: "UNMEASURABLE — gpx is a 2-3 point placeholder, not a track",
  trackIsThePins: "UNMEASURABLE — the gpx IS this route's own waypoints joined by straight lines",
  noTrack: "UNMEASURABLE — waypoints but no gpx at all",
  elevKeyWrong: "elevFt SET WITHOUT elev — the app reads w.elev, so this elevation never renders",
  typeCasing: "CANONICAL type IN THE WRONG CASE — the app has a branch for it and compares exact case, so it does not fire",
  typeOffVocab: "type IS OUTSIDE THE APP'S VOCABULARY — renders with the fallback glyph; needs a decision, not capitalisation",
};
// trackOffItsPeak leads: when it fires, the pin findings below it on that route are measured
// against a line that belongs to somewhere else, and reading them first sends you to rewrite
// correct waypoints.
const ORDER = ["trackOffItsPeak", "trailheadOffLine", "trailheadNotAtStart", "multiTrailhead", "summitOffLine", "trackNotEndingAtSummit",
  "summitMissing", "topoutOnPeak", "waypointOffLine", "outOfOrder", "truncatedTrack", "elevKeyWrong", "typeCasing",
  "typeOffVocab", "noCoordinate", "unrouted", "trackIsThePins", "noTrack"];
// A category missing from ORDER is COLLECTED AND NEVER PRINTED. `trackIsThePins` was added to F
// and to the labels and omitted here, and the run reported an unchanged tally with no sign that
// 105 routes had been set aside — a silent drop, in the script whose whole discipline is naming
// what it could not measure. Keep ORDER and the F initialiser in step.

console.log(`\n${scoped.length} of ${routes.length} routes in scope carry waypoints.\n`);
let actionable = 0;
for (const k of ORDER) {
  const v = F[k];
  if (!v.length) continue;
  /* trackOffItsPeak is informational for a measured reason, not a hedge: of its 8 WA hits, 5 are
     already counted under trackNotEndingAtSummit and 1 under truncatedTrack, so counting it as
     actionable would re-inflate the very total this pass deflated. It earns its place by saying
     WHICH LINE the pin findings were measured against, and by needing no summit waypoint to do
     it — not by being a new count. */
  const informational = k === "unrouted" || k === "noTrack" || k === "trackIsThePins" || k === "truncatedTrack"
    || k === "typeOffVocab" || k === "trackOffItsPeak";
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
  fs.writeFileSync(JSON_OUT, JSON.stringify({
    scope: STATE, routes: scoped.length, findings: F,
    // Serialised alongside the findings so a consumer cannot read one without the other, and
    // named for what it is rather than "counts".
    populationsOverlapping: Object.fromEntries(Object.entries(POP).map(([k, v]) => [k, [...v]])),
  }, null, 2));
  console.log(`Wrote ${JSON_OUT}`);
}

/* Two numbers, and they answer different questions. The block above is the exclusive
   classification: every finding filed once, so it SUMS to the total below. This block asks each
   predicate independently, so a route appears under every fault it carries — which is what you
   need to size work, and what the exclusive counts understate. They do NOT sum; adding them
   double-counts on purpose. */
const popRows = Object.entries(POP).filter(([, v]) => v.size);
if (popRows.length) {
  console.log("\nPER-FAULT ROUTE POPULATIONS — these OVERLAP and must NOT be added up.");
  console.log("A route appears once per fault it carries. Use these to size work; use the");
  console.log("exclusive counts above to tally findings. Where a population exceeds its");
  console.log("category, the difference is routes whose fault was filed under a more specific one.");
  for (const [k, v] of popRows.sort((a, b) => b[1].size - a[1].size)) {
    const excl = Array.isArray(F[k]) ? new Set(F[k].map((x) => x.id)).size : null;
    const gap = excl != null && v.size > excl ? `   (+${v.size - excl} filed under a more specific fault)` : "";
    console.log(`  ${String(v.size).padStart(5)}  ${k}${excl != null ? `   exclusive: ${excl}` : ""}${gap}`);
  }

  /* TWO SELF-CHECKS on the column above, in the script rather than only in a review, because
     "population >= exclusive" is exactly what a second column that has quietly started
     double-counting also prints.

     1. A population can never be SMALLER than its exclusive count. It is a superset by
        construction, so smaller means the independent predicate has drifted from the one the
        classifier uses — the two would then be measuring different faults under one name.
     2. The MOST SPECIFIC faults must show a gap of exactly ZERO. `truncatedTrack` and
        `trackNotEndingAtSummit` are first in their chains, so nothing can be filed above them
        and there is nothing for a population to recover. If either grows a gap, the
        independent measurement is counting something the classifier does not — which is the
        failure mode that would make this whole column reassuring and wrong. */
  const FIRST_IN_CHAIN = ["truncatedTrack", "trackNotEndingAtSummit"];
  const popProblems = [];
  for (const [k, v] of Object.entries(POP)) {
    if (!Array.isArray(F[k])) continue;
    const excl = new Set(F[k].map((x) => x.id)).size;
    if (v.size < excl) popProblems.push(`${k}: population ${v.size} < exclusive ${excl} — the independent predicate has drifted from the classifier's`);
    if (FIRST_IN_CHAIN.includes(k) && v.size !== excl) popProblems.push(`${k}: it is first in its chain, so population and exclusive must match, but ${v.size} != ${excl} — the independent measurement is counting something the classification does not`);
  }
  if (popProblems.length) {
    console.log("\n  POPULATION SELF-CHECK FAILED — treat the column above as unreliable:");
    for (const p of popProblems) console.log(`    ${p}`);
  } else {
    console.log(`\n  self-check ok — every population is a superset, and both first-in-chain faults (${FIRST_IN_CHAIN.join(", ")}) match exactly.`);
  }
}

console.log(`\nNothing was written to the database. ${actionable} waypoint problems warrant a look` +
  ` (exclusive findings, so this total sums);` +
  ` ${F.unrouted.length + F.noTrack.length + F.trackIsThePins.length} routes could not be measured at all.`);
