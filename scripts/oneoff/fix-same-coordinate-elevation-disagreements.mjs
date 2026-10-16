// Nine pins share a coordinate with a sibling route and disagree with it about how high that place
// is. The ground settles which of them is right.
//
// THE MIRROR OF audit:cross-route-pins, AND NOTHING LOOKS FOR IT. That audit asks "same height,
// different place". This is "same place, different height" — the coordinate is byte-identical
// across the rows, so only the number can be wrong. audit:waypoint-elevations cannot see it
// whenever both values sit inside the terrain box, and PR #1320 repaired exactly one instance of
// this class, found BY HAND.
//
// 32 findings across WA, 23 of them TRAILHEADS — the highest-consequence pin type, since a
// trailhead's elevation feeds the approach gain a party plans from.
//
// THE MINORITY IS SOMETIMES THE CORRECT ROW, which is the whole argument for adjudicating against
// the ground rather than the vote. At the SR-20 Wine Spires pullout FOUR routes say 2,200 or 3,450
// ft and ONE says 4,300; the ground reads 4,198-4,579 and admits only the lone dissenter. A
// majority rule would have "repaired" the correct row into agreement with four wrong ones.
//
// TWO THRESHOLD ARTEFACTS WERE MEASURED AND EXCLUDED, and both would have produced a confident
// wrong write:
//   - Upper Dungeness Trailhead: the ground refuses 2,970 ft by SEVENTEEN FEET, and that route's
//     own prose independently says 2,960. A 17 ft margin is not evidence.
//   - Lake of the Woods: the surviving value is "admitted" only by 13 ft of tolerance, while the
//     ground box itself (6,583-6,713) refuses it outright and the route's prose says 5,300. Both
//     rows are wrong there; neither is a donor.
// So the rule is not "outside the tolerance band" but a SEPARATION: the surviving value must sit
// inside the ground box (or within 50 ft of it), and every value being replaced must be at least
// 300 ft outside — a 6x gap, not a coin-flip at the boundary.
//
// FOUR GATES, all re-asserted at apply time against the live rows:
//   1. the target still states the elevation this repair was measured against
//   2. the donor still carries the same-named pin AT THE SAME COORDINATE (within ~11 m), so the two
//      rows are demonstrably describing one place rather than two of the same name
//   3. the ground at that shared coordinate admits the donor's value to within 50 ft
//   4. the ground REFUSES the target's value by at least 300 ft
//
// Every value written is READ FROM THE DONOR ROW, never typed. THE COORDINATE IS NEVER TOUCHED:
// this repair's claim is about the number alone, and the verification asserts the position is
// unchanged.
//
//   node scripts/oneoff/fix-same-coordinate-elevation-disagreements.mjs --dry
//   node scripts/oneoff/fix-same-coordinate-elevation-disagreements.mjs
import { elevationAt, offset } from "../lib/terrain.mjs";
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const TARGETS = [
  // Four routes wrong, one right — and the right one is the minority.
  { route: "wa_playing_not_spraying", pin: "SR-20 Wine Spires pullout (milepost 166)", was: 2200, donor: "wa_south_face" },
  { route: "wa_the_chalice", pin: "SR-20 Wine Spires pullout (milepost 166)", was: 2200, donor: "wa_south_face" },
  { route: "wa_clean_break", pin: "SR-20 Wine Spires pullout (milepost 166)", was: 3450, donor: "wa_south_face" },
  { route: "wa_east_face_2", pin: "SR-20 Wine Spires pullout (milepost 166)", was: 3450, donor: "wa_south_face" },

  { route: "wa_andersons_thumb_standard", pin: "Dosewallips Road washout parking (FR-2610)", was: 1600, donor: "wa_inner_constance_standard" },
  { route: "wa_mount_rainier_ptarmigan_ridge", pin: "White River Campground", was: 4930, donor: "wa_mount_rainier_curtis_ridge" },
  { route: "wa_hourglass_gully_winter", pin: "Lake Serene Trailhead", was: 1000, donor: "wa_mount_index_northeast_buttress" },
  { route: "wa_goode_mountain_northeast_face", pin: "Rainy Pass PCT Trailhead", was: 4500, donor: "wa_north_ridge_west_side" },

  // THE ONE I MISSED EARLIER TONIGHT. fix-trailhead-elevations-from-a-corroborated-sibling moved
  // three Stuart Lake Trailhead rows to 3,400 ft and left this one at 2,930, because that sweep
  // only examined pins the TERRAIN refuses and 2,930 was inside the flat tolerance. An instance
  // fixed by hand is not a class closed — including when you are the one who fixed it.
  { route: "wa_boving_christensen", pin: "Stuart Lake Trailhead", was: 2930, donor: "wa_beckey_davis" },
];

