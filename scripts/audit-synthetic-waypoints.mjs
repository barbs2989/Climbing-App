// Are a route's waypoints REAL positions, or points spaced along a straight line?
//
// `wa_castle_peak_pasayten_scramble` pins "Lightning Creek Trail Junction" at 1,500 ft — on a
// ridge the ground reads at 7,990 ft, 24 km from the peak. `wa_himmelhorn_southeast_route` puts
// all five of its intermediate pins, claiming 5,100-7,400 ft, on ground between 1,191 and 1,612.
// The elevations are right; they were read from the route's own prose. The COORDINATES were
// manufactured by spacing points along the line from the trailhead to the summit, and a straight
// line between a valley and a summit crosses whatever happens to be in between.
//
// THE TEST NEEDS NO ELEVATION DATA AND NO NETWORK BEYOND THE DB. Every intermediate pin lying
// within metres of the segment joining the first and last pin is not something terrain produces:
// a trailhead, a creek ford, a camp and a col are not collinear. Many of these are EXACTLY
// collinear — worst-case perpendicular offset 0 m — which no real survey achieves.
//
// This is the waypoint-level twin of `trackIsJustTheWaypoints` (lib/track.js), which catches a
// TRACK that is merely the pin list joined up. Here the pins themselves are the fabrication, and
// a route can have both: several of these carry genuine 300-500 point tracks alongside
// manufactured pins, so a real track is NOT evidence that the pins are real.
//
// THE ORIGINAL TEST ASKED ONE QUESTION AND MISSED MOST OF THE FABRICATION. It required EVERY
// intermediate pin to be on the first->last line, at least 5 pins, and at least 1,500 ft of
// relief — three gates ANDed, all about the route AS A WHOLE. Measured against WA, that reports
// 62 routes where 188 are defensible. The two shapes it cannot see:
//
//   * PARTIAL fabrication. A real trailhead and a real summit with the middle filled in, or a run
//     of pins interpolated between two interior pins. `wa_mount_thomson_west_ridge` holds pins 2-7
//     on one bearing to six figures while pin 1 is genuine; the whole-route test needs pin 1 on
//     the line too, so it sees nothing. This is the COMMON case, not an edge one.
//   * ONE-AXIS interpolation. The Dorado Needle rows interpolated LONGITUDE alone: latitudes are
//     clean 5-decimal values, longitudes run to 17 decimals. Nothing is collinear in the plane, so
//     no geometric test finds them.
//
// So there are three detectors now, and the third needs no geometry at all:
//
//   A. COMPUTED COORDINATE. A surveyed position is written to 4-6 decimals. `-121.16888095238095`
//      is 17, and that tail is 5/21 — the floating-point residue of dividing a span into equal
//      parts. This is per-PIN, survives partial fabrication, and is not arguable.
//   B. COLLINEAR RUN. Three or more CONSECUTIVE pins holding one exact bearing. Real terrain
//      bends. A run of 4+ stands alone; a run of exactly 3 is reported only when A corroborates
//      it, because three points sit near a line often enough by luck (measured: 19 WA routes).
//   C. WHOLE ROUTE — the original test, kept unchanged so its count stays comparable.
//
// Measured on WA: A and B are independent and agree on 127 routes, which is what makes B usable.
//
// Report-only, exit 0. It says which routes cannot be trusted to navigate by; it does not say
// where the pins should be, because nothing in the row knows that.
//
//   npm run audit:synthetic-waypoints
//   npm run audit:synthetic-waypoints -- --tol 200
import { readFileSync } from "node:fs";

const root = new URL("..", import.meta.url).pathname;
const env = {};
for (const f of [".env.local", ".env"]) {
  try { for (const l of readFileSync(root + f, "utf8").split("\n")) {
    const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !(m[1] in env)) env[m[1]] = m[2].trim(); } } catch {}
}
const URL_ = env.VITE_SUPABASE_URL, KEY = env.VITE_SUPABASE_ANON_KEY;
if (!URL_ || !KEY) { console.error("no Supabase url/anon key — failing closed"); process.exit(1); }

const argv = process.argv.slice(2);
const arg = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const TOL = Number(arg("--tol") || 120);   // m from the line that still counts as "on" it
const MIN_PINS = 5;                        // fewer cannot distinguish a line from a path
const MIN_SPAN_M = 1000;                   // a short span is trivially straight
const MIN_RELIEF = 1500;                   // ft across the pins — the point is that they climb

