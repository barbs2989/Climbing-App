// Diagnose the ROOT CAUSES behind `npm run audit:waypoints`.
//
// READ-ONLY. Writes nothing to the DB. Run:
//   node scripts/oneoff/diagnose-waypoint-findings.mjs
//   node scripts/oneoff/diagnose-waypoint-findings.mjs --verbose
//   node scripts/oneoff/diagnose-waypoint-findings.mjs --json /tmp/wp-diag.json
//
// audit:waypoints reports 878 problems and stops there. Its categories are *symptoms* —
// "this waypoint is 900 m from its track" — and the fix for each depends entirely on WHY,
// which the audit does not ask. This script asks why, and its whole output is a
// classification into three verdicts:
//
//   SAFE_MECHANICAL_FIX  a transform provably correct for the whole subset
//   NEEDS_RESEARCH       N independent problems; only a human with a map fixes them
//   NOT_A_DEFECT         the audit is wrong, or the data describes reality correctly
//
// It re-implements the audit's own geometry (same helpers, same tolerances) rather than
// parsing its text output, and ASSERTS its category counts match the audit's published
// numbers. If they drift, every diagnosis below is about a different population and the
// script says so instead of reporting confidently about the wrong rows.

import fs from "node:fs";
import { selectAll, SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const argv = process.argv.slice(2);
const VERBOSE = argv.includes("--verbose");
const JSON_OUT = (() => {
  const i = argv.indexOf("--json");
  return i >= 0 && argv[i + 1] ? argv[i + 1] : null;
})();

// ---------------------------------------------------------------------------
// geometry — lifted verbatim from scripts/audit-waypoints.mjs so the populations
// are identical. Deliberately a copy: this script must measure what the audit
// measured even if the audit's tolerances later change under it.
// ---------------------------------------------------------------------------
const TH_ON_LINE = 250, TH_AT_START = 400, SUMMIT_TOL = 300, WP_TOL = 500, TRUNCATED = 2000;
const R = 6371000;
const rad = d => (d * Math.PI) / 180;
function haversine(aLat, aLng, bLat, bLng) {
  const dLat = rad(bLat - aLat), dLng = rad(bLng - aLng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
function toPolyline(lat, lng, track) {
  if (!track.length) return null;
  if (track.length === 1) return { m: haversine(lat, lng, track[0][0], track[0][1]), seg: 0, t: 0, px: 0, py: 0 };
  const kx = Math.cos(rad(lat)) * 111320, ky = 110540;
  let best = { m: Infinity, seg: 0, t: 0, px: 0, py: 0 };
  for (let i = 0; i < track.length - 1; i++) {
    const [y1, x1] = track[i], [y2, x2] = track[i + 1];
    const px = (lng - x1) * kx, py = (lat - y1) * ky;
    const vx = (x2 - x1) * kx, vy = (y2 - y1) * ky;
    const len2 = vx * vx + vy * vy;
    let t = len2 ? (px * vx + py * vy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const dx = px - vx * t, dy = py - vy * t;
    const m = Math.sqrt(dx * dx + dy * dy);
    // dx,dy is the displacement FROM the nearest point on the line TO the waypoint,
    // in local metres (east, north). That vector is what a systematic offset would
    // show up in — a projection/datum error points every waypoint the same way.
    if (m < best.m) best = { m, seg: i, t, px: dx, py: dy };
  }
  // WHERE the nearest point fell decides which of two very different defects this is.
  // If the closest point on the polyline is one of its ENDPOINTS, the waypoint lies
  // beyond the track's extent — the track stops short of it, i.e. the gpx is clipped
  // and the waypoint may be perfectly correct. If the closest point is in the MIDDLE
  // of a segment, the waypoint is laterally displaced from a line that runs right past
  // it — that is a wrong coordinate. Merging the two is how a bulk "fix" destroys
  // good waypoints to flatter a bad track. (Same lesson as the audit's note (3).)
  best.beyondStart = best.seg === 0 && best.t === 0;
  best.beyondEnd = best.seg === track.length - 2 && best.t === 1;
  best.lateral = !best.beyondStart && !best.beyondEnd;
  return best;
}
function trackLenM(track) {
  let d = 0;
  for (let i = 0; i < track.length - 1; i++) d += haversine(track[i][0], track[i][1], track[i + 1][0], track[i + 1][1]);
  return d;
}
function alongTrack(track, seg, t) {
  let d = 0;
  for (let i = 0; i < seg; i++) d += haversine(track[i][0], track[i][1], track[i + 1][0], track[i + 1][1]);
  if (seg < track.length - 1) d += t * haversine(track[seg][0], track[seg][1], track[seg + 1][0], track[seg + 1][1]);
  return d;
}
const m0 = n => Math.round(n);
const typeOf = w => String(w?.type || "").trim();
const lc = w => typeOf(w).toLowerCase();

// small stats helpers
const pct = (arr, p) => { if (!arr.length) return NaN; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]; };
function hist(vals, edges) {
  const out = edges.map((e, i) => ({ lo: i ? edges[i - 1] : 0, hi: e, n: 0 }));
  out.push({ lo: edges[edges.length - 1], hi: Infinity, n: 0 });
  for (const v of vals) { let i = edges.findIndex(e => v < e); if (i < 0) i = edges.length; out[i].n++; }
  return out;
}
function printHist(label, vals, edges, unit = "m") {
  if (!vals.length) return;
  console.log(`   ${label}  n=${vals.length}  median=${m0(pct(vals, 50))}${unit}  p90=${m0(pct(vals, 90))}${unit}  max=${m0(Math.max(...vals))}${unit}`);
  for (const b of hist(vals, edges)) {
    if (!b.n) continue;
    const bar = "#".repeat(Math.max(1, Math.round((b.n / vals.length) * 40)));
    console.log(`      ${String(b.lo).padStart(6)}–${b.hi === Infinity ? "  ∞" : String(b.hi).padStart(6)}${unit}  ${String(b.n).padStart(4)}  ${bar}`);
  }
}
function topCounts(map, n = 12) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

// ---------------------------------------------------------------------------
// load — same chunked-by-area_id read the audit uses. Never filter on the jsonb
// column; that scans 200k rows unindexed and dies on the anon statement_timeout.
// ---------------------------------------------------------------------------
console.log("Reading WA areas…");
const allAreas = await selectAll("areas", "id,name,path,area_type", null, { pageSize: 1000 });
if (!allAreas.length) { console.error("FAIL: read 0 areas — refusing to diagnose an empty read."); process.exit(1); }
const areas = allAreas.filter(a => String(a.path || "").split(".").includes("washington") || String(a.id || "").startsWith("wa_"));
if (!areas.length) { console.error("FAIL: 0 WA areas."); process.exit(1); }
const areaById = new Map(areas.map(a => [a.id, a]));

console.log(`Reading routes across ${areas.length} areas…`);
const COLS = "id,area_id,name,waypoints,gpx,discipline,source,auto_generated,dist_km,gain_ft,high_point_ft,lat,lng,gps_contributor_name,outing_shape,pitches,grade";
const routes = [];
const ids = areas.map(a => a.id);
for (let i = 0; i < ids.length; i += 80) {
  const chunk = ids.slice(i, i + 80).map(x => `"${x}"`).join(",");
  const url = `${SUPABASE_URL}/rest/v1/routes?select=${COLS}&area_id=in.(${encodeURIComponent(chunk)})&limit=2000`;
  let res, tries = 0;
  // 57014 is intermittent, not deterministic. One retry, then fail loudly — a
  // partial read would understate every count below and look like good news.
  while (true) {
    res = await fetch(url, { headers: headers(anonKey()) });
    if (res.ok) break;
    if (++tries > 1) throw new Error(`GET routes chunk ${i} -> ${res.status} ${(await res.text()).slice(0, 200)}`);
    await new Promise(r => setTimeout(r, 1500));
  }
  routes.push(...await res.json());
}
if (!routes.length) { console.error("FAIL: read 0 routes."); process.exit(1); }
const scoped = routes.filter(r => Array.isArray(r.waypoints) && r.waypoints.length);
if (!scoped.length) { console.error("FAIL: 0 routes carry waypoints — the read is broken, not clean."); process.exit(1); }

// Index every measurable track in each area, so an off-track waypoint can be asked
// the contamination question: is it on some OTHER route's track in the same place?
const tracksByArea = new Map();
for (const r of routes) {
  const t = (Array.isArray(r.gpx) ? r.gpx : []).filter(p => Array.isArray(p) && p.length >= 2 && p[0] != null && p[1] != null);
  if (t.length < 4) continue;
  if (!tracksByArea.has(r.area_id)) tracksByArea.set(r.area_id, []);
  tracksByArea.get(r.area_id).push({ id: r.id, name: r.name, track: t });
}

// ---------------------------------------------------------------------------
// measure — reproduce the audit's categories, and record the extra facts that
// let each finding be explained rather than merely counted.
// ---------------------------------------------------------------------------
const F = { trailheadOffLine: [], trailheadNotAtStart: [], truncatedTrack: [], summitMissing: [], summitOffLine: [], trackNotEndingAtSummit: [], topoutOnPeak: [], waypointOffLine: [], multiTrailhead: [], unrouted: [], noTrack: [] };

for (const r of scoped) {
  const wps = r.waypoints.filter(w => w && typeof w === "object");
  if (!wps.length) continue;
  const track = (Array.isArray(r.gpx) ? r.gpx : []).filter(p => Array.isArray(p) && p.length >= 2 && p[0] != null && p[1] != null);
  const ths = wps.filter(w => lc(w) === "trailhead");
  const summits = wps.filter(w => lc(w) === "summit");
  const topouts = wps.filter(w => lc(w) === "topout");
  const area = areaById.get(r.area_id);
  const tag = { id: r.id, name: r.name, area: area?.name || r.area_id, areaId: r.area_id, areaType: area?.area_type || null, discipline: r.discipline || null, source: r.source || null, auto: !!r.auto_generated, contributor: r.gps_contributor_name || null, shape: r.outing_shape || null };

  if (ths.length > 1) F.multiTrailhead.push({ ...tag, names: ths.map(w => w.name) });
  if (!summits.length) {
    if (topouts.length && area?.area_type === "peak") F.topoutOnPeak.push({ ...tag, names: topouts.map(w => w.name) });
    else if (!topouts.length) F.summitMissing.push({ ...tag, types: [...new Set(wps.map(typeOf))], nWps: wps.length, highPointFt: r.high_point_ft ?? null, pitches: r.pitches ?? null, grade: r.grade ?? null, wpNames: wps.map(w => String(w.name || "")), wpPairs: wps.map(w => `${typeOf(w) || "(none)"}:${String(w.name || "")}`) });
  }

  if (!track.length) { F.noTrack.push({ ...tag }); continue; }
  if (track.length < 4) { F.unrouted.push({ ...tag, pts: track.length }); continue; }

  const start = track[0], end = track[track.length - 1];
  const tLen = trackLenM(track);
  const startEndM = haversine(start[0], start[1], end[0], end[1]);
  const routeCtx = { pts: track.length, trackKm: +(tLen / 1000).toFixed(2), startEndM: m0(startEndM), distKm: r.dist_km ?? null };

  for (const w of ths) {
    if (w.lat == null || w.lng == null) continue;
    const line = toPolyline(w.lat, w.lng, track);
    const dStart = haversine(w.lat, w.lng, start[0], start[1]);
    if (line.m > TRUNCATED && dStart > TRUNCATED) F.truncatedTrack.push({ ...tag, ...routeCtx, wp: w.name, offLineM: m0(line.m), fromStartM: m0(dStart) });
    else if (line.m > TH_ON_LINE) F.trailheadOffLine.push({ ...tag, ...routeCtx, wp: w.name, offLineM: m0(line.m), fromStartM: m0(dStart) });
    else if (dStart > TH_AT_START) F.trailheadNotAtStart.push({ ...tag, ...routeCtx, wp: w.name, offLineM: m0(line.m), fromStartM: m0(dStart), alongM: m0(alongTrack(track, line.seg, line.t)), alongFrac: +(alongTrack(track, line.seg, line.t) / (tLen || 1)).toFixed(3) });
  }

  for (const w of summits) {
    if (w.lat == null || w.lng == null) continue;
    const line = toPolyline(w.lat, w.lng, track);
    if (line.m > SUMMIT_TOL) F.summitOffLine.push({ ...tag, ...routeCtx, wp: w.name, offLineM: m0(line.m) });
    const dEnd = haversine(w.lat, w.lng, end[0], end[1]);
    const dStart = haversine(w.lat, w.lng, start[0], start[1]);
    if (dEnd > SUMMIT_TOL && dStart > SUMMIT_TOL) {
      const along = alongTrack(track, line.seg, line.t);
      F.trackNotEndingAtSummit.push({ ...tag, ...routeCtx, wp: w.name, gapM: m0(dEnd), offLineM: m0(line.m), fromStartM: m0(dStart), alongFrac: +(along / (tLen || 1)).toFixed(3), beyondEnd: line.beyondEnd, beyondStart: line.beyondStart, lateral: line.lateral });
    }
  }

  for (const w of wps) {
    if (w.lat == null || w.lng == null) continue;
    const line = toPolyline(w.lat, w.lng, track);
    if (line.m <= WP_TOL) continue;
    // ---- the diagnostic questions, asked once per off-track waypoint ----
    // 1. swapped lat/lng, and each of the three sign flips. A transform "fixes" a
    //    waypoint only if it lands it back ON the track; producing a valid-looking
    //    coordinate somewhere else is not evidence of anything.
    const cands = {
      swap: [w.lng, w.lat],
      negLat: [-w.lat, w.lng],
      negLng: [w.lat, -w.lng],
      negBoth: [-w.lat, -w.lng],
    };
    const repairs = {};
    for (const [k, [la, ln]] of Object.entries(cands)) {
      if (!Number.isFinite(la) || !Number.isFinite(ln) || Math.abs(la) > 90 || Math.abs(ln) > 180) { repairs[k] = null; continue; }
      const d = toPolyline(la, ln, track);
      repairs[k] = m0(d.m);
    }
    // 2. is the coordinate even plausibly in Washington?
    const inWA = w.lat >= 45.4 && w.lat <= 49.1 && w.lng >= -124.9 && w.lng <= -116.8;
    // 3. does it sit on a DIFFERENT route's track in the same area? (contamination)
    let nearest = null;
    for (const o of (tracksByArea.get(r.area_id) || [])) {
      if (o.id === r.id) continue;
      const d = toPolyline(w.lat, w.lng, o.track).m;
      if (!nearest || d < nearest.m) nearest = { id: o.id, name: o.name, m: m0(d) };
    }
    F.waypointOffLine.push({
      ...tag, ...routeCtx, wp: w.name, type: typeOf(w), offLineM: m0(line.m),
      east: m0(line.px), north: m0(line.py), repairs, inWA,
      beyondStart: line.beyondStart, beyondEnd: line.beyondEnd, lateral: line.lateral,
      otherTrackId: nearest?.id || null, otherTrackM: nearest ? nearest.m : null,
      distMi: typeof w.distMi === "number" ? w.distMi : null,
    });
  }
}

// ---------------------------------------------------------------------------
// self-check: are we looking at the same population the audit reported?
// ---------------------------------------------------------------------------
const AUDIT = { waypointOffLine: 395, trackNotEndingAtSummit: 146, summitMissing: 70, trailheadNotAtStart: 55, summitOffLine: 46, trailheadOffLine: 26, topoutOnPeak: 9, multiTrailhead: 1 };
console.log(`\n${scoped.length} of ${routes.length} WA routes carry waypoints.\n`);
console.log("=== SELF-CHECK — do my counts match `npm run audit:waypoints`? ===");
let drift = 0;
for (const [k, want] of Object.entries(AUDIT)) {
  const got = F[k].length;
  if (got !== want) drift++;
  console.log(`   ${got === want ? "ok  " : "DRIFT"} ${k.padEnd(24)} audit=${String(want).padStart(4)}  here=${String(got).padStart(4)}`);
}
if (drift) console.log(`   !! ${drift} categories drifted. Every diagnosis below describes a DIFFERENT population than the audit's report.`);
console.log("");

// ---------------------------------------------------------------------------
// Q0 — is 500 m a CLIFF or a SLICE?
//
// Every count in this report is downstream of one threshold. If the distances of ALL
// measurable waypoints form a clean bimodal split — a dense population on the track and
// a separate population far away — then "395 off-track waypoints" names a real defect
// class. If they form a smooth continuum, the number is an artifact of where the line
// was drawn, and "fixing 395 of them" is not a coherent goal. Ask before diagnosing.
// ---------------------------------------------------------------------------
console.log("=".repeat(78));
console.log("Q0  IS THE 500 m TOLERANCE A CLIFF OR A SLICE? (all measurable waypoints)");
console.log("=".repeat(78));
const ALL_D = [];
for (const r of scoped) {
  const track = (Array.isArray(r.gpx) ? r.gpx : []).filter(p => Array.isArray(p) && p.length >= 2 && p[0] != null && p[1] != null);
  if (track.length < 4) continue;
  for (const w of r.waypoints) {
    if (!w || typeof w !== "object" || w.lat == null || w.lng == null) continue;
    ALL_D.push({ m: toPolyline(w.lat, w.lng, track).m, type: typeOf(w) || "(none)" });
  }
}
{
  const ds = ALL_D.map(x => x.m);
  console.log(`   ${ds.length} waypoints on ${scoped.filter(r => (Array.isArray(r.gpx) ? r.gpx : []).filter(p => Array.isArray(p) && p.length >= 2).length >= 4).length} routes with a measurable track.`);
  printHist("   distance to own track, ALL of them:", ds, [50, 100, 250, 500, 1000, 2000, 5000], "m");
  for (const cut of [250, 500, 750, 1000, 2000]) console.log(`      at a ${String(cut).padStart(4)}m tolerance the finding count would be ${ds.filter(d => d > cut).length}`);
  console.log(`   ${ds.filter(d => d <= 50).length} sit within 50m of their track — the healthy mode is TIGHT, so the tail is real, not noise.`);
  // One tolerance is applied to every type, and the types are not alike. A Campsite or a
  // Water source is legitimately OFF the trail — you camp beside the lake, not on the
  // path — while a Junction is a point ON it by definition. If the off-trail types run
  // systematically wider, part of the 395 is the tolerance being wrong, not the data.
  const byT = new Map();
  for (const x of ALL_D) { if (!byT.has(x.type)) byT.set(x.type, []); byT.get(x.type).push(x.m); }
  console.log(`\n   PER-TYPE — is one tolerance right for all of them?`);
  for (const [t, arr] of [...byT.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 10)) {
    console.log(`      ${t.padEnd(12)} n=${String(arr.length).padStart(4)}  median=${String(m0(pct(arr, 50))).padStart(5)}m  p75=${String(m0(pct(arr, 75))).padStart(6)}m  p90=${String(m0(pct(arr, 90))).padStart(6)}m  >500m: ${(100 * arr.filter(d => d > 500).length / arr.length).toFixed(0)}%`);
  }
}

// ---------------------------------------------------------------------------
// Q1 — TRACK DOES NOT REACH THE SUMMIT (146)
// ---------------------------------------------------------------------------
console.log("=".repeat(78));
console.log("Q1  TRACK DOES NOT REACH THE SUMMIT — truncation, or a route that does not summit?");
console.log("=".repeat(78));
{
  const v = F.trackNotEndingAtSummit;
  // The decisive split is NOT the gap to the track's end. It is whether the summit
  // lies on the LINE at all. A track that runs over the summit and carries on (or
  // comes back down the way it went up) reaches the summit perfectly well — the
  // audit's own check only looks at the two endpoints, so it cannot see that.
  const onLine = v.filter(x => x.offLineM <= SUMMIT_TOL);
  const offLine = v.filter(x => x.offLineM > SUMMIT_TOL);
  const returns = onLine.filter(x => x.startEndM <= 500);      // out-and-back / loop
  const thru = onLine.filter(x => x.startEndM > 500);          // traverse: over the top and down the far side
  console.log(`   ${v.length} findings.`);
  console.log(`   ${onLine.length}  summit IS on the track (within ${SUMMIT_TOL}m of the line) — the track DOES reach it`);
  console.log(`        ${returns.length}  out-and-back / loop (track start≈end, ≤500m apart): summit is mid-track BY CONSTRUCTION`);
  console.log(`        ${thru.length}  through-track (start and end far apart): summit passed, descent continues`);
  console.log(`   ${offLine.length}  summit is genuinely NOT on the track — a real question`);
  printHist("gap track-end → summit, summit ON the line:", onLine.map(x => x.gapM), [250, 500, 1000, 2000, 5000], "m");
  printHist("gap track-end → summit, summit OFF the line:", offLine.map(x => x.gapM), [250, 500, 1000, 2000, 5000], "m");
  printHist("summit distance to the line, OFF-line subset:", offLine.map(x => x.offLineM), [500, 1000, 2000, 5000], "m");
  // Truncation test for the genuinely-off-line ones: a clipped GPX is SHORT. Compare
  // the stored track length to dist_km. dist_km holds two conventions (one-way vs half
  // a round trip), so this is a soft signal and is reported as a ratio, never acted on.
  const withDist = offLine.filter(x => typeof x.distKm === "number" && x.distKm > 0);
  const ratios = withDist.map(x => x.trackKm / x.distKm);
  if (ratios.length) {
    console.log(`   track length vs dist_km, off-line subset (n=${ratios.length}):  median ratio=${pct(ratios, 50).toFixed(2)}  p10=${pct(ratios, 10).toFixed(2)}  p90=${pct(ratios, 90).toFixed(2)}`);
    console.log(`      ${ratios.filter(x => x < 0.5).length} tracks are under HALF the stated distance (truncation candidates)`);
  }
  console.log(`   position of the summit along the track (alongFrac), summit-on-line subset:`);
  printHist("      alongFrac ×100:", onLine.map(x => x.alongFrac * 100), [10, 30, 50, 70, 90], "%");
  // For the 46 that really are off the line: does the summit lie BEYOND an end of the
  // track (clipped gpx — the track stops short) or off to the SIDE of it (the track
  // goes somewhere else entirely, so the route may simply not summit)?
  console.log(`\n   the ${offLine.length} genuinely-off-line summits, split by WHERE they fall relative to the track:`);
  const bEnd = offLine.filter(x => x.beyondEnd), bStart = offLine.filter(x => x.beyondStart), lat = offLine.filter(x => x.lateral);
  console.log(`      ${bEnd.length}  beyond the track's END   — the gpx stops short of the summit (TRUNCATED)`);
  console.log(`      ${bStart.length}  beyond the track's START — summit sits before the track begins (track covers the wrong span)`);
  console.log(`      ${lat.length}  LATERAL to the track      — the track runs past the summit at a distance; it climbs something else`);
  printHist("      TRUNCATED subset, distance the track falls short:", bEnd.map(x => x.offLineM), [500, 1000, 2000, 5000], "m");
  printHist("      LATERAL subset, sideways distance:", lat.map(x => x.offLineM), [500, 1000, 2000, 5000], "m");
  if (VERBOSE) for (const x of offLine.slice(0, 46)) console.log(`      ${x.beyondEnd ? "END " : x.beyondStart ? "STRT" : "LAT "} ${x.id}  gap=${x.gapM}m offLine=${x.offLineM}m trackKm=${x.trackKm} distKm=${x.distKm} pts=${x.pts}`);
}

// ---------------------------------------------------------------------------
// Q2 — WAYPOINT IS NOT ON THE TRACK (395)
// ---------------------------------------------------------------------------
console.log("\n" + "=".repeat(78));
console.log("Q2  WAYPOINT IS NOT ON THE TRACK — one systematic offset, or 395 mistakes?");
console.log("=".repeat(78));
{
  const v = F.waypointOffLine;
  console.log(`   ${v.length} off-track waypoints across ${new Set(v.map(x => x.id)).size} routes.`);
  printHist("distance off the line:", v.map(x => x.offLineM), [750, 1000, 2000, 5000, 10000, 25000], "m");

  // --- the mechanical hypotheses, each tested by whether the transform lands the
  // --- point back ON the track. Anything else is a coincidence, not a repair.
  const fixed = k => v.filter(x => x.repairs[k] != null && x.repairs[k] <= WP_TOL);
  console.log(`\n   MECHANICAL REPAIR TESTS — a hypothesis counts only if the transform puts the point back on the track:`);
  for (const k of ["swap", "negLat", "negLng", "negBoth"]) {
    const f = fixed(k);
    const valid = v.filter(x => x.repairs[k] != null).length;
    console.log(`      ${k.padEnd(8)} produces a valid coordinate for ${String(valid).padStart(4)}/${v.length};  lands ON the track for ${f.length}`);
  }
  console.log(`      coordinates outside Washington's bounding box: ${v.filter(x => !x.inWA).length}`);

  // --- systematic offset: a projection/datum error points every point the same way.
  const bearings = v.map(x => (Math.atan2(x.east, x.north) * 180 / Math.PI + 360) % 360);
  const sect = new Array(8).fill(0);
  for (const b of bearings) sect[Math.floor(b / 45) % 8]++;
  const NAMES = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  console.log(`\n   DIRECTION of the offset (a datum/projection shift would pile into ONE sector):`);
  console.log("      " + NAMES.map((n, i) => `${n}=${sect[i]}`).join("  "));
  const maxSect = Math.max(...sect);
  console.log(`      largest sector holds ${maxSect}/${v.length} = ${(100 * maxSect / v.length).toFixed(1)}%  (uniform would be 12.5%)`);
  const mE = pct(v.map(x => x.east), 50), mN = pct(v.map(x => x.north), 50);
  console.log(`      median displacement east=${m0(mE)}m north=${m0(mN)}m  — a constant shift would show a large median in both, not ~0`);

  // --- is the defect per-WAYPOINT or per-ROUTE? If every waypoint on a route is off,
  // --- the track is the suspect, not 6 independent waypoints.
  const wpsPerRoute = new Map();
  for (const r of scoped) {
    const t = (Array.isArray(r.gpx) ? r.gpx : []).filter(p => Array.isArray(p) && p.length >= 2);
    if (t.length < 4) continue;
    wpsPerRoute.set(r.id, r.waypoints.filter(w => w && w.lat != null && w.lng != null).length);
  }
  const byRoute = new Map();
  for (const x of v) byRoute.set(x.id, (byRoute.get(x.id) || 0) + 1);
  let allOff = 0, someOff = 0, allOffRoutes = [];
  for (const [id, n] of byRoute) {
    const total = wpsPerRoute.get(id) || n;
    if (n >= total && total > 1) { allOff++; allOffRoutes.push({ id, n, total }); } else someOff++;
  }
  console.log(`\n   PER-ROUTE vs PER-WAYPOINT:`);
  console.log(`      ${allOff} routes have EVERY waypoint off the track (${allOffRoutes.reduce((a, b) => a + b.n, 0)} waypoints) — suspect the TRACK`);
  console.log(`      ${someOff} routes have only SOME waypoints off (${v.length - allOffRoutes.reduce((a, b) => a + b.n, 0)} waypoints) — suspect the WAYPOINT`);

  // --- by waypoint type. Some types are OFF the route by definition.
  const byType = new Map();
  for (const x of v) byType.set(x.type || "(none)", (byType.get(x.type || "(none)") || 0) + 1);
  const typeTotals = new Map();
  for (const r of scoped) for (const w of r.waypoints) if (w && typeof w === "object") { const t = typeOf(w) || "(none)"; typeTotals.set(t, (typeTotals.get(t) || 0) + 1); }
  console.log(`\n   BY WAYPOINT TYPE (off-track / all such waypoints in WA):`);
  for (const [t, n] of topCounts(byType, 20)) console.log(`      ${t.padEnd(14)} ${String(n).padStart(4)} / ${String(typeTotals.get(t) || 0).padStart(4)}  = ${(100 * n / (typeTotals.get(t) || n)).toFixed(0)}% off track`);

  // --- THE decisive split for this category, same test as Q1: beyond an end of the
  // --- track (clipped gpx, waypoint probably fine) vs lateral to it (wrong coordinate).
  const bStart = v.filter(x => x.beyondStart), bEnd = v.filter(x => x.beyondEnd), lat = v.filter(x => x.lateral);
  console.log(`\n   WHERE the waypoint falls relative to the track — the truncation test:`);
  console.log(`      ${bStart.length}  beyond the track's START — the gpx omits the approach; the waypoint is probably RIGHT`);
  console.log(`      ${bEnd.length}  beyond the track's END   — the gpx is clipped at the top`);
  console.log(`      ${lat.length}  LATERAL to the track      — the line runs past it; the WAYPOINT is the suspect`);
  printHist("      beyond-START distances:", bStart.map(x => x.offLineM), [750, 2000, 5000, 10000], "m");
  printHist("      LATERAL distances:", lat.map(x => x.offLineM), [750, 1000, 2000, 5000], "m");
  const latByType = new Map();
  for (const x of lat) latByType.set(x.type || "(none)", (latByType.get(x.type || "(none)") || 0) + 1);
  console.log(`      LATERAL by type: ${topCounts(latByType, 12).map(([k, n]) => `${k}=${n}`).join("  ")}`);
  const endByType = new Map();
  for (const x of [...bStart, ...bEnd]) endByType.set(x.type || "(none)", (endByType.get(x.type || "(none)") || 0) + 1);
  console.log(`      BEYOND-END by type: ${topCounts(endByType, 12).map(([k, n]) => `${k}=${n}`).join("  ")}`);

  // --- contamination: does it sit on a sibling route's track instead?
  const contam = v.filter(x => x.otherTrackM != null && x.otherTrackM <= WP_TOL);
  console.log(`\n   CONTAMINATION: ${contam.length}/${v.length} off-track waypoints sit ON a DIFFERENT route's track in the same area`);
  if (contam.length && VERBOSE) for (const x of contam.slice(0, 30)) console.log(`      ${x.id} · ${x.wp} (${x.offLineM}m off own track, ${x.otherTrackM}m from ${x.otherTrackId})`);

  // --- short tracks. A 4-point "track" over a 12 km route explains a lot of distance
  // --- without any waypoint being wrong.
  const sparse = v.filter(x => x.pts <= 8);
  console.log(`\n   TRACK RESOLUTION: ${sparse.length}/${v.length} findings are against a track of ≤8 points`);
  printHist("      points in the offending route's track:", v.map(x => x.pts), [5, 10, 25, 50, 100], "pts");
  const ratios2 = v.filter(x => typeof x.distKm === "number" && x.distKm > 0).map(x => x.trackKm / x.distKm);
  if (ratios2.length) console.log(`      track length vs dist_km: median ratio=${pct(ratios2, 50).toFixed(2)};  ${ratios2.filter(x => x < 0.5).length}/${ratios2.length} under half the stated distance`);
}

// ---------------------------------------------------------------------------
// Q3 — NO SUMMIT OR TOPOUT WAYPOINT (70)
// ---------------------------------------------------------------------------
console.log("\n" + "=".repeat(78));
console.log("Q3  NO SUMMIT OR TOPOUT WAYPOINT — missing pin, or a route with no summit?");
console.log("=".repeat(78));
{
  const v = F.summitMissing;
  console.log(`   ${v.length} routes.`);
  const by = (key) => { const m = new Map(); for (const x of v) m.set(String(x[key] ?? "(null)"), (m.get(String(x[key] ?? "(null)")) || 0) + 1); return m; };
  console.log(`   by area_type:   ${topCounts(by("areaType"), 10).map(([k, n]) => `${k}=${n}`).join("  ")}`);
  console.log(`   by discipline:  ${topCounts(by("discipline"), 12).map(([k, n]) => `${k}=${n}`).join("  ")}`);
  console.log(`   by source:      ${topCounts(by("source"), 8).map(([k, n]) => `${k}=${n}`).join("  ")}`);
  const peaky = v.filter(x => x.areaType === "peak");
  console.log(`   ${peaky.length} sit on an area_type='peak' — a NAMED SUMMIT EXISTS, so the pin is genuinely missing`);
  console.log(`   ${v.length - peaky.length} sit on a crag/wall/boulder area — there may be no summit to pin`);
  // How many waypoints do these routes carry? A route with a full waypoint list and no
  // summit is a different problem from one carrying a single trailhead.
  printHist("   waypoints carried by these routes:", v.map(x => x.nWps), [2, 3, 5, 8], "");
  const tset = new Map();
  for (const x of v) for (const t of x.types) tset.set(t || "(none)", (tset.get(t || "(none)") || 0) + 1);
  console.log(`   waypoint types present on these routes: ${topCounts(tset, 14).map(([k, n]) => `${k}=${n}`).join("  ")}`);
  // Does the route reach a high point at all? A route with high_point_ft and a peak
  // area is unambiguously missing its summit pin.
  const hp = v.filter(x => x.areaType === "peak" && x.highPointFt != null);
  console.log(`   ${hp.length} are on a peak AND carry high_point_ft`);
  // The cheapest possible fix, if it exists: the summit is already pinned and merely
  // MIS-TYPED. Ask the waypoint NAMES, not the types — a pin called "Summit" typed
  // `climb` is a one-word retype, not a research task.
  const NAME_RE = /\b(summit|top ?out|topout|high point|highpoint|true summit)\b/i;
  const named = v.filter(x => x.wpNames.some(n => NAME_RE.test(n)));
  console.log(`   ${named.length} already carry a waypoint whose NAME says summit/topout but whose TYPE does not — a retype, not research`);
  for (const x of named) console.log(`      ${x.id}  [${x.wpPairs.filter(p => NAME_RE.test(p)).join(" | ")}]`);
  // And the reverse: how many carry NO waypoint that could be the summit at all?
  const onlyTh = v.filter(x => x.types.every(t => /^trailhead$/i.test(t)));
  console.log(`   ${onlyTh.length} carry ONLY a trailhead — there is no pin to retype; the summit must be researched or derived`);
  if (VERBOSE) for (const x of v) console.log(`      ${x.id}  areaType=${x.areaType} disc=${x.discipline} n=${x.nWps} pairs=${JSON.stringify(x.wpPairs)}`);
}

// ---------------------------------------------------------------------------
// Q4 — concentration: one import, or spread across the catalog?
// ---------------------------------------------------------------------------
console.log("\n" + "=".repeat(78));
console.log("Q4  CONCENTRATION — is one import batch responsible?");
console.log("=".repeat(78));
{
  const ALL = [...F.waypointOffLine, ...F.trackNotEndingAtSummit, ...F.summitMissing, ...F.trailheadNotAtStart, ...F.summitOffLine, ...F.trailheadOffLine, ...F.topoutOnPeak, ...F.multiTrailhead];
  const denom = (keyFn) => {
    const m = new Map();
    for (const r of scoped) { const k = String(keyFn(r) ?? "(null)"); m.set(k, (m.get(k) || 0) + 1); }
    return m;
  };
  const show = (label, keyFn, findKey) => {
    const num = new Map(); for (const x of ALL) { const k = String(x[findKey] ?? "(null)"); num.set(k, (num.get(k) || 0) + 1); }
    const den = denom(keyFn);
    console.log(`\n   by ${label}  (findings / routes-with-waypoints in that group):`);
    for (const [k, n] of topCounts(num, 14)) console.log(`      ${k.slice(0, 40).padEnd(42)} ${String(n).padStart(4)} / ${String(den.get(k) || 0).padStart(4)}`);
  };
  show("source", r => r.source, "source");
  show("auto_generated", r => !!r.auto_generated, "auto");
  show("gps_contributor_name", r => r.gps_contributor_name, "contributor");
  show("area", r => areaById.get(r.area_id)?.name, "area");
  // Findings per route: a long tail of one-each is 878 independent problems; a short
  // head of routes carrying many is a handful of broken rows.
  const perRoute = new Map();
  for (const x of ALL) perRoute.set(x.id, (perRoute.get(x.id) || 0) + 1);
  console.log(`\n   ${ALL.length} findings spread over ${perRoute.size} distinct routes (of ${scoped.length} with waypoints).`);
  printHist("   findings per affected route:", [...perRoute.values()], [2, 3, 5, 8], "");
  console.log(`   worst routes: ${topCounts(perRoute, 8).map(([k, n]) => `${k}=${n}`).join("  ")}`);
  console.log(`\n   UNMEASURABLE (context): ${F.unrouted.length} routes have a 2–3 point placeholder gpx, ${F.noTrack.length} have waypoints and no gpx at all.`);

  // Raw finding counts confound "this group is broken" with "this group is big".
  // The honest question is the RATE: what share of routes in each group has any finding?
  console.log(`\n   RATE, not raw count — share of waypointed routes in each group with ≥1 finding:`);
  // CONFOUND, and it inverts the naive reading: a route with no track cannot produce a
  // geometry finding at all, so a group full of trackless routes looks "clean" for a
  // reason that has nothing to do with its data quality. 468 of 569 auto_generated=false
  // routes carry a <4-point placeholder. Restrict the denominator to routes that COULD
  // have been measured, and count only the geometry findings.
  const measurable = new Set(scoped.filter(r => (Array.isArray(r.gpx) ? r.gpx : []).filter(p => Array.isArray(p) && p.length >= 2).length >= 4).map(r => r.id));
  const GEO = [...F.waypointOffLine, ...F.trackNotEndingAtSummit, ...F.trailheadNotAtStart, ...F.summitOffLine, ...F.trailheadOffLine];
  const geoRoutes = new Set(GEO.map(x => x.id));
  const rateBy = (label, keyFn) => {
    const den = new Map(), num = new Map();
    for (const r of scoped) { if (!measurable.has(r.id)) continue; const k = String(keyFn(r) ?? "(null)"); den.set(k, (den.get(k) || 0) + 1); if (geoRoutes.has(r.id)) num.set(k, (num.get(k) || 0) + 1); }
    console.log(`      ${label}:`);
    for (const [k, d] of [...den.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
      const n = num.get(k) || 0;
      console.log(`         ${k.slice(0, 34).padEnd(36)} ${String(n).padStart(4)}/${String(d).padStart(4)} measurable routes = ${(100 * n / d).toFixed(0)}%`);
    }
  };
  console.log(`      (denominator = the ${measurable.size} routes with a ≥4-point track; numerator = GEOMETRY findings only)`);
  rateBy("auto_generated", r => !!r.auto_generated);
  rateBy("source", r => r.source);
  rateBy("discipline", r => r.discipline);
  // Track provenance is the real suspect if auto_generated separates: is the GPX itself
  // synthesised? Compare track point counts between the two populations.
  for (const flag of [true, false]) {
    const pts = scoped.filter(r => !!r.auto_generated === flag).map(r => (Array.isArray(r.gpx) ? r.gpx.length : 0));
    console.log(`      auto_generated=${flag}: ${pts.length} routes, median gpx points=${m0(pct(pts, 50))}, ${pts.filter(p => p < 4).length} with a <4-point placeholder`);
  }
}

// ---------------------------------------------------------------------------
// Q5 — the root-cause classifier: is the TRACK wrong, or are the WAYPOINTS wrong?
//
// Every category above counts waypoints. But a waypoint is only ever "off track"
// relative to a track, and inspecting the worst offenders showed the track is usually
// the guilty party — one bad gpx manufactures 7-11 findings at once. So classify the
// ROUTE, not the waypoint, and count how many findings each class is responsible for.
// ---------------------------------------------------------------------------
console.log("\n" + "=".repeat(78));
console.log("Q5  ROOT-CAUSE CLASSIFIER — per route: is the TRACK wrong or the WAYPOINTS wrong?");
console.log("=".repeat(78));
{
  const classes = new Map();
  const bump = (k, id, n) => { if (!classes.has(k)) classes.set(k, { routes: [], findings: 0 }); classes.get(k).routes.push(id); classes.get(k).findings += n; };
  const findingsPerRoute = new Map();
  for (const x of [...F.waypointOffLine, ...F.trackNotEndingAtSummit, ...F.trailheadNotAtStart, ...F.summitOffLine, ...F.trailheadOffLine]) findingsPerRoute.set(x.id, (findingsPerRoute.get(x.id) || 0) + 1);

  let nullCoord = 0, nullCoordRoutes = new Set();
  const rows = [];
  for (const r of scoped) {
    const track = (Array.isArray(r.gpx) ? r.gpx : []).filter(p => Array.isArray(p) && p.length >= 2 && p[0] != null && p[1] != null);
    const wps = r.waypoints.filter(w => w && typeof w === "object");
    for (const w of wps) if (w.lat == null || w.lng == null) { nullCoord++; nullCoordRoutes.add(r.id); }
    const pts = wps.filter(w => w.lat != null && w.lng != null);
    if (track.length < 4 || !pts.length) continue;
    const n = findingsPerRoute.get(r.id) || 0;
    if (!n) continue;

    const tLen = trackLenM(track);
    // extent, not point count: a 4-point track spanning 20 m is a stub wearing a track's
    // clothes, and the audit's `length < 4` guard waves it straight through.
    let tExtent = 0;
    for (let i = 0; i < track.length; i += Math.max(1, Math.floor(track.length / 40))) for (let j = i + 1; j < track.length; j += Math.max(1, Math.floor(track.length / 40))) tExtent = Math.max(tExtent, haversine(track[i][0], track[i][1], track[j][0], track[j][1]));
    let wExtent = 0;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) wExtent = Math.max(wExtent, haversine(pts[i].lat, pts[i].lng, pts[j].lat, pts[j].lng));
    const dists = pts.map(w => toPolyline(w.lat, w.lng, track).m);
    const onTrack = dists.filter(d => d <= WP_TOL).length;
    const minD = Math.min(...dists);
    const th = wps.find(w => lc(w) === "trailhead" && w.lat != null);
    const thStart = th ? haversine(th.lat, th.lng, track[0][0], track[0][1]) : null;
    const thEnd = th ? haversine(th.lat, th.lng, track[track.length - 1][0], track[track.length - 1][1]) : null;

    // The discriminator that matters is the SHARE of a route's waypoints that sit on its
    // track. A route with 1 of 8 on track is not 7 bad waypoints — the track and the
    // waypoint list are describing different things, and rewriting 7 good waypoints to
    // match one bad gpx is exactly the bulk "fix" that breaks more than it repairs.
    const frac = onTrack / pts.length;
    let cls;
    if (tExtent < 1000 && wExtent > 2000) cls = "A_DEGENERATE_TRACK";     // gpx is a stub; slipped past the <4pt guard
    else if (minD > 1000) cls = "B_DISJOINT_TRACK";                        // NO waypoint is near the track: wrong gpx entirely
    else if (th && thEnd != null && thEnd < 400 && thStart > 2000) cls = "C_REVERSED_TRACK"; // trailhead at the track's END
    else if (frac < 0.4) cls = "D_TRACK_DESCRIBES_SOMETHING_ELSE";        // most waypoints off: the gpx is the wrong span/leg
    else if (frac < 0.75) cls = "E_PARTIAL_TRACK";                        // gpx covers part of the outing
    else cls = "F_WAYPOINT_SCATTER";                                      // track sound; a minority of waypoints are displaced
    bump(cls, r.id, n);
    rows.push({ id: r.id, cls, n, tPts: track.length, tExtentM: m0(tExtent), tLenKm: +(tLen / 1000).toFixed(2), wExtentM: m0(wExtent), onTrack, of: pts.length, minD: m0(minD), thStartM: thStart == null ? null : m0(thStart), thEndM: thEnd == null ? null : m0(thEnd), disc: r.discipline });
  }

  const LABEL = {
    A_DEGENERATE_TRACK: "gpx is a STUB (extent <1km) that slipped past the <4-point guard — one bad row, many findings",
    B_DISJOINT_TRACK: "gpx is somewhere ELSE entirely (no waypoint within 1km) — wrong track attached to the route",
    C_REVERSED_TRACK: "gpx is REVERSED — the trailhead sits at the track's END",
    D_TRACK_DESCRIBES_SOMETHING_ELSE: "under 40% of the route's waypoints are on its track — the GPX is the wrong leg/span, not the waypoints",
    E_PARTIAL_TRACK: "40-75% on track — the gpx covers part of the outing; waypoints past its ends are probably correct",
    F_WAYPOINT_SCATTER: "over 75% on track — the track is sound and a MINORITY of waypoints are genuinely displaced",
  };
  const total = [...classes.values()].reduce((a, b) => a + b.findings, 0);
  console.log(`   ${total} geometry findings across ${rows.length} routes, classified by what is actually wrong:\n`);
  for (const [k, v] of [...classes.entries()].sort((a, b) => b[1].findings - a[1].findings)) {
    console.log(`   ${String(v.findings).padStart(4)} findings  ${String(v.routes.length).padStart(4)} routes   ${k}`);
    console.log(`        ${LABEL[k]}`);
    const ex = rows.filter(x => x.cls === k).sort((a, b) => b.n - a.n).slice(0, VERBOSE ? 50 : 5);
    for (const x of ex) console.log(`        e.g. ${x.id} (${x.n} findings, track ${x.tPts}pts/${x.tLenKm}km extent=${x.tExtentM}m, waypoints span ${x.wExtentM}m, ${x.onTrack}/${x.of} on track)`);
  }
  // CROSS-TAB — the actual deliverable. For each audit category, how many of its
  // findings sit on a route whose TRACK is the identified problem (A-E) versus one
  // where the track is sound and the waypoint really is misplaced (F)? Only the F
  // column is a per-waypoint research task; the rest are per-ROUTE gpx problems.
  const clsOf = new Map(rows.map(x => [x.id, x.cls]));
  const CATS = { waypointOffLine: F.waypointOffLine, trackNotEndingAtSummit: F.trackNotEndingAtSummit, summitOffLine: F.summitOffLine, trailheadNotAtStart: F.trailheadNotAtStart, trailheadOffLine: F.trailheadOffLine };
  const COLS2 = ["A_DEGENERATE_TRACK", "B_DISJOINT_TRACK", "C_REVERSED_TRACK", "D_TRACK_DESCRIBES_SOMETHING_ELSE", "E_PARTIAL_TRACK", "F_WAYPOINT_SCATTER"];
  console.log(`\n   CROSS-TAB — audit category × what is actually wrong with the route:`);
  console.log(`      ${"category".padEnd(24)} ${COLS2.map(c => c[0]).map(c => c.padStart(6)).join("")}   total`);
  for (const [cat, arr] of Object.entries(CATS)) {
    const counts = COLS2.map(c => arr.filter(x => clsOf.get(x.id) === c).length);
    console.log(`      ${cat.padEnd(24)} ${counts.map(n => String(n).padStart(6)).join("")}   ${arr.length}`);
  }
  console.log(`      A=degenerate B=disjoint C=reversed D=describes-something-else E=partial F=waypoint-scatter`);
  console.log(`      (rows may not sum to the total: findings on routes with no other finding are unclassified)`);

  console.log(`\n   WAYPOINTS WITH NO COORDINATES: ${nullCoord} across ${nullCoordRoutes.size} routes — silently SKIPPED by the audit`);
  console.log(`   (they cannot be measured, so they are invisible to every category above; they still render as a pin with no position)`);
}

// ---------------------------------------------------------------------------
// Q6 — the one transform that is even a candidate: reversing a track's point order.
//
// Reversing a polyline changes NO point-to-line distance, so it cannot touch the 395.
// It can only ever move a finding in the two endpoint-sensitive categories. That makes
// it cheap to evaluate honestly: apply it and re-run the audit's own predicate.
// ---------------------------------------------------------------------------
console.log("\n" + "=".repeat(78));
console.log("Q6  WOULD REVERSING THE TRACK FIX ANYTHING? (the only mechanical transform in play)");
console.log("=".repeat(78));
{
  let cand = [], wouldFix = [], wouldBreak = [];
  for (const r of scoped) {
    const track = (Array.isArray(r.gpx) ? r.gpx : []).filter(p => Array.isArray(p) && p.length >= 2 && p[0] != null && p[1] != null);
    if (track.length < 4) continue;
    const wps = r.waypoints.filter(w => w && typeof w === "object");
    const th = wps.find(w => lc(w) === "trailhead" && w.lat != null && w.lng != null);
    if (!th) continue;
    const line = toPolyline(th.lat, th.lng, track);
    const dStart = haversine(th.lat, th.lng, track[0][0], track[0][1]);
    const dEnd = haversine(th.lat, th.lng, track[track.length - 1][0], track[track.length - 1][1]);
    // The audit flags this route iff the trailhead is on the line but not at the start.
    const flagged = line.m <= TH_ON_LINE && dStart > TH_AT_START;
    if (!flagged) continue;
    cand.push(r.id);
    // After reversal the roles of dStart/dEnd swap. Does the predicate go quiet?
    const fixedNow = !(line.m <= TH_ON_LINE && dEnd > TH_AT_START);
    // ...but a summit that WAS at the reversed end may now be at the start, and vice
    // versa. Check we are not trading one finding for another.
    const summit = wps.find(w => lc(w) === "summit" && w.lat != null);
    let breaks = false;
    if (summit) {
      const sEndBefore = haversine(summit.lat, summit.lng, track[track.length - 1][0], track[track.length - 1][1]);
      const sEndAfter = haversine(summit.lat, summit.lng, track[0][0], track[0][1]);
      if (sEndBefore <= SUMMIT_TOL && sEndAfter > SUMMIT_TOL) breaks = true;
    }
    if (fixedNow && !breaks) wouldFix.push({ id: r.id, dStart: m0(dStart), dEnd: m0(dEnd), disc: r.discipline });
    else if (fixedNow && breaks) wouldBreak.push({ id: r.id, dStart: m0(dStart), dEnd: m0(dEnd) });
  }
  console.log(`   ${cand.length} routes are flagged TRAILHEAD-NOT-AT-START (of ${F.trailheadNotAtStart.length} findings).`);
  console.log(`   ${wouldFix.length} would be silenced by reversing the gpx, and break nothing else.`);
  console.log(`   ${wouldBreak.length} would be silenced but would then push the SUMMIT off the track's end — a wash, not a fix.`);
  for (const x of wouldFix.slice(0, VERBOSE ? 100 : 15)) console.log(`      ${x.id}  trailhead is ${x.dStart}m from the start but ${x.dEnd}m from the end  (${x.disc})`);
  console.log(`\n   NOTE: reversal cannot affect the 395 off-track waypoints at all — distance to a`);
  console.log(`   polyline is order-independent. Any claim that "fixing the tracks" clears that`);
  console.log(`   category by reordering is arithmetically false.`);
  console.log(`\n   For context, the audit's own informational TRUNCATED-TRACK bucket holds ${F.truncatedTrack.length} routes,`);
  console.log(`   where the trailhead is right and the gpx omits the approach — already excluded from the 878.`);
}

if (JSON_OUT) { fs.writeFileSync(JSON_OUT, JSON.stringify(F, null, 2)); console.log(`\nWrote ${JSON_OUT}`); }
console.log("\nNothing was written to the database.");
