// A route whose own GPS track returns to where it started cannot descend a quarter of what it climbs.
//
// `loss_ft` feeds the descent term of scarfHrs, which drives Est. summit and Est. return. On a party
// that finishes where it began, total descent equals total ascent — so where a row records a loss far
// below its gain, the row contradicts itself.
//
// THE HARD PART IS ESTABLISHING THE SHAPE WITHOUT ASSERTING IT. fix-outback-loss-equals-gain.mjs
// (7 rows) took the shape from a DECLARED `outing_shape`, and deliberately left 17 rows alone because
// asserting an out-and-back where none is recorded would be adding a claim. `outing_shape` is populated
// on only 170 of 8,365 WA rows, so that gate closes fast.
//
// This establishes the same thing GEOMETRICALLY, from the row's own recorded track, with no prose read
// and nothing asserted:
//   1. the track has at least 20 points, so it is a real recording rather than a stub or a line drawn
//      between the waypoints (this catalog holds 201 of those);
//   2. its last vertex is within 500 m of its first — it comes back to where it started;
//   3. it starts within 500 m of THIS route's own trailhead pin, so it is this route's track and not a
//      neighbour's, which is a defect this catalog demonstrably has;
//   4. and the row's loss_ft is under half its gain_ft, i.e. impossible rather than merely imprecise.
//
// OUT-AND-BACK VERSUS LOOP DOES NOT MATTER HERE, which is what makes the geometric test sufficient.
// Both return to the starting elevation, and that is the whole content of the invariant. The script
// does not claim to know which the route is, and does not write outing_shape.
//
// WHAT THIS ASSERTS AND WHAT IT DOES NOT: that these two figures must AGREE, not that gain_ft is
// accurate. loss inherits whatever gain is, and any later correction to gain then applies to both
// rather than leaving the row self-contradictory.
//
// AND WHY A SHORTER ESTIMATE IS NOT A REGRESSION, since the arithmetic looks alarming: for an unpitched
// route retH = depart + hikeH + (gainCoversWholeOuting ? 0 : hikeH*0.75), and hikeH already charges
// descent through scarfHrs' loss term. With loss correct, hikeH contains the real descent and the
// extra 0.75 leg would count it about 1.75 times over — that leg is the fallback for a row whose
// descent is NOT recorded. Removing it is the removal of a compensating hack, not of a safety margin.
//
// Today the gate matches one row. It is written as the general test rather than as that row, so it
// stays usable as more tracks are added.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const rad = x => x * Math.PI / 180;
const km = (a, b) => { const R = 6371, dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]); const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const pts = g => Array.isArray(g) ? g.map(p => Array.isArray(p) ? [+p[0], +p[1]] : [+(p.lat ?? p[0]), +(p.lng ?? p[1])]).filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1])) : [];

const MIN_PTS = 20, CLOSES_M = 500, TH_M = 500, IMPOSSIBLE = 0.5;

const rows = await selectAll("routes", "id,gain_ft,loss_ft,outing_shape,gpx,waypoints", "id=like.wa_*", { pageSize: 1000 });
console.log(`WA routes read: ${rows.length}`);
if (rows.length < 5000) { console.error("SHORT READ — refusing to act on a partial read"); process.exit(1); }

let usable = 0, closed = 0, mine = 0;
const plan = [], refused = [];
for (const r of rows) {
  const p = pts(r.gpx);
  if (p.length < MIN_PTS) continue;
  usable++;
  if (km(p[0], p[p.length - 1]) * 1000 >= CLOSES_M) continue;
  closed++;
  const wp = (r.waypoints || []).filter(w => w.lat !== "" && w.lng !== "" && Number.isFinite(+w.lat) && Number.isFinite(+w.lng));
  const th = wp.find(w => /trailhead/i.test(w.type || ""));
  if (!th) continue;                                   // cannot show the track is this route's
  const thd = km(p[0], [+th.lat, +th.lng]) * 1000;
  if (thd >= TH_M) continue;                           // the track starts somewhere else — not this route's
  mine++;
  const g = +r.gain_ft, l = +r.loss_ft;
  if (!(g > 0 && l > 0)) continue;
  if (l / g >= IMPOSSIBLE) continue;
  plan.push({ id: r.id, from: l, to: g, thd: Math.round(thd), back: Math.round(km(p[0], p[p.length - 1]) * 1000), n: p.length,
              premise: { gain_ft: r.gain_ft, loss_ft: r.loss_ft } });
}
if (!usable) { console.error("no route has a usable gpx — the scan is broken, refusing"); process.exit(1); }
console.log(`\nroutes with a real recorded track (>=${MIN_PTS} pts): ${usable}`);
console.log(`  ...whose track RETURNS to its own start (<${CLOSES_M} m)      : ${closed}`);
console.log(`  ...and demonstrably starts at THIS route's trailhead pin  : ${mine}`);
console.log(`  ...and record a loss under half their gain — impossible   : ${plan.length}\n`);
for (const p of plan)
  console.log(`  ${p.id}\n      loss ${p.from} -> ${p.to}   (${p.n}-point track, closes to ${p.back} m, starts ${p.thd} m from its trailhead pin)`);
if (!plan.length) { console.log("nothing to do."); process.exit(0); }
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

let wrote = 0, skipped = 0;
const live = new Map((await selectAll("routes", "id,gain_ft,loss_ft", "id=like.wa_*", { pageSize: 1000 })).map(r => [r.id, r]));
for (const p of plan) {
  const r = live.get(p.id);
  if (!r || r.gain_ft !== p.premise.gain_ft || r.loss_ft !== p.premise.loss_ft) { console.log(`  SKIPPED ${p.id}: the row has changed since it was read`); skipped++; continue; }
  await patchRow("routes", p.id, { loss_ft: p.to });
  wrote++;
}
console.log(`\nwrote ${wrote}, skipped ${skipped}`);
const after = new Map((await selectAll("routes", "id,gain_ft,loss_ft", "id=like.wa_*", { pageSize: 1000 })).map(r => [r.id, r]));
let ok = 0;
for (const p of plan) { const r = after.get(p.id); if (r && r.loss_ft === p.to && r.gain_ft === p.premise.gain_ft) ok++; else console.log(`  NOT APPLIED: ${p.id}`); }
console.log(`verified ${ok} of ${plan.length}`);