async function get(p, tries = 5) {
  for (let a = 0; a < tries; a++) {
    try { const r = await fetch(`${URL_}/rest/v1/${p}`, { headers: { apikey: KEY, Authorization: "Bearer " + KEY } });
      if (r.ok) return r.json(); if (a === tries - 1) return { __err: String(r.status) }; }
    catch (e) { if (a === tries - 1) return { __err: e.message }; }
    await new Promise(s => setTimeout(s, 500 * 2 ** a));
  }
}
const hav = (a,b,c,d) => { const p=Math.PI/180,R=6371000,dφ=(c-a)*p,dλ=(d-b)*p;
  const s=Math.sin(dφ/2)**2+Math.cos(a*p)*Math.cos(c*p)*Math.sin(dλ/2)**2; return 2*R*Math.asin(Math.sqrt(s)); };

/** Perpendicular distance in metres from p to segment a-b, on a local flat projection. */
function offSegment(p, a, b) {
  const k = Math.cos(a.lat * Math.PI / 180), R = 6371000 * Math.PI / 180;
  const X = q => [(q.lng - a.lng) * k * R, (q.lat - a.lat) * R];
  const [px, py] = X(p), [bx, by] = X(b);
  const L2 = bx * bx + by * by;
  if (L2 === 0) return Math.hypot(px, py);
  const t = Math.max(0, Math.min(1, (px * bx + py * by) / L2));
  return Math.hypot(px - t * bx, py - t * by);
}

// EVERY discipline, not just the alpine three. The first version filtered to
// alpine/mountaineering/scrambling and missed a `rock` route carrying the same fabrication.
// Waypoints exist on ~1,016 routes and every one of them is WA, so this is the whole population.
//
// KEYSET-PAGINATED, because `limit=3000` DOES NOT DEFEAT PostgREST's server-side max-rows cap.
// The single-query version returned exactly 1000 rows and reported 61 findings where the true
// figure is 63 — and `rows.length` looked entirely healthy, which is the whole problem with a
// silent cap. Hitting a round number exactly is treated as evidence of truncation below.
// `--selftest` proves the two new detectors on CONSTRUCTED pin sets, before any count from the
// live catalog is believed. Both directions matter and the second is the one that decides whether
// this is usable: a detector that also fires on a real winding approach turns 188 findings into
// 188 arguments. Needs no database.
if (argv.includes("--selftest")) {
  const dec = v => { const s = String(v); const i = s.indexOf("."); return i < 0 ? 0 : s.length - i - 1; };
  const lerp = (a, b, t) => ({ lat: a.lat + t * (b.lat - a.lat), lng: a.lng + t * (b.lng - a.lng) });
  const A = { lat: 47.4277, lng: -121.4136 }, B = { lat: 47.4723, lng: -121.3607 };
  const cases = [
    ["fully interpolated run", [A, lerp(A, B, 0.2), lerp(A, B, 0.4), lerp(A, B, 0.7), B], true],
    ["real trailhead+summit, middle filled in",
      [{ lat: 47.40, lng: -121.50 }, lerp(A, B, 0.3), lerp(A, B, 0.5), lerp(A, B, 0.8), { lat: 47.55, lng: -121.20 }], true],
    // A trail that switchbacks: bearing reverses between legs. Deliberately NOT lifted from a live
    // row — the obvious candidates are pins from routes this audit flags, so using one would prove
    // the opposite of what the label claims.
    ["a genuinely winding approach",
      [A, { lat: 47.4380, lng: -121.4010 }, { lat: 47.4402, lng: -121.3880 },
       { lat: 47.4551, lng: -121.3902 }, { lat: 47.4610, lng: -121.3702 }, B], false],
    ["a straight ROAD walk of only 3 pins — must NOT fire alone",
      [A, lerp(A, B, 0.5), B].map(p => ({ lat: +p.lat.toFixed(5), lng: +p.lng.toFixed(5) })), false],
  ];
  let bad = 0;
  for (const [label, P, expect] of cases) {
    const computed = P.filter(p => Math.max(dec(p.lat), dec(p.lng)) > 8).length;
    const slope = (p, q) => (q.lng === p.lng ? Infinity : (q.lat - p.lat) / (q.lng - p.lng));
    let longest = 0, run = 1;
    for (let i = 0; i + 1 < P.length - 1; i++) {
      const s1 = slope(P[i], P[i + 1]), s2 = slope(P[i + 1], P[i + 2]);
      if (Number.isFinite(s1) && Number.isFinite(s2) && Math.abs(s1 - s2) <= Math.abs(s1) * 2e-3) run++;
      else run = 1;
      longest = Math.max(longest, run + (run > 1 ? 1 : 0));
    }
    const fires = computed > 0 || longest >= 4 || (longest >= 3 && computed > 0);
    const ok = fires === expect;
    if (!ok) bad++;
    console.log(`  ${ok ? "ok  " : "FAIL"}  ${label.padEnd(44)} computed=${computed} longestRun=${longest} fires=${fires} expected=${expect}`);
  }
  console.log(bad ? `\n${bad} self-test case(s) failed — the detectors are not measuring what they claim.`
                  : `\nself-test passed: both fabrication shapes are caught and a real winding approach is not.`);
  process.exit(bad ? 1 : 0);
}

