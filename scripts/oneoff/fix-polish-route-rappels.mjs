#!/usr/bin/env node
// wa_colfax_peak_polish_route.rappels says the standard descent needs no rappels. Four other
// columns on the SAME ROW say it does, one of them structured:
//
//   rappel_detail  [{n:1, anchor:"V-thread (Abalakov) in ice below the dagger", lengthM:30},
//                   {n:2, anchor:"V-thread (Abalakov) in ice",                  lengthM:30}]
//   descent        "Most parties rappel/downclimb the route itself using V-thread anchors"
//   descent_text   "not typically walked off directly from the summit face — ... roughly two
//                   short rappels near the summit/upper dagger pitch"
//   gear           "Two ropes for the rappel descent"
//
// So this is not a judgement call about the mountain; it is one field disagreeing with the
// row it lives on, and the structured column is the tie-breaker. `rappels` is the field a
// climber reads when deciding what to carry, and it currently tells them to leave the rope
// behind on a WI6 face above a bergschrund.
//
// It stays PROSE and gains no number. The catalog rule is that rappel counts are
// rope-configuration dependent and most apparent conflicts are one rope versus two, so
// inventing a count here would trade one wrong claim for another. The new text says what the
// standard descent is and names the alternative, which is what the other four columns agree on.
//
// Dry run by default; --write to apply. Asserts the exact current value before writing, so if
// anyone has already fixed this the script refuses rather than clobbering their wording.

import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const ID = "wa_colfax_peak_polish_route";
const WRITE = process.argv.includes("--write");

const EXPECT_OLD = "None required for the standard walk-off descent; rappel only if retreating through the crux";
const NEW = "Two ~30 m V-thread (Abalakov) rappels near the top of the route on the standard descent, then downclimbing the slabby ice and snow below; the walk-off via the Colfax-Baker saddle and the Coleman-Deming route is the alternative, not the norm";

const [row] = await selectAll("routes", "id,name,grade,rappels,rappel_detail,gear,descent", `id=eq.${ID}`, { pageSize: 5 });
if (!row) { console.error(`FAIL — ${ID} not found`); process.exit(1); }

console.log(`${row.id}  "${row.name}"  grade=${row.grade}`);
console.log(`\ncurrent rappels:\n  ${row.rappels}`);

if (row.rappels !== EXPECT_OLD) {
  console.error(`\nFAIL — rappels is not the value this script was written against.`);
  console.error(`Someone else may have already corrected it. Re-read the row and re-decide;`);
  console.error(`do not widen the match to force this through.`);
  process.exit(1);
}

// The evidence must still be there. If rappel_detail were emptied, the premise is gone and
// "no rappels" might have become the truthful answer.
const det = Array.isArray(row.rappel_detail) ? row.rappel_detail : [];
if (det.length < 2) {
  console.error(`\nFAIL — rappel_detail holds ${det.length} entries, expected 2. The evidence`);
  console.error(`this correction rests on is gone; re-establish it before rewriting rappels.`);
  process.exit(1);
}
console.log(`\nevidence intact: rappel_detail has ${det.length} entries` +
  det.map((d) => `\n  ${d.n}. ${d.lengthM}m — ${d.anchor}`).join(""));
console.log(`\nproposed rappels:\n  ${NEW}`);

if (!WRITE) { console.log(`\nDRY RUN — pass --write to apply.`); process.exit(0); }

requireServiceKey();
await patchRow("routes", ID, { rappels: NEW });

const [live] = await selectAll("routes", "id,rappels", `id=eq.${ID}`, { pageSize: 5 });
if (live?.rappels !== NEW) {
  console.error(`\nFAILED — reconcile mismatch.\n  want ${NEW}\n  got  ${live?.rappels}`);
  process.exit(1);
}
console.log(`\nok — written and reconciled against a fresh read`);
