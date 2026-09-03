// Undoing six writes I made by accident, and the reason they are safe to undo is not a statistic.
//
// fix-noca-fee-charged-per-trip-not-per-night.mjs scanned each row as a flat list of (key, value) pairs
// built from the top-level `permit` COLUMN and the keys of the `access` object. Both are called "permit",
// so a repair computed from access.permit was dispatched to the column instead. On six rows the column
// was empty, so the effect was to POPULATE it with a copy of the neighbouring field, while leaving the
// actual defect in access.permit untouched.
//
// THE TELL WAS THE VERIFICATION LINE, and nothing else could have produced it: "values still saying '$10
// per person per night': 9 (expected 3)". Every patch succeeded, patchRow raised nothing, and the script
// reported "wrote 33". A write that lands on the wrong field is indistinguishable from a correct one
// unless something counts the defect afterwards and compares it against what was held back.
//
// WHY CLEARING IS THE RIGHT REPAIR, and it does not rest on the 70% statistic. Each of the six columns is
// currently, byte for byte, its own access.permit with the two words " per night" removed — the exact
// output of the buggy write. That is a value which is a FUNCTION of a neighbouring field, so it cannot be
// pre-existing independent text unless six rows independently happened to duplicate their access.permit
// while only 1 row in 699 does so catalog-wide. The supporting evidence agrees: the permit column is empty
// on 70.4% of the 2,362 rows that populate access.permit, and the two untouched sibling routes on Davis
// Peak both have it empty.
//
// The script REFUSES rather than clears if that derivation does not hold, so a column carrying genuine
// independent text cannot be emptied by it. Nothing is written except an empty string, and nothing is
// composed: access.permit already carries the statement in full and is what these rows had all along.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const TARGETS = ["wa_berdeen_peak_scramble", "wa_davis_peak_nc_southwest", "wa_goode_mountain_megalodon_ridge",
  "wa_goode_mountain_northeast_face", "wa_goode_mountain_southwest_couloir", "wa_mount_goode_northeast_buttress"];
const TEN = "$10 per person per night";

const rows = await selectAll("routes", "id,permit,access", `id=in.(${TARGETS.join(",")})`, { pageSize: 20 });
if (rows.length !== TARGETS.length) { console.error(`expected ${TARGETS.length} rows, read ${rows.length} — refusing`); process.exit(1); }

const plan = [];
for (const r of rows) {
  const col = String(r.permit ?? "");
  const ap = String(r.access?.permit ?? "");
  if (!col.trim()) { console.log(`  already reverted: ${r.id}`); continue; }
  // The column must be derivable from access.permit — either the repaired form or the original one.
  const derived = col === ap.replace(TEN, "$10 per person") || col === ap;
  if (!derived) {
    console.error(`REFUSING ${r.id}: the column is NOT a copy of access.permit, so it may be genuine text`);
    console.error(`   column: ${JSON.stringify(col.slice(0, 160))}`);
    console.error(`   access: ${JSON.stringify(ap.slice(0, 160))}`);
    process.exit(1);
  }
  if (!ap.trim()) { console.error(`REFUSING ${r.id}: access.permit is empty, so clearing the column would lose the statement`); process.exit(1); }
  console.log(`\n  ${r.id}.permit (column)`);
  console.log(`     clearing ${JSON.stringify(col.slice(0, 150))}`);
  console.log(`     kept in access.permit: ${JSON.stringify(ap.slice(0, 150))}`);
  plan.push(r.id);
}
if (!plan.length) { console.log("\nnothing to do."); process.exit(0); }
if (!APPLY) { console.log(`\nDRY RUN — ${plan.length} column(s) to clear. Pass --apply to write.`); process.exit(0); }

for (const id of plan) await patchRow("routes", id, { permit: "" });
const after = await selectAll("routes", "id,permit,access", `id=in.(${TARGETS.join(",")})`, { pageSize: 20 });
let bad = 0;
for (const r of after) {
  const ok = !String(r.permit ?? "").trim() && String(r.access?.permit ?? "").trim();
  if (!ok) { bad++; console.log(`NOT REVERTED — ${r.id}`); }
}
console.log(`\ncleared ${plan.length}; rows now with an empty column and a populated access.permit: ${after.length - bad} of ${after.length}`);
