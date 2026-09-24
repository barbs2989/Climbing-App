// Mount Stuart's North Ridge describes ITS SOUTHERN APPROACH TWICE, and the two namings disagree
// about which pass you cross. Both render on the Plan tab, a screen apart.
//
//   approach_variants[1]  "South side — Esmeralda TH over INGALLS PASS and Goat Pass"
//   approach              "the southern approach via the Esmeralda/Teanaway trailhead over LONGS
//                          PASS and up Ingalls Creek to Goat Pass"
//
// ONE APPROACH, NOT TWO, AND THAT NEEDS NO CLIMBING KNOWLEDGE TO ESTABLISH: the variant states
// distMi 9, gainFt 4800, hours 8, and the approach sentence states "~9 miles, ~4,800 ft gain, ~8
// hours". Two genuinely different ways in do not agree on all three figures. So one of the two
// namings is wrong, rather than the page offering a choice.
//
// THE ROW SETTLES WHICH, and the count is of FIELDS rather than of mentions. Longs Pass appears in
// FIVE independent records:
//   waypoints[1]            a pin NAMED "Longs Pass", 6,300 ft, distMi 3.5 — with Goat Pass next
//                           at distMi 5.0, and NO pin anywhere for Ingalls Pass or Ingalls Lake
//   approach                the sentence quoted above
//   descent_text            twice, on the walk back around
//   itinerary               days[1] schedule detail, "over Longs Pass"
//   bivy[2].notes           "The camp for the southern approach over Longs Pass and up Ingalls Creek"
// Ingalls Pass appears in ONE: the variant's own `name` and `notes` — which is one claim written
// twice, not two records agreeing.
//
// A SIXTH record agrees and it is arithmetic rather than prose: the variant's own hazard list says
// "~2,000 ft of descent on the way in, all of which must be regained on the way out". Its pins put
// Longs Pass at 6,300 ft and Goat Pass at 7,600 — a straight line between them only GAINS, so a
// 2,000 ft drop only makes sense if the way in falls off Longs Pass to Ingalls Creek and climbs
// back, which is exactly what the `approach` sentence describes. The Ingalls Pass line the variant
// gives (past Ingalls Lake at ~6,460 ft, then contouring to Goat Pass) loses almost nothing. Not
// gated below, because the row holds no elevation for Ingalls Creek to check it against — recorded
// as corroboration, not as proof.
//
// A CLASS OF ONE, MEASURED BEFORE WRITING THIS. Across the 872 routes carrying approach_variants,
// 293 variants name a pass; three name one the row contradicts, and reading them leaves this.
// `wa_cascade_peak_east_ridge` names Cache Col while pinning Cascade Pass — two real places on one
// route, not a contradiction. `wa_mount_ann_scramble` names Maple Pass inside the sentence "NOTE ON
// THE NAME: this is the Lake Ann below Artist Point on SR-542, not the Lake Ann near Maple Pass" —
// correct work, flagged because a NEGATION is not a claim, the trap this repo already records for
// road prose. A detector for a class of one is the thing this repo keeps refusing to build.
//
// NOTHING IS TYPED. The replacement phrase is lifted VERBATIM from this row's own `approach` field,
// and the pass name from its own waypoint. A repair needing a fact the row does not hold cannot be
// expressed here. The Ingalls-specific clause is REMOVED rather than rewritten: the rest of the
// paragraph (the traverse east beneath the Stuart Glacier, the moraine mound, the toe) is common to
// either way in and is kept byte-for-byte.
//
// Pass --apply to write; default is a dry run.
import { requireServiceKey, anonKey, selectAll, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const ROUTE = "wa_mount_stuart_north_ridge";
const IDX = 1;                                     // the southern variant

// DECLARED STATE — the row must still say what this entry was written against.
const NAME_FIND = "South side — Esmeralda TH over Ingalls Pass and Goat Pass";
const NAME_REPL = "South side — Esmeralda TH over Longs Pass and Goat Pass";
const NOTES_FIND = "take the Ingalls Way trail over Ingalls Pass, past Ingalls Lake, and continue toward the foot of Stuart's West Ridge. From there contour northwest to Goat Pass,";
const NOTES_REPL = "take the trail over Longs Pass and up Ingalls Creek to Goat Pass,";
const DONOR = "over Longs Pass and up Ingalls Creek to Goat Pass";   // lifted from `approach`

const key = APPLY ? requireServiceKey() : anonKey();
const [row] = await selectAll("routes", "id,approach,approach_variants,waypoints,bivy,descent_text,itinerary",
  `id=eq.${ROUTE}`, { key, pageSize: 3 });
if (!row) { console.error(`REFUSED: ${ROUTE} not found`); process.exit(1); }

const vs = Array.isArray(row.approach_variants) ? row.approach_variants.slice() : [];
const v = vs[IDX];
if (!v) { console.error(`REFUSED: no approach_variants[${IDX}]`); process.exit(1); }

const fail = m => { console.error(`REFUSED: ${m}`); process.exit(1); };

// --- the state this entry was written against ------------------------------------------------
if (v.name !== NAME_FIND) fail(`variant name is now "${v.name}" — the row has moved`);
if ((String(v.notes || "").split(NOTES_FIND).length - 1) !== 1)
  fail(`the notes find string matched ${String(v.notes || "").split(NOTES_FIND).length - 1} times, expected exactly 1`);

// --- THE EVIDENCE MUST STILL HOLD AT APPLY TIME, not merely when this was written --------------
// Without these the script would happily rewrite a row somebody had already corrected a different
// way, which is the failure the declared-state contract exists to prevent one level up.
const pins = (Array.isArray(row.waypoints) ? row.waypoints : []).map(w => String(w?.name || ""));
if (!pins.some(n => /longs pass/i.test(n))) fail("the row no longer pins Longs Pass — the evidence is gone");
if (pins.some(n => /ingalls (pass|lake)/i.test(n))) fail("the row now pins Ingalls Pass or Ingalls Lake — re-read before writing");
if (!String(row.approach || "").includes(DONOR)) fail(`the approach field no longer contains the donor phrase "${DONOR}"`);

// The load-bearing evidence: the two descriptions are of ONE approach, because their figures agree.
const m = String(row.approach || "").match(/~?([\d.]+)\s*miles?,\s*~?([\d,]+)\s*ft\s*gain,\s*~?([\d.]+)\s*hours?/i);
if (!m) fail("the approach sentence no longer states ~N miles / ~N ft gain / ~N hours — cannot show these are one approach");
const [pmi, pgain, phr] = [Number(m[1]), Number(m[2].replace(/,/g, "")), Number(m[3])];
if (Number(v.distMi) !== pmi || Number(v.gainFt) !== pgain || Number(v.hours) !== phr)
  fail(`the figures no longer agree (variant ${v.distMi}/${v.gainFt}/${v.hours} vs prose ${pmi}/${pgain}/${phr}) — they may now be two different approaches, so read before writing`);

console.log(`${ROUTE}`);
console.log(`  evidence, re-measured just now:`);
console.log(`    variant ${v.distMi} mi / ${v.gainFt} ft / ${v.hours} hr  ==  approach "~${pmi} miles, ~${pgain.toLocaleString()} ft gain, ~${phr} hours"  -> ONE approach`);
console.log(`    pins naming a pass: ${pins.filter(n => /pass/i.test(n)).join(", ") || "(none)"}`);
console.log(`    no pin names Ingalls Pass or Ingalls Lake`);

const newNotes = String(v.notes).replace(NOTES_FIND, NOTES_REPL);
// PRINT THE RESULTING SENTENCE, never just the find/repl pair. A substitution this size strands a
// connective or doubles a space in a way that is invisible from the edit alone.
const at = newNotes.indexOf(NOTES_REPL);
console.log(`\n  name was: ${v.name}`);
console.log(`  name now: ${NAME_REPL}`);
console.log(`\n  notes was: ...${String(v.notes).slice(0, 240)}...`);
console.log(`  notes now: ...${newNotes.slice(Math.max(0, at - 90), at + NOTES_REPL.length + 130)}...`);

if (!APPLY) { console.log("\nDry run. Pass --apply to write."); process.exit(0); }

vs[IDX] = Object.assign({}, v, { name: NAME_REPL, notes: newNotes });
await patchRow("routes", ROUTE, { approach_variants: vs });

// A 200 is not evidence the data changed.
const [back] = await selectAll("routes", "id,approach_variants", `id=eq.${ROUTE}`, { key, pageSize: 3 });
const bv = back.approach_variants[IDX];
if (bv.name !== NAME_REPL || bv.notes !== newNotes) { console.error("WROTE, BUT THE READ-BACK DISAGREES"); process.exit(1); }
if (/ingalls pass|ingalls lake/i.test(bv.name + "  " + bv.notes)) { console.error("WROTE, but Ingalls Pass survives in the variant"); process.exit(1); }
console.log("\napplied; verified by read-back.");
