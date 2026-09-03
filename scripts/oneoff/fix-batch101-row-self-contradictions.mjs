// Two defects from batch 101 where the row contradicts itself and the correct value is already
// somewhere else in the same row. Both are truncations or copies; nothing is composed. A third
// repair was dropped when this script's own gate refused it -- see the note under (2).
//
// ------------------------------------------------------------------------------------------------
// 1. wa_bears_breast_mountain_southwest_face -- `pitches` 5 -> 3
//
// `pitch_detail` has five entries and the first two are "Approach Gully" (Class 3-4) and "Ridge
// Traverse" (Class 2-3). Those are STAGES, not roped pitches -- the split CLAUDE.md records for
// check:pitch-split, where a pitch_detail ENTRY is not always one pitch. The row says three in four
// separate places: overview "A 3-pitch (up to 5.6) summit block", beta "climb the summit block in
// three short pitches", descent three rappels, and approach_variants baseFinding "Not a long face
// climb -- three pitches."
//
// NOT COSMETIC. `pitches` feeds techHrs() in the planner's climbing-time estimate, so counting two
// walking stages as roped pitches bills the party for ground they walk -- and it feeds
// `check:gain-floor-stated`'s climbing credit (pitches x 35 m), so it also moves that caveat.
//
// THE CLASS IS A CANDIDATE LIST, NOT A SWEEP. 596 WA rows carry both `pitches` and `pitch_detail`;
// 22 have `pitches` equal to the entry count while some entries carry no pitch number. But reading
// them, the label test cannot decide on its own: wa_black_peak_northeast_ridge's entries are all
// descriptive ("Ridge-crest low-5th section", "Summit block") and are plainly rope lengths, while
// wa_dark_peak_dark_glacier_route's seven entries are approach legs from High Bridge. Only this row
// is repaired, because only this row was read end to end and states its own answer four times.
//
// ------------------------------------------------------------------------------------------------
// 2. wa_bears_breast_mountain_se_mega_slab -- `season` 62 chars -> "Aug-Sep"
//
// `season` renders in the route header strap beside elevation and pitch count, and CLAUDE.md is
// explicit that anything over ~20 characters there is a defect regardless of accuracy, with the
// explanation belonging in the prose column beside it. It ALREADY does: best_season carries
// "Documented ascents cluster in August and early September", so this truncation loses nothing.
// The route's three siblings on the same peak store "Jul-Sep".
//
// A THIRD REPAIR WAS DROPPED BECAUSE THIS SCRIPT'S OWN GATE REFUSED IT, and that is worth keeping.
// `rock_grade` is "Low 5th class (unrated friction slab)" -- 37 chars in a grade field, the same
// shape defect. The batch's research said the qualifier "already lives in pro_needs", so I wrote a
// premise asserting that and the premise FAILED: pro_needs reads "low-angle friction with
// essentially no protection placements needed", which covers the friction and the absence of gear
// but never says UNRATED. Truncating would drop that word, and the honest place for it is a null
// `grade` -- which this row already has, but that is an argument, not the "loses nothing" claim the
// repair rested on. The fix was to drop the repair, NOT to loosen the gate until it passed:
// weakening a premise to reach a wanted answer is the failure this repo records under half a dozen
// names. Recorded as an open shape defect instead.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const EDITS = [
  {
    id: "wa_bears_breast_mountain_southwest_face",
    field: "pitches",
    from: 5, to: 3,
    why: "pitch_detail's first two entries are Class 3-4 / Class 2-3 stages, not roped pitches",
    premises: r => {
      const pd = Array.isArray(r.pitch_detail) ? r.pitch_detail : [];
      if (pd.length !== 5) return `pitch_detail no longer has 5 entries (${pd.length}) — re-read it.`;
      const roped = pd.filter(p => /\d/.test(String(p && p.pitch != null ? p.pitch : ""))).length;
      if (roped !== 3) return `pitch_detail no longer shows exactly 3 numbered pitches (${roped}).`;
      const ov = String(r.overview || ""), bt = String(r.beta || "");
      if (!/3-pitch|three short pitches/i.test(ov + " " + bt)) return "the row's own overview/beta no longer say three pitches — that is the whole basis for this change.";
      return null;
    },
  },
  {
    id: "wa_bears_breast_mountain_se_mega_slab",
    field: "season",
    from: "Aug-Sep (documented ascents cluster in late summer/early fall)", to: "Aug-Sep",
    why: "62 chars in the header-strap field; the qualifier is already in best_season",
    premises: r => {
      if (!/cluster in august/i.test(String(r.best_season || ""))) return "best_season no longer carries the clustering sentence — truncating would LOSE it.";
      return null;
    },
  },
];

const ids = [...new Set(EDITS.map(e => e.id))];
const rows = await selectAll("routes",
  "id,pitches,pitch_detail,overview,beta,season,best_season,rock_grade,pro_needs",
  `id=in.(${ids.join(",")})`, { pageSize: 20 });
if (rows.length !== ids.length) {
  console.error(`FAIL: expected ${ids.length} rows, read ${rows.length}. Refusing to act on a partial read.`);
  process.exit(1);
}

let planned = 0, skipped = 0, refused = 0;
const plan = [];
for (const e of EDITS) {
  const r = rows.find(x => x.id === e.id);
  const cur = r[e.field];
  if (cur === e.to) { console.log(`\n== ${e.id}.${e.field}\n   already applied — no-op.`); skipped++; continue; }
  if (cur !== e.from) {
    console.error(`\n== ${e.id}.${e.field}\n   REFUSED: expected ${JSON.stringify(e.from)}, found ${JSON.stringify(cur)}. The field has changed; re-read it.`);
    refused++; continue;
  }
  const bad = e.premises(r);
  if (bad) { console.error(`\n== ${e.id}.${e.field}\n   REFUSED: ${bad}`); refused++; continue; }
  console.log(`\n== ${e.id}.${e.field}   [gate: EVIDENCE]`);
  console.log(`   why:    ${e.why}`);
  console.log(`   BEFORE: ${JSON.stringify(cur)}`);
  console.log(`   AFTER:  ${JSON.stringify(e.to)}`);
  plan.push({ id: e.id, field: e.field, to: e.to });
  planned++;
}

console.log(`\nplanned ${planned}, already-applied ${skipped}, refused ${refused}`);
if (refused) { console.error("one or more entries were refused — nothing will be written."); process.exit(1); }
if (!planned) { console.log("nothing to do."); process.exit(0); }
if (!APPLY) { console.log("\ndry run — re-run with --apply to write."); process.exit(0); }

for (const p of plan) await patchRow("routes", p.id, { [p.field]: p.to });

// verify by RE-READ, never by the write's own status
const after = await selectAll("routes", "id,pitches,season,rock_grade", `id=in.(${ids.join(",")})`, { pageSize: 20 });
let bad = 0;
for (const p of plan) {
  const got = after.find(x => x.id === p.id)?.[p.field];
  if (got !== p.to) { console.error(`FAIL: ${p.id}.${p.field} re-read is ${JSON.stringify(got)}, expected ${JSON.stringify(p.to)}.`); bad++; }
}
if (bad) process.exit(1);
console.log(`\nverified by re-read: ${plan.length} field(s) corrected.`);
