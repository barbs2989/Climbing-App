// Four peaks whose own routes put the summit on the flank, repaired against three records.
//
// `audit:summit-splits` reports SIX WA peaks where two pins make one claim and stand on ground
// 250 ft or more apart, and it deliberately refuses to say which is wrong: a majority can be one
// enrichment pass counted many times. This picks a winner only where three records that share no
// input agree — the USGS 3DEP GROUND, the GNIS GAZETTEER, and the peak's own `areas` row — and
// leaves the other two reported.
//
//   North Early Winters Spire   4 routes at 48.514,-120.655       ground 7,096  (states 7,760)
//                               2 routes at 48.51291,-120.65557   ground 7,709  8 m from the area
//   Mount Baker                 6 routes at 48.777,-121.813       ground 10,397 (states 10,781)
//                               3 routes at 48.776797,-121.814467 ground 10,766 0 m from the area
//   Gilbert Peak                1 route  at 46.48833,-121.40694   ground 7,846  (states 8,184)
//                               2 routes at 46.488625,-121.408385 ground 8,106  0 m from the area
//   Guye Peak                   2 routes at 47.442,-121.411       ground 4,227  (states 5,168)
//                               1 route  at 47.442945,-121.409145 ground 5,167  0 m from the area
//
// EVERY DONOR'S GROUND MATCHES THE PEAK'S OWN STATED ELEVATION and every replaced coordinate
// stands hundreds of feet below it with higher ground around it. That is not a vote — the terrain
// is a record neither pin derives from, and the gazetteer is a third.
//
// TWO ARE DELIBERATELY LEFT, and the reasons are the point:
//   Mount Stuart      SIX distinct coordinates for one summit, ground 9,416 down to 8,870, nearly
//                     all stating 9,415. There is no single wrong cluster to move; sorting it out
//                     is a per-route reading, not a copy.
//   Burgundy Spire    a climbers' name — GNIS holds no feature for it — so the third record this
//                     script rests on does not exist. The ground alone leans the same way, and
//                     leaning is not the bar here.
//
// AND GUYE PEAK CARRIES A RESIDUAL THAT IS STATED RATHER THAN SWEPT. The gazetteer's Guye Peak
// sits 2 m from a DIFFERENT cluster (`wa_guye_peak_r1`, ground 5,140) and 101 m from the donor
// used here, while the donor is the one matching the area row and the stated 5,168 ft to a foot.
// Those two are 106 m and 27 ft apart — inside this instrument's own noise — so which of THEM is
// the better summit pin is a separate, much smaller question. What is settled is that the cluster
// being moved stands 941 ft below either of them.
//
// IT MOVES PINS BY NAME, NOT BY COORDINATE, AND ON GUYE THE THIRD PIN AT THAT COORDINATE IS THE
// MECHANISM. `wa_blood_sport` carries a correctly-typed Topout, "Blood Sport crag" at 3,400 ft,
// at exactly 47.442,-121.411 — and `wa_south_gully_south_spur` and `wa_south_rib` put their
// "Guye Peak" SUMMIT pin on that same coordinate. Two routes' summit is the crag's topout,
// copied. The crag pin itself is correct and is left alone; only the two summit claims move.
//
// `wa_blood_sport`'s OWN "Guye Peak" summit pin is deliberately not touched either. It sits at
// 47.4415,-121.4093, which `wa_guye_peak_improbable_traverse` independently names "Guye Peak
// summit (south summit, has the summit register)" — a real, named, lower feature. Whether that
// pin means the south summit or the main one is a question about the NAME, not the coordinate,
// and this script only ever moves coordinates.
//
// DECLARE A DONOR ROW, NEVER A COORDINATE. Every surviving latitude and longitude is read off the
// donor pin at run time, so nothing here can be invented and a repair needing a coordinate the
// catalog does not already hold cannot be expressed at all.
//
// A REFUSAL SAYING "the ground could not be read" IS THE SERVICE, NOT THE DATA. USGS 3DEP goes
// unavailable under load and `elevationAt` returns null after its retries — the run then refuses
// every peak and writes nothing, which is correct and is the whole reason terrain.mjs returns
// null rather than 0. Re-run it; do not read it as a finding about the catalog, and do not
// weaken the gate to get past it.
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { elevationAt, summitProbe } from "../lib/terrain.mjs";
import { gnis } from "./probe-gnis-reachable.mjs";

