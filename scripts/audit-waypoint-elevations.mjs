// Does each waypoint sit at the height it says it does?
//
// THE THREE EXISTING WAYPOINT AUDITS ARE ALL TRACK-RELATIVE. `audit:waypoints` and
// `audit:waypoint-track` ask whether a pin is on the route's line; `audit:waypoint-order` asks
// whether the list is sensibly ordered. All of them are answered YES BY CONSTRUCTION on the 201
// of 580 WA routes whose "track" is simply the waypoint list joined up (lib/track.js) — the pin
// is on the line because the line is made of pins.
//
// A waypoint's own `elev` is a second record that owes nothing to any track. The ground says what
// is actually at its coordinate. If those disagree by more than terrain can explain, the pin is
// not where it claims — and that holds for a Junction, a Trailhead, a Campsite or a Hazard, none
// of which any summit-oriented check looks at.
//
// THE THRESHOLD IS HIGH BECAUSE MOST OF THESE ELEVATIONS ARE ESTIMATES, NOT MEASUREMENTS, and
// getting this wrong is how this audit would have shipped a 1,080-pin false finding. Measured
// over 3,506 WA pins, how often `elev` lands on a round 100 ft:
//
//     Summit  3%      Hazard 82%      Campsite 68%      Junction 64%      Water 56%
//
// A summit elevation is surveyed — 3% is roughly chance. A hazard or campsite elevation is a
// round-number guess written by an enrichment pass. Their coordinates are loose too: against the
// 307 routes whose track is NOT merely the pin list, summit pins sit 18 m off it and junction,
// campsite and water pins 118-183 m. On steep ground 150 m of slop plus a rounded guess produces
// a 400 ft disagreement with nothing wrong at all, so a low threshold measures the data's
// inherent precision and calls it a defect. Only a gap far larger than that mechanism can
// manufacture is evidence — nothing innocent puts Camp Schurman 4,883 ft below itself.
//
// USGS 3DEP, 1 m raster, one request per waypoint. Report-only, exit 0.
//
//   npm run audit:waypoint-elevations                 # WA alpine/mountaineering/scrambling
//   npm run audit:waypoint-elevations -- --sample 400 # a random subset, to see the distribution
//   npm run audit:waypoint-elevations -- --type Trailhead
import { readFileSync } from "node:fs";
import { elevationAt, selfTest } from "./lib/terrain.mjs";

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
const SAMPLE = Number(arg("--sample") || 0);
const ONLY = arg("--type");
const CONC = 5;

async function get(p, tries = 5) {
  for (let a = 0; a < tries; a++) {
    try { const r = await fetch(`${URL_}/rest/v1/${p}`, { headers: { apikey: KEY, Authorization: "Bearer " + KEY } });
      if (r.ok) return r.json(); if (a === tries - 1) return { __err: String(r.status) }; }
    catch (e) { if (a === tries - 1) return { __err: e.message }; }
    await new Promise(s => setTimeout(s, 500 * 2 ** a));
  }
}

const rows = await get(`routes?select=id,discipline,waypoints&discipline=in.(alpine,mountaineering,scrambling)&waypoints=not.is.null&limit=3000`);
if (rows.__err || !rows.length) { console.error("READ FAILED / EMPTY — failing closed", rows.__err || ""); process.exit(1); }

let pins = [];
for (const r of rows) for (const w of (Array.isArray(r.waypoints) ? r.waypoints : []))
  if (w && w.lat != null && w.lng != null && w.elev != null)
    pins.push({ route: r.id, type: String(w.type || "?").trim(), name: w.name, lat: w.lat, lng: w.lng, elev: w.elev });
if (ONLY) pins = pins.filter(p => p.type.toLowerCase() === ONLY.toLowerCase());
if (!pins.length) { console.error("no waypoints carry both a coordinate and an elevation — failing closed"); process.exit(1); }

// Deterministic subsample — no Math.random, so two runs of --sample compare like for like.
const all = pins.length;
if (SAMPLE > 0 && SAMPLE < pins.length) {
  const step = pins.length / SAMPLE;
  pins = Array.from({ length: SAMPLE }, (_, i) => pins[Math.floor(i * step)]);
}

console.log(`terrain probe calibration — "no findings" is also what a BROKEN probe prints:`);
try { console.log(await selfTest()); } catch (e) { console.error("\n" + e.message); process.exit(1); }
console.log(`\n${all} waypoints carry both a coordinate and an elevation` +
  (pins.length !== all ? `; sampling ${pins.length} of them` : "") + (ONLY ? ` (type=${ONLY})` : "") + "\n");

let done = 0;
async function work(q) { for (;;) { const p = q.shift(); if (!p) return;
  p.ground = await elevationAt(p.lat, p.lng);
  if (++done % 50 === 0) process.stderr.write(`  ${done}/${pins.length}\r`); } }
const queue = pins.slice();   // NOT `pins` itself — the workers shift() it empty, and then
await Promise.all(Array.from({ length: CONC }, () => work(queue)));  // every result has nowhere to live
process.stderr.write("".padEnd(24) + "\r");

