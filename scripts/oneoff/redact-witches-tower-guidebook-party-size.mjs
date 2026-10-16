// The last road/access citation: a guidebook cited for a PERMIT RULE.
//
// `wa_witches_tower_southwest_corner` access.permit reads "...(max party size 8 for this route per
// the Mountaineers guide) via Recreation.gov lottery." It is the one finding left in
// `audit:prose-citations`' ROAD/ACCESS section, and it was deliberately left by #1544's batch 2 on
// the reasoning that dropping the attribution would assert a REGULATION in our own voice.
//
// THAT REASONING WAS RIGHT AND THE CONCLUSION WAS WRONG. The choice is not "cite the guidebook or
// assert the rule" — it is "cite the guidebook, assert the rule, or say neither". The value already
// sends the climber to **Recreation.gov**, which is where the party-size limit is authoritative and
// current. A guidebook-sourced number adds a claim we cannot stand behind, in front of a climber
// who is being told to go to the land manager anyway.
//
// So the whole parenthetical goes, rather than just its attribution:
//   * keeping the number without the source asserts a regulation nobody verified
//   * keeping the source breaks the standing no-sources rule on an operational surface
//   * dropping both leaves the permit requirement, the season, and the lottery — every fact a
//     party needs to actually get the permit
//
// This is the same call the sweep already made for a metric it could not stand behind: cut the
// figure, keep the qualitative claim. Nothing here is a hedge, so nothing is lost by removing it.
//
// Contract as every batch in this sweep: an exact find/repl pair, refused unless `find` matches
// EXACTLY ONCE live, written through patchRow, re-read afterwards, and the resulting sentence
// printed because a deletion can strand a connective the pair does not show.
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const ID = "wa_witches_tower_southwest_corner";
const COL = "access";
const FIND = " (max party size 8 for this route per the Mountaineers guide)";
const REPL = "";

const KEY = APPLY ? requireServiceKey() : anonKey();
const url = `${SUPABASE_URL}/rest/v1/routes?id=eq.${ID}&select=id,name,${COL}`;
const r = await fetch(url, { headers: headers(KEY) });
if (!r.ok) { console.error(`read failed: ${r.status} ${await r.text()}`); process.exit(1); }
const rows = await r.json();
if (rows.length !== 1) { console.error(`read returned ${rows.length} row(s) - refusing`); process.exit(1); }

const count = (v) => (typeof v === "string" ? v.split(FIND).length - 1
  : Array.isArray(v) ? v.reduce((n, x) => n + count(x), 0)
  : v && typeof v === "object" ? Object.values(v).reduce((n, x) => n + count(x), 0) : 0);
const swap = (v) => (typeof v === "string" ? v.split(FIND).join(REPL)
  : Array.isArray(v) ? v.map(swap)
  : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, swap(x)])) : v);

const before = rows[0][COL];
const n = count(before);
if (n !== 1) {
  console.error(`REFUSED - found ${n} occurrence(s) of ${JSON.stringify(FIND)}, expected exactly 1.`);
  console.error("Nothing was written. Re-read the live value before changing the declaration.");
  process.exit(1);
}
const after = swap(before);
console.log(`### ${ID}  —  ${rows[0].name}`);
console.log(`   - ${JSON.stringify(FIND)}`);
console.log(`   => ${after.permit}`);
if (!APPLY) { console.log("\nDRY RUN - pass --apply to write."); process.exit(0); }

await patchRow("routes", ID, { [COL]: after });
const v = await fetch(url, { headers: headers(KEY) });
const live = (await v.json())[0][COL];
if (count(live) !== 0) { console.error("NOT APPLIED - the phrase is still there."); process.exit(1); }
if (!/Enchantment Permit Area overnight permit required/.test(live.permit)) {
  console.error("VERIFY FAILED - the permit requirement itself did not survive the edit.");
  process.exit(1);
}
console.log("\nverified: the citation is gone and the permit requirement, season and lottery all survive.");
