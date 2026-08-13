// Is the trailhead in `approach_logistics` even on the right mountain?
//
// probe-trailhead-vs-logistics.mjs shows the pin and the blob disagreeing on 155 WA routes but
// cannot say WHICH is wrong — both are just coordinates. This one can, for the extreme cases,
// because it measures each claimed trailhead against the route's OWN PEAK, taken from `areas`.
// A trailhead 130 km from the summit is not a judgement call.
//
// It is the same move `trackOffItsPeak` makes in audit-waypoints.mjs: every other test asks "do
// these two records agree?" and therefore cannot name the guilty one. Anchoring on a third,
// independent record settles it.
//
// THE FINGERPRINT THIS EXISTS FOR. The blob looks bulk-filled from a template: one
// `trailheadDirection` string repeats verbatim across routes that share no trailhead at all —
// "From the Staircase Ranger Station trailhead past Lake Cushman (FR-24)" is stamped on Devore
// Peak (Lake Chelan) and La Bohn Peak (Alpine Lakes) as well as on Olympic peaks. So the run
// groups by that string and prints how far apart the peaks wearing it are.
//
// Read-only. node scripts/oneoff/probe-logistics-trailhead-vs-peak.mjs [--state=wa] [--far=25000]
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";

const arg = (n, d) => (process.argv.find(a => a.startsWith(`--${n}=`)) || `--${n}=${d}`).split("=")[1];
const STATE = arg("state", "wa");
const FAR = Number(arg("far", 25000));
const key = requireServiceKey();

const num = v => (v === null || v === undefined || v === "" ? null : Number.isFinite(+v) ? +v : null);
const R = Math.PI / 180;
const hav = (aLat, aLng, bLat, bLng) => {
  const dLat = (bLat - aLat) * R, dLng = (bLng - aLng) * R;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * R) * Math.cos(bLat * R) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(s));
};

/* Warm-up: the first request of a run costs ~3.7s of connection setup and can trip the timeout.
   The areas walk uses the SERVICE key — 47k rows on the anon role's 3s statement_timeout is a
   coin flip, and this read is the anchor the whole probe rests on. */
await selectAll("areas", "id", "id=eq.__warmup_no_such_area__", { pageSize: 1, key });
const areas = await selectAll("areas", "id,name,lat,lng", null, { pageSize: 500, key });
const A = new Map(areas.map(a => [a.id, a]));

const rows = await selectAll("routes", "id,name,area_id,waypoints,approach_logistics",
  `id=like.${STATE}_*`, { pageSize: 80, key });
if (!rows.length || !areas.length) { console.error("read 0 rows — refusing to report"); process.exit(1); }

const findings = [], byDir = new Map();
let checked = 0, noPeak = 0;
for (const r of rows) {
  const al = (r.approach_logistics && typeof r.approach_logistics === "object"
    && !Array.isArray(r.approach_logistics)) ? r.approach_logistics : null;
  if (!al) continue;
  const tLat = num(al.trailheadLat), tLng = num(al.trailheadLng);
  if (tLat === null || tLng === null) continue;

  /* Peak anchor comes from `areas`, NOT from the blob's own peakLat/peakLng. A blob filled from
     the wrong template may carry a wrong peak too, and then it would agree with itself. */
  const a = A.get(r.area_id);
  const pLat = a ? num(a.lat) : null, pLng = a ? num(a.lng) : null;
  if (pLat === null || pLng === null) { noPeak++; continue; }
  checked++;

  const dLog = Math.round(hav(pLat, pLng, tLat, tLng));
  const w = (Array.isArray(r.waypoints) ? r.waypoints : [])
    .find(x => x && String(x.type || "").toLowerCase() === "trailhead"
      && num(x.lat) !== null && num(x.lng) !== null);
  const dPin = w ? Math.round(hav(pLat, pLng, num(w.lat), num(w.lng))) : null;

  const dir = String(al.trailheadDirection || "").replace(/\s+/g, " ").trim();
  if (dir) {
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir).push({ id: r.id, peak: a.name, pLat, pLng });
  }

  if (dLog > FAR) findings.push({ id: r.id, peak: a.name, dLog, dPin,
    logName: al.trailhead, pinName: w ? w.name : null, dir });
}

console.log(`${STATE}: ${checked} routes with approach_logistics coords AND a located area`);
console.log(`   (${noPeak} skipped — their area carries no lat/lng, so nothing can be measured)`);
console.log(`approach_logistics trailhead more than ${(FAR / 1000).toFixed(0)} km from its own peak: ${findings.length}\n`);

findings.sort((a, b) => b.dLog - a.dLog);
for (const f of findings) {
  const verdict = f.dPin === null ? "no pin to compare"
    : f.dPin < f.dLog / 3 ? `PIN IS BETTER (${(f.dPin / 1000).toFixed(1)} km)`
    : `pin is no better (${(f.dPin / 1000).toFixed(1)} km) — BOTH may be wrong`;
  console.log(`${(f.dLog / 1000).toFixed(1).padStart(7)} km  ${f.id}   peak: ${f.peak}`);
  console.log(`          log "${f.logName}"   ->  ${verdict}`);
  if (f.pinName) console.log(`          pin "${f.pinName}"`);
}

/* A trailheadDirection string worn by peaks hundreds of km apart is a template, not a fact. */
console.log(`\n-- trailheadDirection strings shared by routes on DIFFERENT peaks --`);
const shared = [...byDir.entries()].map(([dir, v]) => {
  const peaks = [...new Set(v.map(x => x.peak))];
  let spread = 0;
  for (const p of v) for (const q of v) spread = Math.max(spread, hav(p.pLat, p.pLng, q.pLat, q.pLng));
  return { dir, v, peaks, spread: Math.round(spread) };
}).filter(x => x.peaks.length > 1 && x.spread > FAR).sort((a, b) => b.spread - a.spread);
for (const s of shared) {
  console.log(`\n  ${(s.spread / 1000).toFixed(0)} km apart · ${s.v.length} routes · ${s.peaks.length} peaks`);
  console.log(`  "${s.dir.slice(0, 120)}"`);
  for (const x of s.v) console.log(`     ${x.id}  (${x.peak})`);
}
console.log(`\nNothing was written. Distance from the peak condemns a trailhead only when it is`);
console.log(`absurd; a legitimate approach can start 15 km away. Read the prose before writing.`);
