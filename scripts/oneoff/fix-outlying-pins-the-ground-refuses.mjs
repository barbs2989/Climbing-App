// Eight pins name a place, state that place's height, and sit somewhere that height cannot be.
//
// THE SEQUEL TO fix-outlying-pins-against-the-majority, AND IT REACHES WHAT THAT ONE COULD NOT.
// That script required a MAJORITY — three or more routes carrying the name — because with two, a
// vote picks a winner at random. But the USGS 3DEP ground descends from neither record, so it needs
// no majority at all: it can settle a two-route disagreement on its own. That is exactly the shape
// of the two largest findings here, and neither was reachable before:
//
//   Obstruction Point Trailhead  2 routes, 9.4 km apart, both stating ~6,140 ft
//   Camp Handy                   2 routes, 8.6 km apart, both stating exactly 3,100 ft
//
// A TRAILHEAD IS THE WORST PIN TO GET WRONG. trailheadPoint() drives the map marker, both
// "Directions to..." buttons and the summit bearing, so a 9.4 km error sends a party to the wrong
// road — and gpxDownload writes waypoints into the GPX file they carry into the field.
//
// WHY A PIN REFUSED BY ITS OWN GROUND IS NOT AMBIGUOUS HERE. In isolation it could be the position
// OR the elevation that is wrong. What disambiguates it is the SIBLING: when another route states
// the same height (within 100 ft) at a place the ground admits, the height is the agreed fact
// across both rows and the position is the lone dissenter. Every target below satisfies that.
//
// CORROBORATED BEYOND THE DEM where the catalog allowed it, because the DEM agreeing with itself is
// one measurement, not two:
//   - Obstruction Point: BOTH routes' own approach prose independently states ~6,135-6,150 ft, and
//     the refused pin sits near where Obstruction Point Road BRANCHES OFF rather than where it ends.
//   - Camp Handy: within wa_warrior_peak_standard's OWN pin chain every other waypoint sits near
//     longitude -123.14/-123.15, and Camp Handy alone is at -123.04, off the river the trail follows.
//
// FOUR GATES, all re-asserted at apply time against the live rows:
//   1. the target still carries the pin at the coordinate this was measured against
//   2. the donor still carries the same-named pin, with an elevation within 100 ft of the target's
//   3. the ground at the DONOR's coordinate admits the elevation the target states
//   4. the ground at the TARGET's current coordinate REFUSES it
//
// Every coordinate written is READ FROM THE NAMED DONOR ROW — never a centroid, never a mode. The
// script holds route ids and pin names only, so a repair needing a coordinate the catalog does not
// already hold cannot be expressed here. The ELEVATION is never touched.
//
//   node scripts/oneoff/fix-outlying-pins-the-ground-refuses.mjs --dry
//   node scripts/oneoff/fix-outlying-pins-the-ground-refuses.mjs
import { elevationAt, offset } from "../lib/terrain.mjs";
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const TARGETS = [
  { route: "wa_mount_cameron_standard", pin: "Obstruction Point Trailhead", wasLat: 47.9738, wasLng: -123.4767, donor: "wa_mount_claywood_standard" },
  { route: "wa_warrior_peak_standard", pin: "Camp Handy", wasLat: 47.8280, wasLng: -123.0413, donor: "wa_mount_fricaba_standard" },
  { route: "wa_ptarmigan_peak_pasayten_scramble", pin: "Freds Pass", wasLat: 48.8572, wasLng: -120.5353, donor: "wa_osceola_peak_scramble" },
  // Two routes place this lake up a mountainside; four routes and the ground put it on the highway.
  { route: "wa_snowfield_peak_neve_glacier", pin: "Pyramid Lake", wasLat: 48.6899, wasLng: -121.1218, donor: "wa_pyramid_peak_colonial_standard" },
  { route: "wa_the_needle_neve_glacier", pin: "Pyramid Lake", wasLat: 48.6649, wasLng: -121.1378, donor: "wa_pyramid_peak_colonial_standard" },
  { route: "wa_tricouni_peak_southwest_slopes", pin: "McAllister Camp", wasLat: 48.5980, wasLng: -121.0790, donor: "wa_east_slope" },
  { route: "wa_sinister_peak_southwest_route", pin: "Cub Lake", wasLat: 48.3090, wasLng: -121.0548, donor: "wa_dome_peak_dome_glacier" },
  // A SUMMIT pin claiming 6,827 ft sitting on ground of ~4,200. Its own name and its own elevation
  // both say Baldy's summit; only the coordinate dissents, and the sibling agrees to within 19 ft.
  { route: "wa_gray_wolf_ridge_se_slopes", pin: "Baldy summit", wasLat: 47.8742, wasLng: -123.1903, donor: "wa_baldy_standard" },
];

// MEASURED AND DELIBERATELY NOT REPAIRED — 14 of the 21 candidates the audit reports. Recorded so
// the refusals are not re-derived as findings:
//   10  the ground ADMITS more than one coordinate, so nothing picks a winner (Luna Camp, Lake
//       Ingalls, Cub Lake Pass, Spider-Formidable Col, Lake Constance, Heart Lake, Cache Col ...)
//    3  one cluster is admitted but the rows state DIFFERENT heights, so they may be two real
//       places rather than one misplaced pin (Mary's Falls Camp, Sahale-Boston col, Hogsback Camp)
//    1  the ground REFUSES every cluster — all records suspect, none usable as a donor
// Roughly 40% of candidates are decidable, in both this batch and the previous one. That rate is
// the point: a detector whose findings all "repair" is one that is not checking anything.

