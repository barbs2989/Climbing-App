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
// --ground ASKS THE TERRAIN TO SET THE TOLERANCE INSTEAD OF FIXING IT AT 2,000 ft.
//
// The flat number is right about the mechanism and blunt about the answer: 2,000 ft is what steep
// ground plus a rounded guess can manufacture, so it is the correct bound ON STEEP GROUND and far
// too loose everywhere else. Nothing innocent puts a camp 800 ft above a valley floor that varies
// by 160 ft across the whole radius of its own uncertainty.
//
// So bound the uncertainty and ask what it can actually explain here. A pin's true position lies
// within its ROUNDING box (a coordinate at 2 dp is one of many points that round to it, ~+/-550 m)
// plus the PLACEMENT slop measured above (~183 m, 40 m for a surveyed summit). Sample the ground
// across that box: those are the heights this pin could hold with nothing wrong. A claim outside
// them is not explained by the mechanism the 2,000 ft allows for.
//
// MEASURED BEFORE SHIPPING, and the measurement corrected itself twice. Over a 208-pin sample, the
// box built from ROUNDING ALONE reported 23 attributable disagreements; folding in the placement
// slop measured in the paragraph above took that to 7. A first pass would have over-reported 3x,
// and what caught it was reading that paragraph rather than trusting the new instrument. It also
// killed the hypothesis that prompted it — a rounded coordinate (<=2 dp, 100 of 4,196 WA pins)
// looked like a fabrication fingerprint beside the long decimal tail and the collinear run, and is
// not one: coarse pins fail this at 4.1% against precise pins' 2.7%.
//
// THE CENSUS, not that sample: 1,253 of 3,495 pins are near enough the threshold to qualify, and
// **249 pins on 166 routes** land beyond what their own terrain can explain — **151 of them
// invisible to the flat 2,000 ft tolerance**. The 208-pin sample had estimated ~133 and ~114, so
// quote the run and never the extrapolation. Its top finding is Camp Schurman, which the paragraph
// above already names, so where the two tests overlap they agree.
//
// The grid UNDER-states a box's true range, and understating it manufactures findings, so a box
// too rugged for 9 points to describe is reported as NOT ATTRIBUTABLE rather than as clean or as a
// defect. Costs 8 extra requests per pin, over pins that can possibly qualify — hence opt-in, and
// compose it with --sample on a first run.
//
// USGS 3DEP, 1 m raster, one request per waypoint. Report-only, exit 0.
//
//   npm run audit:waypoint-elevations                 # WA alpine/mountaineering/scrambling
//   npm run audit:waypoint-elevations -- --sample 400 # a random subset, to see the distribution
//   npm run audit:waypoint-elevations -- --type Trailhead
//   npm run audit:waypoint-elevations -- --ground     # terrain sets the tolerance, not a constant
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
const GROUND = argv.includes("--ground");
const CONC = 5;

// --- the terrain-set tolerance, as a pure function so it can be proven without a network ---
// Placement slop in metres, from this file's own measurement above. A summit is surveyed; a
// junction, campsite or hazard elevation is a hand-placed guess. Taking the TOP of the measured
// 118-183 m band deliberately: over-stating the uncertainty errs toward silence, and a report that
// flags correct work is one people learn to ignore.
const SLOP_M = t => /summit|topout/i.test(String(t || "")) ? 40 : 183;
const FLOOR_FT = 250;        // below this a gap is inside the 9-point grid's own noise
const RELIEF_SHARE = 0.5;    // ...and inside terrain this rugged, the grid has missed the extremes
const FLAT_ENOUGH = 800;     // a box rougher than this is not described by 9 points at all
const MIN_GAP = 500;
const dpOf = v => { const s = String(v); const i = s.indexOf("."); return i < 0 ? 0 : s.length - i - 1; };

