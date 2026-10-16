// FOUR ROUTES PUT LAKE CONSTANCE 2.9 KM FROM LAKE CONSTANCE.
//
// audit:cross-route-pins reports the disagreement and deliberately refuses to pick, because "a
// majority can be one enrichment pass counted many times". adjudicate-cross-route-pins.mjs settles
// it with a record that descends from neither: the gazetteer's own "Lake Constance", with the
// distance gate this catalog arrived at today.
//
//   wa_inner_constance_standard      29 m from the gazetteer feature   CORROBORATED
//   four Mount Constance routes    2856 m                              MISPLACED
//
// AND THE ROUTES' OWN PROSE CONFIRMS THEY MEAN THAT LAKE. All four describe walking the closed
// Dosewallips River Road to "the unsigned, unmaintained LAKE CONSTANCE climbers' trail" and up it.
// A pin named for a lake the route climbs past belongs at the lake.
//
// THE MIRROR CASE IS NOT REPAIRED, and it is why the prose check is not ceremony. Three Mount
// Stuart routes place "Lake Ingalls" 3,203 m from Lake Ingalls — and NONE of them mentions the lake
// anywhere in its prose. Their pin sits near Longs Pass, so it is plausibly a DIFFERENT place
// carrying the wrong name, where the repair is a rename and not a move. Moving it would put a
// correct point at a wrong one. Same discipline as the two Cascade Pass pins that merely mention
// Pelton Basin.
//
// THE REPAIR COPIES A SIBLING'S COORDINATE — no latitude or longitude appears in this file, so a
// repair needing a coordinate the catalog does not already hold cannot be expressed. That is the
// "declare a winner, never a coordinate" contract the trailhead batches run on.
//
// Only the COORDINATE moves. The elevations differ by 50 ft (4,750 against 4,800), which is below
// what the DEM can resolve on this ground and is not what is being repaired; rewriting it would be
// a second, unevidenced change riding along with the first.
import { SUPABASE_URL, requireServiceKey, headers, patchRow, selectAll } from "../lib/supabase-env.mjs";
import { elevationAt } from "../lib/terrain.mjs";

const DONOR = "wa_inner_constance_standard";
const NAME = "Lake Constance";
const TARGETS = [
  "wa_mount_constance_finger_traverse",
  "wa_mount_constance_north_chimney",
  "wa_mount_constance_terrible_traverse",
  "wa_mount_constance_west_arete",
];
const EXPECT_FAR_M = 2856;      // what the adjudicator measured
const TOL_M = 200;

const T = Math.PI / 180;
const metres = (a, b) => 2 * 6371000 * Math.asin(Math.sqrt(
  Math.sin((b.lat - a.lat) * T / 2) ** 2 +
  Math.cos(a.lat * T) * Math.cos(b.lat * T) * Math.sin((b.lng - a.lng) * T / 2) ** 2));

const H = headers(requireServiceKey());
const get = async (id) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints&id=eq.${id}`, { headers: H });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const j = await r.json();
  if (j.length !== 1) throw new Error(`${id}: ${j.length} rows`);
  return j[0];
};
const findWp = (row) => {
  const wps = Array.isArray(row.waypoints) ? row.waypoints : [];
  const i = wps.findIndex((w) => w && String(w.name || "").trim() === NAME);
  return { wps, i, w: i < 0 ? null : wps[i] };
};

const donorRow = await get(DONOR);
const d = findWp(donorRow);
if (!d.w) { console.log(`REFUSED — donor ${DONOR} has no "${NAME}" waypoint`); process.exit(1); }
const donor = { lat: Number(d.w.lat), lng: Number(d.w.lng) };
if (!Number.isFinite(donor.lat) || !Number.isFinite(donor.lng)) {
  console.log("REFUSED — donor pin has no coordinate"); process.exit(1);
}

// The donor must still be the corroborated one. Re-asserted at apply time rather than trusted:
// if it has moved, the whole argument is gone.
const q = "https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=us&q=" +
  encodeURIComponent(NAME);
const r = await fetch(q, { headers: { "User-Agent": "climbing-app-pin-adjudicator" } });
const feats = r.ok ? await r.json() : [];
const wa = feats.map((f) => ({ lat: Number(f.lat), lng: Number(f.lon), name: String(f.display_name).split(",")[0] }))
  .filter((f) => f.name.toLowerCase() === NAME.toLowerCase()
    && f.lat > 45.4 && f.lat < 49.1 && f.lng > -124.9 && f.lng < -116.8);
if (wa.length !== 1) { console.log(`REFUSED — ${wa.length} gazetteer features named "${NAME}" in WA`); process.exit(1); }
const dGaz = metres(donor, wa[0]);
console.log(`donor ${DONOR} is ${Math.round(dGaz)} m from the gazetteer feature`);
if (dGaz > 250) { console.log("REFUSED — the donor is no longer corroborated."); process.exit(1); }

const ground = Math.round(await elevationAt(donor.lat, donor.lng));
console.log(`ground at the donor pin: ${ground} ft`);

const plan = [];
for (const id of TARGETS) {
  const row = await get(id);
  const t = findWp(row);
  if (!t.w) { console.log(`REFUSED — ${id} has no "${NAME}" waypoint`); process.exit(1); }
  const here = { lat: Number(t.w.lat), lng: Number(t.w.lng) };
  const off = metres(here, donor);
  if (Math.abs(off - EXPECT_FAR_M) > TOL_M) {
    console.log(`REFUSED — ${id} is ${Math.round(off)} m from the donor, expected ~${EXPECT_FAR_M}. It has moved.`);
    process.exit(1);
  }
  // keep the row's own elevation: it must at least be plausible for the donor's ground
  const elev = t.w.elev == null ? null : Number(t.w.elev);
  if (elev != null && Math.abs(elev - ground) > 400) {
    console.log(`REFUSED — ${id} states ${elev} ft, which the donor's ground (${ground}) refuses.`);
    process.exit(1);
  }
  plan.push({ id, row, ...t, off });
  console.log(`  ${id}: ${Math.round(off)} m off, states ${elev ?? "—"} ft`);
}

if (!process.argv.includes("--apply")) {
  console.log(`\ndry run — would move ${plan.length} pin(s) onto the donor's coordinate`);
  process.exit(0);
}

let wrote = 0;
for (const p of plan) {
  const next = JSON.parse(JSON.stringify(p.wps));
  next[p.i] = { ...next[p.i], lat: donor.lat, lng: donor.lng };
  await patchRow("routes", p.id, { waypoints: next });
  wrote++;
}
console.log(`\nmoved ${wrote} pin(s); re-reading to reconcile`);
let ok = 0;
for (const p of plan) {
  const back = findWp(await get(p.id)).w;
  if (back && Number(back.lat) === donor.lat && Number(back.lng) === donor.lng) ok++;
  else console.log(`  MISMATCH ${p.id}`);
}
console.log(`verified ${ok}/${plan.length}`);
process.exitCode = ok === plan.length ? 0 : 1;
