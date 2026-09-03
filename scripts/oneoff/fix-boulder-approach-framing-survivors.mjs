// AN INSTANCE FIXED BY HAND IS NOT A CLASS CLOSED -- AND THIS TIME THE CLASS WAS ONE ROW.
//
// CLAUDE.md records a repair to wa_don_t_climb_that_she_said: its `approach` opened with a
// documented negative result ("No route-specific trailhead or approach beta ... turned up anywhere
// online") and then invented 636 characters of approach beta, ending in the affirmative safety
// claim "nothing resembling glacier travel, creek fording, or avalanche terrain given the minimal
// distance and zero gain". That was repaired by prefix truncation, and the repair HELD: the tail is
// gone and the negative result stands. Verified by reading the field end to end, 2026-09-03.
//
// The identical framing survives in SIX other places, because the truncation was scoped to one
// field and the sentence had been written into several. Batch 105 found four; reading the row found
// two more (the day title and the timing `fromTo`, both "Boulder session, car to car"):
//
//   timing.sectionBreakdown[0].note   "A trivial, flat approach (under half a mile) ... walk out
//   itinerary.days[0].note             the same day. No camping, permits, or glacier gear involved."
//                                      -- byte-identical in both fields
//   itinerary.totalNote               "A short, flat, single-day bouldering outing -- well under an
//                                      hour of approach each way."
//   itinerary.days[0].title           "Boulder session, car to car"
//   timing.sectionBreakdown[0].fromTo "Boulder session, car to car"
//   descent_text                      "... given the low-elevation, forested character of the
//                                      ground here."
//
// THIS HALF IS WORSE THAN THE HALF ALREADY REPAIRED, because `timing` and `itinerary` are the
// PLANNER surfaces -- where a party budgets the day -- while `approach` is prose they may skim.
//
// THE ROW REFUTES ITSELF, WHICH IS WHY THIS NEEDS NO SOURCE. Every replacement clause below is
// copied from another field of this same row:
//   crowds.estimatePerSeason        "about 8 miles into the North Fork Sauk approach trail"
//   partner_requirements.approachTime "Roughly 8 miles up the North Fork Sauk River trail"
//   partner_requirements.requiredSkills[0] "Multi-day wilderness backpacking"
//   access.permit                   "Self-Issue Wilderness Permit"   <- the sentence DENIES this
//   overview                        "climbed almost in passing by parties on Glacier Peak's
//                                    standard south-side approach"
//   best_season                     "the approach requires snow-free high-alpine trail conditions"
// So "no permits" is contradicted by the row's own permit field, and "trivial, flat, under half a
// mile" by its own approach description, on the same page.
//
// THE NUMBERS ARE DELIBERATELY NOT TOUCHED, and that is the lesson from the first repair rather
// than timidity. dist_km 0.97 (= 0.6 mi), gainFt 0, packLb 0 and hours 2 describe the boulder
// itself, not the journey to it. Replacing them needs a measured approach figure for THIS row,
// which is research, and this applier must not fabricate. What went wrong last time is that the
// truncation removed the sentence that EXPLAINED what the small numbers were -- leaving bare wrong
// figures with nothing to read them by. So the new notes carry that explanation instead of
// deleting it. Correcting the numbers is a separate, sourced job.
//
// DISCIPLINE: every edit is a deletion of a false clause or a copy of something the row already
// says. Each declares the exact string it expects to find, re-asserts it against the live row at
// apply time, refuses rather than writing on any mismatch, is idempotent, and verifies by re-read.
//
// IDEMPOTENCE IS BY EQUALITY, NEVER BY A PHRASE. fix-batch104-row-self-contradictions.mjs guarded
// on a phrase that its own replacement text contained, so the row could never report as applied and
// the verify clause could never pass. The new notes here contain "North Fork Sauk" and "8 miles";
// guarding on those would repeat that exactly.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const KEY = requireServiceKey();
const ID = "wa_don_t_climb_that_she_said";
const DRY = !process.argv.includes("--apply");

