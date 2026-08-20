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

const rows = await get(`routes?select=id,discipline,waypoints,gpx&discipline=in.(alpine,mountaineering,scrambling)&waypoints=not.is.null&limit=3000`);
if (rows.__err || !rows.length) { console.error("READ FAILED / EMPTY — failing closed", rows.__err || ""); process.exit(1); }

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

hits.sort((x, y) => x.maxOff - y.maxOff || y.relief - x.relief);
const exact = hits.filter(h => h.maxOff <= 20);

console.log(`${rows.length} alpine/mountaineering/scrambling routes with waypoints`);
console.log(`  ${considered} have >=${MIN_PINS} pins spanning >=${MIN_SPAN_M} m — enough to tell a line from a path\n`);
console.log(`=== EVERY INTERMEDIATE PIN ON THE FIRST->LAST LINE (${hits.length}, within ${TOL} m) ===`);
console.log(`Each carries >=${MIN_RELIEF} ft of claimed relief across those pins, so they are not a flat`);
console.log(`traverse that happens to run straight. ${exact.length} are collinear to within 20 m, which is`);
console.log(`not a tolerance question — no real survey places a ford, a camp and a col on one line.\n`);
for (const h of hits)
  console.log(`  ${h.maxOff <= 20 ? "EXACT" : "     "}  ${h.id.padEnd(56)} ${String(h.n).padStart(2)} pins · ` +
    `${String(h.span).padStart(3)} km · ${String(h.relief).padStart(5)} ft relief · off-line <=${String(h.maxOff).padStart(3)} m · track ${h.track} pts`);

const withTrack = hits.filter(h => h.track >= 100).length;
console.log(`\n${hits.length} of ${considered} routes (${Math.round(100 * hits.length / considered)}%). ` +
  `${withTrack} of them carry a track of 100+ points — a real track is NOT evidence the pins are real.`);
console.log(`\nreport-only: exit 0 regardless. These routes' pins should not be navigated by.`);
