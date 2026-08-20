// `wa_don_t_climb_that_she_said`'s `approach` admits no beta exists and then invents one anyway.
//
// THE FIRST SENTENCE IS EVIDENCE AND MUST BE KEPT. CLAUDE.md is explicit that a previous pass's
// recorded failure to find something is a result, not a gap — five Goose Egg routes carry exactly
// such an admission and writing a plausible approach over them would be fabrication. Everything
// after it here is inference from the row's OWN COLUMNS dressed as beta:
//   "With 0 pitches, no elevation gain listed, and a roughly 1 km/0.6-mile approach distance, this
//    is a short, low-commitment boulder problem reached by a brief, mostly flat walk from a pullout
//    or trailhead..."          <- restates dist_km and pitches, then invents the walk
//   "Expect an informal boot-path or use-trail through forest/talus ... but NOTHING RESEMBLING
//    GLACIER TRAVEL, CREEK FORDING, OR AVALANCHE TERRAIN given the minimal distance and zero gain."
//
// THE LAST CLAUSE IS THE REASON THIS IS WORTH FIXING RATHER THAN NOTING. The row's own overview
// places this boulder "beside the White Chuck Glacier basin" on Glacier Peak's standard south-side
// approach — terrain reached by a multi-day walk with glacier travel and real avalanche exposure.
// The 0.97 km it reasons from is the step from a high camp to the boulder, not from a road. So the
// speculation does not merely pad the column, it prints an affirmative safety claim that the rest
// of the same row contradicts, and it renders under APPROACH on the Planner tab where a climber
// reads it as beta. Same family as #641, where a missing approach and a zero approach became
// indistinguishable and the return tile went green.
//
// THE OPERATION IS A PREFIX TRUNCATION AND NOTHING ELSE. CLAUDE.md records that trimming interior
// sentences strands the connectives around them and needs prose rewritten — which is why the
// approach-scope batches were truncation-only. This cut keeps sentence 1 and drops the rest, and
// the result is ASSERTED to be a prefix of the original, so the script cannot express a rewrite.
//
// It is ONE ROUTE. `probe-approach-prose-that-admits-it-is-guessing.mjs` measured the class across
// all 8,365 WA routes: 13 carry a documented negative (correct, left alone) and 2 go on to
// speculate. The second, wa_the_pyramid_picket_east_ridge, is deliberately NOT touched — "parties
// would likely use the same general approach as the neighbouring route" is a STATED UNCERTAINTY,
// not invented detail, and removing it would delete an honest hedge.
//
// --apply to write. Dry by default.
import { selectAll, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const TARGET = "wa_don_t_climb_that_she_said";
/* The admission ends here. Quoted so the cut point is a fact about the text rather than an offset,
   and re-asserted against the live row before any write. */
const KEEP_THROUGH = "it isn't cross-referenced anywhere against a named boulder or trailhead in the Glacier Peak area.";

const r = (await selectAll("routes", "id,name,approach,overview,dist_km,gain_ft", `id=eq.${TARGET}`, { pageSize: 5 }))[0];
if (!r) { console.error(`FAIL — ${TARGET} returned no row.`); process.exit(1); }

const before = String(r.approach || "");
const at = before.indexOf(KEEP_THROUGH);
if (at < 0) {
  if (before.trim() === "" ) { console.error(`FAIL — approach is empty; nothing to trim.`); process.exit(1); }
  /* Already applied is a completed entry, not a failure — the trimmed text IS the keep-through
     sentence, so a re-run finds the anchor missing only if the prose changed some other way. */
  console.error(`FAIL — the anchor sentence is not in the live approach. Either this was already\n` +
    `trimmed to something else, or the prose changed. Read the row before re-running.\n\nlive approach:\n${before}`);
  process.exit(1);
}
const after = before.slice(0, at + KEEP_THROUGH.length).trim();

/* The one structural guarantee: this can only ever SHORTEN, never rewrite. */
if (!before.startsWith(after)) { console.error(`FAIL — the result is not a prefix of the original. Refusing.`); process.exit(1); }
if (after.length >= before.length) { console.log(`Nothing to trim — already at the admission only.`); process.exit(0); }

console.log(`${TARGET}  dist_km=${r.dist_km}  gain_ft=${r.gain_ft}`);
console.log(`\n--- overview (the row's own contradiction of what it is about to claim) ---\n${String(r.overview || "").trim()}`);
console.log(`\n--- approach BEFORE (${before.length} chars) ---\n${before}`);
console.log(`\n--- approach AFTER (${after.length} chars, prefix: ${before.startsWith(after)}) ---\n${after}`);
console.log(`\n--- dropped (${before.length - after.length} chars) ---\n${before.slice(at + KEEP_THROUGH.length).trim()}`);

if (!APPLY) { console.log(`\nDry run — nothing written. Re-run with --apply.`); process.exit(0); }

await patchRow("routes", TARGET, { approach: after });
const check = (await selectAll("routes", "id,approach", `id=eq.${TARGET}`, { pageSize: 5 }))[0];
if (!check || String(check.approach).trim() !== after) { console.error(`VERIFY FAILED — stored value does not match.`); process.exit(1); }
console.log(`\nverified ${TARGET} — approach is now the documented negative alone, ${after.length} chars.`);
