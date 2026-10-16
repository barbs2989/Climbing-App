// EIGHT Picket summits are stored as TWO coordinates, and neither is a summit.
//
// `audit:peak-coords` screens every peak's stored coordinate against the ground. Across 402 WA
// peaks the agreement is tight — median 14 ft, p90 93 ft — and 11 sit more than 400 ft out. The
// ground readings on those repeat: 6709, 6709, 6709, 6709, 6709 and 6768, 6768, 6768. Repeated
// values mean shared coordinates.
//
//   48.768,  -121.288  (3 dp, ~100 m) is stored for East Twin Needle, Frenzel Spitz,
//                      Little Mac Spire, The Pyramid and The Rake — five distinct summits
//                      claiming 7,440-7,920 ft, at a point reading 6,709 ft that is NOT a local
//                      maximum. It is 437 m from their parent "Southern Pickets".
//   48.823,  -121.345  likewise for Ghost Peak, Poltergeist Pinnacle and Spectre Peak.
//
// WHY audit:summit-pins COULD NOT FIND THIS. It compares a summit waypoint to the peak's
// coordinate and reports where they DISAGREE. For Frenzel Spitz, The Pyramid and Poltergeist the
// pin was copied FROM the placeholder, so the two records agree — on a wrong value — and the
// audit is structurally blind to it. Screening the coordinate against the ground needs no second
// record, which is the whole point of the new audit.
//
// ONLY THREE ARE REPAIRED HERE, and the other five are left alone deliberately:
//
//   The Rake         pin reads 7822 ft, a strict local maximum, against a claimed 7840. Repair.
//   Ghost Peak       pin reads 7990 ft, a strict local maximum, against a claimed 8000. Repair.
//   East Twin Needle pin reads 7840 ft against a claimed 7868, and its ONE higher neighbour
//                    within 70 m is +76 ft. That is its twin: West Twin Needle is stored at
//                    48.7766,-121.3125, which is 75 m from this pin and 76 ft higher, and West's
//                    own coordinate is NOT flagged by the screen. Twins 75 m apart is right;
//                    East's stored coordinate is 1.8 km from its twin, which is not. Repair.
//
//   Little Mac Spire pin reads 7885 ft against a claimed 7736 — 149 ft out. Too weak. LEFT.
//   Spectre Peak     pin reads 6959 ft against a claimed 7952 and is not a maximum either, so
//                    BOTH its records are wrong. Nothing here can fix that. LEFT.
//   Frenzel Spitz / The Pyramid / Poltergeist Pinnacle — their pins ARE the placeholder, so
//                    there is no independent record to copy. LEFT, and reported.
//
// IT DECLARES A WINNER, NEVER A COORDINATE: the pin's lat/lng is copied off the live row. Every
// threshold below is re-proved against the live DB and the DEM at write time, so a row already
// repaired elsewhere, or a reading that does not reproduce, aborts rather than being overwritten.
//
//   node scripts/oneoff/fix-picket-placeholder-coords.mjs          # dry run, writes nothing
//   node scripts/oneoff/fix-picket-placeholder-coords.mjs --apply
import { SUPABASE_URL, anonKey, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { summitProbe, selfTest } from "../lib/terrain.mjs";

const APPLY = process.argv.includes("--apply");
const PEAKS = ["wa_the_rake", "wa_ghost_peak", "wa_east_twin_needle"];

// Measured separations, not guesses: the three accepted read 18/10/28 ft from their claim and the
// two rejected read 149 and 993. The higher-ground limit separates a named adjacent twin (+76)
// from a pin that is simply on a slope (+436).
const PIN_ELEV_TOL   = 100;  // ft: the pin must read close to the elevation the peak claims
const AREA_MIN_OFF   = 400;  // ft: the stored coordinate must read well BELOW that claim
const PIN_MAX_RISE   = 120;  // ft: nothing much higher may sit within the probe's 70 m ring
const MIN_MOVE_M     = 25;   // pure churn floor. It is deliberately NOT a "close enough" test:
                             // Ghost Peak's stored coordinate is 273 m from its pin and reads
                             // 1,232 ft BELOW the peak's claimed height. On Picket terrain a short
                             // horizontal move is a large vertical one, so distance cannot stand in
                             // for the evidence. The elevation tests below are the real gate.

const H = { apikey: anonKey(), Authorization: `Bearer ${anonKey()}` };
const get = async p => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: H });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`); return r.json(); };
const hav = (a,b,c,d) => { const p=Math.PI/180,R=6371000,dφ=(c-a)*p,dλ=(d-b)*p;
  const s=Math.sin(dφ/2)**2+Math.cos(a*p)*Math.cos(c*p)*Math.sin(dλ/2)**2; return 2*R*Math.asin(Math.sqrt(s)); };
const rise = note => { const m = /\+(\d+) ft/.exec(note || ""); return m ? Number(m[1]) : 0; };

if (APPLY) requireServiceKey();
console.log("terrain probe calibration:\n" + await selfTest());

let wrote = 0, skipped = 0;
for (const pid of PEAKS) {
  const [area] = await get(`areas?id=eq.${pid}&select=id,name,lat,lng,elevation_ft,area_type`);
  if (!area) { console.log(`\n${pid}: NOT FOUND — refusing to guess`); skipped++; continue; }
  console.log(`\n=== ${area.name}  (${area.id})`);
  if (area.area_type !== "peak" || area.elevation_ft == null) {
    console.log(`   not a peak with an elevation — skipping`); skipped++; continue; }

  const routes = await get(`routes?area_id=eq.${pid}&select=id,waypoints`);
  const pins = [];
  for (const r of routes) for (const w of (Array.isArray(r.waypoints) ? r.waypoints : []))
    if (/^(summit|topout)$/i.test(String(w.type || "").trim()) && w.lat != null) pins.push(w);
  if (!pins.length) { console.log("   no summit pin — nothing independent to copy"); skipped++; continue; }

  const p0 = pins[0];
  const spread = Math.max(...pins.map(w => hav(p0.lat, p0.lng, w.lat, w.lng)));
  if (spread > 50) { console.log(`   its ${pins.length} summit pins disagree by ${Math.round(spread)} m — not one claim`); skipped++; continue; }

  const moved = hav(p0.lat, p0.lng, area.lat, area.lng);
  console.log(`   stored ${area.lat}, ${area.lng}   claims ${area.elevation_ft} ft`);
  console.log(`   pin    ${p0.lat}, ${p0.lng}   ${Math.round(moved)} m away`);
  if (moved <= MIN_MOVE_M) { console.log(`   pin is the stored coordinate (${Math.round(moved)} m) — nothing to move`); skipped++; continue; }

  const tPin = await summitProbe(p0.lat, p0.lng), tArea = await summitProbe(area.lat, area.lng);
  console.log(`   ground at pin    ${String(Math.round(tPin.centre ?? NaN)).padStart(6)} ft  ${tPin.note}`);
  console.log(`   ground at stored ${String(Math.round(tArea.centre ?? NaN)).padStart(6)} ft  ${tArea.note}`);
  if (tPin.centre == null || tArea.centre == null) { console.log("   the DEM could not answer — no evidence, refusing"); skipped++; continue; }

  const pinOff = Math.abs(tPin.centre - area.elevation_ft);
  const areaOff = area.elevation_ft - tArea.centre;
  const pinRise = tPin.isMax ? 0 : rise(tPin.note);
  console.log(`   pin is ${Math.round(pinOff)} ft from the claim · stored is ${Math.round(areaOff)} ft below it · ${pinRise} ft of higher ground by the pin`);

  if (!(pinOff <= PIN_ELEV_TOL && areaOff >= AREA_MIN_OFF && pinRise <= PIN_MAX_RISE)) {
    console.log(`   THE EVIDENCE DOES NOT REPRODUCE (needs <=${PIN_ELEV_TOL} / >=${AREA_MIN_OFF} / <=${PIN_MAX_RISE}). Refusing to write.`);
    skipped++; continue;
  }
  console.log(`   => the PIN is the summit; copying it onto areas.${area.id}`);
  if (!APPLY) { skipped++; continue; }

  await patchRow("areas", area.id, { lat: p0.lat, lng: p0.lng });
  const [after] = await get(`areas?id=eq.${pid}&select=lat,lng`);
  if (hav(after.lat, after.lng, p0.lat, p0.lng) > 1) {
    console.error(`   RECONCILE FAILED — read back ${after.lat}, ${after.lng}`); process.exit(1); }
  console.log(`   verified: areas.${area.id} is now ${after.lat}, ${after.lng}`);
  wrote++;
}
console.log(`\n${APPLY ? `wrote ${wrote}` : "DRY RUN — nothing written"}, skipped ${skipped}.`);
if (!APPLY) console.log("Re-run with --apply.");
