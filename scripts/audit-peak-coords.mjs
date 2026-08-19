// Does every peak's stored coordinate sit at the height that peak claims to be?
//
// `audit:summit-pins` can only see a peak where TWO records disagree. A peak whose
// `areas.lat/lng` is wrong and that has no summit waypoint — 25 routes in scope have none — is
// invisible to it, and so is one whose pin was copied FROM the wrong coordinate. That is the
// blind spot that let one trailhead's position sit on three summits.
//
// This needs no second record. The peak states its own `elevation_ft`; the ground states what
// is actually at `lat/lng`. If those disagree by more than the terrain can explain, the
// coordinate is not on the peak — whatever any other record says.
//
// ONE request per peak, deliberately. The expensive ring test that proves a point is a local
// MAXIMUM (lib/terrain.mjs) is ~9x the cost, so it runs only on what this screen flags. Cheap
// global check first, expensive confirmation second.
//
// Report-only, exit 0. `areas.elevation_ft` can itself be wrong, so a flag is a question about
// a PAIR of fields, not a verdict on the coordinate.
//
//   npm run audit:peak-coords                 # WA (default)
//   npm run audit:peak-coords -- --state co
//   npm run audit:peak-coords -- --verify     # ring-test the flagged ones too
import { readFileSync } from "node:fs";
import { elevationAt, summitProbe, selfTest } from "./lib/terrain.mjs";

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
const STATE = (arg("--state") || "wa").toLowerCase();
const VERIFY = argv.includes("--verify");
const CONC = 5;                       // polite to a public federal service

async function get(p, tries = 5) {
  for (let a = 0; a < tries; a++) {
    try { const r = await fetch(`${URL_}/rest/v1/${p}`, { headers: { apikey: KEY, Authorization: "Bearer " + KEY } });
      if (r.ok) return r.json(); if (a === tries - 1) return { __err: String(r.status) }; }
    catch (e) { if (a === tries - 1) return { __err: e.message }; }
    await new Promise(s => setTimeout(s, 500 * 2 ** a));
  }
}

const peaks = await get(`areas?select=id,name,lat,lng,elevation_ft,route_count&area_type=eq.peak` +
  `&id=like.${STATE}_*&lat=not.is.null&elevation_ft=not.is.null&limit=5000`);
if (peaks.__err) { console.error("READ FAILED — failing closed:", peaks.__err); process.exit(1); }
if (!peaks.length) { console.error(`no ${STATE.toUpperCase()} peaks with a coordinate AND an elevation — failing closed`); process.exit(1); }

console.log(`terrain probe calibration — the expected result below is "no findings", which is also`);
console.log(`what a BROKEN probe prints, so it is proved able to fail before anything is believed:`);
try { console.log(await selfTest()); }
catch (e) { console.error("\n" + e.message); process.exit(1); }

console.log(`\n${peaks.length} ${STATE.toUpperCase()} peaks carry both a coordinate and an elevation.\n`);

const results = [];
let done = 0;
async function work(queue) {
  for (;;) {
    const p = queue.shift(); if (!p) return;
    const dem = await elevationAt(p.lat, p.lng);
    results.push({ ...p, dem, diff: dem == null ? null : Math.round(p.elevation_ft - dem) });
    if (++done % 50 === 0) process.stderr.write(`  ${done}/${peaks.length}\r`);
  }
}
const queue = peaks.slice();
await Promise.all(Array.from({ length: CONC }, () => work(queue)));
process.stderr.write("".padEnd(24) + "\r");

const read = results.filter(r => r.dem != null);
const unread = results.length - read.length;
if (!read.length) { console.error("the DEM answered for NO peak — failing closed"); process.exit(1); }

// Pick the threshold from the measured distribution rather than guessing at one.
const diffs = read.map(r => Math.abs(r.diff)).sort((a, b) => a - b);
const pc = q => diffs[Math.min(diffs.length - 1, Math.floor(diffs.length * q))];
console.log(`|claimed - ground| across ${read.length} peaks:  median ${pc(0.5)} ft · p90 ${pc(0.9)} ft · ` +
  `p95 ${pc(0.95)} ft · p99 ${pc(0.99)} ft · max ${diffs[diffs.length - 1]} ft`);
if (unread) console.log(`(${unread} peak(s) the DEM could not answer for — counted as no evidence, never as agreement)`);

const TOL = 400;   // ft. Comfortably past p99 on WA; a summit coordinate off by a few tens of
                   // metres on steep ground still reads within this, so a flag is real relief.
                   //
                   // DO NOT LOWER THIS EXPECTING MORE BUGS — measured, and the answer is no.
                   // At 150 ft the tail is 21 peaks, and 17 of them are Stuart, Shuksan,
                   // Forbidden, Goode, Little Tahoma, Logan, Luna, Inspiration and friends,
                   // whose claimed elevations are all CORRECT. A grid search around them finds
                   // the true summit 35-100 m away, matching the stored elevation to ~40 ft:
                   // Forbidden's is 35 m out, Little Tahoma's 70 m. That is one phenomenon —
                   // a coordinate slightly off the top on very steep ground — not 17 defects.
                   //
                   // Snapping them to the DEM maximum was considered and REJECTED. It would
                   // DERIVE a new coordinate rather than copy an existing record, which is the
                   // safety property every repair in this family has relied on; the gain is
                   // ~50 m on peaks already essentially right; the method missed on 1 of the 3
                   // tested (Goode, 66 ft out); and on glaciated summits the raster's date and
                   // 1 m resolution stop being more authoritative than the survey elevation.
                   //
                   // The other 4 in that tail are ELEVATION questions, not coordinate ones —
                   // their coordinate IS a local maximum. None is actionable either: each peak's
                   // summit pin carries an elevation that is an exact COPY of elevation_ft
                   // (Lemah Two 7280/7280, Nooksack Tower 8285/8285, Lemah Mountain 7519/7519,
                   // Chimney Rock 7727/7727), so there is no independent second record, and a
                   // DEM sample must not overwrite a surveyed elevation.
const flagged = read.filter(r => Math.abs(r.diff) > TOL).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

console.log(`\n=== COORDINATE IS NOT AT THE CLAIMED HEIGHT (${flagged.length}, >${TOL} ft) ===`);
console.log(`The peak says how high it is and the ground says what is at its coordinate. Either the`);
console.log(`coordinate is off the summit, or elevation_ft is wrong. Read both before writing either.\n`);
for (const f of flagged)
  console.log(`  ${String(f.diff > 0 ? "-" + f.diff : "+" + -f.diff).padStart(7)} ft  ${f.id.padEnd(38)} ` +
    `claims ${String(f.elevation_ft).padStart(6)} ft, ground reads ${String(Math.round(f.dem)).padStart(6)} ft   ${f.name}`);

if (VERIFY && flagged.length) {
  console.log(`\n=== RING TEST on the ${flagged.length} flagged ===`);
  console.log(`A coordinate below its claimed height might still be the summit if the whole peak is`);
  console.log(`mis-measured. A coordinate that is not a local MAXIMUM is not a summit either way.\n`);
  for (const f of flagged) {
    const t = await summitProbe(f.lat, f.lng);
    console.log(`  ${f.id.padEnd(38)} ${String(Math.round(t.centre ?? NaN)).padStart(6)} ft  ` +
      `${t.isMax === null ? "no evidence" : t.isMax ? "local maximum — coordinate is ON a summit, so check elevation_ft"
        : `${t.note} — NOT a summit`}`);
  }
}

console.log(`\nreport-only: exit 0 regardless. ${flagged.length} thing(s) to read.`);
