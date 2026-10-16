// Two of the twelve trailhead pin-vs-blob disagreements, repaired.
//
// Only these two, and the other ten are not a backlog — they are mostly CORRECT. Of the 12,
// six are peaks with two genuine approaches whose prose describes both (Lundin is the case
// CLAUDE.md already names), two carry no distMi so nothing can adjudicate them, and two have
// a chain that matches NEITHER record. That leaves these two, where the route's own waypoint
// chain settles it physically: a waypoint's straight-line distance from the trailhead cannot
// exceed the trail mileage recorded on it. See probe-trailhead-by-chain-geometry.mjs.
//
//   wa_chikamin_peak_southeast_slopes — "Kendall Katwalk" is recorded at 6.6 trail miles
//     (10.62 km) and lies 11.30 km straight-line from the Mineral Creek PIN. You cannot walk
//     10.62 km to reach a point 11.30 km away. From the PCT North blob it is 3.7 km. The
//     chain is the PCT-from-Snoqualmie approach (Katwalk, Ridge Lake, Park Lakes, in that
//     order), so the PIN is the wrong record. Mineral Creek is not fabricated — it is the
//     route's genuine SECOND approach, described in its own prose, which is where it stays.
//
//   wa_classic_route_3 (Lane Peak) — the mirror case. The chain starts at Narada Falls and
//     runs "Stevens Canyon Road bend @0.5mi -> Tatoosh Creek @0.8mi"; the Pinnacle Saddle
//     BLOB is the one that needs a chord longer than the walk. The prose names both starts
//     ("Reflection Lake pullout ... or, when the road is gated by snow, from Narada Falls"),
//     so again nothing is lost — only the record the mileages are measured from is corrected.
//
// Both repairs COPY the row's own other record. No coordinate is typed in, so a wrong one
// cannot be introduced, and a repair needing a third coordinate cannot be expressed here at
// all — the same structural safety as fix-trailhead-disagreements-batch4/5.
//
// --apply to write; dry by default.
import { SUPABASE_URL, anonKey, headers, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const k = anonKey();
const isTh = (w) => /trailhead/i.test(String((w && w.type) || ""));

const PLAN = [
  { id: "wa_chikamin_peak_southeast_slopes", winner: "blob", expectPin: "Mineral Creek Trailhead", expectBlob: "PCT North Trailhead" },
  { id: "wa_classic_route_3", winner: "pin", expectPin: "Narada Falls Parking Lot", expectBlob: "Pinnacle Saddle Trailhead (Reflection Lakes, Stevens Canyon Road)" },
];

for (const p of PLAN) {
  const r = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,waypoints,approach_logistics&id=eq.${p.id}`, { headers: headers(k) })).json())[0];
  if (!r) throw new Error(`no such route ${p.id}`);
  const wps = r.waypoints || [];
  const idx = wps.findIndex(isTh);
  if (idx < 0) throw new Error(`${p.id}: no trailhead pin`);
  const al = r.approach_logistics || {};

  // Refuse if the row is not the row this plan was written against.
  if (wps[idx].name !== p.expectPin) { console.log(`SKIP ${p.id}: pin is "${wps[idx].name}", expected "${p.expectPin}" — already repaired or changed underneath; refusing`); continue; }
  if (al.trailhead !== p.expectBlob) { console.log(`SKIP ${p.id}: blob is "${al.trailhead}", expected "${p.expectBlob}"; refusing`); continue; }

  let body, describe;
  if (p.winner === "blob") {
    const next = wps.map((w, i) => (i === idx ? { ...w, name: al.trailhead, lat: Number(al.trailheadLat), lng: Number(al.trailheadLng) } : w));
    body = { waypoints: next };
    describe = `pin "${wps[idx].name}" @${wps[idx].lat},${wps[idx].lng}  ->  "${al.trailhead}" @${al.trailheadLat},${al.trailheadLng}`;
  } else {
    body = { approach_logistics: { ...al, trailhead: wps[idx].name, trailheadLat: Number(wps[idx].lat), trailheadLng: Number(wps[idx].lng) } };
    describe = `blob "${al.trailhead}" @${al.trailheadLat},${al.trailheadLng}  ->  "${wps[idx].name}" @${wps[idx].lat},${wps[idx].lng}`;
  }
  console.log(`${p.id}  (winner: ${p.winner})\n    ${describe}`);
  if (!APPLY) continue;

  await patchRow("routes", p.id, body);
  const after = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints,approach_logistics&id=eq.${p.id}`, { headers: headers(k) })).json())[0];
  const aw = (after.waypoints || []); const aidx = aw.findIndex(isTh);
  const aal = after.approach_logistics || {};
  if (aw.length !== wps.length) { console.error(`VERIFY FAILED ${p.id}: waypoint count ${wps.length} -> ${aw.length}`); process.exit(1); }
  const pinName = aw[aidx] && aw[aidx].name, blobName = aal.trailhead;
  if (pinName !== blobName) { console.error(`VERIFY FAILED ${p.id}: pin "${pinName}" still disagrees with blob "${blobName}"`); process.exit(1); }
  console.log(`    verified: both records now say "${pinName}" @ ${aw[aidx].lat},${aw[aidx].lng}; ${aw.length} waypoints, unchanged`);
}
if (!APPLY) console.log("\ndry run — pass --apply to write");