const APPLY = process.argv.includes("--apply");

const PEAKS = [
  { area: "wa_north_early_winters_spire", pin: "North Early Winters Spire",
    donor: { id: "wa_flycatcher_buttress", lat: 48.51291, lng: -120.65557 },
    wrong: [
      { id: "wa_chockstone_route", lat: 48.514, lng: -120.655 },
      { id: "wa_early_winter_couloir", lat: 48.514, lng: -120.655 },
      { id: "wa_labor_pains", lat: 48.514, lng: -120.655 },
      { id: "wa_the_west_face", lat: 48.514, lng: -120.655 },
    ],
    // GNIS holds the group as one Pillar; the spires themselves are not separately named.
    gnis: { term: "EARLY WINTER", box: [-120.70, 48.48, -120.61, 48.55] } },

  { area: "wa_mount_baker", pin: "Mount Baker Summit",
    donor: { id: "wa_mount_baker_boulder_glacier", lat: 48.776797, lng: -121.814467, pin: "Mt. Baker summit (Grant Peak)" },
    wrong: [
      { id: "wa_mount_baker_boulder_park_cleaver", lat: 48.777, lng: -121.813 },
      { id: "wa_mount_baker_cockscomb_ridge", lat: 48.777, lng: -121.813 },
      { id: "wa_mount_baker_coleman_headwall", lat: 48.777, lng: -121.813 },
      { id: "wa_mount_baker_easton_glacier", lat: 48.777, lng: -121.813 },
      { id: "wa_mount_baker_north_ridge", lat: 48.777, lng: -121.813 },
      { id: "wa_mount_baker_squak_glacier", lat: 48.777, lng: -121.813 },
    ],
    gnis: { term: "BAKER", box: [-121.90, 48.72, -121.72, 48.83] } },

  { area: "wa_gilbert_peak", pin: "Gilbert Peak summit",
    donor: { id: "wa_gilbert_peak_conrad_glacier", lat: 46.488625, lng: -121.408385, pin: "Summit" },
    wrong: [{ id: "wa_gilbert_peak_west_route", lat: 46.48833, lng: -121.40694 }],
    gnis: { term: "GILBERT", box: [-121.46, 46.44, -121.36, 46.53] } },

  { area: "wa_guye_peak", pin: "Guye Peak",
    donor: { id: "wa_guye_peak_southeast_gully", lat: 47.442945, lng: -121.409145, pin: "Guye Peak summit" },
    wrong: [
      { id: "wa_south_gully_south_spur", lat: 47.442, lng: -121.411 },
      { id: "wa_south_rib", lat: 47.442, lng: -121.411 },
    ],
    gnis: { term: "GUYE", box: [-121.46, 47.40, -121.36, 47.48] } },
];

const MIN_DROP_FT = 250;    // audit:waypoint-elevations' own FLOOR_FT — inside this the grid is noise
const DONOR_TOL_FT = 200;   // how far the donor's ground may sit below the peak's stated elevation
const AREA_TOL_M = 25;      // the donor must be the pin the area row corroborates

