// Repair the six routes whose rappel data a research sample found contradicted.
//
// WHY THESE SIX: they are the yield sample for "can per-station rappel beta be researched?"
// (findable 2, partial 3, not-published 1). The station text was the question; the CONTRADICTIONS
// were the result - 6 of 6 carry one. Recorded in findings.jsonl under __audit_meta__.
//
// THE CONTRACT, and it is what makes this safe to run unattended:
//   * every field this script writes declares the SHA-256 of the value it expects to find.
//     A row that has moved since the research is REFUSED rather than clobbered - the standard
//     `fix-trailhead-disagreements-batch4` sets with "declare a winner, never a coordinate".
//   * nothing is invented. Every new sentence is either re-homed from the row's own other
//     fields, or traceable to a page fetched during the research pass. Where no source
//     publishes a distance the length is set to NULL, never to a rope capacity - that write
//     is the very defect the rappel-length finding is about.
//   * NO PUBLISHER IS NAMED. The rule is no sources anywhere in the app, so the facts are
//     re-homed and the attributions dropped.
//   * NO PIPELINE VOICE. Two of the values being replaced address the next editor rather than
//     a climber; the replacements do not.
//
// Run with --dry first. Writes only with --apply.
import crypto from "crypto";
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const KEY = requireServiceKey();
const APPLY = process.argv.includes("--apply");
// Postgres jsonb does NOT preserve key insertion order, so reading a jsonb column back
// serialises its keys in a different order from the object that was sent. Comparing
// JSON.stringify output therefore reports a MISMATCH on a write that landed perfectly -
// which is exactly what the first --apply run of this script did, on 5 of 6 routes, while
// every value was in fact correct. Sort keys recursively so the comparison is about DATA.
// NOTE this changes the `expect` constants for jsonb fields; regenerate them with --hashes.
const canon = v => {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === "object") {
    const o = {};
    for (const k of Object.keys(v).sort()) if (v[k] !== undefined) o[k] = canon(v[k]);
    return o;
  }
  return v;
};
const sha = v => crypto.createHash("sha256")
  .update(v == null ? " NULL" : (typeof v === "string" ? v : JSON.stringify(canon(v))))
  .digest("hex").slice(0, 16);

// ---------------------------------------------------------------------------------------------
// 1  wa_chair_peak_northeast_buttress   findable
//    The two stored stations are on the WRONG SIDE OF THE MOUNTAIN: descent_text sends you back
//    to the notch and down the SW/S gully, while rappel_detail describes rappelling the CLIMBING
//    ROUTE (the ice pitch, the climber's-left entry pitch) - text traceable to a winter
//    ski-descent report, with a phrase from descent_text grafted onto station 1.
//    The descent gully has ONE station, not two: the "second descent gully" in the record is an
//    ALTERNATIVE gully carrying its own upper and lower anchor, not a second station below the
//    first. Storing it as station 2 would repeat the defect being fixed.
const CHAIR_STATIONS = [{
  n: 1,
  lengthM: 60,
  anchor: "three fixed pitons tied together with aging webbing and two aluminium rappel rings",
  station: "Coming off the flat top of the peak, drop into the first obvious gully on climber's left — not the one further along the ridge near the true summit. Old tat on two small trees marks the entrance. The gully runs due south between high rock walls: scramble down and take the very first left it offers, and the anchor comes into view as soon as the walls let you out, at roughly 6,000 ft. Parties miss it by carrying on too far down, or too far right, once the gully opens up.",
  hazards: "The lip is often heavily corniced and the rappel goes through a gap in the cornice. Sloughs run the gully in warm conditions and you are exposed to overhead hazard for the whole of it. Once down, move to the side of the gully mouth so the next person cannot drop anything on you; close calls from rock knocked down by a party behind are on record here.",
  pull: "Ropes have hung up on retrieval — one party's jammed, they judged the rope had cut into the snow, and freed it only by repeated hauling. Test the pull before the next person commits.",
  notes: "The anchor is fixed and old; a knife and 20 ft of cord will let you re-rig it. Two ropes give one 60 m rappel that clears the cornice and lands where the gully opens out and ends. A single 60 m rope halves that and leaves 30-40 m of very steep snow to downclimb, still fully in the fall line — a tag line buys a quick rappel to a protected stance instead of a long spell standing in it.",
}];