const INVENTED_NOTE =
  "A trivial, flat approach (under half a mile) to a single boulder problem — pad up, session it, " +
  "and walk out the same day. No camping, permits, or glacier gear involved.";
const INVENTED_TOTAL =
  "A short, flat, single-day bouldering outing — well under an hour of approach each way.";
const INVENTED_TITLE = "Boulder session, car to car";
const FORESTED_CLAUSE =
  " given the low-elevation, forested character of the ground here";

// Written from the row's own fields, named above. It states what the figures measure rather than
// asserting an approach distance of its own.
const TRUE_NOTE =
  "The 0.6 mi and 2 hr here describe the boulder session itself, not the journey to it. This " +
  "problem sits roughly 8 miles up the North Fork Sauk approach trail toward Glacier Peak, so " +
  "reaching it is a multi-day wilderness trip requiring a self-issue wilderness permit — do not " +
  "read these figures as a car-to-car outing.";
const TRUE_TOTAL =
  "A short session at the boulder itself. Reaching it is the trip: roughly 8 miles up the North " +
  "Fork Sauk River trail toward Glacier Peak, as a multi-day wilderness outing rather than a day " +
  "trip.";
const TRUE_TITLE = "Boulder session on the Glacier Peak approach";

const [row] = await selectAll("routes", "id,timing,itinerary,descent_text,access,crowds,partner_requirements",
  `id=eq.${ID}`, { pageSize: 5, key: KEY });
if (!row) { console.error(`REFUSED: ${ID} not found.`); process.exit(1); }

// PREMISE RE-ASSERTED AT APPLY TIME: the row must still hold the honest version elsewhere, or the
// replacement text is no longer a copy of anything and this becomes fabrication.
const premises = [
  ["access.permit names a wilderness permit", /wilderness permit/i.test(String(row.access?.permit || ""))],
  ["partner_requirements says multi-day backpacking",
    /multi-day wilderness backpacking/i.test(JSON.stringify(row.partner_requirements || ""))],
  ["the row's own fields put it ~8 miles up the North Fork Sauk",
    /north fork sauk/i.test(JSON.stringify(row.crowds || "") + JSON.stringify(row.partner_requirements || ""))],
];
let ok = true;
for (const [what, held] of premises) { console.log(`  premise ${held ? "HOLDS " : "FAILED"}: ${what}`); if (!held) ok = false; }
if (!ok) { console.error("\nREFUSED: the row no longer states the facts this repair copies. Re-read it."); process.exit(1); }

const timing = JSON.parse(JSON.stringify(row.timing || {}));
const itin = JSON.parse(JSON.stringify(row.itinerary || {}));
const sb = (timing.sectionBreakdown || [])[0];
const d0 = (itin.days || [])[0];
if (!sb || !d0) { console.error("REFUSED: timing.sectionBreakdown[0] or itinerary.days[0] is missing."); process.exit(1); }

const edits = [];
const plan = (label, cur, want, expected) => {
  if (cur === want) { console.log(`  == ${label}: already applied — no-op.`); return { done: true }; }
  if (cur !== expected) {
    console.error(`  !! ${label}: REFUSED — does not hold the string this repair is about.`);
    console.error(`     found: ${JSON.stringify(String(cur).slice(0, 120))}`);
    return { refused: true };
  }
  edits.push(label);
  console.log(`  -> ${label}\n     OLD ${JSON.stringify(String(cur).slice(0, 150))}\n     NEW ${JSON.stringify(String(want).slice(0, 150))}`);
  return { apply: true };
};

let refused = 0;
const r1 = plan("timing.sectionBreakdown[0].note", sb.note, TRUE_NOTE, INVENTED_NOTE);
const r2 = plan("itinerary.days[0].note", d0.note, TRUE_NOTE, INVENTED_NOTE);
const r3 = plan("itinerary.totalNote", itin.totalNote, TRUE_TOTAL, INVENTED_TOTAL);
const r4 = plan("itinerary.days[0].title", d0.title, TRUE_TITLE, INVENTED_TITLE);
const r5 = plan("timing.sectionBreakdown[0].fromTo", sb.fromTo, TRUE_TITLE, INVENTED_TITLE);
for (const r of [r1, r2, r3, r4, r5]) if (r.refused) refused++;

