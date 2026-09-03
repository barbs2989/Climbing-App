// Mount Rainier's $82 climbing fee, described as an annual pass it is not.
//
// Nine values across seven rows call it annual — "$82/climber ANNUAL climbing cost-recovery fee",
// "$82/person/YEAR climbing registration", and most explicitly "Annual Climbing Cost Recovery Fee:
// $82/person for 2026, VALID FOR ALL CLIMBS THAT CALENDAR YEAR". A party climbing Rainier twice in a
// season budgets once and is $82 a head short.
//
// READ OFF THE AGENCY THIS SESSION, because a fee must not be inferred:
// nps.gov/mora/planyourvisit/climbing.htm describes the $82 as a per-person REGISTRATION fee attached to
// a climb, twice, once in each seasonal path — "You may register for a walk-up permit 24-hours before
// your climb begins. Each person in your party must pay $82" (summer), and "Each person in your party
// must pay $82. The registration fee may be paid per party member online at Pay.gov... You must pay
// before you come to the park" (winter self-registration, Sept 15 - May 21). Nothing on that page
// supports annual validity.
//
// THE REPAIR IS SUBTRACTIVE AND ASSERTS NOTHING, which matters because the page does not use the words
// "per climb" either. Only the unsupported qualifier comes out — "annual", "/year", "per year", "valid
// for all climbs that calendar year". The amount, the fee's name, who pays it and when it applies all
// survive untouched, and no new term is typed. This is stale rather than invented: the park did once
// sell an annual climbing pass, so the qualifier was true of a different era's product.
//
// TWO VALUES LOOK IDENTICAL TO A NEEDLE AND ARE CORRECT, which is why the exclusion is structural rather
// than a word list. "America the Beautiful / interagency ANNUAL pass covers only the $30 vehicle
// entrance fee, not the separate $82 climbing registration fee" puts "annual" and "$82" in one sentence
// while the qualifier belongs to a DIFFERENT pass — and that sentence exists precisely to warn a climber
// the annual pass does not cover this fee. A proximity match reported both as defects. The rule here is
// that the qualifier must sit inside the $82 fee's own noun phrase, not merely in the same sentence.
//
// THE `permit` KEY NAMES TWO DIFFERENT FIELDS AND THIS SCRIPT CONFLATED THEM ON ITS FIRST RUN. The
// top-level `permit` COLUMN and the `access.permit` sub-key are both called "permit", so a repair
// computed from access.permit was dispatched to the column — populating it with a copy of a
// neighbouring field on four rows and leaving the real defect in place. Identical to the bug the
// NOCA fee applier hit hours earlier, in a script whose header documents it, reintroduced because
// this one built its field list the same flat way. The column is keyed distinctly now.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

