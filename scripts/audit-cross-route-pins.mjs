/* DO TWO ROUTES PLACE THE SAME NAMED POINT IN TWO DIFFERENT PLACES?
 *
 * A FIFTH WAYPOINT AUDIT NEEDS JUSTIFYING, because this repo has already recorded that of the four
 * that exist, two ask the same question with different tolerances. This one is the COMPLEMENT of all
 * four rather than another take on them: every one of them is scoped to a SINGLE ROUTE —
 *
 *   audit:waypoints           a pin against its own route's gpx track
 *   audit:waypoint-track      the same question, per-type tolerances
 *   audit:waypoint-geometry   pins against EACH OTHER on one route
 *   audit:trailhead-agreement a route's two copies of its OWN trailhead
 *   audit:coord-origin        a pin against its own route's area
 *
 * — so "two routes disagree about where a named place is" is invisible to all of them by
 * construction. Its unit is a NAME, not a route, which is why it could not be folded into
 * audit:waypoint-geometry without changing what that audit's rows mean.
 *
 * WHY THE SIGNAL IS TRUSTWORTHY. Measured 2026-08-27: of 537 waypoint names carried by more than one
 * WA route, 424 (79%) agree within 500 m. Agreement is the NORMAL state of this data, so a
 * multi-kilometre gap is ~20x the ordinary spread rather than ordinary noise.
 *
 * TRIAGE BY FEATURE CLASS BEFORE DISTANCE — the rule this repo already paid for in the GNIS work,
 * where 8 of 15 hits were linear or areal. A ford, a wilderness boundary, a ridge crest, a creek
 * crossing has EXTENT, so two routes meeting it at different points are BOTH RIGHT. Only a point —
 * a trailhead, camp, pass, col, lake, falls — has one location to be wrong about. Without this the
 * detector reports correct data: "Olympic National Park Boundary" spans 31.7 km because the boundary
 * does, and "Chiwawa River ford" spans 15.9 km because the river does.
 *
 * A NAMESAKE IS NOT A DEFECT. Washington genuinely holds two Cathedral Passes 173 km apart, two Snow
 * Lakes, two Myrtle Lakes, several High Camps. Those are correct data in both rows, and an audit
 * that reported them would be one people learn to ignore. They are printed SEPARATELY rather than
 * suppressed, because the separation is a judgement the reader should be able to check.
 *
 * WHAT THIS AUDIT DELIBERATELY DOES NOT DO: pick a winner. A majority is not independent evidence —
 * ten routes sharing an approach chain may have inherited one enrichment pass's coordinate, so ten
 * agreeing records can be one claim counted ten times. Adjudicating needs a source that descends
 * from none of them (the USGS 3DEP ground), and measured on the first 8 findings that check REFUSED
 * HALF of them: for Lake Constance the ground fits the OUTLIER better than the majority. So this
 * reports candidates and names the vote; it never states which row is wrong.
 *
 * Read-only, report-only, anon key. NOT a build gate — a property of the DB rather than of the
 * checkout, so no code change can cause or fix it; the same reasoning that keeps check:counts out.
 *
 *   npm run audit:cross-route-pins
 *   npm run audit:cross-route-pins -- --state all
 *   npm run audit:cross-route-pins -- --min-km 5
 */
import { selectAll } from "./lib/supabase-env.mjs";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const STATE = arg("--state", "wa");
const MIN_KM = Number(arg("--min-km", "2"));
const NAMESAKE_KM = Number(arg("--namesake-km", "20"));

/* A point has ONE location. Naming one of these and disagreeing by kilometres is a contradiction. */
const POINT = /\b(trailhead|campsite|camp|bivou?ac|bivy|pass|col|saddle|notch|gap|lake|tarn|pond|falls|spring|summit|parking|pullout|gate|bridge|junction|jct)\b/i;
/* A line or an area has EXTENT. Two routes meeting it at different places is correct data. */
const EXTENT = /\b(creek|river|stream|fork|ford|crossing|ridge|ar[eê]te|crest|boundary|basin|cirque|glacier|meadow|valley|wall|face|buttress|gully|couloir|chute|moraine|talus|scree|band|slabs?|trail|road|traverse|catwalk|spur|shoulder|bowl|snowfield|route|approach)\b/i;

