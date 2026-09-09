// Four rows carrying content about somewhere else — a sibling route's line, a neighbouring
// wilderness's camps, the wrong side of a peak, and a gate that does not exist.
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

// ---------------------------------------------------------------------------------------------
// wa_switchback_mountain_scramble.rope_note opens by describing the WEST RIDGE line from the
// Boiling Lake basin — which is this peak's OTHER route, catalogued as
// wa_switchback_mountain_west_ridge and literally named "West Ridge / West Face (via Boiling
// Lake)". That sibling's own rope_note is null, so the sentence is on the wrong row entirely.
// The equipment sentence is correct for this route and is the only thing telling a party to
// carry an axe, so it stays — with its attribution dropped, since the rule here is that no
// screen names a source.
const SWITCHBACK_ROPE = "Helmet, ice axe and crampons are the kit to carry for the snow sections; no rope is needed for the rock.";

// ---------------------------------------------------------------------------------------------
// wa_sherpa_peak_west_ridge.bivy makes the page assert both "no permit lottery here" and "you
// need a lottery permit". The route is entirely OUTSIDE the Enchantment Permit Area, and four
// of its eight camps are in it or reached from a different trailhead under a different permit
// regime. Dropping four of eight, by index and asserted by name, so the four that stay are not
// retyped:
//   [3] Upper Mountaineer Creek bench   — north side, different trailhead, different regime
//   [4] Argonaut north basin bivies     — over the Colchuck-Argonaut col, Enchantments side
//   [6] Lake Caroline and Little Caroline — Enchantment Permit Area
//   [7] Nada Lake                        — Enchantment Permit Area
// [5] Beverly and De Roux is KEPT deliberately: its prose reads as though written for Ingalls
// Peak, but it describes roadside camping at THIS route's own trailhead, so it serves a party
// on this route. Removing data that is useful because its wording came from elsewhere would be
// the wrong trade.

// ---------------------------------------------------------------------------------------------
// wa_poltergeist_pinnacle_north_route.approach puts Luna Cirque "below the south side" of
// Challenger's subsidiary summits. The first-ascent account calls this the EAST face, and the
// row's own `name` is literally "East Face". The Luna Cirque reference itself is correct and
// stays — an earlier objection to it was factually wrong, since the cirque is south-east of
// Challenger and drains south, with Challenger Gap at its northern edge.

// ---------------------------------------------------------------------------------------------
// wa_nooksack_tower_south_face.road claims a seasonal gate. Its sibling on the same peak and the
// same two roads says "Not gated at this low elevation", and the sibling is right: the Forest
// Service project that proposed a winter closure on FR 32 is recorded as Cancelled, and neither
// FR 32 nor FR 34 appears on the district's gated-road list. Access is limited by unplowed snow,
// which is a different thing to plan around than a barrier.
const NOOKSACK_GATE = "Not gated — FR 32 and FR 34 are open year round. What limits winter and early-spring access is unplowed snow rather than a barrier, so the road is walked or skied from wherever it becomes impassable. Verify current conditions with the ranger district before driving.";

const REPAIRS = [
  { kind: "set", route: "wa_switchback_mountain_scramble", path: "rope_note",
    expect: "1be40682dbbc3929", value: SWITCHBACK_ROPE,
    why: "opened by describing this peak's OTHER route, which is a separate catalog row whose own rope_note is null" },

  { kind: "drop", route: "wa_sherpa_peak_west_ridge", path: "bivy",
    expect: "96eb79be7a26f84e",
    drop: [
      { i: 3, name: "Upper Mountaineer Creek bench" },
      { i: 4, name: "Argonaut north basin bivies, below the Colchuck-Argonaut col" },
      { i: 6, name: "Lake Caroline and Little Caroline" },
      { i: 7, name: "Nada Lake" },
    ],
    why: "four of eight camps are in the Enchantment Permit Area or off a different trailhead, on a route the row itself says is outside it" },

  { kind: "edit", route: "wa_poltergeist_pinnacle_north_route", path: "approach",
    expect: "0eb09e362534804b",
    find: "below the south side of Mt. Challenger's subsidiary summits",
    repl: "below the east side of Mt. Challenger's subsidiary summits",
    count: 1,
    why: "the first-ascent account calls this the east face, and the row's own name is East Face" },

  { kind: "set", route: "wa_nooksack_tower_south_face", path: "road.seasonalGate",
    expect: "5b379e63b3587926", value: NOOKSACK_GATE,
    why: "claimed a seasonal gate that does not exist; the sibling row on the same roads says so and is right" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