const CHAIR_DESCENT = `From the top of the buttress, scramble back across the flat summit area and drop into the first obvious gully on climber's left — not the gully further along the ridge near the true summit. Old tat on two small trees marks the entrance. The gully runs due south between high rock walls: scramble down it and take the very first left it offers, and the rappel station comes into view as soon as the walls let you out, at roughly 6,000 ft. Parties miss it by carrying on too far down, or too far right, once the gully opens up.

The station is fixed and old — three rusty pitons tied together with a mass of aging webbing and a pair of aluminium rappel rings. Two ropes give a single 60 m rappel that clears the corniced lip and lands where the gully opens out and ends; a single 60 m rope halves that and leaves 30-40 m of very steep snow to downclimb, still fully exposed to whatever comes down the gully. Move to the side of the gully mouth once you are down so the next person cannot drop anything on you. A tag line is worth carrying for exactly that reason — it buys a quick rappel to a protected stance instead of a long spell standing in the fall line.

A second gully further along is an alternative rather than a continuation: it carries both an upper and a lower anchor, so a single rope is enough to get through that one instead. Anchors on this descent are not maintained and may not be where you want them — carry cord and a knife to re-rig, and expect that getting around remaining steep snow at the base may take an extra downclimb or rappel.

Below the rappel, plunge-step or downclimb 35-40° snow to the base of the east face and traverse east to rejoin the approach. Cornice collapse at the gully lip, sloughing in warm conditions, and rock knocked down by parties above are the main descent hazards.

Rappelling the buttress itself is a documented summer alternative, taking four to five shorter rappels off a tree, a second gnarlier tree, an old pair of bolts and a rock horn.`;

const CHAIR_NOTE = `One rappel on the standard descent, from the fixed piton station in the first gully on climber's left. Two ropes clear the corniced lip in a single 60 m rappel; a single 60 m rope halves it and leaves 30-40 m of very steep snow to downclimb. The second descent gully is an alternative rather than a continuation — it carries both an upper and a lower anchor, so one rope suffices there. Rappelling the buttress itself in summer is a separate option again, taking four to five shorter rappels.`;

// ---------------------------------------------------------------------------------------------
// 2  wa_dragontail_peak_backbone_ridge   partial
//    rappel_count_note withholds the station coordinate on the stated grounds that it "sits
//    almost exactly on the peak's own summit coordinates". Measured: ~90 m ENE of the catalog's
//    own Dragontail coordinate, in exactly the direction the prose gives ("scramble east on the
//    ledges below the summit"), and larger than the coordinate's own 3-dp quantisation. The
//    stated reason does not hold - AND descent_text publishes that same coordinate two fields
//    away, so the row both gives and withholds it. Two parties also report the line is not
//    viable as described; the row records none of it. The 2 x 30 m is unsourced.
const DRAGONTAIL_STATIONS = [
  {
    n: 1,
    lengthM: null,
    anchor: "fixed station on rock, marked by a cairn",
    station: "A short scramble east along the ledges below the summit, marked by a cairn. Parties report it easy to find, and reachable after only mellow scrambling.",
    hazards: "Loose rock throughout this descent — check the anchor before you commit to it.",
    pull: null,
    notes: "This is the sound half of the pair: even parties who then refused to continue down the line rated this first anchor good. It sits near 47.479°N, 120.832°W, which is a low-precision fix roughly 100 m east-north-east of the summit — enough to put you on the right ledge system, not to find the anchor itself.",
  },
  {
    n: 2,
    lengthM: null,
    anchor: "slung tat on the wall, with a rock horn beside it as the alternative",
    station: "The lower station has been found as a tat anchor on the wall with a rock horn beside it — carry tat and a spare biner and judge it on the day. If neither is one you want to use, it is possible to climb back up to the upper station.",
    hazards: "The second rappel runs directly over a loose flake big enough to kill, and the standard walking descent passes below — make sure nobody is underneath before the first person goes down.",
    pull: null,
    notes: "A doubled 60 m rope only just reaches the ledge below; parties report finishing on the very ends of the rope, and a 70 m gives margin. From that ledge, go left, hug the wall and scramble and downclimb until the standard descent line is regained.",
  },
];

