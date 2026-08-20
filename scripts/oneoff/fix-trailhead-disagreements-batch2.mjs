// Three more of the trailhead pin-vs-blob disagreements, each settled by a different kind of
// evidence — and none of them by geometry, which is why they are here rather than in
// fix-trailhead-chain-disagreements.mjs.
//
//   wa_liberty_bell_independence_route — settled by the route's OWN PROSE, which rejects the
//     blob by name: "This is on the East Face, so — like Liberty Crack — the approach is NOT
//     from the Blue Lake Trailhead but from a separate pullout on SR-20 at the hairpin curve
//     just east of Washington Pass." The chain starts at that pullout at 0 mi. The geometry
//     probe rates this "both fit" (the two are 2.3 km apart on a short route), which is the
//     honest limit of that test — an explicit sentence beats it.
//
//   rainier_central_mowich_face and wa_ridge_traverse_from_east_fury — the same pattern, and
//     it is why these two looked like harmless 642 m and 541 m rounding. The PIN in each case
//     is the coordinate of the NAMED FEATURE, not of a trailhead: 46.93872,-121.86149 is
//     Wikipedia's coordinate for Mowich Lake, and 48.7317,-121.0672 is Wikipedia's for Ross
//     Dam. The blob in each case is the roadside parking. A trailhead pin is where you leave
//     the car, and the route page hangs "Directions" off it — so the pin sent a driver to a
//     lake, and to a dam that sits at the bottom of a mile of trail off SR-20.
//     A small distance is not the same as a small error.
//
// Every repair COPIES the row's own other record. No coordinate is typed in.
//
// --apply to write; dry by default.
import { SUPABASE_URL, anonKey, headers, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const k = anonKey();
const isTh = (w) => /trailhead/i.test(String((w && w.type) || ""));

const PLAN = [
  { id: "wa_liberty_bell_independence_route", winner: "pin", expectPin: "SR-20 Hairpin / Pond Pullout (east of Washington Pass)", expectBlob: "Blue Lake Trailhead (SR-20)" },
  { id: "rainier_central_mowich_face", winner: "blob", expectPin: "Mowich Lake", expectBlob: "Mowich Lake Trailhead" },
  { id: "wa_ridge_traverse_from_east_fury", winner: "blob", expectPin: "Ross Dam Trailhead (SR-20) — via Ross Lake water taxi/hike to Big Beaver, then off-trail to Access Creek/Luna Camp", expectBlob: "Ross Dam Trailhead (SR-20 milepost 134)" },
];

for (const p of PLAN) {
  const r = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,waypoints,approach_logistics&id=eq.${p.id}`, { headers: headers(k) })).json())[0];
  if (!r) throw new Error(`no such route ${p.id}`);
  const wps = r.waypoints || [];
  const idx = wps.findIndex(isTh);
  if (idx < 0) throw new Error(`${p.id}: no trailhead pin`);
  const al = r.approach_logistics || {};
  if (wps[idx].name !== p.expectPin) { console.log(`SKIP ${p.id}: pin is "${wps[idx].name}" — refusing`); continue; }
  if (al.trailhead !== p.expectBlob) { console.log(`SKIP ${p.id}: blob is "${al.trailhead}" — refusing`); continue; }

  let body, describe;
  if (p.winner === "blob") {
    /* Keep the PIN'S OWN NAME where it is more informative than the blob's — on the Fury
       traverse the pin name carries the whole water-taxi route description, which is real
       beta and belongs on the map popup. Only the coordinate is wrong, so only the
       coordinate moves. */
    const keepName = String(wps[idx].name).length > String(al.trailhead).length;
    const next = wps.map((w, i) => (i === idx ? { ...w, name: keepName ? w.name : al.trailhead, lat: Number(al.trailheadLat), lng: Number(al.trailheadLng) } : w));
    body = { waypoints: next };
    describe = `pin coord ${wps[idx].lat},${wps[idx].lng}  ->  ${al.trailheadLat},${al.trailheadLng}${keepName ? "  (pin name kept — it carries more beta)" : `  (name -> "${al.trailhead}")`}`;
  } else {
    body = { approach_logistics: { ...al, trailhead: wps[idx].name, trailheadLat: Number(wps[idx].lat), trailheadLng: Number(wps[idx].lng) } };
    describe = `blob "${al.trailhead}" @${al.trailheadLat},${al.trailheadLng}  ->  "${wps[idx].name}" @${wps[idx].lat},${wps[idx].lng}`;
  }
  console.log(`${p.id}  (winner: ${p.winner})\n    ${describe}`);
  if (!APPLY) continue;

  await patchRow("routes", p.id, body);
  const after = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints,approach_logistics&id=eq.${p.id}`, { headers: headers(k) })).json())[0];
  const aw = after.waypoints || []; const aidx = aw.findIndex(isTh); const aal = after.approach_logistics || {};
  if (aw.length !== wps.length) { console.error(`VERIFY FAILED ${p.id}: waypoint count changed`); process.exit(1); }
  const dLat = Math.abs(Number(aw[aidx].lat) - Number(aal.trailheadLat)), dLng = Math.abs(Number(aw[aidx].lng) - Number(aal.trailheadLng));
  if (!(dLat < 1e-6 && dLng < 1e-6)) { console.error(`VERIFY FAILED ${p.id}: pin ${aw[aidx].lat},${aw[aidx].lng} still differs from blob ${aal.trailheadLat},${aal.trailheadLng}`); process.exit(1); }
  console.log(`    verified: both records now at ${aw[aidx].lat},${aw[aidx].lng}; ${aw.length} waypoints, unchanged`);
}
if (!APPLY) console.log("\ndry run — pass --apply to write");
