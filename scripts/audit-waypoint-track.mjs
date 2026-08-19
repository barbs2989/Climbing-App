#!/usr/bin/env node
// audit:waypoint-track — is every waypoint actually on (or very near) the route's own track?
//
// A waypoint and the GPX line are two independent enrichments, written at different times from
// different sources, and nothing has ever checked them against each other. When they disagree
// the map does not look broken: it draws the line, drops the pin, and the pin simply sits in
// the wrong basin — which reads as "the trail goes over there" to someone navigating by it.
//
// Distance is measured from each waypoint to the NEAREST SEGMENT of the track, not to the
// nearest track VERTEX. That distinction is the whole accuracy of this audit: GPX points on a
// long straight traverse can be hundreds of metres apart, so a waypoint sitting exactly on the
// line between two of them is far from both, and a vertex-distance check would flag it. The
// first draft did that and called a correctly-placed trailhead a 400 m error.
//
// REPORT-ONLY. A genuinely off-track waypoint is a data fix; but a Bailout or a Hazard pin is
// legitimately off the line (that is what bailing means), so those carry a higher threshold
// rather than being silently exempt — an exemption you cannot see is one you cannot audit.
//
// Read-only, anon key, fails closed on an empty read.

import { selectAll } from "./lib/supabase-env.mjs";
import { trackIsJustTheWaypoints } from "../lib/track.js";