const DRAGONTAIL_NOTE = `Two rappels on this alternate line, though not every party gets down it: some have found the anchors below the first one poor enough to turn round and downclimb instead, and others report needing three or four shorter rappels rather than two. The upper station is marked with a cairn and sits near 47.479°N, 120.832°W — a low-precision fix about 100 m east-north-east of the summit, enough to put you on the right ledge system but not to find the anchor itself. No per-station distance is published; a doubled 60 m rope reaches the ledge at the bottom of the second rappel with nothing to spare, and a 70 m gives margin.`;

const DRAGONTAIL_DESCENT_FIND = "Watch for loose rock and verify anchor integrity on any rappel here.";
const DRAGONTAIL_DESCENT_REPL = "Watch for loose rock and verify anchor integrity on any rappel here — parties have found the anchors below the first station poor enough to turn round and downclimb instead, and the second rappel runs directly over a loose flake big enough to kill, with the standard walking descent passing below it.";

// ---------------------------------------------------------------------------------------------
// 3  wa_ingalls_peak_east_route   partial
//    ROPE OFF THE END. descent_text says "a single 60m rope is sufficient for all three raps" and
//    gear lists a 60 m rope; the record says 70 m ropes and that the FINAL rappel is a double
//    70 m. check:rappel-lengths passes this correctly - 25 m stations fit a 60 - because the
//    defect is that the STATED ROPE is too short for the real descent, which is a different
//    question from the one that guard asks. The 25 x 3 is unsourced.
const INGALLS_STATIONS = [
  {
    n: 1,
    lengthM: null,
    anchor: "sling around chockstone/horn",
    station: "You do not rappel from the summit block. It sits above the highest anchor, and parties protect the short scramble back down to that anchor with a handline, so the first rappel proper starts one station below the summit.",
    hazards: null,
    pull: null,
    notes: "A single rope reaches the next station.",
  },
  {
    n: 2,
    lengthM: null,
    anchor: "sling around chockstone/horn",
    station: null,
    hazards: null,
    pull: null,
    notes: "Also a single-rope rappel. Nothing published describes where this anchor sits or how to find it.",
  },
  {
    n: 3,
    lengthM: null,
    anchor: "sling around chockstone/horn near the notch",
    station: "The last rappel is the long one: it takes two 70 m ropes joined, and it lands on a scramble ledge rather than on the ground. From that ledge, scramble back across to the rappel station in the approach gully to regain packs.",
    hazards: "A party carrying only one rope cannot complete this rappel — it is a full double-rope length, unlike the two single-rope rappels above it.",
    pull: null,
    notes: null,
  },
];

const INGALLS_NOTE = `Three rappels down the line, plus a handline from the summit block down to the top station and a further rappel station in the approach gully at the bottom. The first two are single-rope; the last is a full double-rope rappel needing two 70 m ropes — a single 60 m rope will not complete this descent. No per-station distance is published.`;

const INGALLS_DESCENT_EDITS = [
  // the rope claim - the safety-critical half
  ["Because each pitch is short, a single 60m rope is sufficient for all three raps, though some parties carry a 70m for extra margin/rope-stretch buffer at the lower stations — bring an extra sling or two",
   "The first two rappels go on a single rope, but the last is a full double-rope rappel needing two 70 m ropes — a single 60 m rope will not complete this descent, and 70 m ropes are what parties who have done it recommend. Bring an extra sling or two"],
  // the handline and the gully station, neither of which the row records
  ["rather than fixed hardware.",
   "rather than fixed hardware. You do not rappel from the summit block itself: parties protect the short scramble down from it to the top station with a handline, and there is a further rappel station down in the approach gully used to regain packs."],
  // pipeline voice addressed to the next editor
  [" — but the three rap stations and short rappel off the summit block point to the direct-line rappel descent as the route's normal descent, which this text follows.", "."],
];

