// Two or more of ONE route's own waypoints at the identical coordinate.
//
// NO EXISTING AUDIT SEES THIS, and that was checked rather than assumed. audit:waypoint-order reports a
// "duplicates" section, which is why this looked redundant — but it dedupes by waypoint TYPE
// ("Trailhead, Water, Junction, Hazard, Hazard, Hazard, Summit" collapsing 7 to 6), so it finds a route
// listing three Hazards and cannot see two DIFFERENTLY-NAMED pins sharing one point. Not one of the 27
// rows below appears in its output. The three pin-vs-track audits ask whether a pin is on the route's
// line; audit:cross-route-pins asks whether two ROUTES disagree about one named place. A route
// disagreeing with ITSELF at one coordinate is outside all of them.
//
// WHY IT MATTERS: the map draws stacked pins on top of each other, so a climber sees one marker where
// the list shows several, and any distance derived from the chain treats two places as zero apart.
//
// THE PROVABLE SUBSET IS THE POINT. 103 of 1,011 routes with placed waypoints have pins sharing a
// coordinate, and most of that is placeholder area markers (elev 0, distMi 0) duplicated by a loading
// pass — a milder shape. 27 state two DIFFERENT non-zero elevations at one point, which needs no
// external source to condemn: one point cannot be at two heights, so one of the two coordinates is
// wrong. Those split again on reading:
//   * a base and a summit at one point — "Pinto Rock base (end of NF-77)" 4,700 ft against "Pinto Rock
//     summit" 5,118 ft; "Chianti Spire / East Face area" 7,900 against "Chianti Spire Summit" 8,420;
//     "Whine Spire (Gato Negro topout)" 7,800 against "Whine Spire summit" 8,348. Genuinely two places.
//   * one place recorded twice at slightly different heights — "Half Moon Crag" 4,800 vs 4,761,
//     "Minidike" 3,708 vs 3,712. A near-duplicate row rather than a misplacement.
//
// REPORT ONLY, and deliberately not promoted to a repair: which of the two coordinates is wrong is not
// decidable from the row, and every repair in this session has been either a deletion of a false claim
// or a copy of a value the row already holds. Neither is available here.
//
import { selectAll } from "../lib/supabase-env.mjs";

// Two or more of ONE route's own waypoints at the identical coordinate. The map draws them stacked, so
// a climber sees one pin where the list shows several, and any distance derived from the chain is wrong.
const key = (a, b) => `${Number(a).toFixed(5)},${Number(b).toFixed(5)}`;
const norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const rows = await selectAll("routes", "id,waypoints", "id=like.wa_*", { pageSize: 1000 });
let withPins = 0, dupRoutes = 0, dupSameName = 0, dupDiffName = 0;
const out = [];
for (const r of rows) {
  const wps = (r.waypoints || []).filter(w => Number.isFinite(Number(w.lat)) && Number.isFinite(Number(w.lng)) && !(Number(w.lat) === 0 && Number(w.lng) === 0));
  if (!wps.length) continue;
  withPins++;
  const at = new Map();
  wps.forEach((w, i) => { const k = key(w.lat, w.lng); if (!at.has(k)) at.set(k, []); at.get(k).push({ i, name: String(w.name || ""), elev: Number(w.elev ?? w.elevFt), dist: Number(w.distMi) }); });
  const groups = [...at].filter(([, l]) => l.length > 1);
  if (!groups.length) continue;
  dupRoutes++;
  for (const [k, l] of groups) {
    const names = new Set(l.map(x => norm(x.name)).filter(Boolean));
    if (names.size <= 1) dupSameName++; else dupDiffName++;
    out.push({ id: r.id, k, l, diffName: names.size > 1, total: wps.length });
  }
}
console.log(`routes with placed waypoints: ${withPins}`);
console.log(`routes with 2+ pins at ONE coordinate: ${dupRoutes}`);
console.log(`  stacked groups sharing a NAME (a duplicate row): ${dupSameName}`);
console.log(`  stacked groups with DIFFERENT names (two places, one point): ${dupDiffName}\n`);
// The PROVABLE subset: two pins at one coordinate stating two different non-zero elevations. One
// point cannot be at two heights, so one of the two coordinates is wrong, and it needs no external
// source to say so. Zero/NaN elevations are excluded — those are placeholder area pins, a different
// (and milder) shape.
const impossible = out.filter(o => {
  const es = [...new Set(o.l.map(x => x.elev).filter(n => Number.isFinite(n) && n > 0))];
  return es.length > 1;
});
console.log(`STACKED PINS STATING DIFFERENT ELEVATIONS (one coordinate is wrong): ${impossible.length}`);
for (const o of impossible.slice(0, 18)) {
  const es = o.l.filter(x => Number.isFinite(x.elev) && x.elev > 0);
  console.log(`  ${o.id.padEnd(48)} ${es.map(x => `"${x.name.slice(0, 34)}" ${x.elev}ft`).join("   vs   ")}`);
}
if (impossible.length > 18) console.log(`  ...and ${impossible.length - 18} more`);
console.log("");
const diff = out.filter(o => o.diffName);
for (const o of diff.slice(0, 14)) {
  console.log(`  ${o.id}   at ${o.k}   (${o.total} pins on the route)`);
  for (const x of o.l) console.log(`      [${x.i}] "${x.name}"   elev ${x.elev}   distMi ${x.dist}`);
}
if (diff.length > 14) console.log(`  ...and ${diff.length - 14} more with different names`);
