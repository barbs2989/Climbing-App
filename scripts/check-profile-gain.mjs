#!/usr/bin/env node
// check:profile-gain — THE GAIN AND LOSS ABOVE THE ELEVATION PROFILE ADD UP, AND GPS JITTER ON STEEP
// GROUND IS NOT COUNTED AS CLIMBING.
//
// lib/elevGain.js is the one place the profile under the route map counts its Gain and Loss. This pins
// what it promises:
//   1. the arithmetic: a climb, a descent, a dip on the way up, the 10 ft threshold on a clean recording;
//   2. Gain minus Loss is the last elevation minus the first (the two figures at the profile's foot);
//   3. the gain is never less than the net climb from the start to the highest point, so the top of a
//      climb is not shaved off by the threshold;
//   4. a recording that is jumpy on one stretch (terrain heights read at wandering GPS points on steep
//      rock) reads close to the real climb, while a clean recording reads exactly what the flat
//      threshold reads. The same case under the FLAT threshold must read far too high: that is the
//      proof this case can fail (Liberty Bell's Beckey Route printed 15,393 ft on 2,372 ft of relief);
//   5. ElevChart counts through lib/elevGain.js, hands it the distances, and keeps no copy of its own.
//
// No database, no browser. Notes: docs/guards/route-page.md.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { elevationGainLoss as gl, gainThresholds, BASE_THRESHOLD_FT } from "../lib/elevGain.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failures = 0;
const t = (name, ok, got) => { if (!ok) { failures++; console.log(`FAIL ${name}${got === undefined ? "" : "  -> " + JSON.stringify(got)}`); } };
const eq = (r, g, l) => Math.abs(r.gain - g) < 1e-6 && Math.abs(r.loss - l) < 1e-6;
// deterministic noise: the guard must not pass on one run and fail on the next
let seed = 11; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

// ── 1. arithmetic ──
t("a steady climb of 1,000 ft", eq(gl([1000, 1250, 1500, 1750, 2000]), 1000, 0), gl([1000, 1250, 1500, 1750, 2000]));
t("a steady descent of 1,000 ft", eq(gl([2000, 1500, 1000]), 0, 1000), gl([2000, 1500, 1000]));
t("up and back", eq(gl([1000, 2000, 1000]), 1000, 1000), gl([1000, 2000, 1000]));
t("a dip on the way up counts both ways", eq(gl([1000, 1500, 1300, 2000]), 1200, 200), gl([1000, 1500, 1300, 2000]));
t("a thousand one-foot rises are 1,000 ft", eq(gl(Array.from({ length: 1001 }, (_, i) => i)), 1000, 0));
t("exactly 10 ft counts", eq(gl([100, 110]), 10, 0), gl([100, 110]));
t("9 ft does not", eq(gl([100, 109]), 0, 0), gl([100, 109]));
t("±4 ft of jitter on a flat walk adds nothing", eq(gl(Array.from({ length: 500 }, (_, i) => 1000 + (i % 2 ? 4 : -4))), 0, 0));
t("one sample, or none, is nothing", eq(gl([5]), 0, 0) && eq(gl([]), 0, 0));
{ const a = Array.from({ length: 400 }, (_, i) => 5000 + i * 5); const r = gl(a); t("the top of a climb is not shaved (0 → 1,995 ft reads 1,995)", eq(r, 1995, 0), r); }

// ── 2 + 3. identity and floor, on random walks, with and without distances ──
{
  let worstId = 0, below = 0;
  for (let k = 0; k < 300; k++) {
    const e = [3000], km = [0];
    for (let i = 1; i < 500; i++) { e.push(e[i - 1] + (rnd() - 0.47) * 70); km.push(km[i - 1] + 0.005 + rnd() * 0.02); }
    for (const dist of [null, km]) {
      const r = gl(e, dist), counted = r.gain > 0 || r.loss > 0;
      if (counted) worstId = Math.max(worstId, Math.abs((r.gain - r.loss) - (e[499] - e[0])));
      if (counted && r.gain < Math.max(...e) - e[0] - 1e-6) below++;
    }
  }
  t("Gain minus Loss is the last elevation minus the first", worstId < 1e-6, worstId);
  t("the gain is never less than the climb from the start to the highest point", below === 0, below);
}

// ── 4. a jumpy stretch ──
{
  // 1,000 ft → 3,000 ft over 5 km, 0.6 km of steep rock where each sample is off by up to ±45 ft, and back.
  const up = [], km = [];
  for (let i = 0; i <= 500; i++) { km.push(i * 0.01); up.push(1000 + i * 4); }
  const clean = [...up, ...up.slice(0, -1).reverse()];
  const kmAll = [...km, ...km.slice(1).map((d) => 5 + d)];
  const noisy = clean.map((v, i) => (kmAll[i] > 4.4 && kmAll[i] < 5.6 ? v + (rnd() - 0.5) * 90 : v));
  const truth = 2000;
  const cl = gl(clean, kmAll), ns = gl(noisy, kmAll), flat = gl(noisy);
  t("a clean recording reads the same with distances as with the flat threshold", eq(cl, truth, truth) && eq(gl(clean), truth, truth), [cl, gl(clean)]);
  // A sharp turnaround is itself a small departure from the local average, so the threshold lifts a
  // little AT the summit of even a perfect recording (26 ft here). It costs nothing: the line above reads exact.
  const cth = gainThresholds(clean, kmAll);
  t("...its threshold is 10 ft on the slopes and stays under 30 ft at the turnaround", cth[100] === BASE_THRESHOLD_FT && cth[900] === BASE_THRESHOLD_FT && Math.max(...cth) < 30, [cth[100], Math.max(...cth)]);
  t(`a recording jumpy on 1.2 km reads within 10% of the real ${truth} ft`, Math.abs(ns.gain - truth) <= 0.1 * truth && Math.abs(ns.loss - truth) <= 0.1 * truth, ns);
  t("PROOF THE CASE CAN FAIL: the flat threshold reads that recording at over 1.5 times the real climb", flat.gain > 1.5 * truth, flat);
  const th = gainThresholds(noisy, kmAll);
  t("the threshold rises only on the jumpy stretch", th[100] === BASE_THRESHOLD_FT && th[500] > 40, [th[100], Math.round(th[500])]);
  t("distances of the wrong length fall back to the flat threshold", eq(gl(noisy, kmAll.slice(1)), flat.gain, flat.loss));
}

// ── 5. the chart counts through lib/elevGain.js ──
{
  const src = fs.readFileSync(path.join(ROOT, "src/components/ElevChart.tsx"), "utf8");
  t("ElevChart imports elevationGainLoss from lib/elevGain.js", /import\s*\{[^}]*\belevationGainLoss\b[^}]*\}\s*from\s*"\.\.\/\.\.\/lib\/elevGain\.js"/.test(src));
  t("ElevChart hands it the distances (km), not the elevations alone", /elevationGainLoss\(\s*pts\s*,[^)]*\bkm\b/.test(src), (src.match(/elevationGainLoss\([^)]*\)/g) || []));
  t("ElevChart keeps no gain arithmetic of its own", !/function\s+elevationGainLoss/.test(src) && !/gain\s*\+=/.test(src));
}

if (failures) { console.log(`\ncheck:profile-gain: ${failures} failure(s)`); process.exit(1); }
console.log("ok — check:profile-gain: the profile's gain and loss add up, and a jumpy stretch is not counted as climbing.");