const INGALLS_GEAR_EDIT = ["60m rope", "two 70m ropes (the last rappel is a full double-rope rappel; a single 60m rope will not complete the descent)"];

// ---------------------------------------------------------------------------------------------
// 4  wa_colfax_peak_polish_route   not-published
//    BOTH stored rappel claims are MIS-ATTRIBUTED. The "two short rappels" traces to a two-part
//    post whose Colfax and SLESSE sections sit side by side - that sentence is in the Slesse
//    section, surrounded by North Rib / West Face references. The "V-thread below the dagger" is
//    a party's BAIL, not a station; that same party walked down. Every first-hand descent found
//    is the Colfax-Baker saddle walk-off, which the row calls "the alternative, not the norm".
//    The stored 30 m is exactly half the 60 m rope the row's own descent_text names.
const COLFAX_RAPPELS = `No rappel descent is on record. Parties who top out descend on foot to the Colfax-Baker saddle and down the Coleman Glacier; ropes are carried for the climb and for retreat off the route, not for a rappel line.`;

const COLFAX_DESCENT = `No first-hand account describes a rappel descent from this route. Parties who top out continue on foot to the Colfax-Baker saddle and descend the Coleman Glacier, the same walk-off used from the neighbouring lines on this face — at least one party recorded needing no downclimbing at all.

Retreating from partway up is a different matter. A V-thread in the ice is the normal way off if you bail on or below the dagger pitch, so carry screws and cord for building fresh threads rather than trusting anything left behind; ice quality and thickness change through the season.

Going down, watch for the same crevasse hazards on the Coleman Glacier as on the approach, and budget enough daylight — the glacier descent in the dark is unpleasant and hazardous.`;

const COLFAX_GEAR_EDIT = ["Two ropes for the rappel descent", "Two ropes — for the climb and for retreat off the route; the descent is a walk-off"];

// ---------------------------------------------------------------------------------------------
// 5  wa_crooked_thumb_peak_south_route   partial
//    The row credits a "2020 party"; the source page reads "Trip Date: June 25 - July 3, 2016"
//    and "2020" appears on it zero times. Station 3's anchor is an over-claim - the account
//    records a second, shorter rappel and never says what it hung from; only one horn appears in
//    the whole account. rope_note contradicts the rest of the row on grade (III-IV 5.6 against
//    5.8+) and on trailhead (Big Beaver against Hannegan) - Big Beaver is the 2015 ATTEMPT's
//    approach, which never reached the route - and holds a route summary rather than anything
//    about ropes. Storing 30 m for both lower rappels contradicts the account's own "one long
//    rappel and another short rappel".
const THUMB_STATIONS = [
  {
    n: 1,
    lengthM: null,
    anchor: "gear anchor (crack)",
    station: "At the top of the headwall that bars the upper west face, immediately beyond the band of giant boulders. The headwall runs from the ridge crest down to a lower cliff band and forms a near-impasse; the crossing is the roughly 10-ft vertical crack, the third of four lines evaluated across it — the ridge crest, a high catwalk ledge, this crack, and the bottom nose. Reached on the way down after downclimbing the summit ridge and the loose ledges below it.",
    hazards: "The three other crossings do not go — the ridge-crest line would need several hundred feet of traversing out on the sheer east face. The ledges below are very exposed and covered in sand and pebbles, so footing is insecure, and the summit ridge and ledges above are loose enough that running belays and rock protection were used to downclimb them.",
    pull: null,
    notes: "Rappelled on a single strand; a 30-40 m rope reaches the ledge below. Climbed on the ascent, this same step went at about 5.8+ free, or 5.2 with a point of aid. A distinctive cannonhole chockstone in the boulder band just above is a landmark, though it was plugged with snow when last recorded.",
  },
  {
    n: 2,
    lengthM: null,
    anchor: "natural anchor (rock horn draped with old slings — back up before trusting)",
    station: "A small horn draped with several rappel slings, on the exposed traverse around the north ridge's pinnacles. It is passed on the way UP, between the notch at the top of the couloir and the easier ground beyond, on loose class 4-5 ledges — note it on the ascent, because it is the descent anchor.",
    hazards: "The traverse out of the north-ridge notch to reach the horn is exposed and on loose class 4-5 ledges. The horn already carries several old rappel slings of unknown age.",
    pull: "Two ropes of different lengths were knotted together for this rappel, so expect a knot to pass and a knotted pull. The party recorded that working out how to tie the two together was a hard call when tired.",
    notes: "The longer of the two rappels made from this point down into the northwest couloir. The one recorded descent joined a 40 m and a 30 m 6.9 mm alpine rope; a single 60 m doubled, or two 30 m ropes, substitutes.",
  },
  {
    n: 3,
    lengthM: null,
    anchor: null,
    station: null,
    hazards: null,
    pull: null,
    notes: "The shorter of the two rappels from the north-ridge area, ending at an exit ledge above the northwest couloir. Nothing is recorded about what this one hangs from — expect to find or build your own anchor. From the exit ledge, downclimb the couloir, protecting with snow flukes or pickets if it is firm or icy.",
  },
];

