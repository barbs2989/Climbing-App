// A follow-up to fix-six-rappel-tables-from-research.mjs, and a candidate THAT script created.
//
// That repair put the party-dependence of this descent into descent_text: the one recorded
// party made three rappels, and a soloist who found a low-angle southeast wall bypassing the
// summit cliffs downclimbed the whole route with none. `rappels` was left alone, still leading
// with a flat "3 rappels" — so `audit:rappel-claims` began reporting the route as claiming raps
// its own descent text denies. It was not flagged before that edit.
//
// The audit is right that this is a CANDIDATE rather than a defect — its own output says a
// conditional alternative to downclimbing is not a contradiction. But the headline field is
// the one a climber reads first, and it should not assert a count the row now knows is not a
// property of the route. Leading with the party-dependence says the true thing and removes the
// candidate as a side effect, rather than the other way round.
//
// Run with no flag for a dry run; --apply writes.
import crypto from "crypto";
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const KEY = requireServiceKey();
const APPLY = process.argv.includes("--apply");
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

const ID = "wa_crooked_thumb_peak_south_route";
const EXPECT_RAPPELS = "d3a72e7cbd6faa09";
const NEW_RAPPELS = "Party-dependent. The one recorded descent made 3 rappels — one single-strand down the headwall crack, then a long one and a short one from the north-ridge horn on doubled ropes to an exit ledge — but the route has also been downclimbed with no rappels at all, on a low-angle southeast wall that bypasses the summit cliffs.";

const rows = await selectAll("routes", "id,rappels,descent_text", `id=eq.${ID}`, { pageSize: 10, key: KEY });
const r = rows[0];
if (!r) { console.log(`REFUSE: ${ID} not found`); process.exit(1); }

const got = sha(r.rappels);
if (got !== EXPECT_RAPPELS) {
  console.log(`REFUSE: rappels has moved (expected ${EXPECT_RAPPELS}, found ${got})`);
  console.log(`  stored: ${JSON.stringify(r.rappels)}`);
  process.exit(1);
}
// the premise: descent_text must already carry the party-dependence this field is being made
// to agree with. Without it this rewrite would be asserting something the row does not hold.
if (!String(r.descent_text).includes("downclimbed the whole route with no rappels at all")) {
  console.log("REFUSE: descent_text does not record the no-rappel descent, so there is nothing to agree with");
  process.exit(1);
}

console.log(`${ID}`);
console.log(`  WAS: ${r.rappels}`);
console.log(`  NOW: ${NEW_RAPPELS}`);

if (!APPLY) { console.log("\nDRY RUN — nothing written. Re-run with --apply."); process.exit(0); }
await patchRow("routes", ID, { rappels: NEW_RAPPELS });
const after = await selectAll("routes", "id,rappels", `id=eq.${ID}`, { pageSize: 10, key: KEY });
const ok = sha(after[0].rappels) === sha(NEW_RAPPELS);
console.log(ok ? "\nwrote and reconciled" : "\nMISMATCH — the write did not land as declared");
process.exitCode = ok ? 0 : 1;