const args = process.argv.slice(2);
const argOf = (n, d) => {
  const eq = args.find(a => a.startsWith(n + "="));
  if (eq) return eq.slice(n.length + 1);
  const i = args.indexOf(n);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const STATE = argOf("--state", "wa").toLowerCase();
const LIMIT = parseInt(argOf("--limit", "30"), 10);
const INJECT = argOf("--inject", null);

// On-track tolerance, metres. A recorded track and a hand-placed pin will never agree exactly:
// consumer GPS is good to ~10 m, and a "Summit" pin is placed on the high point while the
// track stops where the recorder stopped walking.
const TOL = { default: 120, Bailout: 2000, Hazard: 600, Water: 400, Bivy: 500, Campsite: 500 };

const R = 6371000;
const rad = d => d * Math.PI / 180;
// Local equirectangular projection to metres. Over the few km a route spans this is accurate
// to well under the tolerances above, and it makes the point-to-segment maths ordinary planar
// geometry instead of spherical trigonometry.
function proj(lat, lng, lat0) { return { x: rad(lng) * Math.cos(rad(lat0)) * R, y: rad(lat) * R }; }

function distToSegment(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const L2 = dx * dx + dy * dy;
  if (L2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function nearestOnTrack(wp, pts, lat0) {
  const p = proj(+wp.lat, +wp.lng, lat0);
  const P = pts.map(q => proj(q.lat, q.lng, lat0));
  let best = Infinity;
  if (P.length === 1) return Math.hypot(p.x - P[0].x, p.y - P[0].y);
  for (let i = 0; i < P.length - 1; i++) best = Math.min(best, distToSegment(p, P[i], P[i + 1]));
  return best;
}

const norm = g => {
  if (!g) return [];
  const arr = Array.isArray(g) ? g : (Array.isArray(g.points) ? g.points : []);
  return arr
    .map(q => Array.isArray(q) ? { lat: +q[0], lng: +q[1] } : { lat: +(q.lat ?? q.latitude), lng: +(q.lng ?? q.lon ?? q.longitude) })
    .filter(q => Number.isFinite(q.lat) && Number.isFinite(q.lng));
};

const rows = await selectAll("routes", "id,name,area_id,discipline,waypoints,gpx", "", { pageSize: 1000 })
  .catch(e => { console.error("read failed:", e.message); process.exit(1); });
if (!rows.length) { console.error("FAIL — read 0 routes; refusing to report clean on an empty read."); process.exit(1); }

const scoped = rows.filter(r => STATE === "all" || String(r.id || "").startsWith(STATE + "_"));

/* A PLACEHOLDER TRACK IS ONE WITH NO EXTENT, NOT ONE WITH FEW POINTS — and measuring against one
   manufactures findings that read as waypoint defects.
   `wa_sky_mountain_s_route` stores NINE points spanning FOUR METRES; against that dot every pin
   is "off the track", and this audit reported one 2,237 m off. `wa_mount_terror_stoddard_buttress`
   is 2 points spanning 55 m and reported 9,966 m. The pins are fine; there is simply no line to
   be on, and "fix the waypoint" is the wrong instruction.
   This is the same defect #834 fixed in the sibling `audit-waypoints.mjs`, which was never
   applied here — the two scripts ask the same question and drifted, exactly like the four grade
   parsers. A point-count gate cannot see it: 9 points is not a suspicious number.
   Skipped routes are COUNTED AND REPORTED below rather than silently dropped: a guard that
   cannot measure something must say so. */
const MIN_TRACK_SPAN_M = 500;
const trackSpanOf = (pts) => {
  if (pts.length < 2) return 0;
  let max = 0;
  for (const p of pts) { const d = nearestOnTrack(p, [pts[0]], pts[0].lat); if (d > max) max = d; }
  return max;
};

/* A SECOND UNMEASURABLE CLASS, and the extent gate above cannot see it: a track that IS the route's
   own waypoint list joined by straight lines. 201 of the 580 WA routes carrying a gpx store one —
   median FOUR points, and 162 of them span more than 2 km, so they sail through MIN_TRACK_SPAN_M
   and through any point-count test.
   The question this whole script asks is "is each pin on this route's own track?", and on these
   routes the answer is YES BY CONSTRUCTION: the track is a COPY of the pins, not a second opinion.
   Two records agreeing is one claim counted twice. So both answers are worthless here — a clean
   result is not evidence the pins are right, and an off-track finding is not evidence they are
   wrong.
   Detected by `lib/track.js`, shared with the route page's caveat and with `check:track-caveat`,
   rather than reimplemented: two copies of one predicate is the four-grade-parsers shape this repo
   keeps paying for. Reported, never silently dropped. */
const measurable = [], placeholder = [], derivedFromPins = [];
for (const r of scoped) {
  const w = Array.isArray(r.waypoints) ? r.waypoints : [];
  const pts = norm(r.gpx);
  if (pts.length < 2 || !w.some(x => x && x.lat != null && x.lng != null)) continue;
  const span = trackSpanOf(pts);
  if (pts.length < 4 || span < MIN_TRACK_SPAN_M) {
    placeholder.push({ r, pts: pts.length, span: Math.round(span) });
  } else if (trackIsJustTheWaypoints(r.gpx, r.waypoints)) {
    derivedFromPins.push({ r, pts: pts.length, pins: w.filter(x => x && x.lat != null).length });
  } else measurable.push(r);
}
let withBoth = measurable;

if (INJECT === "shift") {
  // Move every waypoint ~1km north. Every route with a track must then report findings.
  withBoth = withBoth.map(r => ({ ...r, waypoints: r.waypoints.map(w => (w && w.lat != null) ? { ...w, lat: +w.lat + 0.009 } : w) }));
}
if (INJECT === "snap") {
  // Put every waypoint exactly on the track's first vertex — must report ZERO findings.
  withBoth = withBoth.map(r => { const p = norm(r.gpx)[0]; return { ...r, waypoints: r.waypoints.map(w => (w && w.lat != null) ? { ...w, lat: p.lat, lng: p.lng } : w) }; });
}

const findings = [];
let wpChecked = 0;
for (const r of withBoth) {
  const pts = norm(r.gpx);
  const lat0 = pts[0].lat;
  const bad = [];
  for (const w of (r.waypoints || [])) {
    if (!w || w.lat == null || w.lng == null) continue;
    if (!Number.isFinite(+w.lat) || !Number.isFinite(+w.lng)) continue;
    wpChecked++;
    const d = nearestOnTrack(w, pts, lat0);
    const tol = TOL[w.type] || TOL.default;
    if (d > tol) bad.push({ w, d, tol });
  }
  if (bad.length) {
    const placed = (r.waypoints || []).filter(w => w && w.lat != null && Number.isFinite(+w.lat)).length;
    // WHICH of the two is wrong matters more than the distance, and the distance alone cannot
    // say. If EVERY pin misses — and misses by kilometres — the pins are not individually
    // misplaced; the track is describing a different journey. Curtis Ridge is the case that
    // forced this distinction: a 5-point track sitting 60 km north of Rainier while all three
    // of its waypoints are correctly on the mountain. Reported as an off-track PIN, that reads
    // as "fix the waypoints", which would have moved three correct pins onto a wrong line.
    const allMiss = bad.length === placed && placed >= 2;
    const far = Math.min(...bad.map(b => b.d)) > 2000;
    // The third case, and the one that makes this list worth reading. A track that covers only
    // the CLIMB — starting at the base, not the car — leaves every approach waypoint
    // legitimately off it. Those are not misplaced pins and must not be listed as if they
    // were: "fixing" them means dragging a correct trailhead onto a line that never went
    // there. Detected by extent, not by waypoint type: if the pins span far more ground than
    // the track does, the track is a subset of the journey rather than a contradiction of it.
    const span = arr => { if (arr.length < 2) return 0; const la = arr.map(q => q.lat), ln = arr.map(q => q.lng);
      const a = proj(Math.min(...la), Math.min(...ln), la[0]), b = proj(Math.max(...la), Math.max(...ln), la[0]);
      return Math.hypot(b.x - a.x, b.y - a.y); };
    const wpPts = (r.waypoints || []).filter(w => w && Number.isFinite(+w.lat)).map(w => ({ lat: +w.lat, lng: +w.lng }));
    const trackSpan = span(pts), wpSpan = span(wpPts);
    const onTrack = placed - bad.length;
    const partial = onTrack >= 1 && wpSpan > trackSpan * 1.6 && trackSpan > 0;
    findings.push({
      r, bad, placed, trackSpan, wpSpan,
      worst: Math.max(...bad.map(b => b.d)),
      blame: (allMiss && far) ? "TRACK" : partial ? "PARTIAL" : "PIN",
      trackPts: pts.length,
    });
  }
}
findings.sort((a, b) => b.worst - a.worst);
const trackBad = findings.filter(f => f.blame === "TRACK");

console.log(`\nscope "${STATE}" · ${scoped.length} routes · ${withBoth.length} have a REAL track (4+ pts, 500 m+ of extent, not just the pins joined up) and placed waypoints`);
console.log(`${wpChecked} waypoints measured against their own track · ${findings.length} routes disagree`);
// Named, not silently dropped — a guard that cannot measure something has to say so, or its
// coverage looks larger than it is.
if (placeholder.length) {
  console.log(`  ${placeholder.length} route(s) SKIPPED — the gpx is a placeholder, not a track, so no pin can be judged against it:`);
  for (const p of placeholder.slice(0, 10)) {
    console.log(`     ${p.r.id}  (${p.pts} pts spanning ${p.span} m)`);
  }
  if (placeholder.length > 10) console.log(`     … ${placeholder.length - 10} more`);
}
if (derivedFromPins.length) {
  console.log(`  ${derivedFromPins.length} route(s) SKIPPED — the "track" IS this route's own waypoint list joined by`);
  console.log(`     straight lines, so every pin is on it BY CONSTRUCTION and neither answer means anything:`);
  for (const p of derivedFromPins.slice(0, 10)) {
    console.log(`     ${p.r.id}  (${p.pts}-pt line through ${p.pins} pins)`);
  }
  if (derivedFromPins.length > 10) console.log(`     … ${derivedFromPins.length - 10} more`);
}
const partialN = findings.filter(f => f.blame === "PARTIAL").length;
const pinN = findings.length - trackBad.length - partialN;
console.log(`  ${trackBad.length} WRONG TRACK  — every pin misses by >2 km; the line, not the pins, is in the wrong place`);
console.log(`  ${partialN} PARTIAL TRACK — the track covers only part of the journey (usually the climb), so approach pins sit off it legitimately. NOT a defect.`);
console.log(`  ${pinN} PIN           — individual waypoints off an otherwise matching track. This is the list worth fixing.\n`);
for (const f of findings.slice(0, LIMIT)) {
  console.log(`── [${f.blame}] ${f.r.name}  (${f.r.id})  worst ${Math.round(f.worst)} m off · ${f.bad.length}/${f.placed} pins miss · track has ${f.trackPts} pts`);
  for (const b of f.bad.slice(0, 4)) {
    console.log(`     ${String(b.w.type || "?").padEnd(10)} ${JSON.stringify(String(b.w.name || "").slice(0, 40))}  ${Math.round(b.d)} m  (tolerance ${b.tol} m)`);
  }
  console.log("");
}
if (findings.length > LIMIT) console.log(`… ${findings.length - LIMIT} more (raise --limit)\n`);
console.log("Report only — nothing was changed.");
// Injection cases:
//   --inject=snap   every waypoint placed on the track    -> must report 0 routes
//   --inject=shift  every waypoint moved ~1km north       -> must report ~every route
process.exit(0);