// MEASURED AND DELIBERATELY NOT REPAIRED — 26 of the 32 findings. Recorded so they are not
// re-derived:
//   23  the ground admits EVERY stated value, so the spread is inside the terrain's own noise and
//       nothing decides (Blue Lake Trailhead, Goodell Creek, Barclay Lake, Cutthroat Pass, the
//       second Stuart Lake key, Kangaroo Temple, Thornton Lakes, Sol Duc, Hayes River ...)
//    1  Ross Dam Trailhead — the ground refuses EVERY value, so the coordinate may be the wrong
//       half; that is audit:cross-route-pins' question, not this one
//    1  Lake of the Woods — the surviving value is admitted only by 13 ft and the ground box
//       refuses it outright; both rows look wrong and neither is usable as a donor
//    1  Upper Dungeness Trailhead — refused by 17 ft, with the route's own prose corroborating the
//       refused value at 2,960 ft

const DRY = process.argv.includes("--dry");
const NEAR_FT = 50;      // how close the surviving value must sit to the ground box
const CLEAR_FT = 300;    // how far outside it a replaced value must be
const SAME_M = 15;       // "the same coordinate" — the 4 dp the finding was keyed on is ~11 m
const key = requireServiceKey();

const norm = s => String(s || "").toLowerCase().replace(/^"+|"+$/g, "").replace(/\s+/g, " ").trim();
const metres = (a, b) => {
  const R = 6371000, r = d => d * Math.PI / 180;
  const dy = r(b[0] - a[0]), dx = r(b[1] - a[1]);
  const q = Math.sin(dy / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dx / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(q));
};
async function span(lat, lng) {
  const c = await elevationAt(lat, lng);
  if (c == null) return null;
  const ring = [];
  for (const b of [0, 90, 180, 270]) { const [y, x] = offset(lat, lng, 150, b); ring.push(await elevationAt(y, x)); }
  const k = ring.filter(v => v != null);
  return { lo: Math.min(c, ...k), hi: Math.max(c, ...k) };
}
const outside = (v, s) => v < s.lo ? s.lo - v : v > s.hi ? v - s.hi : 0;

const ids = [...new Set(TARGETS.flatMap(t => [t.route, t.donor]))];
const rows = await selectAll("routes", "id,waypoints", `id=in.(${ids.join(",")})`, { pageSize: 200, key });
if (rows.length !== ids.length) { console.error(`asked for ${ids.length} routes, read ${rows.length} — refusing`); process.exit(1); }

