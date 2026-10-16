// wa_sherpa_balanced_rock_standard — CLASS A misdirection, from DATA-DEFECTS-INDEX-2026-08-19.
//
// The index recorded it as a 1-v-1: "approach is the Teanaway side (Longs Pass/Esmeralda);
// waypoints are the Icicle side (Stuart Lake)". A 1-v-1 is NOT decidable from the disagreement
// -- Little Annapurna is on record where the reported repair was backwards and would have
// flipped a shady north slog sunny.
//
// It is actually 2-v-1. The row carries a 324-point gpx track, and that track is INDEPENDENT
// evidence here: `lib/track.js` records that 201 of 580 WA routes store a line that is merely
// their own waypoint list joined up, on which "is the pin on the track" is answered yes by
// construction. This one is not (measured: every vertex is NOT a waypoint), it spans 5.3 km,
// and it ends 70 m from the summit.
//
//   approach prose  -> Longs Pass Trailhead (Esmeralda), Teanaway River Road   SOUTH-WEST
//   gpx track start -> 47.4369, -120.9372, 5.3 km SW of the peak                SOUTH-WEST
//   waypoints[0..3] -> Stuart Lake Trailhead and the Colchuck/Mountaineer trail NORTH-EAST
//
// Opposite drainages, so this is also not the "partial track" false positive that
// audit:waypoint-track exists to separate out (where approach pins are legitimately off a
// climb-only track, but in the SAME direction).
//
// Measured off-track distances: 8.04, 5.07, 4.16 and 1.58 km for the four; 0.28, 0.03 and 0.03
// for the three near-peak pins, which are kept untouched.
//
// WHAT THIS DOES NOT DO: invent a replacement trailhead. The obvious move is to re-home it onto
// the gpx's first point, and that would be wrong -- the approach prose describes ~8 km of
// walking (2.5 mi to Longs Pass, ~1 mi down to Ingalls Creek, then up) against a 5.3 km track,
// so the track does NOT start at the trailhead. Writing its first point as "the trailhead"
// would fabricate a coordinate, which is the failure this repo has already recorded twice.
// The route keeps its named trailhead in prose and carries no trailhead PIN, which is honest:
// no pin is strictly safer than a pin on the wrong side of the range, because the crag
// Overview's "Directions to crag" reads the pin first.
import { loadEnv, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const env = loadEnv();
const U = env.VITE_SUPABASE_URL;
const K = requireServiceKey();
const H = { apikey: K, Authorization: `Bearer ${K}` };
const ID = "wa_sherpa_balanced_rock_standard";

const res = await fetch(`${U}/rest/v1/routes?id=eq.${ID}&select=id,waypoints,approach,gpx`, { headers: H });
if (!res.ok) throw new Error(`read -> ${res.status}`);
const [row] = await res.json();
if (!row) throw new Error("no row");

// The four to drop, named exactly as the triage read them. Matching by NAME, not by index --
// an index would silently drop the wrong pin if the array is ever reordered.
const DROP = [
  "Stuart Lake Trailhead",
  "Colchuck/Stuart Lake trail fork",
  "Mountaineer Creek south branch crossing",
  "Sherpa-Argonaut north basin bivy sites",
];
const KEEP = ["Stuart-Sherpa col", "Pedestal shoulder-stand start", "Sherpa Balanced Rock summit block"];

const fails = [];
const names = (row.waypoints || []).map((w) => w.name);
for (const d of DROP) if (!names.includes(d)) fails.push(`waypoint "${d}" is no longer on the row — re-triage before writing`);
for (const k of KEEP) if (!names.includes(k)) fails.push(`waypoint "${k}" (to keep) is missing — the row has moved`);
if ((row.waypoints || []).length !== 7) fails.push(`expected 7 waypoints, found ${(row.waypoints || []).length}`);
if (!/Longs Pass Trailhead/i.test(row.approach || "")) fails.push("approach no longer names Longs Pass Trailhead — the winner has changed");
if (!Array.isArray(row.gpx) || row.gpx.length !== 324) fails.push(`gpx is no longer the 324-point track this was measured against (${Array.isArray(row.gpx) ? row.gpx.length : "not an array"})`);

if (fails.length) {
  console.error("REFUSING TO WRITE — the row is not what the triage measured:");
  for (const f of fails) console.error("  - " + f);
  process.exit(1);
}

const kept = row.waypoints.filter((w) => !DROP.includes(w.name));
console.log(`waypoints ${row.waypoints.length} -> ${kept.length}`);
for (const w of row.waypoints) console.log(`  ${DROP.includes(w.name) ? "DROP" : "keep"}  [${w.type}] ${w.name}`);

if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

await patchRow("routes", ID, { waypoints: kept });
const after = await (await fetch(`${U}/rest/v1/routes?id=eq.${ID}&select=waypoints`, { headers: H })).json();
const got = (after[0].waypoints || []).map((w) => w.name);
const want = kept.map((w) => w.name);
const ok = JSON.stringify(got) === JSON.stringify(want);
console.log(`\nre-read: ${got.length} waypoints — ${ok ? "verified" : "MISMATCH"}`);
if (!ok) { console.log("  want", want, "\n  got ", got); process.exit(1); }
