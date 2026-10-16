// wa_south_face_5 (Inspiration Peak, via Terror Basin) — the last of the trailhead
// disagreements that has a determinable winner.
//
// Both records name the Goodell Creek trailhead, 1,536 m apart. The route's own prose says
// "Park at the small pullout just before Goodell Creek Campground (~600 ft)", and the
// published coordinate for Goodell Creek Campground is ~48.673, -121.267 — which is the PIN
// (48.6733, -121.2658) to within 90 m. The blob names the "Upper Goodell Group Camp", 1.5 km
// further up. So the pin is the start the prose describes and the blob is a different camp.
//
// Copies the row's own pin into the blob. Nothing typed in.
// --apply to write; dry by default.
import { SUPABASE_URL, anonKey, headers, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const k = anonKey();
const ID = "wa_south_face_5";
const EXPECT_PIN = "Goodell Creek Trailhead";
const EXPECT_BLOB = "Goodell Creek / Upper Goodell Group Camp trailhead (SR-20, Newhalem)";

const r = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints,approach_logistics&id=eq.${ID}`, { headers: headers(k) })).json())[0];
if (!r) throw new Error("route not found");
const wps = r.waypoints || [];
const idx = wps.findIndex((w) => /trailhead/i.test(String((w && w.type) || "")));
const al = r.approach_logistics || {};
if (idx < 0 || wps[idx].name !== EXPECT_PIN) { console.log(`SKIP: pin is "${idx < 0 ? "(none)" : wps[idx].name}" — refusing`); process.exit(0); }
if (al.trailhead !== EXPECT_BLOB) { console.log(`SKIP: blob is "${al.trailhead}" — already repaired or changed; refusing`); process.exit(0); }

console.log(`${ID}\n    blob "${al.trailhead}" @${al.trailheadLat},${al.trailheadLng}\n    ->   "${wps[idx].name}" @${wps[idx].lat},${wps[idx].lng}`);
if (!APPLY) { console.log("\ndry run — pass --apply to write"); process.exit(0); }

await patchRow("routes", ID, { approach_logistics: { ...al, trailhead: wps[idx].name, trailheadLat: Number(wps[idx].lat), trailheadLng: Number(wps[idx].lng) } });
const after = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints,approach_logistics&id=eq.${ID}`, { headers: headers(k) })).json())[0];
const aal = after.approach_logistics || {};
const aw = after.waypoints || [];
if (aw.length !== wps.length) { console.error("VERIFY FAILED: waypoint count changed"); process.exit(1); }
if (Math.abs(Number(aal.trailheadLat) - Number(wps[idx].lat)) > 1e-6) { console.error(`VERIFY FAILED: blob lat is ${aal.trailheadLat}`); process.exit(1); }
console.log(`    verified: both records now at ${aal.trailheadLat},${aal.trailheadLng}; ${aw.length} waypoints, unchanged`);