const DRY = process.argv.includes("--dry");
const TOL = 300;         // the DEM agreement band used throughout this repo
const SAME_FT = 100;     // how close two rows must be to count as stating the same height
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

const ids = [...new Set(TARGETS.flatMap(t => [t.route, t.donor]))];
const rows = await selectAll("routes", "id,waypoints", `id=in.(${ids.join(",")})`, { pageSize: 200, key });
if (rows.length !== ids.length) { console.error(`asked for ${ids.length} routes, read ${rows.length} — refusing`); process.exit(1); }

const plan = [];
for (const t of TARGETS) {
  const wps = rows.find(r => r.id === t.route)?.waypoints || [];
  const i = wps.findIndex(w => norm(w.name) === norm(t.pin));
  if (i < 0) { console.error(`REFUSED ${t.route}: no pin named "${t.pin}"`); process.exit(1); }
  const w = wps[i];

  // GATE 1
  if (w.lat == null || Math.abs(+w.lat - t.wasLat) > 1e-3 || Math.abs(+w.lng - t.wasLng) > 1e-3) {
    console.log(`  skip  ${t.route} "${t.pin}": now at ${w.lat},${w.lng}, not the ${t.wasLat},${t.wasLng} this was measured against`);
    continue;
  }
  const elev = w.elev != null ? Number(w.elev) : null;
  if (!Number.isFinite(elev)) { console.error(`REFUSED ${t.route} "${t.pin}": states no elevation, so the ground cannot adjudicate it`); process.exit(1); }

  // GATE 2 — the donor must still name the same place AND agree about its height. Without the
  // height test a donor could be a different place of the same name, and the repair would move a
  // pin onto it with total confidence.
  const d = (rows.find(r => r.id === t.donor)?.waypoints || []).find(x => norm(x.name) === norm(t.pin));
  if (!d || d.lat == null) { console.error(`REFUSED ${t.route}: donor ${t.donor} no longer carries "${t.pin}" with a coordinate`); process.exit(1); }
  const dElev = d.elev != null ? Number(d.elev) : null;
  if (!Number.isFinite(dElev) || Math.abs(dElev - elev) > SAME_FT) {
    console.error(`REFUSED ${t.route} "${t.pin}": donor states ${dElev} ft against this row's ${elev} — more than ${SAME_FT} ft apart, so they may be two different places`);
    process.exit(1);
  }
  const cLat = Number(d.lat), cLng = Number(d.lng);

  // GATES 3 and 4
  const mS = await span(cLat, cLng), oS = await span(+w.lat, +w.lng);
  if (!mS || !oS) { console.error(`REFUSED ${t.route}: no DEM reading — no evidence, never agreement`); process.exit(1); }
  if (!admits(elev, mS)) { console.error(`REFUSED ${t.route} "${t.pin}": the ground at the donor (${Math.round(mS.lo)}-${Math.round(mS.hi)}) does not admit ${elev} ft`); process.exit(1); }
  if (admits(elev, oS)) { console.error(`REFUSED ${t.route} "${t.pin}": the ground where it sits now (${Math.round(oS.lo)}-${Math.round(oS.hi)}) ALSO admits ${elev} ft — nothing here says it is misplaced`); process.exit(1); }

  const moved = km([+w.lat, +w.lng], [cLat, cLng]);
  const next = wps.map((x, j) => j === i ? { ...x, lat: cLat, lng: cLng } : x);
  plan.push({ t, next, cLat, cLng, elev, moved, mS, oS });
  console.log(`  ${DRY ? "would move" : "moving   "} ${t.route}`);
  console.log(`      "${t.pin}"  ${t.wasLat},${t.wasLng} -> ${cLat},${cLng}   (${moved.toFixed(1)} km)`);
  console.log(`      states ${elev} ft; ground there ${Math.round(mS.lo)}-${Math.round(mS.hi)} ft, ground where it sat ${Math.round(oS.lo)}-${Math.round(oS.hi)} ft`);
  console.log(`      coordinate read from ${t.donor}, which states ${dElev} ft; elevation untouched`);
}

if (DRY) { console.log(`\n--dry: ${plan.length} pin(s) would be moved, nothing written.`); process.exit(0); }
if (!plan.length) { console.log("\nnothing to do — every target has already been repaired or has moved."); process.exit(0); }

// ONE PATCH PER ROUTE. patchRow rewrites the whole waypoints array, so two pins on one route
// patched from the same stale read would have the second write silently revert the first.
const byRoute = new Map();
for (const p of plan) byRoute.set(p.t.route, p.next);
for (const [id, next] of byRoute) await patchRow("routes", id, { waypoints: next });

const after = await selectAll("routes", "id,waypoints", `id=in.(${[...byRoute.keys()].join(",")})`, { pageSize: 100, key });
let bad = 0;
for (const p of plan) {
  const wps = after.find(r => r.id === p.t.route)?.waypoints || [];
  const w = wps.find(x => norm(x.name) === norm(p.t.pin));
  const lost = wps.length !== p.next.length;
  const drifted = !w || Math.abs(+w.lat - p.cLat) > 1e-6 || Math.abs(+w.lng - p.cLng) > 1e-6;
  const elevMoved = !w || Number(w.elev) !== p.elev;
  if (lost || drifted || elevMoved) {
    console.error(`  VERIFY FAILED ${p.t.route} "${p.t.pin}"${lost ? " — waypoint count changed" : ""}${elevMoved ? " — ELEVATION changed, which this repair must not do" : ""}`);
    bad++;
  }
}
console.log(`\n${plan.length} moved, ${plan.length - bad} verified.`);
process.exit(bad ? 1 : 0);
