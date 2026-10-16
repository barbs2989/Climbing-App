// Nine trailhead pins their own route's prose contradicts.
//
// Surfaced by probe-trailhead-consensus.mjs, then CONFIRMED BY READING each route's approach
// prose (probe-trailhead-prose.mjs). The majority vote is only ever a hypothesis and has now been
// wrong FOUR times — the Alpental/Rainier "Snow Lake" pair, Esmeralda, Goodell Creek, and
// wa_early_winter_couloir below, which is in this batch precisely because the consensus is wrong
// about it.
//
// WHERE THE NEW COORDINATE COMES FROM. Preferably the route's OWN `approach_logistics`
// trailheadLat/Lng — a second copy of the same fact on the same row, written by a different
// enrichment pass. That beats the group consensus: it cannot be outvoted by neighbours and it is
// not circular the way a gpx track start is (a track is often generated FROM the waypoints).
// Where the row has no approach_logistics, the consensus of routes naming the same trailhead is
// used. Nothing is invented.
//
//   Stuart Lake (2)  — both Colchuck Balanced Rock routes pin 2,944 m from the trailhead their
//                      prose names: "Start at the Stuart Lake Trailhead (NF-7601, off Icicle
//                      Creek Road)". Consensus of 33 routes.
//
//   Barclay Lake (2) — wa_baring_mountain_oatmeal_man ("Follow FS 6024 roughly 4.3-4.5 miles of
//                      gravel to the Barclay Lake trailhead") and wa_wing_peak_northwest_ridge
//                      ("From the Barclay Lake Trailhead, reached via Forest Road 6024"), pinned
//                      1.1 km and 2.6 km up-valley of it. Consensus of 9 routes.
//
//   Blue Lake (3)    — Chockstone / Labor Pains / The West Face are genuinely west-side routes;
//                      each carries approach_logistics naming the Blue Lake Trailhead at
//                      48.518965,-120.67436 while its pin sits 1,271 m east.
//
//   THE HAIRPIN (2)  — and this is why the batch is read rather than voted. Two routes carry a
//                      pin NAMED "Blue Lake" on the EAST side of the Early Winters Spires:
//
//                        wa_early_winter_couloir  — its own approach says "From the Hairpin turn
//                          on SR-20 (east side of the Early Winters Spire formation)", and its
//                          approach variant states outright that "the Blue Lake Trailhead serves
//                          the west side and is the wrong side of the mountain for this route."
//                          Moving it to the Blue Lake consensus — which is what the majority
//                          says to do — would put a climber on the wrong face. It moves the
//                          OTHER way, to its own approach_logistics hairpin coordinate.
//
//                        wa_particulate_matter — "reached from the same large pullout at the
//                          hairpin turns on SR-20 near Washington Pass used for Kangaroo Temple".
//                          Its coordinate is ALREADY at the hairpin; only the NAME is wrong, so
//                          this one is renamed and the coordinate is deliberately NOT touched.
//                          A name bug no geometry test can see.
//
// DELIBERATELY NOT IN THIS BATCH: wa_prusik_peak_solid_gold (597 m from the Stuart Lake consensus
// while naming the same trailhead — that is within parking-area-vs-trail-start slop, and the
// evidence that it is WRONG rather than differently rounded is too thin to write on).
//
// Pass --apply to write; default is a dry run.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const key = requireServiceKey();

const STUART = { lat: 47.5278, lng: -120.8205 };      // consensus of 33
const BARCLAY = { lat: 47.7954, lng: -121.4592 };     // consensus of 9
const BLUE = { lat: 48.518965, lng: -120.67436 };     // each route's own approach_logistics
const HAIRPIN = { lat: 48.51454, lng: -120.64332 };   // early_winter_couloir's own approach_logistics

