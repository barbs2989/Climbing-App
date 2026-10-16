// Five WA peaks whose `areas.lat/lng` is not on the peak. The SUMMIT PIN is the right record.
//
// This is the mirror of fix-lemah-two-summit-pin.mjs. There the waypoint held a trailhead's
// position and the area row was right; here the AREA row is wrong and the pin is right. Which
// way round it goes is not guessable, which is why `audit:summit-pins` reports rather than
// repairs — and why this needed a THIRD record to settle.
//
// THE THIRD RECORD IS THE GROUND. A summit is a local elevation maximum, and that is true
// independently of what either stored record claims. USGS 3DEP (1 m raster, public, read-only)
// answers it. The route's own track cannot: on 201 of 580 WA routes the track IS the waypoint
// list joined up, so "is the pin on the track" is answered yes by construction.
//
// Measured for all five: the PIN reads within ~55 ft of the elevation BOTH records agree on and
// is a strict local maximum; the AREA coordinate reads 1,300-3,300 ft LOWER and is not.
//
//   Sky Mountain / Spinnaker Peak / Tye Peak — their three area coordinates sit within 300 m of
//   EACH OTHER and ~150-230 m from their routes' own Trailhead pins, all reading ~4,050 ft. One
//   trailhead's position was written onto three different summits.
//   Pernod Spire — 198 m from its PARENT area ("Silver Star and Wine spires"), i.e. the
//   grouping's coordinate inherited by the spire.
//   Massie Peak — 2.7 km down-valley; its route's 15-point track comes 811 m from the pin and
//   2,524 m from the area.
//
// IT DECLARES A WINNER, NEVER A COORDINATE: the pin's lat/lng is copied off the live row, so no
// number is retyped here and this cannot introduce a new wrong value. Every claim above is
// RE-PROVED against the live DB and against the DEM at write time, so a row already repaired by
// another session, or a reading that does not reproduce, aborts instead of being overwritten.
//
//   node scripts/oneoff/fix-peak-coords-from-summit-pins.mjs          # dry run, writes nothing
//   node scripts/oneoff/fix-peak-coords-from-summit-pins.mjs --apply
import { SUPABASE_URL, anonKey, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { summitProbe as terrain, selfTest } from "../lib/terrain.mjs";

const APPLY = process.argv.includes("--apply");
const PEAKS = ["wa_pernod_spire", "wa_massie_peak", "wa_sky_mountain", "wa_spinnaker_peak", "wa_tye_peak"];

const DIST_MIN   = 300;   // below this the two records agree and there is nothing to repair
const ELEV_AGREE  = 15;   // ft: the pin and the area must be describing ONE point
const DEM_PIN_TOL = 90;   // ft: DEM at the pin vs the claimed summit elevation
const DEM_AREA_MIN = 400; // ft: the area coordinate must read at least this far BELOW the claim

const H = { apikey: anonKey(), Authorization: `Bearer ${anonKey()}` };
const get = async p => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: H });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`); return r.json(); };
const hav = (a,b,c,d) => { const p=Math.PI/180,R=6371000,dφ=(c-a)*p,dλ=(d-b)*p;
  const s=Math.sin(dφ/2)**2+Math.cos(a*p)*Math.cos(c*p)*Math.sin(dλ/2)**2; return 2*R*Math.asin(Math.sqrt(s)); };

// ---------------------------------------------------------------------------------------------
if (APPLY) requireServiceKey();
console.log("terrain probe calibration:\n" + await selfTest());
let wrote = 0, skipped = 0;

for (const pid of PEAKS) {
  const [area] = await get(`areas?id=eq.${pid}&select=id,name,lat,lng,elevation_ft,area_type`);
  if (!area) { console.log(`\n${pid}: NOT FOUND — refusing to guess`); skipped++; continue; }
  console.log(`\n=== ${area.name}  (${area.id})`);
  if (area.area_type !== "peak") { console.log(`   area_type is '${area.area_type}', not 'peak' — skipping`); skipped++; continue; }

  const routes = await get(`routes?area_id=eq.${pid}&select=id,waypoints`);
  const pins = [];
  for (const r of routes) for (const w of (Array.isArray(r.waypoints) ? r.waypoints : []))
    if (/^(summit|topout)$/i.test(String(w.type || "").trim()) && w.lat != null) pins.push({ route: r.id, w });
  if (!pins.length) { console.log("   no summit pin on any route — nothing to copy"); skipped++; continue; }

  // Every route on this peak must agree on where the summit is, or this is not one claim.
  const p0 = pins[0].w;
  const spread = Math.max(...pins.map(p => hav(p0.lat, p0.lng, p.w.lat, p.w.lng)));
  if (spread > 50) { console.log(`   its ${pins.length} summit pins disagree by ${Math.round(spread)} m — not one claim, skipping`); skipped++; continue; }

  const dist = hav(p0.lat, p0.lng, area.lat, area.lng);
  console.log(`   area ${area.lat}, ${area.lng}   ${area.elevation_ft} ft`);
  console.log(`   pin  ${p0.lat}, ${p0.lng}   ${p0.elev ?? "no elev"} ft   (${pins.length} route(s) agree, ${Math.round(dist)} m apart)`);
  if (dist <= DIST_MIN) { console.log(`   already within ${DIST_MIN} m — nothing to fix`); skipped++; continue; }

  // The two records must be describing ONE point, or this is a sub-summit and not a contradiction.
  const claim = area.elevation_ft;
  const pinElev = pins.map(p => p.w.elev).find(e => e != null) ?? null;
  if (claim == null) { console.log("   the peak has no elevation — cannot corroborate, skipping"); skipped++; continue; }
  if (pinElev != null && Math.abs(pinElev - claim) > ELEV_AGREE) {
    console.log(`   pin claims ${pinElev} ft vs peak ${claim} ft — a DIFFERENT point, skipping`); skipped++; continue; }

  const tPin = await terrain(p0.lat, p0.lng), tArea = await terrain(area.lat, area.lng);
  console.log(`   DEM at pin  ${String(Math.round(tPin.centre ?? NaN)).padStart(6)} ft  ${tPin.note}`);
  console.log(`   DEM at area ${String(Math.round(tArea.centre ?? NaN)).padStart(6)} ft  ${tArea.note}`);

  const ok = tPin.isMax === true && tArea.isMax === false
    && tPin.centre != null && Math.abs(tPin.centre - claim) <= DEM_PIN_TOL
    && tArea.centre != null && (claim - tArea.centre) >= DEM_AREA_MIN;
  if (!ok) {
    console.log("   THE EVIDENCE DOES NOT REPRODUCE — the pin must be a local maximum at the claimed");
    console.log("   elevation and the area must be well below it and not a maximum. Refusing to write.");
    skipped++; continue;
  }
  console.log(`   => the PIN is the summit; copying it onto areas.${area.id}`);
  if (!APPLY) { skipped++; continue; }

  await patchRow("areas", area.id, { lat: p0.lat, lng: p0.lng });
  const [after] = await get(`areas?id=eq.${pid}&select=lat,lng`);
  const d = hav(after.lat, after.lng, p0.lat, p0.lng);
  if (d > 1) { console.error(`   RECONCILE FAILED — read back ${after.lat}, ${after.lng} (${Math.round(d)} m off)`); process.exit(1); }
  console.log(`   verified: areas.${area.id} is now ${after.lat}, ${after.lng}`);
  wrote++;
}

console.log(`\n${APPLY ? `wrote ${wrote}` : "DRY RUN — nothing written"}, skipped ${skipped}.`);
if (!APPLY) console.log("Re-run with --apply.");