// descent_text is a pure DELETION of a false clause -- the surrounding sentence ("watch footing on
// any wet rock or duff on the way down") is correct advice and survives untouched.
const dtCur = String(row.descent_text || "");
const dtWant = dtCur.includes(FORESTED_CLAUSE) ? dtCur.replace(FORESTED_CLAUSE, "") : dtCur;
let dtChange = false;
if (dtCur.includes(FORESTED_CLAUSE)) {
  if ((dtCur.match(new RegExp(FORESTED_CLAUSE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length !== 1) {
    console.error("  !! descent_text: REFUSED — the clause appears more than once; a blind replace would cut the wrong one.");
    refused++;
  } else {
    dtChange = true;
    console.log(`  -> descent_text: delete the forested-ground clause (${FORESTED_CLAUSE.trim().length} chars)`);
    console.log(`     TAIL NOW ${JSON.stringify(dtWant.slice(-90))}`);
  }
} else if (/forested/i.test(dtCur)) {
  console.error("  !! descent_text: REFUSED — still mentions forested ground but not in the expected clause.");
  refused++;
} else {
  console.log("  == descent_text: already applied — no-op.");
}

if (refused) { console.error(`\nREFUSED ${refused} edit(s); writing nothing. Re-read the row.`); process.exit(1); }
if (!edits.length && !dtChange) { console.log("\nNothing to do — every edit is already applied."); process.exit(0); }
if (DRY) { console.log(`\nDRY RUN — ${edits.length + (dtChange ? 1 : 0)} edit(s). Re-run with --apply.`); process.exit(0); }

sb.note = TRUE_NOTE; sb.fromTo = TRUE_TITLE;
d0.note = TRUE_NOTE; d0.title = TRUE_TITLE;
itin.totalNote = TRUE_TOTAL;
const body = { timing, itinerary: itin };
if (dtChange) body.descent_text = dtWant;
await patchRow("routes", ID, body, { key: KEY });

// VERIFY BY RE-READ. A 200 is not evidence the data changed.
const [v] = await selectAll("routes", "id,timing,itinerary,descent_text", `id=eq.${ID}`, { pageSize: 5, key: KEY });
const vsb = (v.timing?.sectionBreakdown || [])[0] || {};
const vd0 = (v.itinerary?.days || [])[0] || {};
const checks = [
  ["timing note", vsb.note === TRUE_NOTE],
  ["timing fromTo", vsb.fromTo === TRUE_TITLE],
  ["itinerary note", vd0.note === TRUE_NOTE],
  ["itinerary title", vd0.title === TRUE_TITLE],
  ["itinerary totalNote", v.itinerary?.totalNote === TRUE_TOTAL],
  ["descent_text clause gone", !String(v.descent_text || "").includes(FORESTED_CLAUSE)],
  ["descent_text advice kept", /watch footing on any wet rock or duff/i.test(String(v.descent_text || ""))],
  ["no surviving 'car to car'", !/car to car/i.test(JSON.stringify(v.timing) + JSON.stringify(v.itinerary))],
  ["no surviving 'No camping, permits'", !/no camping, permits/i.test(JSON.stringify(v.timing) + JSON.stringify(v.itinerary))],
];
let bad = 0;
for (const [what, held] of checks) { console.log(`  ${held ? "OK  " : "FAIL"} ${what}`); if (!held) bad++; }
console.log(bad ? `\n${bad} check(s) FAILED — re-read the row.` : `\nApplied and verified: ${edits.length + (dtChange ? 1 : 0)} edit(s) on ${ID}.`);
process.exitCode = bad ? 1 : 0;