let rows = [], page, after = "";
do {
  page = await get(`routes?select=id,discipline,waypoints,gpx&waypoints=not.is.null` +
    `&order=id.asc&limit=1000` + (after ? `&id=gt.${after}` : ""));
  if (page.__err) { console.error("READ FAILED — failing closed:", page.__err); process.exit(1); }
  rows = rows.concat(page);
  if (page.length) after = page[page.length - 1].id;
} while (page.length === 1000);
if (!rows.length) { console.error("READ EMPTY — failing closed"); process.exit(1); }
if (rows.length % 1000 === 0) { console.error(`read exactly ${rows.length} rows — that is a cap, not a catalog. Failing closed.`); process.exit(1); }

let considered = 0;
const hits = [];
for (const r of rows) {
  const wps = (Array.isArray(r.waypoints) ? r.waypoints : []).filter(w => w.lat != null && w.lng != null);
  if (wps.length < MIN_PINS) continue;
  const a = wps[0], b = wps[wps.length - 1];
  const span = hav(a.lat, a.lng, b.lat, b.lng);
  if (span < MIN_SPAN_M) continue;
  considered++;
  const offs = wps.slice(1, -1).map(w => offSegment(w, a, b));
  const elevs = wps.map(w => w.elev).filter(e => e != null);
  const relief = elevs.length >= 2 ? Math.max(...elevs) - Math.min(...elevs) : 0;
  if (offs.every(d => d <= TOL) && relief >= MIN_RELIEF)
    hits.push({ id: r.id, disc: r.discipline, n: wps.length, span: Math.round(span / 1000),
      relief, maxOff: Math.round(Math.max(...offs)),
      track: Array.isArray(r.gpx) ? r.gpx.length : 0 });
}
if (!considered) { console.error("no route had enough pins to judge — failing closed"); process.exit(1); }

// --- A and B: fabrication the whole-route test cannot reach -------------------------------------
// Neither needs MIN_PINS, MIN_RELIEF or the first->last line, because neither asks about the route
// as a whole. A asks about ONE PIN; B asks about a CONSECUTIVE RUN.
const DP_MAX = 8;         // decimals beyond which a coordinate was computed, not measured
const SLOPE_TOL = 2e-3;   // relative agreement of consecutive bearings that counts as one line
const MIN_RUN = 3;
const decimals = v => { const s = String(v); const i = s.indexOf("."); return i < 0 ? 0 : s.length - i - 1; };

const partial = [];
let pinsSeen = 0, computedPins = 0;
for (const r of rows) {
  const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
  const P = wps.map(w => (w && w.lat != null && w.lng != null && !(+w.lat === 0 && +w.lng === 0)
    ? { lat: +w.lat, lng: +w.lng } : null));
  if (!P.some(Boolean)) continue;

  const computed = [];
  for (let i = 0; i < P.length; i++) {
    if (!P[i]) continue;
    pinsSeen++;
    if (Math.max(decimals(wps[i].lat), decimals(wps[i].lng)) > DP_MAX) { computed.push(i); computedPins++; }
  }

  // Maximal runs of consecutive pins holding one bearing. Compare SLOPES rather than distances to
  // a line: a run can be short in extent and still be arithmetic, and slope agreement to 0.2% over
  // three legs is not something a trail does.
  const runs = [];
  const slope = (p, q) => (q.lng === p.lng ? Infinity : (q.lat - p.lat) / (q.lng - p.lng));
  let start = 0;
  for (let i = 0; i + 2 < P.length; i++) {
    if (!P[i] || !P[i + 1] || !P[i + 2]) { start = i + 1; continue; }
    const s1 = slope(P[i], P[i + 1]), s2 = slope(P[i + 1], P[i + 2]);
    if (!(Number.isFinite(s1) && Number.isFinite(s2) && Math.abs(s1 - s2) <= Math.abs(s1) * SLOPE_TOL)) {
      if (i + 2 - start >= MIN_RUN) runs.push([start, i + 1]);
      start = i + 1;
    }
  }
  if (P.length - start >= MIN_RUN && P.slice(start).every(Boolean)) runs.push([start, P.length - 1]);

  const longest = runs.length ? Math.max(...runs.map(([x, y]) => y - x + 1)) : 0;
  // A 3-pin run on its own is luck as often as fabrication — 19 WA routes sit there with no second
  // tell. Require 4, or a computed decimal somewhere on the row to corroborate it.
  const runUsable = longest >= 4 || (longest >= MIN_RUN && computed.length > 0);
  if (!computed.length && !runUsable) continue;
  partial.push({ id: r.id, n: P.length, computed, runs, longest, runUsable,
    whole: hits.some(h => h.id === r.id) });
}