const THUMB_ROPE_NOTE = `Two thin ropes, roughly 30 m and 40 m, joined for the rappels off the north-ridge horn; a single 60 m rope doubled, or two 30 m ropes, substitutes. The headwall rappel is made on a single strand.`;

const THUMB_NOTE = `Three rappels on the one recorded descent — one at the headwall crack, then a long one and a short one from the north-ridge horn. That party carried a 40 m and a 30 m rope. The count is not a property of the route: a soloist who found a low-angle, barely-fifth-class wall on the southeast side bypassing the summit cliffs downclimbed the whole thing with no rappels at all, and a traverse party crossed the peak without a rope. No per-station distance is published, and the two lower rappels are explicitly a long one and a short one rather than a matched pair.`;

const THUMB_DESCENT_EDITS = [
  ["a party in 2020 used a 40m and 30m 6.9mm alpine rope joined together",
   "the one party to record this descent joined a 40m and a 30m 6.9mm alpine rope"],
  ["Total rappel count: 3 (one at the headwall crack, two from the north-ridge horn).",
   "Total rappel count on the one recorded descent: 3 (one at the headwall crack, two from the north-ridge horn) — a long rappel and a short one from the horn, not a matched pair. This is not fixed: a soloist who found a low-angle, barely-fifth-class wall on the southeast side bypassing the summit cliffs downclimbed the whole route with no rappels at all, and a traverse party crossed the peak without a rope."],
];

// ---------------------------------------------------------------------------------------------
// 6  wa_east_wilmans_spire   findable
//    Both stations are stored as "fixed/bolted anchor" while the row's OWN `rappels` field calls
//    station 2 "a slung station" - an internal contradiction - and two independent eyewitness
//    accounts describe three pitons with webbing and rings on the summit and a slung rock
//    "a complete rats nest" of old webbing below. The 30 m on station 2 is unsourced and
//    implausible: the whole route is about 42 m over three pitches. descent_text also omits the
//    re-ascent of the 20-ft 5.5 crack, which is the most committing unroped move of the descent.
const WILMANS_STATIONS = [
  {
    n: 1,
    lengthM: null,
    anchor: "three fixed pitons with webbing and rappel rings",
    station: "Off the summit block itself — a small table-top summit that drops away steeply on every side. This is a short rappel and it lands at the slung rock at the top of pitch 2.",
    hazards: null,
    pull: null,
    notes: "Fixed pitons and tat, not a bolt.",
  },
  {
    n: 2,
    lengthM: null,
    anchor: "slung rock at the top of pitch 2, buried in old webbing",
    station: "A rock festooned with slings at the top of pitch 2, where the ramp ends at the corner — the same block parties belay from on the way up, east of the first crack. This rappel takes you back down pitch 2 to the top of pitch 1.",
    hazards: "The sling bundle here has been a rat's nest of aging tat: one party cut at least six slings off it, added one, and still called it a complete rats nest. Inspect what you are hanging on before committing to it.",
    pull: null,
    notes: "A slung natural anchor, not a bolt.",
  },
];

