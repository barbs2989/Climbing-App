// Four routes place a named point kilometres from where every one of their siblings places it, and
// the ground refuses the outlier while corroborating the majority.
//
// NO EXISTING AUDIT COULD SEE THIS, and the reason is structural rather than an oversight: all five
// geometric waypoint audits are scoped to ONE ROUTE — a pin against its own track
// (audit:waypoints, audit:waypoint-track), pins against each other on one route
// (audit:waypoint-geometry), a route's two copies of its own trailhead (audit:trailhead-agreement),
// a pin against its own area (audit:coord-origin). "Two routes disagree about where a named place
// is" is invisible to every one of them by construction.
//
// WHY A MAJORITY IS EVIDENCE HERE. Of the 537 waypoint names shared across WA routes, 424 (79%)
// agree within 500 m — agreement is the normal state of this data, so a multi-kilometre gap is ~20x
// the ordinary spread rather than ordinary noise. And in three of the four the outlier states the
// SAME ELEVATION as the majority to the foot (5,100 / 5,066 / 6,507), so the two rows agree about
// what the place IS and differ only about where: a copied-wrong coordinate, not a different place.
// Lake Serene is the exception at 124 ft off the majority's 2,525, which is well inside the 300 ft
// band used throughout this repo and nowhere near the 1,678 ft by which the ground refuses it.
//
// THE ELEVATION IS LEFT ALONE EVEN WHERE IT IS SLIGHTLY WRONG, and that is a scope decision rather
// than an oversight. This repair's claim is about POSITION; Lake Serene's 2,649 ft will sit on
// ground the DEM reads at 2,525 once moved, and correcting it belongs to audit:waypoint-elevations,
// which is built to adjudicate exactly that and will still see it. A repair that quietly widens to
// a second field is one nobody can review against its own stated gates.
//
// ...AND WHY THE MAJORITY IS NOT ENOUGH ON ITS OWN. Ten routes sharing an approach chain may have
// inherited one enrichment pass's coordinate, so ten agreeing records can be one claim counted ten
// times. The USGS 3DEP ground descends from none of them. That gate earned itself immediately: a
// fifth candidate, "Lake Constance" on wa_inner_constance_standard, is NOT repaired here because
// the ground admits BOTH coordinates — and in fact fits the outlier (4,667-4,776 ft) better than the
// majority (4,378-4,577 ft). On the vote alone it would have been "fixed" toward the weaker record.
//
// FOUR GATES, all re-asserted at apply time against the live rows:
//   1. the target still carries the pin at the coordinate this was measured against
//   2. the named majority routes still agree with each other within 500 m
//   3. the ground at the majority's coordinate still admits the elevation the pin states
//   4. the ground at the TARGET's current coordinate still refuses it
//
// Every coordinate written is READ FROM A NAMED DONOR ROW. The script holds route ids and pin names
// only, so a repair needing a coordinate the catalog does not already hold cannot be expressed here
// — the same structural safety as fix-trailhead-disagreements-batch4. The ELEVATION is never
// touched: these rows already state the right height, and only their position is wrong.
//
//   node scripts/oneoff/fix-outlying-pins-against-the-majority.mjs --dry
//   node scripts/oneoff/fix-outlying-pins-against-the-majority.mjs
import { elevationAt, offset } from "../lib/terrain.mjs";
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const TARGETS = [
  {
    route: "wa_honeymoon_route", pin: "Royal Lake", wasLat: 47.8779, wasLng: -123.1369,
    donor: "wa_mount_clark_standard",
    majority: ["wa_mount_clark_standard", "wa_mount_johnson_standard", "wa_mount_mystery_standard", "wa_sundial_northeast", "wa_the_incisor_scramble"],
  },
  {
    route: "wa_icy_peak_southwest_route", pin: "Hannegan Pass", wasLat: 48.8363, wasLng: -121.5284,
    donor: "wa_ruth_mountain_south_slopes",
    majority: ["wa_bear_mountain_chilliwack_north_buttress", "wa_ghost_peak_south_route", "wa_poltergeist_pinnacle", "wa_ruth_mountain_south_slopes", "wa_whatcom_peak_southwest_route"],
  },
  {
    route: "wa_mount_carru_scramble", pin: "Fred's Lake", wasLat: 48.8188, wasLng: -120.5545,
    donor: "wa_blackcap_mountain_scramble",
    majority: ["wa_blackcap_mountain_scramble", "wa_lost_peak_pasayten_scramble", "wa_mount_lago_south_slope_south_face"],
  },
  {
    route: "wa_philadelphia_mountain_scramble", pin: "Lake Serene", wasLat: 47.7977, wasLng: -121.5536,
    donor: "wa_mount_index_north_face",
    majority: ["wa_j_tnar", "wa_mount_index_north_face", "wa_mount_index_northeast_buttress"],
  },
];