const PLAN = [
  { id: "wa_colchuck_balanced_rock_west_face", expect: [47.50502, -120.84049], set: STUART,
    why: "prose starts at the Stuart Lake Trailhead; pin is 2,944 m off it" },
  { id: "wa_colchuck_balanced_rock_col_east_lake_side_approch", expect: [47.50502, -120.84049], set: STUART,
    why: "same — prose starts at the Stuart Lake Trailhead (FS Road 7601)" },
  { id: "wa_baring_mountain_oatmeal_man", expect: [47.7884, -121.4482], set: BARCLAY,
    why: "prose drives FS 6024 to the Barclay Lake trailhead; pin is 1,132 m up-valley" },
  { id: "wa_wing_peak_northwest_ridge", expect: [47.8164, -121.4446], set: BARCLAY,
    why: "prose starts at the Barclay Lake Trailhead via FR 6024; pin is 2,577 m up-valley" },
  { id: "wa_chockstone_route", expect: [48.5168, -120.6573], set: BLUE,
    why: "west-side route; its own approach_logistics puts the Blue Lake TH 1,271 m west of the pin" },
  { id: "wa_labor_pains", expect: [48.5168, -120.6573], set: BLUE,
    why: "shares its start with the Chockstone Route; same approach_logistics" },
  { id: "wa_the_west_face", expect: [48.5168, -120.6573], set: BLUE,
    why: "prose follows the Blue Lake Trail from the Blue Lake Trailhead" },
  { id: "wa_early_winter_couloir", expect: [48.5168, -120.6573],
    set: { ...HAIRPIN, name: "SR-20 Hairpin / Pond Pullout" },
    why: "EAST side — its own prose calls Blue Lake 'the wrong side of the mountain for this route'" },
  { id: "wa_particulate_matter", expect: [48.51344, -120.64594],
    set: { name: "SR-20 Hairpin pullout (Kangaroo Temple / Spire Gully)" },
    why: "coordinate is already at the hairpin; only the NAME said Blue Lake. Rename only" },
];

let wrote = 0;
for (const p of PLAN) {
  const [r] = await selectAll("routes", "id,name,waypoints", `id=eq.${p.id}`, { pageSize: 3, key });
  if (!r) { console.error(`${p.id}: NOT FOUND`); process.exit(1); }
  const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
  const i = wps.findIndex(w => w && String(w.type || "").toLowerCase() === "trailhead");
  if (i < 0) { console.error(`${p.id}: no Trailhead waypoint`); process.exit(1); }
  const cur = wps[i];

  // Assert the current value, so a correction someone else already made is refused, not clobbered.
  if (Math.abs(+cur.lat - p.expect[0]) > 1e-4 || Math.abs(+cur.lng - p.expect[1]) > 1e-4) {
    console.error(`${p.id}: pin is now ${cur.lat},${cur.lng}, not the ${p.expect} this was written against — refusing.`);
    process.exit(1);
  }

  console.log(`${p.id}\n   ${p.why}`);
  console.log(`   "${cur.name}" @${cur.lat},${cur.lng}`);
  console.log(`   ->  "${p.set.name || cur.name}" @${p.set.lat ?? cur.lat},${p.set.lng ?? cur.lng}`);
  if (!APPLY) { console.log("   (dry run)\n"); continue; }

  await patchRow("routes", p.id, { waypoints: wps.map((w, n) => n === i ? { ...w, ...p.set } : w) });

  const [after] = await selectAll("routes", "id,waypoints", `id=eq.${p.id}`, { pageSize: 3, key });
  const got = (after.waypoints || []).find(w => String(w.type || "").toLowerCase() === "trailhead");
  const okName = !p.set.name || got.name === p.set.name;
  const okLat = p.set.lat == null || Math.abs(+got.lat - p.set.lat) < 1e-6;
  const okLng = p.set.lng == null || Math.abs(+got.lng - p.set.lng) < 1e-6;
  if (!got || !okName || !okLat || !okLng) {
    console.error(`   RECONCILE FAILED — now "${got && got.name}" @${got && got.lat},${got && got.lng}`);
    process.exit(1);
  }
  if ((after.waypoints || []).length !== wps.length) { console.error("   WAYPOINT COUNT CHANGED"); process.exit(1); }
  console.log(`   reconciled: "${got.name}" @${got.lat},${got.lng}  (${after.waypoints.length} waypoints intact)\n`);
  wrote++;
}
console.log(APPLY ? `wrote ${wrote} route(s).` : "DRY RUN — pass --apply to write.");