// Deliberately NOT exported. This file opens with top-level await against the database, so an
// import to reach one pure function would run the whole audit — an attractive nuisance. The
// self-test below runs on every --ground invocation instead, which is where it gets read anyway.
/** { gap, relief, attributable } — gap is 0 when the box explains the claim. */
function boxVerdict(elevRaw, samples) {
  const elev = Number(elevRaw);
  const known = samples.filter(v => v != null).map(Number);
  if (known.length < 7) return { gap: null, relief: null, attributable: false, note: `read ${known.length}/9` };
  const lo = Math.min(...known), hi = Math.max(...known), relief = hi - lo;
  const margin = Math.max(FLOOR_FT, RELIEF_SHARE * relief);
  const gap = elev < lo - margin ? lo - margin - elev : elev > hi + margin ? elev - (hi + margin) : 0;
  return { lo, hi, relief, margin, gap, attributable: gap >= MIN_GAP && relief < FLAT_ENOUGH };
}

/** The 9 points bounding what rounding and placement slop together could explain. */
function boxGrid(lat, lng, type) {
  const M_LAT = 111320, cos = Math.cos(lat * Math.PI / 180);
  const halfLat = (0.5 * 10 ** -dpOf(lat) * M_LAT + SLOP_M(type)) / M_LAT;
  const halfLng = (0.5 * 10 ** -dpOf(lng) * M_LAT * cos + SLOP_M(type)) / (M_LAT * cos);
  const pts = [];
  for (const dy of [-1, 0, 1]) for (const dx of [-1, 0, 1]) if (dy || dx) pts.push([lat + dy * halfLat, lng + dx * halfLng]);
  return pts;   // 8 — the centre is already read by the main pass
}

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
// EVERY route, not the worst 40. A truncated list reads as the whole finding — cross-referencing
// this against the structural audit to size the caption's blind spot silently measured 40 routes
// and would have reported that fraction as the answer. `check:field-renders` records the same
// rule: a cap that is not announced is indistinguishable from complete coverage.
for (const [r, ps] of Object.entries(byRoute).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${r}  (${ps.length} pin${ps.length > 1 ? "s" : ""})`);
  for (const p of ps.slice(0, 6))
    console.log(`      ${String(p.diff > 0 ? "+" + p.diff : p.diff).padStart(7)} ft  ${p.type.padEnd(12)} claims ${String(p.elev).padStart(6)}, ground ${String(Math.round(p.ground)).padStart(6)}  "${String(p.name || "").slice(0, 40)}"`);
}
if (GROUND) {
  // The verdict logic is proven with no network first. Its expected output over a healthy catalog
  // is "almost nothing", which is exactly what a broken one prints — so make it fail on demand
  // before believing a quiet run. Both directions: the rugged and inside-the-box cases must stay
  // SILENT, or this reports the data's own precision as a defect the way the 400 ft threshold did.
  const CASES = [
    ["flat box, claim far above",   6000, [4300, 4340, 4380, 4400, 4420, 4440, 4460, 4480, 4500], true],
    ["flat box, claim far below",   4000, [7100, 7150, 7200, 7250, 7300, 7350, 7400, 7420, 7440], true],
    // A REAL 600 ft gap that is disqualified ONLY by the box being too rugged to describe. Written
    // first as elev 6000 against this box, where the claim lands INSIDE it — so the case passed
    // while never exercising the relief gate at all. An assertion that holds for the wrong reason
    // is the same false comfort as an injection that passes out of frame.
    ["real gap, but RUGGED box",    7700, [3800, 4200, 4600, 5000, 5400, 5800, 5900, 5950, 6000], false],
    ["claim inside the box",        5200, [5000, 5050, 5100, 5150, 5200, 5250, 5300, 5350, 5400], false],
    ["outside, but inside margin",  5600, [5000, 5100, 5200, 5250, 5300, 5350, 5380, 5400, 5420], false],
    ["gap present but under 500",   5900, [5000, 5100, 5200, 5250, 5300, 5350, 5380, 5400, 5420], false],
  ];
  const fails = [];
  for (const [label, elev, samples, want] of CASES) {
    const v = boxVerdict(elev, samples);
    if (v.attributable !== want) fails.push(`  ${label}: wanted ${want}, got ${v.attributable} (gap ${v.gap}, relief ${v.relief})`);
  }
  // "no evidence" and "no defect" must not be the same value, or an unreadable box reads as clean.
  const blind = boxVerdict(6000, [4300, 4340, null, null, null, null, null, null, null]);
  if (blind.gap !== null || blind.attributable) fails.push(`  unreadable box did not fail closed: ${JSON.stringify(blind)}`);
  if (fails.length) { console.error(`\n--ground verdict logic is not trustworthy:\n${fails.join("\n")}`); process.exit(1); }
  console.log(`\n--ground verdict logic: ${CASES.length + 1}/${CASES.length + 1} self-tests pass`);

  // A pin nearer the ground than the margin floor can NEVER qualify: the centre reading lies inside
  // [lo,hi] by construction, so a claim above `hi` is at least `margin` above the centre too, and
  // margin is never below FLOOR_FT. So this pre-filter is exact rather than a sampling shortcut —
  // it discards no possible finding, and it is what keeps the request count survivable.
  const cands = read.filter(p => Math.abs(p.diff) > FLOOR_FT && !p.unit);
  console.log(`${cands.length} of ${read.length} pins are far enough from the ground to possibly qualify` +
    ` (${cands.length * 8} extra DEM requests)\n`);

  let n = 0;
  async function box(q) { for (;;) { const p = q.shift(); if (!p) return;
    const vals = [];
    for (const [y, x] of boxGrid(Number(p.lat), Number(p.lng), p.type)) vals.push(await elevationAt(y, x, 3));
    p.box = boxVerdict(p.elev, [...vals, p.ground]);
    if (++n % 25 === 0) process.stderr.write(`  ${n}/${cands.length}\r`); } }
  const bq = cands.slice();
  await Promise.all(Array.from({ length: CONC }, () => box(bq)));
  process.stderr.write("".padEnd(24) + "\r");

  const unread = cands.filter(p => p.box.gap === null);
  const hits = cands.filter(p => p.box.attributable).sort((a, b) => b.box.gap - a.box.gap);
  const rough = cands.filter(p => p.box.gap > 0 && !p.box.attributable);

  // Grouped by route for the reason the flat section already gives: a route whose pins came from
  // one bad enrichment pass is ONE defect, not N, and a per-pin list overstates the work.
  const gRoute = {};
  for (const p of hits) (gRoute[p.route] ||= []).push(p);
  console.log(`\n=== BEYOND WHAT THE TERRAIN CAN EXPLAIN (${hits.length} pins on ${Object.keys(gRoute).length} routes) ===`);
  console.log(`The box is everywhere this pin could truly be. A claim outside it is not accounted for`);
  console.log(`by the rounded-estimate-plus-slop mechanism the flat ${TOL} ft tolerance allows for.`);
  console.log(`WHICH record is wrong is not decided here — read both, as above. And no repair follows`);
  console.log(`from this alone: where the named place's published height matches the stored elev, the`);
  console.log(`COORDINATE is the bad half, and a pin with no source stays where it is.\n`);
  for (const [r, ps] of Object.entries(gRoute).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${r}  (${ps.length} pin${ps.length > 1 ? "s" : ""})`);
    for (const p of ps.sort((a, b) => b.box.gap - a.box.gap)) {
      const seen = Math.abs(p.diff) > TOL ? "" : `  [invisible to the flat ${TOL} ft test]`;
      console.log(`      ${String(Math.round(p.box.gap)).padStart(5)} ft beyond  ${p.type.padEnd(12)} claims ${String(p.elev).padStart(6)}, box spans ${Math.round(p.box.lo)}-${Math.round(p.box.hi)} (relief ${Math.round(p.box.relief)})  "${String(p.name || "").slice(0, 34)}"${seen}`);
    }
  }
  console.log(`\nNOT ATTRIBUTABLE (${rough.length}): the box is too rugged for 9 points to describe, or the`);
  console.log(`gap is inside the grid's own noise. Reported rather than dropped — silent truncation`);
  console.log(`reads as coverage. ${unread.length} box(es) the DEM could not answer for.`);
  const unseen = hits.filter(p => Math.abs(p.diff) <= TOL).length;
  console.log(`\n${unseen} of ${hits.length} would not have been reported by the flat ${TOL} ft tolerance.`);
}

console.log(`\nreport-only: exit 0 regardless. ${Object.keys(byRoute).length} route(s) to read.`);
