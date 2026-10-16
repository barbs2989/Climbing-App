// TWO ADJUDICATED PINS, AND A THIRD DELIBERATELY REFUSED.
//
// adjudicate-cross-route-pins.mjs names the pin the gazetteer refuses; it cannot say whether the
// route MEANT that place. That is the Lake Constance / Lake Ingalls split, and it is decided by
// reading every route that carries the pin. Here it separates two repairs from one refusal.
//
// 1. "Kool-Aid Lake" on wa_magic_mountain_south_ridge — FIVE independent lines:
//      - four sibling pins sit 0-97 m from the gazetteer's Kool-Aid Lake; this one is 1,623 m away
//      - its ELEVATION agrees with the corroborated cluster to 1 ft (6,120 against 6,119), so the
//        pin means that lake — the coordinate is the wrong half, not the name
//      - the GROUND at the corroborated coordinate reads 6,120 ft, exactly what this pin states, so
//        moving it CORROBORATES the elevation instead of stranding it
//      - its own prose says "a descending traverse to the SOUTHEAST, dropping to Kool-Aid Lake"
//      - and the pin lies NNW (345 deg) of its own Cache Col pin, where the corroborated position
//        lies SSE (154 deg). Nearly opposite: the row contradicts itself.
//
// 2. "Cache Col" on wa_ptarmigan_traverse — the route's own approach names it as ground the party
//    CROSSES ("the notch of Cache Col, where parties rope up"), six routes place it within 50 m of
//    the gazetteer, and this pin is 2,752 m away.
//    THE ELEVATION MOVES TOO, AND THAT IS EVIDENCED RATHER THAN RIDING ALONG. The ground at the
//    corroborated coordinate reads 6,935 ft: it admits the siblings' 6,903 (32 ft, inside the DEM
//    floor) and REFUSES this pin's 6,600 by 335 ft. Moving the coordinate and leaving the number
//    would create a fresh audit:waypoint-elevations finding — the "changing which record wins
//    strands the neighbouring field" shape. Both values are COPIED from the corroborated donor.
//
// 3. "Spire Point" on wa_ptarmigan_traverse — REFUSED, and the refusal is why the prose check is
//    not ceremony. Its elevation matches the summit exactly (8,264), which argues the pin means the
//    peak. Everything else argues it does not: it is typed Junction rather than Summit; it sits in
//    sequence between White Rock Lakes and Cub Lake, i.e. ON the traverse line; and the route's one
//    mention of Spire calls it an OPTIONAL side summit — "do not commit to peak summits unless the
//    time/weather window is clear". So the traverse does not go over it, and a pin named for it may
//    be the point you branch from. Mixed evidence is a refusal: moving it would put a traverse
//    waypoint on a summit the route does not climb, and break its own sequence.
//
// THE REPAIR COPIES A CORROBORATED SIBLING'S VALUES. No latitude, longitude or elevation is typed
// in this file, so a fix needing a fact the catalog does not already hold cannot be expressed.
// Every premise is re-asserted against the live rows at apply time: if anything has moved, refuse.
import { SUPABASE_URL, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";
import { elevationAt } from "../lib/terrain.mjs";

const CLOSE_M = 250;          // the corroboration gate the camp work arrived at
const DEM_FLOOR_FT = 60;      // 3DEP is a 10 m grid; finer than this is noise

const REPAIRS = [
  {
    name: "Kool-Aid Lake",
    suspect: "wa_magic_mountain_south_ridge",
    donor: "wa_old_guard_peak_southwest_route",
    expectApartM: 1623,
    moveElev: false,                       // ground agrees with the number already stated
    prose: ["descending traverse to the southeast, dropping to Kool-Aid Lake"],
    // the row contradicts itself relative to its own Cache Col pin
    relTo: "Cache Col", proseBearing: [90, 225],
  },
  {
    name: "Cache Col",
    suspect: "wa_ptarmigan_traverse",
    donor: "wa_mount_formidable_south_face",
    expectApartM: 2752,
    moveElev: true,                        // ground refuses the stated 6,600 at the new position
    prose: ["the notch of Cache Col, where parties rope up"],
  },
];

const TOL_M = 200;
const T = Math.PI / 180;
const metres = (a, b) => 2 * 6371000 * Math.asin(Math.sqrt(
  Math.sin((b.lat - a.lat) * T / 2) ** 2 +
  Math.cos(a.lat * T) * Math.cos(b.lat * T) * Math.sin((b.lng - a.lng) * T / 2) ** 2));
const bearing = (a, b) => {
  const y = Math.sin((b.lng - a.lng) * T) * Math.cos(b.lat * T);
  const x = Math.cos(a.lat * T) * Math.sin(b.lat * T) -
    Math.sin(a.lat * T) * Math.cos(b.lat * T) * Math.cos((b.lng - a.lng) * T);
  return (Math.atan2(y, x) / T + 360) % 360;
};

const H = headers(requireServiceKey());
const COLS = "id,waypoints,overview,approach,climbing_route,beta,descent_text";
const get = async (id) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${COLS}&id=eq.${id}`, { headers: H });
  if (!r.ok) throw new Error(`${id}: ${r.status} ${await r.text()}`);
  const j = await r.json();
  if (j.length !== 1) throw new Error(`${id}: ${j.length} rows`);
  return j[0];
};
const findWp = (row, nm) => {
  const wps = Array.isArray(row.waypoints) ? row.waypoints : [];
  const i = wps.findIndex((w) => w && String(w.name || "").trim() === nm);
  return { wps, i, w: i < 0 ? null : wps[i] };
};
const proseOf = (row) => ["overview", "approach", "climbing_route", "beta", "descent_text"]
  .map((k) => (row[k] == null ? "" : (typeof row[k] === "string" ? row[k] : JSON.stringify(row[k])))).join("\n");

const refuse = (m) => { console.log(`REFUSED — ${m}`); process.exit(1); };

const plan = [];
for (const c of REPAIRS) {
  console.log(`\n=== "${c.name}"  ${c.suspect}`);

  const donRow = await get(c.donor);
  const d = findWp(donRow, c.name);
  if (!d.w) refuse(`donor ${c.donor} has no "${c.name}" waypoint`);
  const donor = { lat: Number(d.w.lat), lng: Number(d.w.lng) };
  const donorElev = d.w.elev == null ? null : Number(d.w.elev);
  if (!Number.isFinite(donor.lat) || !Number.isFinite(donor.lng)) refuse("donor pin has no coordinate");

  // the donor must STILL be the corroborated one — the whole argument rests on it
  const u = "https://nominatim.openstreetmap.org/search?format=json&limit=8&countrycodes=us&q=" +
    encodeURIComponent(c.name);
  const gr = await fetch(u, { headers: { "User-Agent": "climbing-app-pin-adjudicator" } });
  if (!gr.ok) refuse("the gazetteer did not answer — an outage is not a result");
  const wa = (await gr.json())
    .map((f) => ({ lat: Number(f.lat), lng: Number(f.lon), name: String(f.display_name).split(",")[0] }))
    .filter((f) => f.name.toLowerCase() === c.name.toLowerCase()
      && f.lat > 45.4 && f.lat < 49.1 && f.lng > -124.9 && f.lng < -116.8);
  await new Promise((r) => setTimeout(r, 1100));
  if (wa.length !== 1) refuse(`${wa.length} gazetteer features named "${c.name}" in WA — a namesake`);
  const dGaz = metres(donor, wa[0]);
  console.log(`   donor ${c.donor} is ${Math.round(dGaz)} m from the gazetteer feature`);
  if (dGaz > CLOSE_M) refuse("the donor is no longer corroborated");

  const susRow = await get(c.suspect);
  const s = findWp(susRow, c.name);
  if (!s.w) refuse(`${c.suspect} has no "${c.name}" waypoint`);
  const sus = { lat: Number(s.w.lat), lng: Number(s.w.lng) };
  const susElev = s.w.elev == null ? null : Number(s.w.elev);
  const apart = metres(sus, donor);
  console.log(`   suspect is ${Math.round(apart)} m away, states ${susElev ?? "—"} ft (donor ${donorElev ?? "—"})`);
  if (Math.abs(apart - c.expectApartM) > TOL_M) refuse(`expected ~${c.expectApartM} m apart — the pin has moved`);

  // the route's own prose must still say what the repair rests on
  const p = proseOf(susRow);
  for (const q of c.prose) if (!p.includes(q)) refuse(`the prose no longer says "${q}"`);
  console.log(`   prose still states the ${c.prose.length} premise(s) this rests on`);

  // where the row contradicts its own stated direction, re-derive that too
  if (c.relTo) {
    const rw = findWp(susRow, c.relTo).w;
    if (!rw) refuse(`${c.suspect} has no "${c.relTo}" pin to judge the direction against`);
    const rp = { lat: Number(rw.lat), lng: Number(rw.lng) };
    const bSus = bearing(rp, sus), bDon = bearing(rp, donor);
    console.log(`   from "${c.relTo}": suspect ${Math.round(bSus)}deg, corroborated ${Math.round(bDon)}deg (prose says ${c.proseBearing[0]}-${c.proseBearing[1]}deg)`);
    const inArc = (b) => b >= c.proseBearing[0] && b <= c.proseBearing[1];
    if (inArc(bSus)) refuse("the suspect pin already lies in the direction the prose states");
    if (!inArc(bDon)) refuse("the corroborated position does not lie where the prose states either");
  }

  // the ground decides whether the elevation survives the move
  const ground = Math.round(await elevationAt(donor.lat, donor.lng));
  console.log(`   ground at the corroborated coordinate: ${ground} ft`);
  if (c.moveElev) {
    if (donorElev == null) refuse("asked to move the elevation, but the donor has none");
    if (Math.abs(donorElev - ground) > 400) refuse(`the ground refuses the donor's own ${donorElev} ft`);
    if (susElev != null && Math.abs(susElev - ground) <= DEM_FLOOR_FT)
      refuse(`the ground admits the stated ${susElev} ft — moving it would be unevidenced`);
    console.log(`   -> ground refuses ${susElev} ft and admits ${donorElev} ft: the elevation moves too`);
  } else {
    if (susElev != null && Math.abs(susElev - ground) > 400)
      refuse(`the ground (${ground}) refuses the stated ${susElev} ft — this needs the elevation decided too`);
    console.log(`   -> the stated ${susElev} ft survives the move; only the coordinate changes`);
  }

  plan.push({ ...c, susRow, s, donor, donorElev, susElev, ground });
}

