// Five pins hold a coordinate copied from a NEIGHBOURING pin on the same route.
//
// Found by asking the ground what a pin's stated elevation implies, then noticing that the
// impossible ones sit on top of another pin. `audit:waypoint-geometry` reports the same shape at an
// IDENTICAL coordinate; these are near-misses of 0-54 m, which that test cannot reach, and 37 of the
// 39 colliding pairs in WA are of that kind.
//
//   wa_j_tnar                       "Jötunheim Wall Topout" 5,500 ft sits at the EXACT coordinate of
//                                   its own base cirque (3,765 ft; ground 3,914)
//   wa_liberty_bell_* (5 routes)    "Climbers' path junction" 5,800 ft sits 32-38 m from the
//                                   Concord Tower notch (7,300 ft; ground 7,556)
//   wa_little_tahoma_east_shoulder  "Summerland" 5,950 ft sits at the EXACT coordinate of the
//                                   Fryingpan Creek trailhead (3,816 ft; ground 3,839) — the camp is
//                                   four miles up that trail
//   wa_pinnacle_peak_tatoosh_r1     "Seasonal Stream Crossing" 5,350 ft sits 54 m from the summit
//                                   gully (6,400 ft; ground 6,260)
//   wa_preacher_mountain_scramble   "5,200 ft tarn" sits 34 m from the Rainy Creek bridge at
//                                   1,200 ft (ground 1,375)
//
// THE COORDINATE IS CLEARED, NOT CORRECTED, and never the elevation. Two reasons:
//
//   - No source holds the right coordinate. Every one of these was checked for a same-name donor
//     elsewhere in the catalog and there is none; the only candidate was refused because the ground
//     under it disagreed with the claim. Writing a plausible coordinate is the fabrication this
//     catalog already carries 346 examples of. `wpPlaced()` renders a coordinate-less pin as
//     "No coordinate on file — this point is not on the map above", which is the honest state and
//     strictly better than a pin drawn 1,700 ft up the wrong part of the mountain.
//   - Which record is wrong is only decidable when the two pins are nearly co-located. At 138 m,
//     "Spire Col" claims 7,000 ft on ground reading 7,671 — and that col is real and near that
//     summit, so its COORDINATE is likely right and its ELEVATION wrong. Clearing that one would
//     destroy good data. Only the <=54 m cases are written here; the other eight are left to be read.
//
// Refuses rather than writes if the live row no longer matches, and re-reads to confirm.
//
//   node scripts/oneoff/clear-borrowed-waypoint-coordinates.mjs --dry
//   node scripts/oneoff/clear-borrowed-waypoint-coordinates.mjs
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

// Declared as (route, pin name) plus the coordinate and elevation expected to be there NOW, and the
// PARTNER whose coordinate it holds. No coordinate is invented anywhere in this file — the only
// operation available is to clear one, so a repair needing a new position cannot be expressed.
const TARGETS = [
  { route: "wa_j_tnar", name: "Jötunheim Wall Topout (Middle Peak)", elev: 5500,
    lat: 47.77748, lng: -121.57543, partner: "Jötunheim (North Norwegian Buttress base cirque)", ground: 3914 },
  { route: "wa_liberty_bell_east_face", name: "Climbers' path junction", elev: 5800,
    lat: 48.51435, lng: -120.658495, partner: "Liberty Bell-Concord Tower notch", ground: 7556 },
  { route: "wa_liberty_bell_independence_route", name: "Climbers' path junction", elev: 5800,
    lat: 48.51435, lng: -120.658495, partner: "West face base / sloping bench", ground: 7556 },
  { route: "wa_liberty_bell_nw_face", name: "Climbers' path junction", elev: 5800,
    lat: 48.51435, lng: -120.658495, partner: "Liberty Bell-Concord Tower notch", ground: 7556 },
  { route: "wa_liberty_bell_overexposure", name: "Climbers' path junction", elev: 5800,
    lat: 48.51435, lng: -120.658495, partner: "Liberty Bell-Concord Tower notch", ground: 7556 },
  { route: "wa_liberty_bell_thin_red_line", name: "Climbers' path junction", elev: 5800,
    lat: 48.51435, lng: -120.658495, partner: "West face base / sloping bench", ground: 7556 },
  { route: "wa_little_tahoma_east_shoulder", name: "Summerland", elev: 5950,
    lat: 46.8884, lng: -121.611, partner: "Fryingpan Creek / Summerland Trailhead", ground: 3839 },
  { route: "wa_pinnacle_peak_tatoosh_r1", name: "Seasonal Stream Crossing", elev: 5350,
    lat: 46.757162, lng: -121.73258, partner: "Summit Gully Scramble", ground: 6260 },
  { route: "wa_preacher_mountain_scramble", name: "5,200 ft tarn / open bowl", elev: 5200,
    lat: 47.539191, lng: -121.534509, partner: "Rainy Creek bridge / climbers' path split", ground: 1375 },
];

