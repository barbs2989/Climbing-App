// The non-permutation half of waypoint batch 7: pins that no reordering can repair, because the
// pin itself is wrong. Companion to reorder-waypoint-order-batch7.mjs, which RUNS FIRST: its
// `expect` lists name two of the pins this file retypes. Targets here are found by TYPE|NAME,
// never by index, so this half does not care what order it finds the list in.
//
// THREE OPERATIONS, and none of them writes a coordinate somebody had to supply:
//
//   clear   — set lat/lng to null. For a coordinate that is PROVEN not to be the place it names:
//             either the pin's own note says it reuses a neighbour's coordinate, or the USGS 3DEP
//             ground under it contradicts its own stated elevation by more than a pin's slop.
//             `wpPlaced()` renders a coordinate-less pin as "not on the map", which is honest.
//             Same rule and same reasoning as clear-borrowed-waypoint-coordinates.mjs.
//   retype  — a pin typed "Topout" whose own NAME says it is the base of the wall. #1594's batch 2
//             and batch 6 read four of these and left them as "a type question"; this answers it.
//   drop    — remove a pin that is a second record of ANOTHER pin on the same route: same place
//             named, and either an identical coordinate or a coordinate the ground rejects while
//             the twin's is confirmed. The twin keeps every field; nothing a climber could use is
//             lost. (dedupeWaypoints cannot do this: it never merges across TYPES.)
//
// GROUND READINGS (USGS 3DEP EPQS, read 2026-09-30) are recorded on each target, so the decision
// can be re-asked of the same authority rather than trusted.
//
// Refuses rather than writes if a live pin no longer matches, all-or-nothing; re-reads afterwards.
//
//   node scripts/oneoff/fix-waypoint-order-batch7-pins.mjs          # dry run
//   node scripts/oneoff/fix-waypoint-order-batch7-pins.mjs --apply
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const sig = (w) => `${(w && w.type) || "?"}|${((w && w.name) || "").trim()}`;

const TARGETS = [
  // ---- Le Conte: TWO Cascade Pass pins. The one stored second sits 350 m from the trailhead on
  //      ground reading 3,762 ft; it claims 5,392. The later "Junction" twin reads 5,321 on the
  //      ground — that is the pass. Drop the wrong one and put the twin IN ITS SLOT: stored last,
  //      the twin read as a return leg, and the walk in would lose its pass.
  { route: "wa_le_conte_mountain_northern_aspect", op: "drop", pin: "pass|Cascade Pass",
    lat: 48.4728, lng: -121.0724, twin: "Junction|Cascade Pass", takeSlot: true, ground: 3762, claims: 5392 },

  // ---- The Mole: the "topout" coordinate is on Icicle Creek Road (ground 1,355 ft; claims 6,800).
  { route: "wa_north_face_of_the_mole", op: "clear", pin: "Topout|The Mole (Edward Peak) North Face topout",
    lat: 47.5427, lng: -120.7106, ground: 1355, claims: 6800 },

  // ---- Pinto Rock: the "topout" note says outright that no topout coordinate was found and it
  //      reuses the pullout's; and that pullout coordinate reads 5,109 ft — on top of the rock,
  //      35 m from the summit (5,113, a confirmed local maximum). Cleared on all three routes.
  ...["wa_clast_from_the_past", "wa_sidewinder_4", "wa_top_gun"].map((route) => (
    { route, op: "clear", pin: "Topout|Pinto Rock topout (approximate)", lat: 46.3268, lng: -121.92379, ground: 5109, claims: 4821 })),

  // ---- Smears/Jugs: the note says it reuses the Viviane Campsite coordinate (ground 6,800 = the
  //      campsite). Its name says it is a BASE, not a topout.
  { route: "wa_smears_jugs_and_rock_roll", op: "clear", pin: "Topout|Base of Prusik Peak south face (approximate)",
    lat: 47.482495, lng: -120.7837684, ground: 6800, claims: 6788 },
  { route: "wa_smears_jugs_and_rock_roll", op: "retype", pin: "Topout|Base of Prusik Peak south face (approximate)", to: "Base" },

  // ---- Waterfall Basin (4 routes): "Topout" named "Waterfall Basin (base of ...)" — the base,
  //      mistyped — and an "Approach | route reference point" at the IDENTICAL coordinate.
  ...[
    ["wa_flight_of_the_falcon", "Topout|Waterfall Basin (base of walls)"],
    ["wa_roan_wall_center_stage", "Topout|Waterfall Basin (base of Roan Wall)"],
    ["wa_roan_wall_stage_right", "Topout|Waterfall Basin (base of Roan Wall)"],
    ["wa_waterfall_buttress", "Topout|Waterfall Basin (base of Waterfall Buttress)"],
  ].flatMap(([route, pin]) => [
    { route, op: "retype", pin, to: "Base" },
    { route, op: "drop", pin: "Approach|Waterfall Basin (route reference point)", lat: 48.17241, lng: -121.67254,
      twin: "Base|" + pin.split("|")[1], identical: true },
  ]),

  // ---- Pilgrimage to Mecca: "Topout" named "... base area".
  { route: "wa_amphitheater_mountain_pilgrimage_to_mecca", op: "retype", pin: "Topout|Ka'aba Buttress / Pilgrimage to Mecca base area", to: "Base" },
];

