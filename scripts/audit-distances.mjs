// Audit routes.dist_km for internally incoherent approach distances.
//
// Read-only. Prints a report and touches no route data.
//
// The app renders round trip as `roundTripKm = hasDist ? distKm * 2 : null`, so every
// stored value is meant to be ONE WAY. The live data does not honour that uniformly:
// a large minority of rows hold half of a round-trip figure instead, which the app then
// doubles back into the original round trip. Those rows display correctly. Rows that are
// genuinely one-way display correctly too. The two populations are indistinguishable by
// magnitude alone, which is why this script does not — and must not — "normalize" the
// column. See the convention report below for how the two are told apart.
//
// Three things this script deliberately does NOT flag, because each looked like a defect
// and turned out to be real data:
//
//   - A wide min/max spread across one peak's routes. Rainier spans 25x legitimately:
//     Camp Muir and the Carbon River are different trailheads on the same mountain.
//     Spread is reported as context, never as a finding.
//   - A very short approach with big vertical. Johannesburg's NE Buttress gains 4,720 ft
//     in 1.6 km because it rises straight off the Cascade Pass road. Only sub-kilometre
//     approaches on remote peaks are worth a look.
//   - Approach prose that mentions a washout. WA approach text is current and specific
//     about road closures (Dosewallips since 2002, FS 37 since 2021, Suiattle FR 26
//     gated short of Downey Creek). Mentioning a closure is a sign of quality, not staleness.
//
// Query shape: routes are fetched by `area_id=in.(...)` in chunks. Filtering on
// `dist_km=not.is.null` instead scans the whole 200k-row routes table on an unindexed
// column and dies on the anon role's 3s statement_timeout with a 57014.

import { selectAll, SUPABASE_URL, anonKey, headers } from "./lib/supabase-env.mjs";

const KM_PER_MI = 1.60934;

// A value "lands on" whole miles if it is within this tolerance of an integer. Tight
// enough that a random 1-2 decimal km value hits it only ~4% of the time, so a population
// well above that rate is evidence of a mile-derived origin rather than coincidence.
const MILE_TOL = 0.02;

// Accept both `--state wa` and `--state=wa`. audit:identity documents the space form,
// and a flag that silently ignores the documented spelling would audit WA while the
// caller believed they had asked for another state.
const args = process.argv.slice(2);
function flagValue(name, fallback) {
  const eq = args.find(a => a.startsWith(`--${name}=`));
  if (eq) return eq.slice(name.length + 3);
  const i = args.indexOf(`--${name}`);
  if (i !== -1 && args[i + 1] && !args[i + 1].startsWith("--")) return args[i + 1];
  return fallback;
}
const stateArg = String(flagValue("state", "wa")).toLowerCase();
const verbose = args.includes("--verbose");

const toMi = km => Number(km) / KM_PER_MI;
const isWhole = (x, tol = MILE_TOL) => Math.abs(x - Math.round(x)) < tol;
const pad = (s, n) => String(s).padStart(n);

// `path` is an ltree column, so PostgREST cannot LIKE it — fetch areas and filter here.
// The id-prefix fallback catches legacy ids (`stuart_west_ridge`) that predate state
// scoping and would otherwise be dropped from any coverage percentage.
const allAreas = await selectAll("areas", "id,name,path,area_type", null, { pageSize: 1000 });
const areas = allAreas.filter(a =>
  String(a.path || "").split(".").includes(stateArg) || String(a.id || "").startsWith(stateArg + "_"));
if (!areas.length) {
  console.error(`No areas found for state "${stateArg}".`);
  process.exit(1);
}
const areaById = new Map(areas.map(a => [a.id, a]));

const COLS = "id,name,area_id,dist_km,gain_ft,discipline,source";
const routes = [];
const ids = areas.map(a => a.id);
for (let i = 0; i < ids.length; i += 80) {
  const chunk = ids.slice(i, i + 80).map(x => `"${x}"`).join(",");
  const url = `${SUPABASE_URL}/rest/v1/routes?select=${COLS}&area_id=in.(${encodeURIComponent(chunk)})&limit=2000`;
  const res = await fetch(url, { headers: headers(anonKey()) });
  if (!res.ok) throw new Error(`GET routes chunk ${i} -> ${res.status} ${(await res.text()).slice(0, 200)}`);
  routes.push(...await res.json());
}

const withDist = routes.filter(r => r.dist_km != null && Number(r.dist_km) > 0);
const peakOf = r => areaById.get(r.area_id)?.name || r.area_id;