const WILMANS_RAPPELS = `2 single-rope rappels — a three-piton anchor with webbing and rings on the summit block, then a slung rock at the top of pitch 2 — after which most parties reverse pitch 1 on foot to the notch rather than making an optional third rappel into the gully.`;

const WILMANS_NOTE = `Two rappels are standard. An optional third from the top of pitch 1 replaces the unroped reversal of the 5.5 crack, which is why recorded counts here differ between two and three. No per-station distance is published — the whole route is about 42 m over three pitches, and parties carry a 60 m half rope.`;

const WILMANS_DESCENT = `From the summit, make two single-rope rappels down the line of ascent. The first is short, off the three-piton anchor on the summit block, and lands at the slung rock at the top of pitch 2; the second takes you down pitch 2 to the top of pitch 1.

From there most parties do not rappel again: they climb back over the 20-ft 5.5 crack that pitch 1 downclimbs on the way in, then downclimb to the east notch. That reversal is made unroped with about a thousand feet of exposure below and is the most committing move of the descent, though it goes more easily backwards than it looks. Some parties instead make a third rappel straight down into the gully from the top of pitch 1, which is why recorded rappel counts here differ between two and three.

From the notch, downclimb the approach gully — glissading remaining snow where present, or picking carefully through loose talus and scree later in the season — back to the Glacier Basin Trail, then retrace the approach through Monte Cristo townsite to Barlow Pass.`;

// ---------------------------------------------------------------------------------------------
const REPAIRS = [
  {
    id: "wa_chair_peak_northeast_buttress",
    why: "stations describe the CLIMBING ROUTE while descent_text describes the descent gully",
    expect: { rappel_detail: "486d1df94f2ab8cb", descent_text: "8071da42c920fc83", rappel_count_note: "3a250653ca93a542" },
    set: { rappel_detail: CHAIR_STATIONS, descent_text: CHAIR_DESCENT, rappel_count_note: CHAIR_NOTE },
  },
  {
    id: "wa_dragontail_peak_backbone_ridge",
    why: "count note withholds a coordinate on a measurably false premise, while descent_text publishes it; lengths unsourced; the not-viable reports were unrecorded",
    expect: { rappel_detail: "748c90b44e40f8b7", rappel_count_note: "28fe81b279c0c548", descent_text: "d9244170206e3528" },
    set: { rappel_detail: DRAGONTAIL_STATIONS, rappel_count_note: DRAGONTAIL_NOTE },
    edits: { descent_text: [[DRAGONTAIL_DESCENT_FIND, DRAGONTAIL_DESCENT_REPL]] },
  },
  {
    id: "wa_ingalls_peak_east_route",
    why: "ROPE OFF THE END - states a 60 m rope suffices where the last rappel is a double 70 m",
    expect: { rappel_detail: "70feda4b9b2b1aa7", rappel_count_note: "769c52f1e3ca4616", descent_text: "55cd007b9c8a4664", gear: "c651d34e0ec989cf" },
    set: { rappel_detail: INGALLS_STATIONS, rappel_count_note: INGALLS_NOTE },
    edits: { descent_text: INGALLS_DESCENT_EDITS },
    gearEdit: INGALLS_GEAR_EDIT,
  },
  {
    id: "wa_colfax_peak_polish_route",
    why: "both stored rappel claims are mis-attributed; the walk-off is the norm and the row inverts it",
    expect: { rappel_detail: "f5a7a11422a069f7", rappels: "6d5a0a884a086a13", descent_text: "bc9833addd298945", gear: "8c6712ca304cb6c6" },
    set: { rappel_detail: null, rappels: COLFAX_RAPPELS, descent_text: COLFAX_DESCENT },
    gearEdit: COLFAX_GEAR_EDIT,
  },
  {
    id: "wa_crooked_thumb_peak_south_route",
    why: "credits a 2020 party for a 2016 descent; station 3's anchor is an over-claim; rope_note contradicts the row on grade and trailhead",
    expect: { rappel_detail: "57ebf99e09735e3a", rope_note: "ee204cc18f3900db", descent_text: "68e6f0ad1f81c1b2", rappel_count_note: "870abd509efff262" },
    set: { rappel_detail: THUMB_STATIONS, rope_note: THUMB_ROPE_NOTE, rappel_count_note: THUMB_NOTE },
    edits: { descent_text: THUMB_DESCENT_EDITS },
  },
  {
    id: "wa_east_wilmans_spire",
    why: "anchors stored as bolted against eyewitness pitons and a slung rock, contradicting the row's own rappels field; descent omits the 5.5 crack re-ascent",
    expect: { rappel_detail: "0d9fee43ac867aee", rappels: "7fd4339807729c4c", descent_text: "3adf2c1175fb937c", rappel_count_note: "3a250653ca93a542" },
    set: { rappel_detail: WILMANS_STATIONS, rappels: WILMANS_RAPPELS, descent_text: WILMANS_DESCENT, rappel_count_note: WILMANS_NOTE },
  },
];

