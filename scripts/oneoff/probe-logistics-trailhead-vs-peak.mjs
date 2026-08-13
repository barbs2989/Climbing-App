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
// TWO RESULTS FROM RUNNING IT THAT ARE WORTH MORE THAN THE FINDINGS.
//
// 1. THE CONTAMINATION RUNS IN ONE DIRECTION ONLY. The MIRROR section asks the opposite question —
//    is the WAYPOINT PIN the far one, with approach_logistics closer? Across WA the answer is
//    ZERO. So when the two records disagree at this scale the blob is the wrong one every time,
//    and the pin is the record to trust. That is a measured asymmetry, not an assumption, and it
//    is why #886 clears the blob and falls back to the pin rather than the reverse.
//
// 2. THE "SHARED trailheadDirection" GROUPING IS NOT A CONTAMINATION DETECTOR, and shipping it as
//    one would have been wrong. The idea was that a direction string repeating verbatim across
//    distant peaks is a bulk-fill template. Measured, it is mostly LEGITIMATE: "From the Ross Dam
//    Trailhead on SR-20 near milepost 134" really is the access for ten routes across the whole
//    Picket Range and Ross Lake; the Lady of the Lake ferry to Stehekin really does serve Flora,
//    Trapper and Tupshin; Monument Creek really does serve six Pasayten peaks. Remote wilderness
//    peaks SHARE one distant trailhead — that is what remote means. The section is printed as
//    context only and is deliberately NOT counted. Every route repaired in #886 was condemned by
//    distance to its own peak, never by this grouping. Measure a detector's precision before
//    trusting it, the lesson audit-area-parents already records.
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

/* 57014 on these reads is intermittent — heavy jsonb over thousands of rows, and the failure moves
   between runs, so it is contention rather than a page size to tune down. Retry with backoff and
   PRINT when it fires: absorbing a retry silently turns a measurable flake into an invisible one.
   Same reasoning check:field-renders records. */
const withRetry = async (label, fn, tries = 5) => {
  for (let i = 1; i <= tries; i++) {
    try {
      const v = await fn();
      if (i > 1) console.log(`(${label} succeeded on attempt ${i})`);
      return v;
    } catch (e) {
      if (i === tries) throw e;
      console.log(`(${label} attempt ${i} failed: ${String(e.message).slice(0, 80)} — retrying)`);
      await new Promise(r => setTimeout(r, 800 * 2 ** (i - 1)));
    }
  }
};

/* Warm-up: the first request of a run costs ~3.7s of connection setup and can trip the timeout.
   The areas walk uses the SERVICE key — 47k rows on the anon role's 3s statement_timeout is a
   coin flip, and this read is the anchor the whole probe rests on. */
await selectAll("areas", "id", "id=eq.__warmup_no_such_area__", { pageSize: 1, key });
const areas = await withRetry("areas", () => selectAll("areas", "id,name,lat,lng", null, { pageSize: 500, key }));
const A = new Map(areas.map(a => [a.id, a]));

const rows = await withRetry("routes", () => selectAll("routes",
  "id,name,area_id,waypoints,approach_logistics", `id=like.${STATE}_*`, { pageSize: 80, key }));
if (!rows.length || !areas.length) { console.error("read 0 rows — refusing to report"); process.exit(1); }

const findings = [], mirror = [], byDir = new Map();
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
  /* THE MIRROR CASE. Everything above asks whether the BLOB is on the wrong mountain; the pin can
     be contaminated the same way, and that one is worse — the pin drives the waypoint list, the
     GPX map and the crag Overview button, so it is visible in three places rather than one. */
  if (dPin !== null && dPin > FAR && dLog < dPin / 3) mirror.push({ id: r.id, peak: a.name,
    dPin, dLog, pinName: w.name, logName: al.trailhead });
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

console.log(`\n-- MIRROR: the WAYPOINT PIN is the far one and approach_logistics is closer (${mirror.length}) --`);
console.log(`   Worse than the above when it happens: the pin drives the waypoint list, the GPX map`);
console.log(`   and the crag Overview button, so a wrong one is visible in three places.\n`);
mirror.sort((a, b) => b.dPin - a.dPin);
for (const f of mirror) {
  console.log(`${(f.dPin / 1000).toFixed(1).padStart(7)} km  ${f.id}   peak: ${f.peak}`);
  console.log(`          pin "${f.pinName}"`);
  console.log(`          log "${f.logName}" is ${(f.dLog / 1000).toFixed(1)} km — closer`);
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