console.log(`${stateArg.toUpperCase()}: ${areas.length} areas, ${routes.length} routes, ${withDist.length} with a distance\n`);

// ---------------------------------------------------------------------------
// 1. Which convention is each row in?
// ---------------------------------------------------------------------------
const oneWay = [], halfRT = [], neither = [];
for (const r of withDist) {
  if (isWhole(toMi(r.dist_km))) oneWay.push(r);
  else if (isWhole(toMi(r.dist_km) * 2)) halfRT.push(r);
  else neither.push(r);
}
console.log("=== stored convention ===");
console.log(`  ${pad(oneWay.length, 5)}  value is a whole number of miles one-way`);
console.log(`  ${pad(halfRT.length, 5)}  only the DOUBLED value is whole miles -> stored as half a round trip`);
console.log(`  ${pad(neither.length, 5)}  neither (km-native source, or an odd figure)`);
console.log("  Both of the first two display correctly. Do not transform this column in bulk.\n");

// ---------------------------------------------------------------------------
// 2. Suspect: long enough that the doubled figure is a hard day, and NOT explained
//    by the half-round-trip convention.
// ---------------------------------------------------------------------------
const LONG_RT_KM = 64; // ~40 mi round trip
const suspect = withDist
  .filter(r => Number(r.dist_km) * 2 > LONG_RT_KM && !isWhole(toMi(r.dist_km) * 2))
  .sort((a, b) => Number(b.dist_km) - Number(a.dist_km));
console.log(`=== ${suspect.length} long approaches not explained by the half-round-trip convention ===`);
console.log("  Each needs its trailhead identified before any edit; several are genuinely remote.");
for (const r of (verbose ? suspect : suspect.slice(0, 20))) {
  console.log(`  ${pad(r.dist_km, 7)} km one-way -> ${pad((Number(r.dist_km) * 2).toFixed(1), 6)} km RT` +
    ` (${pad((toMi(r.dist_km) * 2).toFixed(1), 5)} mi)  ${peakOf(r)} / ${r.name}`);
}
if (!verbose && suspect.length > 20) console.log(`  … ${suspect.length - 20} more (--verbose to list all)`);
console.log("");

// ---------------------------------------------------------------------------
// 3. Rows whose distance cannot describe their own location.
//    A sub-kilometre approach is only incoherent when the route is not roadside, so this
//    keys off discipline rather than distance alone: a boulder problem carrying an alpine
//    peak's area_id is a filing error, not a short approach.
// ---------------------------------------------------------------------------
const NON_ALPINE = new Set(["bouldering", "sport", "toprope", "gym"]);
const misfiled = withDist.filter(r =>
  NON_ALPINE.has(String(r.discipline || "").toLowerCase()) &&
  areaById.get(r.area_id)?.area_type === "peak");
console.log(`=== ${misfiled.length} non-alpine routes carrying a peak's area_id ===`);
console.log("  A hypothesis, not a verdict: confirm the row against its own overview before acting.");
for (const r of misfiled) {
  console.log(`  ${pad(r.dist_km, 6)} km  ${r.discipline}  ${peakOf(r)} / ${r.name}  [${r.id}]` +
    `${r.source ? "" : "  source:null"}`);
}
console.log("");

// ---------------------------------------------------------------------------
// 4. Per-peak spread — context only. Never treat a high ratio as a finding.
// ---------------------------------------------------------------------------
const byPeak = new Map();
for (const r of withDist) {
  if (!byPeak.has(r.area_id)) byPeak.set(r.area_id, []);
  byPeak.get(r.area_id).push(Number(r.dist_km));
}
const spread = [];
for (const [aid, ds] of byPeak) {
  if (ds.length < 2) continue;
  const mn = Math.min(...ds), mx = Math.max(...ds);
  if (mx / mn >= 2.5) spread.push({ peak: areaById.get(aid)?.name || aid, mn, mx, n: ds.length, ratio: mx / mn });
}
spread.sort((a, b) => b.ratio - a.ratio);
console.log(`=== ${spread.length} peaks whose routes disagree >=2.5x on distance (context, not defects) ===`);
for (const s of spread.slice(0, verbose ? spread.length : 10)) {
  console.log(`  ${pad(s.ratio.toFixed(1), 6)}x  ${s.mn}-${s.mx} km  n=${s.n}  ${s.peak}`);
}
if (!verbose && spread.length > 10) console.log(`  … ${spread.length - 10} more (--verbose to list all)`);

console.log(`\nNothing was written. ${suspect.length + misfiled.length} rows warrant a look.`);