const num = (v) => { const n = Number(v); return v !== null && v !== "" && Number.isFinite(n) ? n : null; };
const near = (a, b) => a != null && b != null && Math.abs(a - b) < 1e-6;
const D = (a, b, c, d) => {
  const R = 6371000, t = (x) => x * Math.PI / 180, dp = t(c - a), dl = t(d - b);
  const h = Math.sin(dp / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const IDS = [...new Set(PEAKS.flatMap((p) => [p.donor.id, ...p.wrong.map((w) => w.id)]))];
const AREAS = PEAKS.map((p) => p.area);
const KEY = APPLY ? requireServiceKey() : anonKey();
const rurl = `${SUPABASE_URL}/rest/v1/routes?id=in.(${IDS.join(",")})&select=id,area_id,waypoints`;
const rr = await fetch(rurl, { headers: headers(KEY) });
if (!rr.ok) { console.error(`read failed: ${rr.status} ${await rr.text()}`); process.exit(1); }
const rows = await rr.json();
if (rows.length !== IDS.length) { console.error(`read ${rows.length} row(s) for ${IDS.length} id(s) - refusing`); process.exit(1); }
const byId = new Map(rows.map((x) => [x.id, x]));

const ar = await fetch(`${SUPABASE_URL}/rest/v1/areas?id=in.(${AREAS.join(",")})&select=id,name,lat,lng,elevation_ft`, { headers: headers(KEY) });
const areas = new Map((await ar.json()).map((a) => [a.id, a]));
if (areas.size !== AREAS.length) { console.error(`read ${areas.size} area(s) for ${AREAS.length} - refusing`); process.exit(1); }

const pinAt = (id, area, name) => {
  const row = byId.get(id);
  if (row.area_id !== area) return { err: `${id}: filed on ${row.area_id}, not ${area}` };
  const wps = row.waypoints;
  if (!Array.isArray(wps)) return { err: `${id}: waypoints is not an array` };
  const hits = wps.map((w, i) => ({ w, i })).filter(({ w }) =>
    String((w || {}).name || "").trim() === name && /summit|topout/i.test(String((w || {}).type || "")));
  if (hits.length !== 1) return { err: `${id}: expected exactly 1 summit pin named "${name}", found ${hits.length}` };
  return hits[0];
};

const refusals = [], staged = [], reports = [];
for (const p of PEAKS) {
  const area = areas.get(p.area);
  const aLat = num(area.lat), aLng = num(area.lng), aFt = num(area.elevation_ft);
  if (aLat == null || aLng == null || aFt == null) { refusals.push(`${p.area}: area row carries no coordinate or elevation`); continue; }

  const d = pinAt(p.donor.id, p.area, p.donor.pin || p.pin);
  if (d.err) { refusals.push(d.err); continue; }
  const dLat = num(d.w.lat), dLng = num(d.w.lng);
  if (!near(dLat, p.donor.lat) || !near(dLng, p.donor.lng)) { refusals.push(`${p.donor.id}: donor pin has moved (now ${dLat},${dLng})`); continue; }
  const dFromArea = D(dLat, dLng, aLat, aLng);
  if (!(dFromArea <= AREA_TOL_M)) { refusals.push(`${p.donor.id}: donor is ${Math.round(dFromArea)} m from the area row, which no longer corroborates it`); continue; }

  /* THE CHEAP DECLARED-STATE CHECKS COME FIRST, and getting that order wrong cost a run. Every
     pin this repair moves is declared with the coordinate it is expected to be AT, so once the
     repair has been applied those declarations no longer match and the run must refuse — which
     it did, after paying for ~40 3DEP readings and two gazetteer queries to find out. Order the
     free assertions ahead of the expensive ones: the same lesson check:clickable records for its
     own exiting blocks, one script over. */
  const staged0 = [];
  for (const w of p.wrong) {
    const t0 = pinAt(w.id, p.area, p.pin);
    if (t0.err) { refusals.push(t0.err); continue; }
    if (!near(num(t0.w.lat), w.lat) || !near(num(t0.w.lng), w.lng)) {
      refusals.push(`${w.id}: pin has moved (now ${num(t0.w.lat)},${num(t0.w.lng)}) — already repaired, or a different fix has run`); continue;
    }
    staged0.push(w.id);
  }
  if (staged0.length !== p.wrong.length) continue;

  /* THE GROUND, re-measured rather than quoted from the header above. A reading that cannot be
     obtained REFUSES: no evidence is not the same as a healthy pin, which is the rule
     terrain.mjs itself is built on. */
  /* The ground test measures ONE coordinate, so every entry in `wrong` must BE that coordinate.
     Without this a second cluster added later would be moved on evidence gathered about the
     first — the shape where a gate looks present and covers half of what it names. */
  const wLats = new Set(p.wrong.map((w) => `${w.lat},${w.lng}`));
  if (wLats.size !== 1) { refusals.push(`${p.area}: the wrong list holds ${wLats.size} distinct coordinates, and the ground is measured at one`); continue; }
  /* PATIENT, because this script REFUSES on a null rather than reporting one. 3DEP is
     intermittently unavailable under load and a nine-point probe needs all nine, so at the
     default four tries a clean run is a coin flip and two consecutive attempts refused on
     different peaks. More retries is not a weaker gate — the gate is still "no reading, no
     write"; it is a more patient measurement. */
  const TRIES = 12;
  const dGround = await elevationAt(dLat, dLng, TRIES);
  const wGround = await summitProbe(p.wrong[0].lat, p.wrong[0].lng, TRIES);
  if (dGround == null || wGround.centre == null) { refusals.push(`${p.area}: the ground could not be read (${dGround == null ? "donor" : "target"})`); continue; }
  if (!(dGround >= aFt - DONOR_TOL_FT)) { refusals.push(`${p.area}: the donor stands on ${Math.round(dGround)} ft against a stated ${aFt} ft — it is not the summit either`); continue; }
  const drop = dGround - wGround.centre;
  if (!(drop >= MIN_DROP_FT)) { refusals.push(`${p.area}: the ground separates the two by only ${Math.round(drop)} ft`); continue; }
  if (wGround.isMax === true) { refusals.push(`${p.area}: the coordinate being replaced is a LOCAL MAXIMUM on the ground, which is what a summit looks like`); continue; }

  /* THE GAZETTEER, a record neither the pins nor the terrain produced. Required to prefer the
     donor; a peak it does not hold is not repaired here at all (see Burgundy Spire above). */
  let gDonor = null, gWrong = null, gName = null;
  let hits = [];
  for (const layer of [5, 7]) { try { hits = hits.concat(await gnis(p.gnis.term, p.gnis.box, layer)); } catch { /* refused below */ } }
  /* SEVERAL FEATURES OF ONE NAME IS A REFUSAL, NOT A PICK. Taking hits[0] would let the query's
     arbitrary ordering choose the record that adjudicates a coordinate — the failure this repo
     records for the camp solver, where a namesake 70 km away nearly supplied an elevation.
     Distinct NAMES are what matter: the same feature returned by both layers is one hit. */
  const summits = hits.filter((h) => /summit|pillar/i.test(h.cls || ""));
  const distinct = new Map(summits.map((h) => [String(h.name).toLowerCase().replace(/[^a-z]/g, ""), h]));
  if (distinct.size > 1) { refusals.push(`${p.area}: the gazetteer holds ${distinct.size} summit-like features near "${p.gnis.term}" (${[...distinct.values()].map((h) => h.name).join(", ")}) — ambiguous, so it adjudicates nothing`); continue; }
  const feat = [...distinct.values()][0];
  if (!feat) { refusals.push(`${p.area}: the gazetteer holds no summit-like feature for "${p.gnis.term}" — this script's third record is missing`); continue; }
  gName = feat.name;
  gDonor = D(dLat, dLng, feat.lat, feat.lng);
  gWrong = D(p.wrong[0].lat, p.wrong[0].lng, feat.lat, feat.lng);
  if (!(gDonor < gWrong)) { refusals.push(`${p.area}: the gazetteer's "${gName}" is CLOSER to the coordinate being replaced (${Math.round(gWrong)} m) than to the donor (${Math.round(gDonor)} m)`); continue; }

  const moved = [];
  for (const w of p.wrong) {
    const t = pinAt(w.id, p.area, p.pin);
    if (t.err) { refusals.push(t.err); continue; }
    const tLat = num(t.w.lat), tLng = num(t.w.lng);
    if (!near(tLat, w.lat) || !near(tLng, w.lng)) { refusals.push(`${w.id}: pin has moved (now ${tLat},${tLng})`); continue; }
    const next = byId.get(w.id).waypoints.slice();
    next[t.i] = Object.assign({}, t.w, { lat: d.w.lat, lng: d.w.lng });
    moved.push({ id: w.id, from: `${tLat},${tLng}`, dist: D(tLat, tLng, dLat, dLng), next });
  }
  if (moved.length !== p.wrong.length) { refusals.push(`${p.area}: staged ${moved.length} of ${p.wrong.length}`); continue; }
  staged.push(...moved);
  reports.push({ p, area, aFt, dLat, dLng, dGround, wGround, drop, gName, gDonor, gWrong, moved });
}

if (refusals.length) { console.error(`REFUSED - ${refusals.length} problem(s):\n  ` + refusals.join("\n  ")); process.exit(1); }
if (staged.length !== PEAKS.reduce((n, p) => n + p.wrong.length, 0)) { console.error("REFUSED - not every declared pin staged"); process.exit(1); }

for (const r of reports) {
  console.log(`\n### ${r.area.name} (${r.p.area}) states ${r.aFt} ft`);
  console.log(`   donor  ${r.dLat},${r.dLng}  ground ${Math.round(r.dGround)} ft`);
  console.log(`   moving ${r.p.wrong[0].lat},${r.p.wrong[0].lng}  ground ${Math.round(r.wGround.centre)} ft  (${r.wGround.note})`);
  console.log(`   the ground separates them by ${Math.round(r.drop)} ft`);
  console.log(`   gazetteer "${r.gName}" is ${Math.round(r.gDonor)} m from the donor and ${Math.round(r.gWrong)} m from the pin being moved`);
  for (const m of r.moved) console.log(`      ${m.id.padEnd(42)} ${m.from}  ->  donor   (${Math.round(m.dist)} m)`);
}
console.log(`\n${staged.length} summit pin(s) on ${reports.length} peak(s). Only the coordinate moves — every stated elevation is left as it is.`);
console.log(`NOT touched: Mount Stuart (six coordinates, no single wrong cluster) and Burgundy Spire (a climbers' name the gazetteer does not hold).`);

if (!APPLY) { console.log("\nDRY RUN - pass --apply to write."); process.exit(0); }

for (const s of staged) await patchRow("routes", s.id, { waypoints: s.next });
console.log(`\nwrote ${staged.length} value(s).`);

const v = await fetch(rurl, { headers: headers(KEY) });
const after = new Map((await v.json()).map((x) => [x.id, x]));
let bad = 0;
for (const r of reports) {
  for (const w of r.p.wrong) {
    const wps = after.get(w.id).waypoints || [];
    const t = wps.find((x) => String((x || {}).name || "").trim() === r.p.pin && /summit|topout/i.test(String((x || {}).type || "")));
    if (!t) { console.error(`PIN LOST: ${w.id} no longer carries a summit pin named "${r.p.pin}"`); bad++; continue; }
    const dist = D(num(t.lat), num(t.lng), r.dLat, r.dLng);
    if (!(dist < 1)) { console.error(`NOT APPLIED: ${w.id} is still ${Math.round(dist)} m from the donor`); bad++; }
    const before = byId.get(w.id).waypoints || [];
    if (wps.length !== before.length) { console.error(`WAYPOINTS LOST: ${w.id} had ${before.length}, now ${wps.length}`); bad++; }
    const wasFt = num((before.find((x) => String((x || {}).name || "").trim() === r.p.pin) || {}).elev);
    if (num(t.elev) !== wasFt) { console.error(`ELEVATION CHANGED: ${w.id} now states ${t.elev}, was ${wasFt}`); bad++; }
  }
}
console.log(bad ? `\nVERIFY FAILED: ${bad} problem(s).` : `\nverified: every moved pin sits on its donor, every elevation is unchanged, and no route lost a waypoint.`);
process.exit(bad ? 1 : 0);