const spanCache = new Map();
const plan = [];
for (const t of TARGETS) {
  const wps = rows.find(r => r.id === t.route)?.waypoints || [];
  const i = wps.findIndex(w => norm(w.name) === norm(t.pin));
  if (i < 0) { console.error(`REFUSED ${t.route}: no pin named "${t.pin}"`); process.exit(1); }
  const w = wps[i];

  // GATE 1
  if (Number(w.elev) !== t.was) { console.log(`  skip  ${t.route} "${t.pin}": states ${w.elev} ft, not the ${t.was} this was measured against — already repaired, or the row has moved`); continue; }
  if (w.lat == null || w.lng == null) { console.error(`REFUSED ${t.route} "${t.pin}": unplaced, so no ground can adjudicate it`); process.exit(1); }

  // GATE 2 — the donor must be at the SAME COORDINATE. That is what makes this the mirror class
  // rather than a same-name guess: without it the donor could be a different place of the same name.
  const d = (rows.find(r => r.id === t.donor)?.waypoints || []).find(x => norm(x.name) === norm(t.pin));
  if (!d || d.lat == null) { console.error(`REFUSED ${t.route}: donor ${t.donor} no longer carries "${t.pin}" with a coordinate`); process.exit(1); }
  const gap = metres([+w.lat, +w.lng], [+d.lat, +d.lng]);
  if (gap > SAME_M) { console.error(`REFUSED ${t.route} "${t.pin}": donor sits ${gap.toFixed(0)} m away — these are no longer the same coordinate, so this is a POSITION question, not an elevation one`); process.exit(1); }
  const now = d.elev != null ? Number(d.elev) : NaN;
  if (!Number.isFinite(now)) { console.error(`REFUSED ${t.route}: donor ${t.donor} states no elevation for "${t.pin}"`); process.exit(1); }

  // GATES 3 and 4 — a SEPARATION, not a boundary test. Both artefacts this script's header records
  // were caught by demanding a gap rather than a verdict.
  const ck = `${(+w.lat).toFixed(5)},${(+w.lng).toFixed(5)}`;
  if (!spanCache.has(ck)) spanCache.set(ck, await span(+w.lat, +w.lng));
  const s = spanCache.get(ck);
  if (!s) { console.error(`REFUSED ${t.route}: no DEM reading — no evidence, never agreement`); process.exit(1); }
  const dOut = outside(now, s), tOut = outside(t.was, s);
  if (dOut > NEAR_FT) { console.error(`REFUSED ${t.route} "${t.pin}": the donor's ${now} ft sits ${Math.round(dOut)} ft outside the ground box (${Math.round(s.lo)}-${Math.round(s.hi)}) — not corroborated enough to copy`); process.exit(1); }
  if (tOut < CLEAR_FT) { console.error(`REFUSED ${t.route} "${t.pin}": ${t.was} ft is only ${Math.round(tOut)} ft outside the ground box — too close to the boundary to call it wrong`); process.exit(1); }

  plan.push({ t, next: wps.map((x, j) => j === i ? { ...x, elev: now } : x), now, s, lat: +w.lat, lng: +w.lng });
  console.log(`  ${DRY ? "would set" : "setting "} ${t.route}`);
  console.log(`      "${t.pin}"  ${t.was} -> ${now} ft   (coordinate unchanged at ${(+w.lat).toFixed(4)},${(+w.lng).toFixed(4)})`);
  console.log(`      ground there ${Math.round(s.lo)}-${Math.round(s.hi)} ft: the donor's value is ${Math.round(dOut)} ft outside it, this row's is ${Math.round(tOut)} ft outside`);
  console.log(`      value read from ${t.donor}, at the same coordinate (${gap.toFixed(1)} m apart)`);
}

if (DRY) { console.log(`\n--dry: ${plan.length} pin(s) would be corrected, nothing written.`); process.exit(0); }
if (!plan.length) { console.log("\nnothing to do — every target already carries its corrected value."); process.exit(0); }

const byRoute = new Map();
for (const p of plan) byRoute.set(p.t.route, p.next);
for (const [id, next] of byRoute) await patchRow("routes", id, { waypoints: next });

const after = await selectAll("routes", "id,waypoints", `id=in.(${[...byRoute.keys()].join(",")})`, { pageSize: 100, key });
let bad = 0;
for (const p of plan) {
  const wps = after.find(r => r.id === p.t.route)?.waypoints || [];
  const w = wps.find(x => norm(x.name) === norm(p.t.pin));
  const lost = wps.length !== p.next.length;
  const moved = !w || w.lat == null || metres([+w.lat, +w.lng], [p.lat, p.lng]) > 1;
  if (!w || Number(w.elev) !== p.now || lost || moved) {
    console.error(`  VERIFY FAILED ${p.t.route} "${p.t.pin}"${lost ? " — waypoint count changed" : ""}${moved ? " — the COORDINATE moved, which this repair must not do" : ""}`);
    bad++;
  }
}
console.log(`\n${plan.length} corrected, ${plan.length - bad} verified.`);
process.exit(bad ? 1 : 0);
