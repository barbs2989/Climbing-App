// Suspect-backlog repairs, batch U — the ROPE AND DESCENT tier. These are the safety-relevant
// half of the batch: three routes whose stored rope or rappel figures would leave a party short,
// and one that manufactures a marginal-rope warning nothing supports.
//
// Verdicts recorded in wa-route-audit/findings/resolutions.jsonl, keyed (route, field).
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

// ---------------------------------------------------------------------------------------------
// wa_west_face_2 (North Peak, Gunsight Range)
// The row stores a SINGLE 60 m rope against a descent of four DOUBLE-rope rappels, and asserts
// "approximately 30 m each" in two fields - a figure in no source, and exactly what you get by
// back-deriving from a doubled 60 m rope. Meanwhile its own rappel_count_note says the lengths
// are unconfirmed and all four stations store null. The row refuses to state a length in one
// place and states a wrong one in two others. Published lengths are ~50/50/50/20 m, and the four
// stored stations already correspond one-for-one, so the table is filled rather than rebuilt.
const WF_COUNT_NOTE = `Four rappels, and they are DOUBLE-rope rappels: the published descent is roughly 50 m, 50 m, 50 m and a short 20 m, so two 60 m ropes are needed and a single rope will not complete it. Two independent accounts describe the descent as double-rope throughout. The stations are the north-ridge line down to the packs at the base of the route.`;

// wa_liberty_bell_beckey_route
// Two errors in one note. It says the count of two comes from parties combining the lower two
// rappels with two ropes; the record says two SINGLE-rope rappels, and the real reason is that
// the first (tree) rappel is OPTIONAL - it replaces a downclimb of the ridge and the 5.6 boulder
// problem. And it warns the two accounts are different station sets and must not be mixed, when
// they are the same anchors - a warning that could send a party hunting stations that do not
// exist. The "slightly over 30 m" claim is also impossible: a doubled 60 m rope reaches exactly
// 30 m, and the source it derives from says the rope is more than enough.
const LB_COUNT_NOTE = `Three rappels on a single 60 m rope, which is the rope this route recommends and the configuration these three stations describe. The count of two comes from the SAME station set rather than a different one: the first rappel, off the trees, is optional and replaces a downclimb of the ridge and the 5.6 boulder problem, so a party that downclimbs that section starts at the second station and reaches the ground in two single-rope rappels. Accounts recording two and accounts recording three are describing the same anchors. Individual lengths are not published; the two lower rappels are reported at about 25 m each, and a single 60 m rope reaches the first ledge with room to spare. This is the standard descent line shared with the East Face and Northwest Face routes.`;

const LB_PULL = `A single 60 m rope reaches the ledge with room to spare. Knot both ends as a matter of habit.`;

// wa_prusik_peak_der_sportsman
// `descent` sends you down the West Ridge; the row's own descent_text, rappels and
// rappel_count_note all say the rappels are on the NORTH side, and the record agrees. The West
// Ridge is only the walking landmark at the BASE of the rappels.
const PRUSIK_DESCENT = `Rappel the north side: five single-rope rappels with a 60 m rope, then a sixth from the balanced-rock landmark at the base of the West Ridge to reach easier ground. The West Ridge is where the rappels land, not the line you descend.`;