const norm = s => String(s || "").toLowerCase().replace(/^"+|"+$/g, "").replace(/\s+/g, " ").trim();
const km = (a, b) => {
  const R = 6371, r = d => d * Math.PI / 180;
  const dy = r(b[0] - a[0]), dx = r(b[1] - a[1]);
  const q = Math.sin(dy / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dx / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(q));
};

const filter = STATE === "all" ? undefined : `id=like.${STATE}_*`;
const rows = await selectAll("routes", "id,waypoints", filter, { pageSize: 300 });
/* FAIL CLOSED. A failed or empty read makes every name look consistent, which is the false-pass
   direction and the one this kind of audit must never produce. */
if (!rows.length) { console.error(`read 0 routes for --state ${STATE} — a broken scan, not a clean catalog`); process.exit(1); }

const byName = new Map();
let placed = 0;
for (const r of rows) for (const w of (r.waypoints || [])) {
  if (w.lat == null || w.lng == null) continue;
  const lat = Number(w.lat), lng = Number(w.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
  const n = norm(w.name); if (!n) continue;
  placed++;
  if (!byName.has(n)) byName.set(n, []);
  byName.get(n).push({ route: r.id, lat, lng, elev: w.elev != null ? Number(w.elev) : null, raw: w.name, type: w.type });
}
if (!placed) { console.error("read routes but found 0 placed waypoints — a broken scan"); process.exit(1); }

const shared = [...byName.entries()].filter(([, p]) => new Set(p.map(x => x.route)).size > 1);
if (!shared.length) { console.error("no waypoint name is carried by two routes — a broken scan, not a clean catalog"); process.exit(1); }

/* The agreement baseline is MEASURED on this run rather than quoted, so the claim "a gap is 20x the
   norm" stays true of whatever the catalog holds today. */
const spans = shared.map(([n, pins]) => {
  let max = 0;
  for (let i = 0; i < pins.length; i++) for (let j = i + 1; j < pins.length; j++)
    max = Math.max(max, km([pins[i].lat, pins[i].lng], [pins[j].lat, pins[j].lng]));
  return { n, pins, max, raw: pins[0].raw, point: POINT.test(n) && !EXTENT.test(n) };
});
const tight = spans.filter(s => s.max <= 0.5).length;
console.log(`${rows.length} routes, ${placed} placed pins, ${byName.size} distinct names`);
console.log(`${shared.length} names carried by more than one route; ${tight} (${Math.round(100 * tight / shared.length)}%) agree within 500 m`);
console.log(`${spans.filter(s => s.point).length} of them name a POINT rather than something with extent\n`);

const cands = spans.filter(s => s.point && s.max >= MIN_KM).sort((a, b) => b.max - a.max);
const namesake = cands.filter(s => s.max >= NAMESAKE_KM);
const real = cands.filter(s => s.max < NAMESAKE_KM);

console.log(`=== CANDIDATES: a named POINT placed ${MIN_KM} km or more apart by two routes ===`);
console.log(`${real.length} within ${NAMESAKE_KM} km. Which row is wrong is NOT decided here — a majority`);
console.log(`can be one enrichment pass counted many times. Adjudicate against the ground.\n`);
for (const s of real) {
  console.log(`  ${s.max.toFixed(1).padStart(6)} km  "${String(s.raw).slice(0, 46)}"   ${s.pins.length} pins`);
  for (const p of [...s.pins].sort((a, b) => a.route.localeCompare(b.route)))
    console.log(`             ${p.lat.toFixed(4)},${p.lng.toFixed(4)}  ${String(p.elev ?? "—").padStart(6)} ft  ${p.route}`);
  console.log();
}

console.log(`=== NAMESAKES (>= ${NAMESAKE_KM} km apart): reported, NOT findings ===`);
console.log(`Washington really does hold two Cathedral Passes and several Snow Lakes. Both rows can`);
console.log(`be right, and "repairing" one would destroy correct data.\n`);
for (const s of namesake) console.log(`  ${s.max.toFixed(0).padStart(4)} km  "${String(s.raw).slice(0, 46)}"  on ${s.pins.length} routes`);

/* ---------------------------------------------------------------------------------------------
 * SECTION 2 — THE MIRROR: same place, different HEIGHT.
 *
 * Section 1 asks whether two routes disagree about WHERE a named point is. This asks whether they
 * disagree about HOW HIGH it is while storing the identical coordinate. Same question — do two
 * routes agree about this named place? — over the same pairs, so it lives here rather than in a
 * SIXTH waypoint audit. The coordinate being byte-identical is what makes it the mirror: the
 * position is agreed, so only the number can be wrong.
 *
 * NOTHING ELSE LOOKS FOR IT. audit:waypoint-elevations flags a pin the TERRAIN refuses, so a
 * disagreement between two rows at one coordinate is invisible to it whenever both values sit
 * inside the terrain box. PR #1320 repaired exactly one instance of this class and it was found
 * BY HAND.
 *
 * KEYED ON THE COORDINATE ROUNDED TO 4 dp (~11 m), which is required rather than sloppy: rows
 * store one point at different precisions (48.8837373 vs 48.8837), so an exact match finds almost
 * nothing — the lesson the modal-coordinate attempt in the batch-1 applier already paid for.
 * ------------------------------------------------------------------------------------------- */
const MIN_SPREAD_FT = 100;
const byCoord = new Map();
for (const [n, pins] of byName) for (const p of pins) {
  if (!Number.isFinite(p.elev)) continue;
  const k = `${n}|${p.lat.toFixed(4)}|${p.lng.toFixed(4)}`;
  if (!byCoord.has(k)) byCoord.set(k, []);
  byCoord.get(k).push(p);
}
const sameSpot = [];
for (const [, pins] of byCoord) {
  if (new Set(pins.map(p => p.route)).size < 2) continue;
  const es = pins.map(p => p.elev);
  const spread = Math.max(...es) - Math.min(...es);
  if (spread >= MIN_SPREAD_FT) sameSpot.push({ pins, spread });
}
sameSpot.sort((a, b) => b.spread - a.spread);

console.log(`\n\n=== SAME PLACE, DIFFERENT HEIGHT: ${sameSpot.length} ===`);
console.log(`One coordinate, two or more routes, and they disagree by ${MIN_SPREAD_FT} ft or more about how high`);
console.log(`it is. The position is AGREED, so only the number can be wrong.\n`);
console.log(`ADJUDICATE AGAINST THE GROUND, NEVER THE VOTE — and demand a SEPARATION rather than a`);
console.log(`verdict at the boundary. Measured: at the SR-20 Wine Spires pullout FOUR routes said`);
console.log(`2,200 or 3,450 ft and ONE said 4,300; the ground admitted only the lone dissenter. And`);
console.log(`two boundary artefacts would each have produced a confident wrong write — one value`);
console.log(`refused by 17 ft (with the route's own prose corroborating it) and one admitted by 13.\n`);
for (const f of sameSpot) {
  const p0 = f.pins[0];
  console.log(`  ${String(Math.round(f.spread)).padStart(5)} ft  ${String(p0.type || "?").padEnd(10)} "${String(p0.raw).slice(0, 40)}"  @ ${p0.lat.toFixed(4)},${p0.lng.toFixed(4)}`);
  for (const p of [...f.pins].sort((a, b) => a.elev - b.elev)) console.log(`             ${String(p.elev).padStart(6)} ft  ${p.route}`);
}

console.log(`\nreport-only: exit 0`);