const ids = [...new Set(TARGETS.map((t) => t.route))];
const KEY = APPLY ? requireServiceKey() : anonKey();
const url = `${SUPABASE_URL}/rest/v1/routes?id=in.(${ids.join(",")})&select=id,name,waypoints`;
const res = await fetch(url, { headers: headers(KEY) });
if (!res.ok) { console.error(`read failed: ${res.status}`); process.exit(1); }
const rows = await res.json();
if (rows.length !== ids.length) { console.error(`read ${rows.length} of ${ids.length} rows — refusing`); process.exit(1); }
const live = new Map(rows.map((r) => [r.id, r.waypoints.map((w) => ({ ...w }))]));
const before = new Map(rows.map((r) => [r.id, r.waypoints]));

const near = (a, b) => a != null && b != null && Math.abs(a - b) < 1e-6;
const refusals = [];
for (const t of TARGETS) {
  const w = live.get(t.route);
  const hits = w.map((p, i) => [p, i]).filter(([p]) => sig(p) === t.pin);
  if (hits.length !== 1) { refusals.push(`${t.route}: ${hits.length} live pin(s) match ${t.pin}`); continue; }
  const [p, i] = hits[0];
  if (t.op === "clear" || t.op === "drop") {
    if (!near(p.lat, t.lat) || !near(p.lng, t.lng)) { refusals.push(`${t.route}: ${t.pin} is at ${p.lat},${p.lng}, expected ${t.lat},${t.lng}`); continue; }
  }
  if (t.op === "drop") {
    const twin = w.find((q) => sig(q) === t.twin || (t.twin.startsWith("Base|") && sig(q) === t.twin.replace(/^Base\|/, "Topout|")));
    if (!twin) { refusals.push(`${t.route}: twin ${t.twin} not on the row — dropping would lose the place`); continue; }
    if (t.identical && (!near(twin.lat, p.lat) || !near(twin.lng, p.lng))) { refusals.push(`${t.route}: twin is not at the identical coordinate`); continue; }
    if (t.takeSlot) { w.splice(w.indexOf(twin), 1); w.splice(w.indexOf(p), 1, twin); }
    else w.splice(i, 1);
  } else if (t.op === "clear") {
    p.lat = null; p.lng = null;
  } else if (t.op === "retype") {
    p.type = t.to;
  } else refusals.push(`${t.route}: unknown op ${t.op}`);
}
if (refusals.length) {
  console.error(`REFUSED — ${refusals.length}:\n  ` + refusals.join("\n  ") + "\nNothing was written.");
  process.exit(1);
}

for (const id of ids) {
  console.log(`\n### ${id}`);
  console.log("   was: " + before.get(id).map((p) => `${sig(p)}${p.lat == null ? " (no coord)" : ""}`).join("  ->  "));
  console.log("   now: " + live.get(id).map((p) => `${sig(p)}${p.lat == null ? " (no coord)" : ""}`).join("  ->  "));
}
console.log(`\n${TARGETS.length} edit(s) on ${ids.length} route(s).`);
if (!APPLY) { console.log("DRY RUN — pass --apply to write."); process.exit(0); }

for (const id of ids) await patchRow("routes", id, { waypoints: live.get(id) });
const v = await (await fetch(url, { headers: headers(KEY) })).json();
let bad = 0;
for (const r of v) {
  const want = live.get(r.id).map((p) => `${sig(p)}@${p.lat},${p.lng}`).join("|");
  const got = r.waypoints.map((p) => `${sig(p)}@${p.lat},${p.lng}`).join("|");
  if (want !== got) { console.error(`NOT APPLIED: ${r.id}`); bad++; }
}
console.log(bad ? `VERIFY FAILED: ${bad}` : `verified: ${v.length} row(s) re-read and match.`);
process.exit(bad ? 1 : 0);
