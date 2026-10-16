// wa_mount_ballard_south is the only route in the catalog whose map paints TWO trailhead
// pins — "Harts Pass" (typed `Trailhead/pass`, which WP_TYPE_MAP normalises to Trailhead)
// and "Canyon Creek Trailhead" — 18.3 km apart.
//
// Which is this route's start is not a guess. The row's own approach text opens "Standard
// approach: drive Highway 20 to the Canyon Creek Trailhead near Mazama and follow the Mill
// Creek/Azurite Pass Trail (#755)...", `approach_logistics.trailhead` says Canyon Creek
// Trailhead, and the waypoint chain is the Canyon Creek one measured from it (Mill Creek
// ford at 5.7 mi → Mill Creek Trail junction 6 → Azurite Mine 11 → basin 14). Harts Pass
// appears nowhere in the approach; the row's own named alternate is the West Fork Methow
// River Trailhead, not Harts Pass.
//
// The repair RETYPES rather than deletes. Harts Pass is a real place at a real coordinate
// (6,191 ft, and the elevation checks out), so the untrue part is calling it this route's
// trailhead, not its presence. `Pass` is a type WP_STYLE already draws, so the pin survives
// with an honest glyph and the map stops claiming two starts. Nothing is destroyed and the
// change is reversible.
//
// --apply to write; dry by default.
import { SUPABASE_URL, anonKey, headers, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const ID = "wa_mount_ballard_south";
const TARGET = "Harts Pass";

const k = anonKey();
const before = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints&id=eq.${ID}`, { headers: headers(k) })).json())[0];
if (!before) throw new Error(`no such route ${ID} — refusing to write`);

const wps = before.waypoints || [];
const hits = wps.filter((w) => w && w.name === TARGET);
if (hits.length !== 1) throw new Error(`expected exactly 1 "${TARGET}" waypoint, found ${hits.length} — refusing to write`);
if (String(hits[0].type).toLowerCase() !== "trailhead/pass") {
  console.log(`already repaired (type is "${hits[0].type}") — nothing to do`);
  process.exit(0);
}

const next = wps.map((w) => (w && w.name === TARGET ? { ...w, type: "Pass" } : w));
const trailheadsBefore = wps.filter((w) => /trailhead/i.test(String(w && w.type))).length;
const trailheadsAfter = next.filter((w) => /trailhead/i.test(String(w && w.type))).length;
console.log(`${ID}: trailhead-typed pins ${trailheadsBefore} -> ${trailheadsAfter}`);
console.log(`  "${TARGET}"  type "${hits[0].type}" -> "Pass"`);
if (trailheadsAfter !== 1) throw new Error("that would not leave exactly one trailhead — refusing to write");

if (!APPLY) { console.log("\ndry run — pass --apply to write"); process.exit(0); }

await patchRow("routes", ID, { waypoints: next });

// Re-read and reconcile. A 200 is not evidence the data changed.
const after = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints&id=eq.${ID}`, { headers: headers(k) })).json())[0];
const got = (after.waypoints || []).find((w) => w && w.name === TARGET);
const nTh = (after.waypoints || []).filter((w) => /trailhead/i.test(String(w && w.type))).length;
if (!got || got.type !== "Pass" || nTh !== 1) {
  console.error(`VERIFY FAILED — type is "${got && got.type}", ${nTh} trailhead pin(s)`);
  process.exit(1);
}
console.log(`verified: "${TARGET}" is now type "Pass"; the route has exactly ${nTh} trailhead pin, and ${(after.waypoints || []).length} waypoints in total (was ${wps.length}).`);