const DRY = process.argv.includes("--dry");
const key = requireServiceKey();
const ids = [...new Set(TARGETS.map(t => t.route))];
const rows = await selectAll("routes", "id,name,waypoints", `id=in.(${ids.join(",")})`, { pageSize: 50, key });
if (rows.length !== ids.length) { console.error(`asked for ${ids.length} routes, read ${rows.length} — refusing`); process.exit(1); }

const near = (a, b) => Math.abs(Number(a) - Number(b)) < 1e-5;
const norm = s => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
const R = 6371, rad = d => d * Math.PI / 180;
const km = (a, b) => { const dy = rad(b[0] - a[0]), dx = rad(b[1] - a[1]);
  const q = Math.sin(dy / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dx / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(q)); };

const plan = [];
for (const t of TARGETS) {
  const r = rows.find(x => x.id === t.route);
  const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
  const i = wps.findIndex(w => norm(w.name) === norm(t.name));
  if (i < 0) { console.error(`REFUSED ${t.route}: no pin named "${t.name}"`); process.exit(1); }
  const w = wps[i];
  if (w.lat == null || w.lng == null) { console.log(`  skip  ${t.route} "${t.name}" — already has no coordinate`); continue; }
  if (!near(w.lat, t.lat) || !near(w.lng, t.lng) || Number(w.elev) !== t.elev) {
    console.error(`REFUSED ${t.route} "${t.name}": row now holds ${w.lat},${w.lng} @ ${w.elev} ft, expected ${t.lat},${t.lng} @ ${t.elev}`);
    process.exit(1);
  }
  // Re-assert the EVIDENCE, not just the target: the partner must still be close enough that no
  // terrain could hold both claims. Without this the script would happily clear a pin whose
  // collision has since been repaired.
  //
  // WITHIN 60 m, not at an identical coordinate — written the strict way first, and it refused every
  // Liberty Bell row. Only two of these five collisions are exact; the rest are 32-54 m, which is the
  // whole reason audit:waypoint-geometry's identical-coordinate test cannot see them. An assertion
  // stricter than the measurement it encodes is a broken assertion, not a careful one.
  const p = wps.find(x => norm(x.name) === norm(t.partner));
  const gap = p && p.lat != null ? km([Number(p.lat), Number(p.lng)], [t.lat, t.lng]) * 1000 : Infinity;
  if (!(gap <= 60)) {
    console.error(`REFUSED ${t.route} "${t.name}": partner "${t.partner}" is ${Number.isFinite(gap) ? Math.round(gap) + " m" : "nowhere"} away, not the <=60 m this repair rests on — the evidence is gone`);
    process.exit(1);
  }
  const next = wps.map((x, j) => j === i ? { ...x, lat: null, lng: null } : x);
  plan.push({ t, route: r, index: i, next });
  console.log(`  ${DRY ? "would clear" : "clearing  "} ${t.route}`);
  console.log(`      "${t.name}" ${t.elev} ft — held ${t.lat},${t.lng}, where the ground is ${t.ground} ft`);
  console.log(`      copied from "${t.partner}" (${p.elev} ft) at the same spot`);
}

if (DRY) { console.log(`\n--dry: ${plan.length} pin(s) would be cleared, nothing written.`); process.exit(0); }
if (!plan.length) { console.log("\nnothing to do."); process.exit(0); }

for (const p of plan) await patchRow("routes", p.t.route, { waypoints: p.next });

// Re-read and reconcile. A 200 is not evidence the data changed.
const after = await selectAll("routes", "id,waypoints", `id=in.(${ids.join(",")})`, { pageSize: 50, key });
let bad = 0;
for (const p of plan) {
  const w = (after.find(x => x.id === p.t.route)?.waypoints || []).find(x => norm(x.name) === norm(p.t.name));
  const cleared = w && w.lat == null && w.lng == null;
  const kept = w && Number(w.elev) === p.t.elev;
  if (!cleared || !kept) { console.error(`  VERIFY FAILED ${p.t.route} "${p.t.name}"`); bad++; }
}
console.log(`\n${plan.length} cleared, ${plan.length - bad} verified.`);
process.exit(bad ? 1 : 0);
