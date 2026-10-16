// KEPT SO NOBODY REBUILDS IT — the same reason measure-foreign-camp-lists.mjs is kept.
//
// audit:camp-route-fit can only judge a camp whose name carries a distinctive UNIQUE peak, which is
// 314 of 5,069 pairs (6.2%). Geocoding the camp NAME removes that requirement entirely — 419 of 646
// distinct names resolve, covering 3,180 pairs (63%), a ten-fold widening of reach — and it still
// produced NO confirmed defect that reading the rows had not already found.
//
// Read the CLAUDE.md entry under audit:camp-route-fit before re-deriving any of this. Three results
// matter more than the code:
//   1. THE PER-ROUTE VERSION IS BIASED AND MUST NOT BE REBUILT. "Is this route's whole camp list
//      centred somewhere else?" looks strictly better than asking about one pair, and the
//      geocodable subset is not a random sample: the names that fail to resolve are the
//      descriptive, multi-place ones a zone file contributes. Mount St. Helens resolved 3 of 7
//      camps — its two CORRECT ones plus one foreign — so its median read a healthy 7.1 km while
//      five of its seven camps were 60 km away. The bias runs toward LOOKING FINE.
//   2. `Number(null) === 0`, and isFinite(0) is true, so a route with a NULL high_point_ft reads as
//      a 0 ft summit and every camp on earth is "above" it. 23 findings became 4 once null was
//      tested for separately. Same trap audit:map-pins records from a 12,215 km finding.
//   3. Prose corroboration is REAL here, and only the base rate proves it: 51.4% of all pairs ARE
//      named by their own route, so findings coming back 30/30 silent is a signal rather than a
//      vacuous test.
//
// Run geocode-camp-names.mjs first; it writes the cache this reads.

// A CAMP'S OWN SPREAD IS ITS CONTROL.
//
// The naive coordinate detector — "this camp is far from this route's peak" — inherits the exact
// weakness audit:camp-route-fit already carries: a shared corridor camp is CORRECT and looks
// identical to a leak. And it adds a new failure the peak-inheritance path did not have, because a
// geocode can simply be wrong.
//
// Both are answered by the same measurement, and the per-camp census memory is where it comes from
// (a camp reaching two ADJACENT neighbours is a traverse chain; one reaching scattered routes is a
// zone file). For each camp, measure the distance to EVERY route that carries it:
//
//   - every route close          -> a corridor camp, working as intended. No finding.
//   - most close, one far        -> that ONE pairing is the outlier. The near routes are the
//                                   control: they prove the coordinate is right, so the distance
//                                   is a fact about the pairing rather than about the geocode.
//   - EVERY route far            -> the COORDINATE is wrong, not twenty pairings. Refused, and
//                                   counted, because a sweep whose refusals share one reason is a
//                                   sweep to suspect rather than a worklist.
import fs from "fs";
const ROOT = new URL("../..", import.meta.url).pathname;
const { SUPABASE_URL, anonKey, headers } = await import(`${ROOT}/scripts/lib/supabase-env.mjs`);

const CACHE = new URL("../../.camp-geocode-cache.json", import.meta.url).pathname; // written by geocode-camp-names.mjs
const CROSS_FT = 400;   // DEM vs the stored elevation: the solver's own agreement bound.
const HOME_KM = 8;      // a camp must be within this of at least one carrying route, or the
                        // coordinate itself is the suspect rather than any pairing.
const cache = JSON.parse(fs.readFileSync(CACHE, "utf8"));

const H = headers(anonKey());
const q = async (p) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: H });
  if (!r.ok) { console.log(`FAIL: read failed (${r.status})`); process.exit(1); }
  return r.json();
};
const rows = await q("routes?select=id,name,area_id,high_point_ft,bivy&bivy=not.is.null&id=like.wa_*&limit=2000");
if (!rows.length) { console.log("FAIL: read nothing"); process.exit(1); }
const areaIds = [...new Set(rows.map((x) => x.area_id).filter(Boolean))];
const areaOf = new Map();
for (let i = 0; i < areaIds.length; i += 150) {
  const chunk = areaIds.slice(i, i + 150).map((x) => `"${x}"`).join(",");
  for (const a of await q(`areas?select=id,name,lat,lng&id=in.(${chunk})`)) areaOf.set(a.id, a);
}

