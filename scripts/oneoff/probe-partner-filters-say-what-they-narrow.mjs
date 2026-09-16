// The Partners tab's filter panel narrows the EXAMPLE profiles and nothing else — and the list of
// REAL accounts sits between the sentence promising the filters and the filters themselves.
//
// In "Anyone" mode the app says "Use the filters below to narrow by level, discipline, trust, and
// distance", and the very next block is "Climbers on ClimbMatch". Measured by source offset, the
// order is: intro sentence -> REAL accounts -> example caveat -> Hide filters -> the filter panel.
// So the first list below the promise is the one list the promise does not cover.
//
// It is not a wiring bug and MUST NOT BE "FIXED" BY APPLYING THE FILTERS. Most of them cannot reach
// a real profile with the data that exists: `RealClimberRow`'s own `_cand` hardcodes
// `objectiveIds: []`, and `profiles` has no availability, no pace and no `level` column for anyone
// (`check:real-profile-rows` exists because rendering one invents a value a real account lacks).
// Applying them would exclude every real climber — absence read as a mismatch, which is exactly the
// defect #612 removed from pace and the comment above the speed filter still warns about. The
// honest fix is to say which list the filters govern, where the reader is when the question arises.
//
// SOURCE-ONLY, and the reason is stated rather than implied: the real-accounts block is gated on
// `USE_DB && DB_UID`, so reaching it means stubbing `./lib/supabase` to flip a module constant AND
// standing up PartnerSearch's full prop set — far more than a copy claim is worth, and
// `check:policy-claims` takes the same decision for the in-app privacy sheet.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ok    " + m); } else { fail++; console.log("  FAIL  " + m); } };

const at = (needle) => { const i = src.indexOf(needle); return i < 0 ? null : i; };

// --- 1. the ORDER is the defect, so assert it rather than describing it -------------------------
const intro  = at("Use the filters below to narrow by level");
const realHd = at("Climbers on ClimbMatch");
const exCav  = at("Example profiles, to show how matching works");
const panel  = at("AVAILABLE TO CLIMB");
ok(intro !== null && realHd !== null && exCav !== null && panel !== null,
  "ANCHOR: all four landmarks are present");
if (intro === null || realHd === null || exCav === null || panel === null) {
  console.log("\nANCHOR LOST — nothing below was checked."); process.exit(1);
}
ok(intro < realHd, "the sentence promising the filters comes BEFORE the real-accounts list");
ok(realHd < exCav, "...and the real-accounts list comes before the example profiles");
ok(exCav < panel, "...and the filter panel is below both — so 'the filters below' is two lists away");

// --- 2. the real list really is outside the filters --------------------------------------------
// `browsePeople` is the rendered real list. If it ever gains the filter chips this probe must be
// re-read rather than re-pointed: the copy would then be the stale half.
const bp = src.slice(at("const browsePeople="), at("const browsePeople=") + 320);
ok(/_blockedIds\.has/.test(bp) && /String\(DB_UID\)/.test(bp),
  "browsePeople is filtered by blocked ids and self");
for (const chip of ["availF", "levelF", "minTrust", "verifiedOnly", "speedMatch", "discF", "maxMiles"])
  ok(!new RegExp("\\b" + chip + "\\b").test(bp), `...and NOT by ${chip}`);

// --- 3. the example list IS filtered, or the new sentence would be false ------------------------
// A rule that only asserts the real list is unfiltered is satisfied by a filter panel that narrows
// NOTHING, which would make the copy wrong in the other direction.
const filtered = src.slice(at("const filtered=ALL_CLIMBERS.filter"), at("const filtered=ALL_CLIMBERS.filter") + 1400);
ok(/ALL_CLIMBERS/.test(filtered), "the filtered list is built from ALL_CLIMBERS (seed + fillers)");
for (const chip of ["availF", "levelF", "minTrust", "verifiedOnly", "speedMatch", "discF", "maxMiles"])
  ok(new RegExp("\\b" + chip + "\\b").test(filtered), `the example list IS narrowed by ${chip}`);

// --- 4. the copy -------------------------------------------------------------------------------
ok(/The filters below narrow the example profiles, not this list\./.test(src),
  "the real-accounts caption says which list the filters govern");
const capIdx = at("The filters below narrow the example profiles, not this list.");
ok(capIdx > realHd && capIdx < exCav,
  "...and it sits INSIDE the real-accounts block, where a reader is when the question arises");
// NOT PINNED TO ONE PHRASING beyond the claim itself: the neighbouring sentence is a Settings PATH
// that check:policy-claims section 4 validates against the app's own section headings, so a reword
// there is a different guard's business and must not be broken here.
ok(/Settings → Privacy & safety/.test(src.slice(realHd, exCav)),
  "the Settings path beside it is intact — check:policy-claims section 4 reads it");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