const read = pins.filter(p => p.ground != null);
if (!read.length) { console.error("the DEM answered for NO waypoint — failing closed"); process.exit(1); }
for (const p of read) p.diff = Math.round(p.elev - p.ground);

const q = arr => { const s = arr.slice().sort((a, b) => a - b); return f => s[Math.min(s.length - 1, Math.floor(s.length * f))]; };
const abs = read.map(p => Math.abs(p.diff));
const P = q(abs);
console.log(`|claimed - ground| across ${read.length} waypoints:  median ${P(0.5)} ft · p90 ${P(0.9)} ft · p95 ${P(0.95)} ft · p99 ${P(0.99)} ft · max ${Math.max(...abs)} ft`);
if (read.length < pins.length) console.log(`(${pins.length - read.length} the DEM could not answer for — no evidence, never agreement)`);

console.log(`\nby type:`);
const types = {};
for (const p of read) (types[p.type] ||= []).push(Math.abs(p.diff));
for (const [t, a] of Object.entries(types).sort((x, y) => y[1].length - x[1].length)) {
  const Q = q(a);
  console.log(`  ${t.padEnd(16)} ${String(a.length).padStart(5)}  median ${String(Q(0.5)).padStart(5)} · p90 ${String(Q(0.9)).padStart(5)} · max ${String(Math.max(...a)).padStart(6)} ft`);
}

// `elev` is FEET; a legacy `elevM` in metres exists on the same column family, so a value stored
// in the wrong unit reads exactly like a badly misplaced pin. Separate them, because they need
// opposite repairs — one is a conversion, the other is a coordinate.
const M2FT = 3.280839895;
for (const p of read)
  p.unit = Math.abs(p.elev * M2FT - p.ground) < Math.min(200, Math.abs(p.diff) / 3);
const units = read.filter(p => p.unit);
if (units.length) {
  console.log(`\n=== STORED IN METRES, NOT FEET (${units.length}) ===`);
  console.log(`elev x 3.28 matches the ground, so the COORDINATE is fine and the unit is not.\n`);
  for (const p of units.slice(0, 30))
    console.log(`  ${p.route.padEnd(42)} ${p.type.padEnd(12)} ${p.elev} -> ${Math.round(p.elev * M2FT)} ft, ground ${Math.round(p.ground)}  "${String(p.name || "").slice(0, 34)}"`);
} else console.log(`\nno waypoint looks like a metres-for-feet mix-up.`);

console.log(`\nhow often \`elev\` is a round 100 ft — a measured elevation rarely is, an estimated one usually is:`);
const rnd = {};
for (const p of read) (rnd[p.type] ||= []).push(p.elev % 100 === 0 ? 1 : 0);
console.log("  " + Object.entries(rnd).filter(([, a]) => a.length >= 20)
  .sort((x, y) => y[1].length - x[1].length)
  .map(([t, a]) => `${t} ${Math.round(100 * a.reduce((s, v) => s + v, 0) / a.length)}%`).join(" · "));

console.log(`\npins beyond each threshold — the count falls off where estimate-and-slop stops explaining it:`);
for (const t of [400, 800, 1200, 1600, 2000, 3000])
  console.log(`  >${String(t).padStart(5)} ft   ${String(read.filter(p => Math.abs(p.diff) > t && !p.unit).length).padStart(5)} pins`);

// 2000 ft, not 400. See the header: at 400 this reported 1,080 pins, most of them the data's own
// precision rather than defects. A rounded estimate plus ~150 m of positional slop on steep
// ground reaches 400-600 ft innocently; it does not reach 2,000.
const TOL = Number(arg("--tol") || 2000);
const bad = read.filter(p => Math.abs(p.diff) > TOL && !p.unit).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
const byRoute = {};
for (const p of bad) (byRoute[p.route] ||= []).push(p);
console.log(`\n=== WAYPOINTS MORE THAN ${TOL} ft FROM THE GROUND (${bad.length} pins on ${Object.keys(byRoute).length} routes) ===`);
console.log(`Either the coordinate is wrong or the elev is, and it goes BOTH ways — Camp Schurman's`);
console.log(`9,440 ft is right and its pin is 4,883 ft too low, while Canyon Creek Trailhead's pin is`);
console.log(`right and its 6,760 ft is wrong. Read both before writing either. Grouped by route,`);
console.log(`because a route whose pins came from one bad pass is ONE defect, not ${bad.length}.\n`);
for (const [r, ps] of Object.entries(byRoute).sort((a, b) => b[1].length - a[1].length).slice(0, 40)) {
  console.log(`  ${r}  (${ps.length} pin${ps.length > 1 ? "s" : ""})`);
  for (const p of ps.slice(0, 6))
    console.log(`      ${String(p.diff > 0 ? "+" + p.diff : p.diff).padStart(7)} ft  ${p.type.padEnd(12)} claims ${String(p.elev).padStart(6)}, ground ${String(Math.round(p.ground)).padStart(6)}  "${String(p.name || "").slice(0, 40)}"`);
}
console.log(`\nreport-only: exit 0 regardless. ${Object.keys(byRoute).length} route(s) to read.`);