const arr = (v) => (Array.isArray(v) ? v : []);
const km = (a, b, c, d) => {
  const R = 6371, t = Math.PI / 180;
  const dLa = (c - a) * t, dLo = (d - b) * t;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(a * t) * Math.cos(c * t) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

const byName = new Map();
for (const r of rows) for (const b of arr(r.bivy)) {
  if (!b || !b.name) continue;
  const a = areaOf.get(r.area_id);
  if (!a || a.lat == null || a.lng == null) continue;
  if (!byName.has(b.name)) byName.set(b.name, []);
  byName.get(b.name).push({ route: r.id, routeName: r.name, peak: a.name, plat: Number(a.lat), plng: Number(a.lng), high: r.high_point_ft, elev: b.elev });
}

let confirmed = 0, noDem = 0, demDisagree = 0, homeless = 0, noElev = 0;
const findings = [];
const homelessNames = [];
for (const [name, carriers] of byName) {
  const g = cache[name];
  if (!g || !g.ok) continue;
  // GATE 4: the DEM under the geocode must agree with the elevation the row already stores.
  const stored = carriers.map((c) => Number(c.elev)).filter((v) => isFinite(v) && v > 0);
  if (!stored.length) { noElev++; continue; }
  if (g.dem == null) { noDem++; continue; }
  const best = Math.min(...stored.map((s) => Math.abs(s - g.dem)));
  if (best > CROSS_FT) { demDisagree++; continue; }
  confirmed++;

  const ds = carriers.map((c) => ({ ...c, d: km(g.lat, g.lng, c.plat, c.plng) }));
  const nearest = Math.min(...ds.map((x) => x.d));
  if (nearest > HOME_KM) { homeless++; homelessNames.push({ name, nearest, n: ds.length, dem: g.dem, via: g.via }); continue; }

  for (const c of ds) {
    // Number(null) is 0, NOT NaN, so isFinite() alone lets a route with NO recorded high point
    // read as a 0 ft summit and every camp on earth reads as "above" it. That is the exact trap
    // audit:map-pins records from a 12,215 km finding, and the first run of this script walked
    // straight into it: wa_mount_index_northeast_buttress is on North Peak with high_point_ft
    // NULL, and produced three of the top findings on a fabricated +1000/+880/+2420 ft.
    const hi = (c.high === null || c.high === undefined || c.high === "") ? NaN : Number(c.high);
    const el = (c.elev === null || c.elev === undefined || c.elev === "") ? NaN : Number(c.elev);
    const above = (isFinite(hi) && isFinite(el)) ? el - hi : null;
    // TWO RULES, REPORTED SEPARATELY so their precisions can be judged apart.
    //   A: the shipped audit's dials — far AND above the climb. "A camp above the climb is not a
    //      camp for it" (the wa_ellation case).
    //   B: SPREAD. Far in absolute terms AND far relative to what this camp's OTHER carriers are,
    //      which is what separates a corridor camp (uniformly distant from a cluster of routes)
    //      from one route that does not belong in the cluster.
    const med = ds.map((x) => x.d).sort((a, b) => a - b)[Math.floor(ds.length / 2)];
    const A = c.d > 5 && above != null && above > 500;
    const B = ds.length >= 3 && c.d > 5 && med > 0.01 && c.d > 3 * med;
    if (A || B) findings.push({ name, ...c, nearest, n: ds.length, dem: g.dem, med, rule: A && B ? "BOTH" : A ? "above" : "spread" });
  }
}

console.log(`camp names with a usable coordinate : ${confirmed}`);
console.log(`   refused, DEM disagrees > ${CROSS_FT} ft  : ${demDisagree}   <- the geocode is not corroborated`);
console.log(`   refused, no DEM reading          : ${noDem}`);
console.log(`   refused, no stored elevation     : ${noElev}   <- nothing to corroborate against`);
console.log(`   refused, far from EVERY carrier  : ${homeless}   <- the COORDINATE is the suspect, not the pairings`);

if (homelessNames.length) {
  console.log(`\n   the homeless ones, nearest carrying route first (read these before trusting any finding):`);
  homelessNames.sort((a, b) => a.nearest - b.nearest).slice(0, 10)
    .forEach((h) => console.log(`      ${h.nearest.toFixed(1).padStart(6)} km from its nearest of ${h.n} route(s)   "${h.name.slice(0, 52)}"  via "${h.via}"`));
}

console.log(`\n-- OUTLIER PAIRINGS: > 5 km from the route's peak AND > 500 ft above its high point`);
console.log(`   (the camp is within ${HOME_KM} km of at least one OTHER route, which is what proves the coordinate)\n`);
findings.sort((a, b) => b.d - a.d);
console.log(`   ${findings.length} pairing(s)  —  by rule: ${["above","spread","BOTH"].map(k=>k+" "+findings.filter(f=>f.rule===k).length).join(", ")}`);
for (const f of findings.slice(0, 40)) {
  console.log(`\n   [${f.rule}] ${f.d.toFixed(1)} km (camp median ${f.med.toFixed(1)} km)  ${f.high == null ? "high unknown" : (Number(f.elev) - Number(f.high) > 0 ? "+" : "") + Math.round(Number(f.elev) - Number(f.high)) + " ft"}   ${f.route}`);
  console.log(`        camp "${f.name.slice(0, 58)}" ${f.elev} ft  (DEM ${f.dem} ft)`);
  console.log(`        route is on ${f.peak} (${f.high} ft); this camp serves ${f.n} route(s), nearest ${f.nearest.toFixed(1)} km`);
}
console.log(`\n   A FINDING IS A HYPOTHESIS. Read the pair — a corridor camp shared by neighbours is`);
console.log(`   correct data, and this cannot tell that from a zone-file leak on its own.`);