const REPAIRS = [
  // ---- wa_prusik_peak_der_sportsman -----------------------------------------------------
  { kind: "set", route: "wa_prusik_peak_der_sportsman", path: "descent",
    expect: "9b6f1ed9e40218b8", value: PRUSIK_DESCENT,
    why: "sent parties down the West Ridge; the row's own three other descent fields all say north side" },
  // P2 is the one pitch whose source header carries no metre figure, and a rappel from the top
  // of P2 to P1's anchor on one 60 m rope bounds it at <=30 m. 50 is not a measurement.
  { kind: "set", route: "wa_prusik_peak_der_sportsman", path: "pitch_detail.1.lengthM",
    expect: "1a6562590ef19d10", value: null,
    why: "the only pitch with no published length; the stored 50 m is contradicted by a one-pull rappel from its top" },

  // ---- wa_west_face_2 -------------------------------------------------------------------
  { kind: "set", route: "wa_west_face_2", path: "rope_type",
    expect: "01af0096ae21b543", value: "single (two 60m ropes required for the four double-rope rappels on descent)",
    why: "stored 'single dynamic' against a descent of four double-rope rappels" },
  { kind: "set", route: "wa_west_face_2", path: "gear.1",
    expect: "5fdddbba08dfa1ac", value: "Two 60m dynamic ropes — the descent is four double-rope rappels and a single rope will not complete it",
    why: "the gear list said 'single rope technique' while also saying 'ropes' plural" },
  { kind: "edit", route: "wa_west_face_2", path: "descent",
    expect: "f099dcf0bbdd1b4b", find: "(approximately 30m each)", repl: "— roughly 50 m, 50 m, 50 m and 20 m —", count: 1,
    why: "the 30 m figure is in no source; it is back-derived from a doubled 60 m rope" },
  { kind: "edit", route: "wa_west_face_2", path: "descent_text",
    expect: "17f5cd7d1b69fbac", find: "of approximately 30 meters each", repl: "of roughly 50 m, 50 m, 50 m and 20 m", count: 1,
    why: "the same fabricated figure, asserted a second time" },
  { kind: "set", route: "wa_west_face_2", path: "rappel_detail.0.lengthM", expect: "3a250653ca93a542", value: 50, why: "published length for station 1" },
  { kind: "set", route: "wa_west_face_2", path: "rappel_detail.1.lengthM", expect: "3a250653ca93a542", value: 50, why: "published length for station 2" },
  { kind: "set", route: "wa_west_face_2", path: "rappel_detail.2.lengthM", expect: "3a250653ca93a542", value: 50, why: "published length for station 3" },
  { kind: "set", route: "wa_west_face_2", path: "rappel_detail.3.lengthM", expect: "3a250653ca93a542", value: 20, why: "published length for the short final station" },
  { kind: "set", route: "wa_west_face_2", path: "rappel_count_note",
    expect: "36357b00c90941de", value: WF_COUNT_NOTE,
    why: "said the lengths were unconfirmed while two other fields asserted a wrong one; they are published" },

  // ---- wa_poltergeist_pinnacle_north_route -----------------------------------------------
  // The source says "The 40m rope was long enough for the rappel with just a few feet to spare."
  // The row attributes the few-feet-to-spare to a 30 m rope and offers 40 m as the upgrade, so
  // it under-states the rope on its only stated length.
  { kind: "edit", route: "wa_poltergeist_pinnacle_north_route", path: "descent_text",
    expect: "ac1f719781190478",
    find: "Bring a 40m rope if possible — parties report a 30m single-rope rappel just barely reaches the glacier/ledge below with only a few feet to spare.",
    repl: "Bring a 40 m rope: a party reported theirs was long enough for this rappel with only a few feet to spare, so a 30 m rope will not reach.",
    count: 1,
    why: "the rope numbers are crossed - the few-feet-to-spare belonged to the 40 m rope, not a 30 m one" },
  // the row's own pitches are 55/60/60 m, so a 60 m rope is what the climb requires
  { kind: "set", route: "wa_poltergeist_pinnacle_north_route", path: "rope_length_m",
    expect: "3a250653ca93a542", value: 60,
    why: "was null while the row's own pitches are 55/60/60 m" },

  // ---- wa_liberty_bell_beckey_route ------------------------------------------------------
  { kind: "set", route: "wa_liberty_bell_beckey_route", path: "rappel_detail.0.pull",
    expect: "e0550e77bf3e9795", value: LB_PULL,
    why: "'a hair over 30 m ... almost nothing spare' is impossible - a doubled 60 m rope reaches exactly 30 m" },
  { kind: "set", route: "wa_liberty_bell_beckey_route", path: "rappel_detail.0.lengthM",
    expect: "624b60c58c9d8bfb", value: null,
    why: "no measured length is published; 30 is the bound implied by the rope, which the row's own note admits" },
  { kind: "set", route: "wa_liberty_bell_beckey_route", path: "rappel_count_note",
    expect: "cf1fb8ada11ae00a", value: LB_COUNT_NOTE,
    why: "warned against mixing two station sets that are the same anchors, and mis-explained the count of two" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