// ---------------------------------------------------------------------------------------------
const rows = await selectAll("routes",
  "id,name,rappels,rappel_count_note,rappel_detail,descent_text,rope_note,gear",
  "id=like.wa_*", { pageSize: 1000, key: KEY });
const byId = new Map(rows.map(r => [r.id, r]));

// --hashes prints the constants the `expect` blocks above should hold, computed with THIS
// script's own sha(). It lives here rather than in a sibling generator because a separate
// generator is a second implementation of the same function, and this one already drifted:
// its null sentinel was a literal NUL byte where this file's is " NULL", so every null field
// got a constant that could never match and two correct rows were refused as "moved".
if (process.argv.includes("--hashes")) {
  for (const rep of REPAIRS) {
    const r = byId.get(rep.id);
    if (!r) { console.log(`  ${rep.id}: NOT FOUND`); continue; }
    console.log(`  ${rep.id}:`);
    for (const f of ["rappels", "rappel_count_note", "descent_text", "rope_note", "rappel_detail", "gear"])
      console.log(`    ${f}: "${sha(r[f])}"`);
  }
  process.exit(0);
}

if (process.argv.includes("--verify")) {
  let bad = 0, ok = 0, skipped = 0;
  for (const rep of REPAIRS) {
    const r = byId.get(rep.id);
    if (!r) { console.log(`  MISSING ${rep.id}`); bad++; continue; }
    for (const [f, v] of Object.entries(rep.set || {})) {
      if (sha(r[f]) === sha(v)) { ok++; console.log(`  ok       ${rep.id}.${f}`); }
      else { bad++; console.log(`  MISMATCH ${rep.id}.${f} — stored value is not what this script declares`); }
    }
    skipped += Object.keys(rep.edits || {}).length + (rep.gearEdit ? 1 : 0);
  }
  console.log(`\n${ok} field(s) match what this script declares, ${bad} do NOT.`);
  console.log(`${skipped} edited field(s) not checked here — a find/replace cannot be re-verified after it lands.`);
  process.exitCode = bad === 0 ? 0 : 1;
} else {

let refused = 0, planned = 0;
const plan = [];
for (const rep of REPAIRS) {
  const r = byId.get(rep.id);
  if (!r) { console.log(`REFUSE ${rep.id}: row not found`); refused++; continue; }

  // every declared field must still hold the value the research was done against
  let stale = null;
  for (const [f, want] of Object.entries(rep.expect)) {
    const got = sha(r[f]);
    if (got !== want) { stale = `${f} (expected ${want}, found ${got})`; break; }
  }
  if (stale) { console.log(`REFUSE ${rep.id}: row has moved since the research — ${stale}`); refused++; continue; }

  const body = { ...(rep.set || {}) };

  // surgical prose edits: each `find` must match EXACTLY ONCE in the live value
  for (const [f, pairs] of Object.entries(rep.edits || {})) {
    let cur = String(r[f] || "");
    for (const [find, repl] of pairs) {
      const n = cur.split(find).length - 1;
      if (n === 0) { console.log(`  (skip ${rep.id}.${f}: a find did not match — "${find.slice(0, 60)}...")`); continue; }
      if (n > 1) { stale = `${f}: a find matched ${n} times, expected once`; break; }
      cur = cur.replace(find, repl);
    }
    if (stale) break;
    body[f] = cur;
  }
  if (stale) { console.log(`REFUSE ${rep.id}: ${stale}`); refused++; continue; }

  // gear is an array; replace exactly one entry, matched exactly once
  if (rep.gearEdit) {
    const [find, repl] = rep.gearEdit;
    const g = Array.isArray(r.gear) ? [...r.gear] : [];
    const hits = g.map((x, i) => [x, i]).filter(([x]) => String(x).includes(find));
    if (hits.length !== 1) { console.log(`REFUSE ${rep.id}: gear entry "${find}" matched ${hits.length} times, expected once`); refused++; continue; }
    g[hits[0][1]] = String(g[hits[0][1]]).replace(find, repl);
    body.gear = g;
  }

  plan.push({ id: rep.id, name: r.name, why: rep.why, body, before: r });
  planned++;
}

console.log(`\n${"=".repeat(92)}\nPLAN: ${planned} route(s) to repair, ${refused} refused\n`);
for (const p of plan) {
  console.log("=".repeat(92));
  console.log(`${p.id}  (${p.name})`);
  console.log(`  WHY: ${p.why}`);
  for (const [f, v] of Object.entries(p.body)) {
    const before = p.before[f];
    if (f === "rappel_detail") {
      const bn = Array.isArray(before) ? before.length : 0;
      const an = Array.isArray(v) ? v.length : 0;
      const bl = Array.isArray(before) ? before.map(s => s.lengthM == null ? "-" : s.lengthM).join("/") : "-";
      const al = Array.isArray(v) ? v.map(s => s.lengthM == null ? "-" : s.lengthM).join("/") : "-";
      const ctx = Array.isArray(v) ? v.filter(s => s.station || s.hazards || s.pull).length : 0;
      console.log(`  rappel_detail: ${bn} station(s) [${bl}] -> ${an} station(s) [${al}], ${ctx} carrying station/hazard/pull context`);
    } else if (f === "gear") {
      console.log(`  gear: ${JSON.stringify(before)}\n     -> ${JSON.stringify(v)}`);
    } else {
      const b = before == null ? "(null)" : String(before);
      console.log(`  ${f}: ${b.length} chars -> ${String(v == null ? "" : v).length} chars`);
      console.log(`     WAS: ${b.slice(0, 220).replace(/\s+/g, " ")}${b.length > 220 ? "..." : ""}`);
      console.log(`     NOW: ${String(v == null ? "(null)" : v).slice(0, 220).replace(/\s+/g, " ")}...`);
    }
  }
}

if (!APPLY) { console.log(`\nDRY RUN — nothing written. Re-run with --apply.`); process.exitCode = 0; }
else {
  console.log(`\n${"=".repeat(92)}\nAPPLYING\n`);
  for (const p of plan) {
    await patchRow("routes", p.id, p.body);
    console.log(`  wrote ${p.id}  (${Object.keys(p.body).join(", ")})`);
  }
  // re-read and reconcile: a 200 is not evidence the data changed
  console.log(`\nRE-READING to reconcile...`);
  const after = await selectAll("routes",
    "id,rappels,rappel_count_note,rappel_detail,descent_text,rope_note,gear",
    "id=like.wa_*", { pageSize: 1000, key: KEY });
  const aById = new Map(after.map(r => [r.id, r]));
  let bad = 0;
  for (const p of plan) {
    const r = aById.get(p.id);
    for (const [f, v] of Object.entries(p.body)) {
      if (sha(r[f]) !== sha(v)) { console.log(`  MISMATCH ${p.id}.${f} — the write did not land as declared`); bad++; }
    }
  }
  console.log(bad === 0
    ? `  reconciled: all ${plan.length} route(s) hold exactly what was declared`
    : `  ${bad} MISMATCH(ES) — investigate before trusting this run`);
  process.exitCode = bad === 0 ? 0 : 1;
}
}
