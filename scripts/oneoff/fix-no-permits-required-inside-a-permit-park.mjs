// Two rows tell a party no permit is required, in a park where one is, and their own permit field says so.
//
// wa_jack_mountain_northeast_glacier's access.notes reads "...No permits required; part of North Cascades
// National Park access area..." and wa_mount_redoubt_south_face's reads "No permits required but requires
// crossing into British Columbia, Canada...". Both are flat, unscoped denials. Both rows carry, two keys
// away, a field that requires a permit — Jack's permit field says "all overnight backcountry stays require
// a backcountry permit", and Redoubt's access.permit says "Wilderness/backcountry permit required for any
// overnight stay: $10 per person plus a $6 non-refundable reservation fee", with access.fees and
// access.passRequired agreeing. This is the error that gets a party cited.
//
// READ OFF THE AGENCY DIRECTLY THIS SESSION, because a permit rule is exactly the kind of fact this
// catalog's standing rule says must not be inferred. nps.gov/noca/planyourvisit/permits.htm: "Any hiker
// without a PCTA Long-distance Permit and Pacific Northwest trail hikers must request, in advance, a
// park-issued backcountry permit for camping inside North Cascades National Park."
//
// THE REPAIR DELETES THE FALSE CLAUSE AND AUTHORS NOTHING. It removes the denial and capitalises the word
// that then begins the sentence — a mechanical consequence of the deletion, not new prose. Every other
// statement in the value survives, and the row's own permit field, which already carries the truth, is
// untouched and stays on screen. No permit rule, fee or agency is typed by this script.
//
// PRECISION WAS MEASURED BEFORE ANYTHING WAS WRITTEN, and the measurement is most of the value here. A
// first detector — "a row denies a permit while another field requires one" — reported 41 rows and nearly
// all were correct work, in three distinct ways, each of which this file records so the rule is not
// re-widened:
//   1. A PARKING PASS IS NOT A PERMIT. "No climbing or wilderness permit required; Northwest Forest Pass
//      to park at developed trailheads" states two compatible facts, and matching "Pass ... required"
//      as a permit requirement condemns dozens of correct rows.
//   2. A NEGATION IS NOT A CLAIM. The requiring side matched "No climbing or wilderness permit required"
//      — reading a denial as an assertion. Same trap audit:trailhead-road records for "Not plowed in
//      winter". Both sides have to be sentence-scoped and negation-aware.
//   3. A SCOPED DENIAL IS CORRECT. "No permit needed for day travel on Forest Service land; a wilderness
//      camping permit is required if the route or camp falls within North Cascades National Park Complex
//      backcountry" is one correct sentence, not two conflicting ones. So is "No climbing permit required,
//      but a free self-issued wilderness travel permit must be filled out at the trailhead register".
// Tightened on all three the count is 8, and reading those 8 individually leaves 2. Do not sweep the other
// six: wa_east_ridge_2 and wa_mutchler_peak_scramble are correctly scoped, wa_philadelphia_mountain_scramble
// is the negation trap once more, and the two wa_lincoln_peak_* rows say "No wilderness permit required;
// free self-issue permits available at the trailhead" — muddled wording whose own second clause tells you
// to get one, which is an editorial matter and not a false claim.
//
// WHAT THIS DOES NOT CLOSE, stated rather than implied: a row that denies a permit and has no other field
// to contradict it is invisible here. 62 WA rows carry an unqualified denial and only these 8 are settled
// from inside the row; the rest would each need the land manager checked against a live agency page, which
// is research per row rather than a mechanical repair.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

// target -> the exact false clause, and the word that must be capitalised once it is gone.
const EDITS = [
  { id: "wa_jack_mountain_northeast_glacier", key: "notes", find: "No permits required; part of", repl: "Part of" },
  { id: "wa_mount_redoubt_south_face", key: "notes", find: "No permits required but requires", repl: "Requires" },
];
const DENIAL = /\bno\s+permits?\s+(?:are\s+)?required\b/i;
// the row must still, somewhere, require a permit — or the deletion would remove the only statement
const REQUIRES = /\b(?:wilderness|backcountry|climbing|overnight|quota)\s+permits?\b[^.]{0,80}\b(?:required|require)|\brequire[sd]?\s+a\s+backcountry\s+permit\b/i;

const rows = await selectAll("routes", "id,permit,access", "id=like.wa_*", { pageSize: 1000 });
console.log(`WA routes read: ${rows.length}`);
if (rows.length < 5000) { console.error("SHORT READ — refusing to act on a partial read"); process.exit(1); }

const plan = [];
for (const e of EDITS) {
  const r = rows.find(x => x.id === e.id);
  if (!r) { console.error(`${e.id} not found — refusing`); process.exit(1); }
  const cur = String(r.access?.[e.key] ?? "");
  if (!DENIAL.test(cur)) { console.log(`  already repaired: ${e.id}`); continue; }
  if (!cur.includes(e.find)) { console.error(`REFUSING ${e.id}: the value no longer reads as recorded`); process.exit(1); }
  if (cur.split(e.find).length - 1 !== 1) { console.error(`REFUSING ${e.id}: the clause appears more than once`); process.exit(1); }

  // the truth has to survive somewhere on this row, or this is a deletion of the only statement
  const elsewhere = [["permit", r.permit], ...Object.entries(r.access || {}).filter(([k]) => k !== e.key)]
    .filter(([, v]) => typeof v === "string" && REQUIRES.test(v) && !DENIAL.test(v));
  if (!elsewhere.length) { console.error(`REFUSING ${e.id}: no other field on this row requires a permit — nothing would be left`); process.exit(1); }

  const after = cur.replace(e.find, e.repl);
  if (DENIAL.test(after)) { console.error(`REFUSING ${e.id}: the denial survives the edit`); process.exit(1); }
  if (after.length >= cur.length) { console.error(`REFUSING ${e.id}: the edit did not shorten the value`); process.exit(1); }
  console.log(`\n  ${e.id}.access.${e.key}`);
  console.log(`     from ${JSON.stringify(cur.slice(0, 170))}`);
  console.log(`     to   ${JSON.stringify(after.slice(0, 170))}`);
  console.log(`     survives on this row -> ${elsewhere[0][0]}: ${JSON.stringify(String(elsewhere[0][1]).slice(0, 130))}`);
  plan.push({ ...e, r, cur, after });
}
if (!plan.length) { console.log("\nnothing to do."); process.exit(0); }
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

let wrote = 0;
for (const p of plan) { await patchRow("routes", p.id, { access: { ...p.r.access, [p.key]: p.after } }); wrote++; }
console.log(`\nwrote ${wrote}`);
const after = await selectAll("routes", "id,access", `id=in.(${EDITS.map(e => e.id).join(",")})`, { pageSize: 10 });
for (const r of after) {
  const e = EDITS.find(x => x.id === r.id);
  const v = String(r.access?.[e.key] ?? "");
  console.log(DENIAL.test(v) ? `NOT APPLIED — ${r.id} still denies a permit` : `verified: ${r.id} no longer tells a party no permit is required`);
}
