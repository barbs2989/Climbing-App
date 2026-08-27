// Nine trailhead pins state an elevation the ground under them refuses, while the catalog already
// holds the right number on a sibling route.
//
// These are the mirror of the borrowed-coordinate class: there the coordinate was the copied half,
// here the COORDINATE IS RIGHT AND THE NUMBER IS WRONG. Canyon Creek is the case CLAUDE.md already
// names by hand — "Canyon Creek Trailhead's pin is right and its 6,760 ft is wrong" — and the same
// shape turns out to run through eight more.
//
// THREE GATES, and the third is the one that matters. A same-name donor elevation alone is not
// enough: if the target's COORDINATE is also wrong, writing a good number onto it merely makes a
// wrong pin internally CONSISTENT, which is worse than leaving two records visibly in conflict. So
// the donor's elevation must sit on the ground AT THE TARGET'S OWN COORDINATE. When it does, the pin
// is exactly where a place of that height is, and only the number was wrong.
//
//   1. the live row still states the elevation this repair was measured against
//   2. the donor route still stores the replacement value under the identical name
//   3. the USGS 3DEP ground at the target's own pin still admits the replacement (+/-300 ft)
//
// Every value written is READ FROM ANOTHER ROW, never typed: the script holds route ids and names,
// so a repair needing a number the catalog does not already hold cannot be expressed here.
//
// Applied 2026-08-27; re-running is a no-op, since gate 1 refuses a row already carrying the
// corrected value.
//
//   node scripts/oneoff/fix-trailhead-elevations-from-a-corroborated-sibling.mjs --dry
//   node scripts/oneoff/fix-trailhead-elevations-from-a-corroborated-sibling.mjs
import { elevationAt, offset } from "../lib/terrain.mjs";
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const TARGETS = [
  { route: "wa_mount_ballard_south",            pin: "Canyon Creek Trailhead",     was: 6760, donor: "wa_crater_mountain_standard_route" },
  { route: "wa_bacon_peak_diobsud",             pin: "Watson Lakes Trailhead",     was: 800,  donor: "wa_mount_watson_scramble" },
  { route: "wa_hagan_mountain_south",           pin: "Baker River Trailhead",      was: 4200, donor: "wa_mount_blum_north_ridge" },
  { route: "wa_mount_rainier_willis_wall",      pin: "White River Campground",     was: 2320, donor: "wa_mount_rainier_curtis_ridge" },
  { route: "wa_mount_larrabee_south_ridge",     pin: "Twin Lakes Trailhead",       was: 3700, donor: "wa_american_border_peak_southeast_face" },
  { route: "wa_mount_stuart_cascadian_couloir", pin: "Esmeralda Basin Trailhead",  was: 3200, donor: "wa_mount_stuart_west_ridge" },
  { route: "wa_energizer_bunny",                pin: "Stuart Lake Trailhead",      was: 1300, donor: "wa_argonaut_peak_northeast_couloir" },
  { route: "wa_beckey_davis",                   pin: "Stuart Lake Trailhead",      was: 1300, donor: "wa_argonaut_peak_northeast_couloir" },
  { route: "wa_stanley_burgner",                pin: "Stuart Lake Trailhead",      was: 1300, donor: "wa_argonaut_peak_northeast_couloir" },
];

const DRY = process.argv.includes("--dry");
const TOL = 300;
const key = requireServiceKey();
// `wa_stanley_burgner` stores its pin name wrapped in literal quote characters, so normalise them
// off. Left in the DATA deliberately — it renders as "Stuart Lake Trailhead" with the quotes visible
// and is a separate defect, and silently rewriting a name while repairing an elevation would hide it.
const norm = s => String(s || "").toLowerCase().replace(/^"+|"+$/g, "").replace(/\s+/g, " ").trim();

const ids = [...new Set([...TARGETS.map(t => t.route), ...TARGETS.map(t => t.donor)])];
const rows = await selectAll("routes", "id,waypoints", `id=in.(${ids.join(",")})`, { pageSize: 100, key });
if (rows.length !== ids.length) { console.error(`asked for ${ids.length} routes, read ${rows.length} — refusing`); process.exit(1); }