hits.sort((x, y) => x.maxOff - y.maxOff || y.relief - x.relief);
const exact = hits.filter(h => h.maxOff <= 20);

console.log(`${rows.length} routes carry waypoints (every discipline, every state)`);
console.log(`  ${considered} have >=${MIN_PINS} pins spanning >=${MIN_SPAN_M} m — enough to tell a line from a path\n`);
console.log(`=== EVERY INTERMEDIATE PIN ON THE FIRST->LAST LINE (${hits.length}, within ${TOL} m) ===`);
console.log(`Each carries >=${MIN_RELIEF} ft of claimed relief across those pins, so they are not a flat`);
console.log(`traverse that happens to run straight. ${exact.length} are collinear to within 20 m, which is`);
console.log(`not a tolerance question — no real survey places a ford, a camp and a col on one line.\n`);
for (const h of hits)
  console.log(`  ${h.maxOff <= 20 ? "EXACT" : "     "}  ${h.id.padEnd(56)} ${String(h.n).padStart(2)} pins · ` +
    `${String(h.span).padStart(3)} km · ${String(h.relief).padStart(5)} ft relief · off-line <=${String(h.maxOff).padStart(3)} m · track ${h.track} pts`);

// A route can have BOTH fabrications. `trackIsJustTheWaypoints` catches a track that is merely
// the pin list joined up; where that meets a synthetic pin list, the route's entire geometry —
// line and pins alike — was manufactured from one straight line, and nothing on its map is a
// record of anywhere.
const { trackIsJustTheWaypoints } = await import("../lib/track.js");
const byId = Object.fromEntries(rows.map(r => [r.id, r]));
const bothFake = hits.filter(h => {
  const r = byId[h.id], gp = Array.isArray(r.gpx) ? r.gpx : [];
  return gp.length >= 2 && trackIsJustTheWaypoints(gp, r.waypoints);
});
console.log(`\n${bothFake.length} of the ${hits.length} ALSO have a track that is just the pin list joined up —`);
console.log(`line and pins both manufactured, so nothing on those maps records anywhere:`);
for (const h of bothFake) console.log(`  ${h.id}`);

const withTrack = hits.filter(h => h.track >= 100).length;
console.log(`\n${hits.length} of ${considered} routes (${Math.round(100 * hits.length / considered)}%). ` +
  `${withTrack} of them carry a track of 100+ points — a real track is NOT evidence the pins are real.`);

// --- A and B ------------------------------------------------------------------------------------
const newOnes = partial.filter(p => !p.whole);
const withComputed = partial.filter(p => p.computed.length);
const corroborated = partial.filter(p => p.computed.length && p.runUsable);
console.log(`\n=== PARTIALLY FABRICATED (${partial.length}; ${newOnes.length} of them invisible to the test above) ===`);
console.log(`A pin whose coordinate carries more than ${DP_MAX} decimals was computed, not surveyed. A run of`);
console.log(`consecutive pins holding one bearing was laid along a line. Either can happen on a route whose`);
console.log(`trailhead and summit are perfectly real, which is why the whole-route test misses them.\n`);
console.log(`  computed coordinates : ${computedPins} pins of ${pinsSeen} (${(100 * computedPins / pinsSeen).toFixed(1)}%), on ${withComputed.length} routes`);
console.log(`  usable collinear run : ${partial.filter(p => p.runUsable).length} routes`);
console.log(`  BOTH tells agree on  : ${corroborated.length} routes — two independent methods, which is what makes the run test usable\n`);
for (const p of partial.slice(0, 60)) {
  const bits = [];
  if (p.runs.length) bits.push(`run${p.runs.length > 1 ? "s" : ""} ${p.runs.map(([x, y]) => `${x}-${y}`).join(",")}`);
  if (p.computed.length) bits.push(`computed pin${p.computed.length > 1 ? "s" : ""} ${p.computed.join(",")}`);
  console.log(`  ${p.whole ? "also-whole" : "          "}  ${p.id.padEnd(52)} ${String(p.n).padStart(2)} pins · ${bits.join(" · ")}`);
}
if (partial.length > 60) console.log(`  … ${partial.length - 60} more`);

const union = new Set([...hits.map(h => h.id), ...partial.map(p => p.id)]);
console.log(`\n${union.size} routes carry fabricated pins by at least one of the three tests, against ${hits.length}`);
console.log(`the whole-route test finds alone. Read the difference as coverage that was missing, not as`);
console.log(`data that got worse — nothing changed in the catalog, only what this script can see.`);
console.log(`\nreport-only: exit 0 regardless. These routes' pins should not be navigated by.`);
