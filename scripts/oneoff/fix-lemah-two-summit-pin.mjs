// wa_lemah_two_scramble's Summit waypoint holds the TRAILHEAD's coordinates.
//
// Evidence, four independent ways:
//   1. The pin sits 56 m from this route's own "Pete Lake Trailhead" waypoint, while claiming
//      7,280 ft against the trailhead's 2,800 ft. A summit cannot be 56 m from its trailhead.
//   2. It is 10,907 m from `areas.wa_lemah_two` (47.494048, -121.3009), which the route is
//      filed under.
//   3. That area coordinate is corroborated externally: Wikipedia gives Lemah Mountain as
//      47.4906687, -121.3012060, and the DB's own `wa_lemah_mountain` is 47.4910382,
//      -121.3013283 — Lemah Two sits ~380 m north on the same massif, which is right for a
//      subsidiary summit of a five-summit ridge.
//   4. The route's own 221-point track (10.9 km span, NOT a pin-joining line) passes within
//      3 m of the area coordinate at point 119 — the turnaround of an out-and-back.
//
// So the track and the area agree on where the summit is, and the pin disagrees with both
// while duplicating a waypoint of a different type. The PIN is the wrong record.
//
// THE REPAIR DECLARES A WINNER, NEVER A COORDINATE. It copies `areas.lat/lng` off the live row
// into the waypoint. No number is retyped here, so this cannot introduce a new wrong value —
// the same structural safety the trailhead-disagreement appliers used.
//
//   node scripts/oneoff/fix-lemah-two-summit-pin.mjs          # dry run, writes nothing
//   node scripts/oneoff/fix-lemah-two-summit-pin.mjs --apply
import { SUPABASE_URL, anonKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const ROUTE = "wa_lemah_two_scramble";
const H = { apikey: anonKey(), Authorization: `Bearer ${anonKey()}` };
const get = async p => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: H });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 160)}`); return r.json(); };
const hav = (a,b,c,d) => { const p=Math.PI/180,R=6371000,dφ=(c-a)*p,dλ=(d-b)*p;
  const s=Math.sin(dφ/2)**2+Math.cos(a*p)*Math.cos(c*p)*Math.sin(dλ/2)**2; return 2*R*Math.asin(Math.sqrt(s)); };

const [row] = await get(`routes?id=eq.${ROUTE}&select=id,waypoints,gpx,areas(id,name,lat,lng,elevation_ft)`);
if (!row) throw new Error(`${ROUTE} not found — refusing to guess`);
const A = row.areas;
if (A?.lat == null || A?.lng == null) throw new Error("the peak has no coordinate to copy — nothing to do");

const wps = JSON.parse(JSON.stringify(row.waypoints || []));
const idx = wps.findIndex(w => String(w.type || "").toLowerCase() === "summit");
if (idx < 0) throw new Error("no Summit waypoint on this route — the shape changed; re-read before writing");

const pin = wps[idx];
const before = hav(pin.lat, pin.lng, A.lat, A.lng);
if (before < 500) { console.log(`already ${Math.round(before)} m from the summit — nothing to fix, exiting.`); process.exit(0); }

// Re-prove the trailhead duplication at write time, so a row that has since been repaired by
// another session cannot be overwritten on the strength of a stale finding.
const th = wps.find(w => /trailhead/i.test(String(w.type || "")));
const dupM = th ? hav(pin.lat, pin.lng, th.lat, th.lng) : null;
if (dupM == null || dupM > 200) {
  console.error(`the pin no longer duplicates a trailhead (${dupM == null ? "no trailhead pin" : Math.round(dupM) + " m"}).`);
  console.error("The evidence this fix rests on is gone. Re-read the route before writing.");
  process.exit(1);
}

console.log(`${ROUTE}`);
console.log(`  summit pin now : ${pin.lat}, ${pin.lng}  (${Math.round(before)} m from the peak, ${Math.round(dupM)} m from the trailhead)`);
console.log(`  peak coordinate: ${A.lat}, ${A.lng}   <- winner, copied verbatim from areas.${A.id}`);
console.log(`  elevations     : pin ${pin.elev} ft vs peak ${A.elevation_ft} ft (unchanged either way)`);

wps[idx] = { ...pin, lat: A.lat, lng: A.lng,
  note: `${pin.note ? pin.note + " " : ""}[Coordinate corrected 2026-08-19: the stored pin held the Pete Lake Trailhead's position (56 m from it, 4,480 ft below this summit). Replaced with the peak's own coordinate, which the route's 221-point track passes within 3 m of.]` };

if (!APPLY) { console.log("\nDRY RUN — nothing written. Re-run with --apply."); process.exit(0); }

await patchRow("routes", ROUTE, { waypoints: wps });
const [after] = await get(`routes?id=eq.${ROUTE}&select=waypoints,areas(lat,lng)`);
const now = (after.waypoints || []).find(w => String(w.type || "").toLowerCase() === "summit");
const d = hav(now.lat, now.lng, after.areas.lat, after.areas.lng);
console.log(`\nre-read: summit pin is now ${now.lat}, ${now.lng} — ${Math.round(d)} m from the peak`);
if (d > 5) { console.error("RECONCILE FAILED — the write did not land as intended"); process.exit(1); }
console.log("verified.");