const plan = [];
for (const t of TARGETS) {
  const wps = rows.find(r => r.id === t.route)?.waypoints || [];
  const i = wps.findIndex(w => norm(w.name) === norm(t.pin));
  if (i < 0) { console.error(`REFUSED ${t.route}: no pin named "${t.pin}"`); process.exit(1); }
  const w = wps[i];
  if (Number(w.elev) !== t.was) { console.log(`  skip  ${t.route} "${t.pin}": states ${w.elev} ft, not the ${t.was} this was measured against — already repaired, or the row has moved`); continue; }
  if (w.lat == null || w.lng == null) { console.error(`REFUSED ${t.route} "${t.pin}": unplaced, so no ground can corroborate it`); process.exit(1); }

  // GATE 2 — the replacement value is read from the donor row, never typed here.
  const dPin = (rows.find(r => r.id === t.donor)?.waypoints || []).find(x => norm(x.name) === norm(t.pin));
  const now = dPin ? Number(dPin.elev) : NaN;
  if (!Number.isFinite(now)) { console.error(`REFUSED ${t.route}: donor ${t.donor} no longer carries "${t.pin}" with an elevation`); process.exit(1); }
  if (Math.abs(now - t.was) < 200) { console.error(`REFUSED ${t.route}: donor now states ${now} ft, within 200 ft of the stored value — not a defect`); process.exit(1); }

  // GATE 3 — the ground at the TARGET's own pin must admit the replacement, or the coordinate is
  // wrong too and this write would only make a misplaced pin self-consistent.
  const at = await elevationAt(+w.lat, +w.lng);
  const ring = [];
  for (const b of [0, 90, 180, 270]) { const [y, x] = offset(+w.lat, +w.lng, 150, b); ring.push(await elevationAt(y, x)); }
  const k = ring.filter(v => v != null);
  if (at == null) { console.error(`REFUSED ${t.route}: no DEM reading — no evidence, never agreement`); process.exit(1); }
  const lo = Math.min(at, ...k), hi = Math.max(at, ...k);
  if (!(now >= lo - TOL && now <= hi + TOL)) {
    console.error(`REFUSED ${t.route} "${t.pin}": ${now} ft is outside the ground at its own coordinate (${Math.round(lo)}-${Math.round(hi)}) — the COORDINATE is wrong too, so writing this would only make it consistent`);
    process.exit(1);
  }

  plan.push({ t, next: wps.map((x, j) => j === i ? { ...x, elev: now } : x), now, lo: Math.round(lo), hi: Math.round(hi) });
  console.log(`  ${DRY ? "would set" : "setting "} ${t.route}`);
  console.log(`      "${t.pin}"  ${t.was} -> ${now} ft   ground at its own pin ${Math.round(lo)}-${Math.round(hi)} ft, value read from ${t.donor}`);
}

if (DRY) { console.log(`\n--dry: ${plan.length} pin(s) would be corrected, nothing written.`); process.exit(0); }
if (!plan.length) { console.log("\nnothing to do — every target already carries its corrected value."); process.exit(0); }

// ONE PATCH PER ROUTE. patchRow rewrites the entire waypoints array, so two pins on one route
// patched from the same stale read would have the second write silently revert the first.
for (const p of plan) await patchRow("routes", p.t.route, { waypoints: p.next });

const after = await selectAll("routes", "id,waypoints", `id=in.(${[...new Set(TARGETS.map(t => t.route))].join(",")})`, { pageSize: 100, key });
let bad = 0;
for (const p of plan) {
  const wps = after.find(r => r.id === p.t.route)?.waypoints || [];
  const w = wps.find(x => norm(x.name) === norm(p.t.pin));
  // Check EVERY pin on a touched route, not just the one edited: the risk a per-pin check cannot
  // see is a NEIGHBOUR that moved.
  const lost = wps.length !== p.next.length;
  if (!w || Number(w.elev) !== p.now || lost) { console.error(`  VERIFY FAILED ${p.t.route} "${p.t.pin}"${lost ? " — waypoint count changed" : ""}`); bad++; }
}
console.log(`\n${plan.length} corrected, ${plan.length - bad} verified.`);
process.exit(bad ? 1 : 0);