// MEASURED AND DELIBERATELY NOT REPAIRED — four more names carry a majority and an outlier, and the
// ground refuses to settle them. Recorded here so the refusals are not re-derived as findings:
//   Lake Constance / wa_inner_constance_standard  — ground admits both, and fits the OUTLIER better
//   Heart Lake     / wa_mount_ferry_standard      — ground admits both; two real lakes is likely
//   Cache Col      / wa_ptarmigan_traverse        — ground admits both, on a traverse that legitimately
//                                                   meets the col at its own point
//   High Camp      / wa_mount_goode_northeast_buttress — ground refuses BOTH, and "High Camp" is a
//                                                   description rather than a name (Adams vs Goode,
//                                                   251 km apart), so there is no one place to be right
//                                                   about. Both records are suspect; neither is usable.

const DRY = process.argv.includes("--dry");
const TIGHT_KM = 0.5;   // the measured norm the majority must still satisfy
const TOL = 300;        // the DEM agreement band used throughout this repo
const key = requireServiceKey();

const norm = s => String(s || "").toLowerCase().replace(/^"+|"+$/g, "").replace(/\s+/g, " ").trim();
const km = (a, b) => {
  const R = 6371, r = d => d * Math.PI / 180;
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
const admits = (v, s) => !!s && v >= s.lo - TOL && v <= s.hi + TOL;

const ids = [...new Set(TARGETS.flatMap(t => [t.route, ...t.majority]))];
const rows = await selectAll("routes", "id,waypoints", `id=in.(${ids.join(",")})`, { pageSize: 200, key });
if (rows.length !== ids.length) { console.error(`asked for ${ids.length} routes, read ${rows.length} — refusing`); process.exit(1); }

const plan = [];
for (const t of TARGETS) {
  const wps = rows.find(r => r.id === t.route)?.waypoints || [];
  const i = wps.findIndex(w => norm(w.name) === norm(t.pin));
  if (i < 0) { console.error(`REFUSED ${t.route}: no pin named "${t.pin}"`); process.exit(1); }
  const w = wps[i];

  // GATE 1 — still the row this was measured against. A repaired or moved pin is a skip, not a write.
  if (w.lat == null || Math.abs(+w.lat - t.wasLat) > 1e-3 || Math.abs(+w.lng - t.wasLng) > 1e-3) {
    console.log(`  skip  ${t.route} "${t.pin}": now at ${w.lat},${w.lng}, not the ${t.wasLat},${t.wasLng} this was measured against`);
    continue;
  }
  const elev = w.elev != null ? Number(w.elev) : null;
  if (!Number.isFinite(elev)) { console.error(`REFUSED ${t.route} "${t.pin}": states no elevation, so the ground cannot adjudicate it`); process.exit(1); }

  // GATE 2 — the majority must still BE a majority, agreeing with each other.
  const peers = t.majority.map(id => {
    const p = (rows.find(r => r.id === id)?.waypoints || []).find(x => norm(x.name) === norm(t.pin));
    return p && p.lat != null ? { id, lat: +p.lat, lng: +p.lng, elev: p.elev != null ? +p.elev : null } : null;
  });
  if (peers.some(p => !p)) { console.error(`REFUSED ${t.route}: a named majority route no longer carries "${t.pin}" with a coordinate`); process.exit(1); }

  // ONE NAMED DONOR ROW, NEVER A CENTROID OR A MODE. Averaging the majority would mint a coordinate
  // no row in the catalog holds — precisely the fabrication this data already carries 346 examples
  // of, committed by the repair rather than by an enrichment pass. A mode does not work either, and
  // measuring showed why: the agreeing routes store the SAME POINT AT DIFFERENT PRECISIONS
  // (48.8829219, 48.883737, 48.8837, 48.88374 ...), all within ~100 m, so no two are byte-equal and
  // an exact-match mode refuses a unanimous cluster. So the value is copied verbatim from ONE row
  // named here, and the majority's job is to be the EVIDENCE that that row is right.
  const src = peers.find(p => p.id === t.donor);
  if (!src) { console.error(`REFUSED ${t.route}: donor ${t.donor} is not among the majority routes`); process.exit(1); }
  const cLat = src.lat, cLng = src.lng;
  const spread = Math.max(...peers.map(p => km([cLat, cLng], [p.lat, p.lng])));
  if (spread > TIGHT_KM) { console.error(`REFUSED ${t.route}: the majority no longer agrees with itself (${spread.toFixed(2)} km spread)`); process.exit(1); }

  // GATES 3 and 4 — the ground must corroborate the majority AND refuse where the pin sits now.
  const mS = await span(cLat, cLng), oS = await span(+w.lat, +w.lng);
  if (!mS || !oS) { console.error(`REFUSED ${t.route}: no DEM reading — no evidence, never agreement`); process.exit(1); }
  if (!admits(elev, mS)) { console.error(`REFUSED ${t.route} "${t.pin}": the ground at the majority (${Math.round(mS.lo)}-${Math.round(mS.hi)}) does not admit ${elev} ft`); process.exit(1); }
  if (admits(elev, oS)) { console.error(`REFUSED ${t.route} "${t.pin}": the ground where it sits now (${Math.round(oS.lo)}-${Math.round(oS.hi)}) ALSO admits ${elev} ft — these may be two real places, and the majority has no right to pick`); process.exit(1); }

  const moved = km([+w.lat, +w.lng], [cLat, cLng]);
  const next = wps.map((x, j) => j === i ? { ...x, lat: cLat, lng: cLng } : x);
  plan.push({ t, next, cLat, cLng, elev, moved, mS, oS });
  console.log(`  ${DRY ? "would move" : "moving   "} ${t.route}`);
  console.log(`      "${t.pin}"  ${t.wasLat},${t.wasLng} -> ${cLat.toFixed(4)},${cLng.toFixed(4)}   (${moved.toFixed(1)} km)`);
  console.log(`      states ${elev} ft; ground there ${Math.round(mS.lo)}-${Math.round(mS.hi)} ft, ground where it sat ${Math.round(oS.lo)}-${Math.round(oS.hi)} ft`);
  console.log(`      coordinate read from ${peers.length} agreeing routes, elevation untouched`);
}

if (DRY) { console.log(`\n--dry: ${plan.length} pin(s) would be moved, nothing written.`); process.exit(0); }
if (!plan.length) { console.log("\nnothing to do — every target has already been repaired or has moved."); process.exit(0); }

for (const p of plan) await patchRow("routes", p.t.route, { waypoints: p.next });

const after = await selectAll("routes", "id,waypoints", `id=in.(${[...new Set(TARGETS.map(t => t.route))].join(",")})`, { pageSize: 100, key });
let bad = 0;
for (const p of plan) {
  const wps = after.find(r => r.id === p.t.route)?.waypoints || [];
  const w = wps.find(x => norm(x.name) === norm(p.t.pin));
  // Check the whole row, not only the pin edited: the risk a per-pin check cannot see is a
  // NEIGHBOUR that moved, and the elevation this repair promised not to touch.
  const lost = wps.length !== p.next.length;
  const drifted = !w || Math.abs(+w.lat - p.cLat) > 1e-3 || Math.abs(+w.lng - p.cLng) > 1e-3;
  const elevMoved = !w || Number(w.elev) !== p.elev;
  if (lost || drifted || elevMoved) {
    console.error(`  VERIFY FAILED ${p.t.route} "${p.t.pin}"${lost ? " — waypoint count changed" : ""}${elevMoved ? " — ELEVATION changed, which this repair must not do" : ""}`);
    bad++;
  }
}
console.log(`\n${plan.length} moved, ${plan.length - bad} verified.`);
process.exit(bad ? 1 : 0);