if (!process.argv.includes("--apply")) {
  console.log(`\ndry run — would repair ${plan.length} pin(s). Spire Point stays REFUSED (see the header).`);
  process.exit(0);
}

let wrote = 0;
for (const p of plan) {
  const next = JSON.parse(JSON.stringify(p.s.wps));
  const patch = { ...next[p.s.i], lat: p.donor.lat, lng: p.donor.lng };
  if (p.moveElev) patch.elev = p.donorElev;
  next[p.s.i] = patch;
  await patchRow("routes", p.suspect, { waypoints: next });
  wrote++;
}
console.log(`\nwrote ${wrote} row(s); re-reading to reconcile`);
let ok = 0;
for (const p of plan) {
  const back = findWp(await get(p.suspect), p.name).w;
  const good = back && Number(back.lat) === p.donor.lat && Number(back.lng) === p.donor.lng
    && (!p.moveElev || Number(back.elev) === p.donorElev);
  if (good) { ok++; console.log(`   ok  ${p.suspect} "${p.name}" -> ${back.lat},${back.lng} ${back.elev} ft`); }
  else console.log(`   MISMATCH ${p.suspect} "${p.name}"`);
}
console.log(`verified ${ok}/${plan.length}`);
process.exitCode = ok === plan.length ? 0 : 1;