// each edit removes ONLY the validity qualifier attached to the $82 fee
const EDITS = [
  [/\$82\s*\/\s*person\s*\/\s*year\b/gi, "$82/person"],
  [/\$82\s*\/\s*climber\s+annual\b/gi, "$82/climber"],
  [/\$82\s*\/\s*person\s+annual\b/gi, "$82/person"],
  [/\bMRNP's \$82 annual climbing fee\b/g, "MRNP's $82 climbing fee"],
  [/\bthe \$82 annual climbing fee\b/gi, "the $82 climbing fee"],
  [/\bthe annual \$82 climbing fee\b/gi, "the $82 climbing fee"],
  [/\bAnnual Climbing Cost Recovery Fee\b/g, "Climbing Cost Recovery Fee"],
  [/,?\s*valid for all climbs that calendar year/gi, ""],
  // A DENY-LIST OF PHRASINGS IS SHORT BY ONE UNTIL IT IS NOT: the first run left two values because
  // "$82 per person per year" and "$82 per person annual" are spelled with words where the others
  // use slashes, and "Annual Climbing FEE" is not "Annual Climbing COST RECOVERY Fee".
  [/\bAnnual Climbing Fee:\s*(\$82 per person)\s*per year\b/gi, "Climbing Fee: $1"],
  [/(\$82 per person)\s+annual\b/gi, "$1"],
  [/(\$82)\s+per person per year\b/gi, "$1 per person"],
  // A SECOND PRODUCT THAT DOES NOT EXIST. 22 rows carry one identical permit-column value:
  // "requires the park's ANNUAL CLIMBING PASS PLUS climbing registration". The NPS climbing page
  // describes exactly one thing — the $82 per-person registration fee — so this both mis-describes
  // it as annual AND invents a separate pass beside it. Deleting the invented half leaves
  // "requires the park's climbing registration", which is what the page says.
  [/\bannual climbing pass plus climbing registration\b/gi, "climbing registration"],
];
// a qualifier belonging to a DIFFERENT pass must never be touched
const OTHER_PASS = /america the beautiful|interagency annual pass|annual pass covers/i;
const COL = "\\x00column:permit";  // a key no access sub-key can collide with
const LEFT = /annual climbing pass|\$\s?82[^.;]{0,30}\b(?:annual|per year|\/year)|\bannual\b[^.;]{0,30}\$\s?82|valid for all climbs that calendar year/i;

const rows = await selectAll("routes", "id,permit,access", "id=like.wa_*", { pageSize: 1000 });
console.log(`WA routes read: ${rows.length}`);
if (rows.length < 5000) { console.error("SHORT READ — refusing to act on a partial read"); process.exit(1); }

const plan = [], held = [];
for (const r of rows) {
  const a = r.access || {};
  for (const [k, v] of [[COL, r.permit], ...Object.entries(a)]) {
    // the entry gate must admit the boilerplate too, which names no dollar amount
    if (typeof v !== "string" || !(/\$\s?82\b/.test(v) || /annual climbing pass/i.test(v))) continue;
    let after = v;
    for (const [re, to] of EDITS) after = after.replace(re, to);
    if (after === v) continue;
    // never edit a sentence whose "annual" belongs to the interagency pass
    const changed = v.split(/(?<=[.;])\s+/).filter((s, i) => s !== after.split(/(?<=[.;])\s+/)[i]);
    if (changed.some(s => OTHER_PASS.test(s))) { held.push({ id: r.id, k, why: "the qualifier belongs to the interagency annual pass, not the $82 fee" }); continue; }
    if (after.length >= v.length) { console.error(`REFUSING ${r.id}.${k}: the edit did not shorten the value`); process.exit(1); }
    plan.push({ id: r.id, key: k, access: a, from: v, to: after });
  }
}

console.log(`\nvalues to repair: ${plan.length}`);
for (const p of plan) {
  const i = p.from.split(/(?<=[.;])\s+/).findIndex((s, j) => s !== p.to.split(/(?<=[.;])\s+/)[j]);
  console.log(`\n  ${p.id}  ${p.key}`);
  console.log(`     from ${JSON.stringify(p.from.split(/(?<=[.;])\s+/)[i]?.trim().slice(0, 135) ?? p.from.slice(0, 135))}`);
  console.log(`     to   ${JSON.stringify(p.to.split(/(?<=[.;])\s+/)[i]?.trim().slice(0, 135) ?? p.to.slice(0, 135))}`);
}
console.log(`\nheld back: ${held.length}`);
for (const h of held) console.log(`   HELD ${h.id}.${h.k} — ${h.why}`);
if (!plan.length) { console.log("\nnothing to do."); process.exit(0); }
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

const byRow = new Map();
for (const p of plan) {
  if (!byRow.has(p.id)) byRow.set(p.id, { permit: undefined, access: { ...p.access } });
  const e = byRow.get(p.id);
  if (p.key === COL) e.permit = p.to; else e.access[p.key] = p.to;
}
for (const [id, e] of byRow) {
  const body = {};
  if (e.permit !== undefined) body.permit = e.permit;
  body.access = e.access;
  await patchRow("routes", id, body);
}
console.log(`\nwrote ${byRow.size} row(s), ${plan.length} value(s)`);
const after = await selectAll("routes", "id,permit,access", "id=like.wa_*", { pageSize: 1000 });
let left = 0;
for (const r of after) for (const v of [r.permit, ...Object.values(r.access || {})]) {
  if (typeof v === "string" && LEFT.test(v) && !OTHER_PASS.test(v)) left++;
}
console.log(`values still calling the $82 fee annual (excluding the interagency-pass sentences): ${left}`);
