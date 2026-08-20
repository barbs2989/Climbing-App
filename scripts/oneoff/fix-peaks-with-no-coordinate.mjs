// A peak with NO coordinate at all — worse than one with a wrong coordinate, and invisible to
// every audit that screens coordinates, because they all filter `lat=not.is.null` first.
//
// WA has two: `wa_swiss_peak` and `wa_west_craggy_peak`. Only one is recoverable, and the
// difference is the whole point of running this rather than writing both by hand.
//
//   West Craggy Peak — its one route carries a Summit waypoint at 8,366 ft, exactly the peak's
//                      own `elevation_ft`, and the ground there reads 8,225 ft. The route's other
//                      pins ascend coherently behind it (trailhead 3,800 -> creek 6,400 -> camp
//                      6,600 -> summit), 4.6 km from the trailhead, so this is not the
//                      duplicated-trailhead shape that `fix-lemah-two-summit-pin` repaired.
//   Swiss Peak       — no summit pin, no track, and its only waypoint is the Ross Dam Trailhead
//                      shared by many Picket routes. NOTHING to recover it from. Left null,
//                      which is the honest value; a parent's coordinate would be an invention
//                      and is exactly how the Picket placeholders got there in the first place.
//
// IT DECLARES A WINNER, NEVER A COORDINATE: the pin's lat/lng is copied off the live row.
//
// The elevation tolerance here is looser than the sibling appliers (200 ft, against their 90-100)
// and that is deliberate. Those chose between two competing coordinates, so a tight bar was free.
// Here the alternative is NULL — a peak that cannot be drawn on any map at all — so a pin that is
// demonstrably on the right mountain wins even if it is not exactly the high point. What it must
// still not be is a pin sitting on some OTHER waypoint of the same route.
//
//   node scripts/oneoff/fix-peaks-with-no-coordinate.mjs          # dry run
//   node scripts/oneoff/fix-peaks-with-no-coordinate.mjs --apply
import { SUPABASE_URL, anonKey, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { summitProbe, selfTest } from "../lib/terrain.mjs";

const APPLY = process.argv.includes("--apply");
const ELEV_TOL = 200;   // ft between the ground at the pin and the peak's claimed elevation
const DUP_M    = 200;   // a summit pin this close to another of the route's pins is suspect

const H = { apikey: anonKey(), Authorization: `Bearer ${anonKey()}` };
const get = async p => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: H });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`); return r.json(); };
const hav = (a,b,c,d) => { const p=Math.PI/180,R=6371000,dφ=(c-a)*p,dλ=(d-b)*p;
  const s=Math.sin(dφ/2)**2+Math.cos(a*p)*Math.cos(c*p)*Math.sin(dλ/2)**2; return 2*R*Math.asin(Math.sqrt(s)); };

if (APPLY) requireServiceKey();
console.log("terrain probe calibration:\n" + await selfTest());

// DISCOVERED, not listed: a peak that loses its coordinate tomorrow is handled without an edit.
const peaks = await get(`areas?select=id,name,elevation_ft,route_count&area_type=eq.peak&id=like.wa_*&lat=is.null&limit=500`);
if (!peaks.length) { console.log("\nno WA peak is missing a coordinate — nothing to do."); process.exit(0); }
console.log(`\n${peaks.length} WA peak(s) carry no coordinate.\n`);

let wrote = 0, left = 0;
for (const a of peaks) {
  console.log(`=== ${a.name}  (${a.id})  claims ${a.elevation_ft ?? "no"} ft, ${a.route_count} route(s)`);
  if (a.elevation_ft == null) { console.log("   no elevation either — nothing to corroborate a pin against. LEFT.\n"); left++; continue; }

  const routes = await get(`routes?area_id=eq.${a.id}&select=id,waypoints`);
  const pins = [];
  for (const r of routes) for (const w of (Array.isArray(r.waypoints) ? r.waypoints : []))
    if (/^(summit|topout)$/i.test(String(w.type || "").trim()) && w.lat != null) pins.push({ r: r.id, w, all: r.waypoints });
  if (!pins.length) { console.log("   no summit pin on any of its routes — NOTHING to recover it from. LEFT.\n"); left++; continue; }

  const { w: p0, all } = pins[0];
  const spread = Math.max(...pins.map(p => hav(p0.lat, p0.lng, p.w.lat, p.w.lng)));
  if (spread > 50) { console.log(`   its ${pins.length} summit pins disagree by ${Math.round(spread)} m — not one claim. LEFT.\n`); left++; continue; }

  // The Lemah signature: a "summit" that is really a copy of another waypoint on the same route.
  let dup = null, dupM = Infinity;
  for (const w of (Array.isArray(all) ? all : [])) {
    if (w === p0 || w.lat == null) continue;
    const d = hav(p0.lat, p0.lng, w.lat, w.lng);
    if (d < dupM) { dupM = d; dup = w; }
  }
  if (dup && dupM <= DUP_M) {
    console.log(`   the summit pin sits ${Math.round(dupM)} m from this route's ${dup.type} pin — that is the`);
    console.log(`   duplicated-waypoint shape, not a summit. LEFT.\n`); left++; continue;
  }

  const t = await summitProbe(p0.lat, p0.lng);
  if (t.centre == null) { console.log("   the DEM could not answer — no evidence. LEFT.\n"); left++; continue; }
  const off = Math.abs(t.centre - a.elevation_ft);
  console.log(`   summit pin ${p0.lat}, ${p0.lng}  "${p0.name}"`);
  console.log(`   ground reads ${Math.round(t.centre)} ft vs claimed ${a.elevation_ft} (${Math.round(off)} off) · ${t.note}`);
  console.log(`   nearest other pin on the route: ${dup ? `${dup.type} at ${Math.round(dupM)} m` : "none"}`);
  if (off > ELEV_TOL) { console.log(`   more than ${ELEV_TOL} ft from the claim — it may not be this peak. LEFT.\n`); left++; continue; }

  console.log(`   => the summit pin is the only record of where this peak is; copying it onto areas.${a.id}`);
  if (!APPLY) { left++; console.log(); continue; }
  await patchRow("areas", a.id, { lat: p0.lat, lng: p0.lng });
  const [after] = await get(`areas?id=eq.${a.id}&select=lat,lng`);
  if (after.lat == null || hav(after.lat, after.lng, p0.lat, p0.lng) > 1) { console.error("   RECONCILE FAILED"); process.exit(1); }
  console.log(`   verified: areas.${a.id} is now ${after.lat}, ${after.lng}\n`);
  wrote++;
}
console.log(`${APPLY ? `wrote ${wrote}` : "DRY RUN — nothing written"}, left ${left}.`);
if (!APPLY) console.log("Re-run with --apply.");
