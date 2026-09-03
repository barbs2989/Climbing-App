// Undoing four writes I made by accident, for the SECOND time in one session and by the same mechanism.
//
// fix-rainier-climbing-fee-called-annual.mjs scanned each row as a flat list of (key, value) pairs built
// from the top-level `permit` COLUMN and the keys of `access`. Both are called "permit", so a repair
// computed from access.permit was dispatched to the column instead: the column was overwritten with the
// repaired text and access.permit kept the defect. Four rows — wa_classic_route_3, wa_lane_peak_r1,
// wa_lane_peak_r2, wa_little_tahoma_east_shoulder.
//
// THIS IS THE SAME BUG AS THE NOCA FEE APPLIER HOURS EARLIER, whose own header documents it in detail.
// Writing the lesson down did not prevent repeating it, because the flat (key, value) list is the
// natural way to write this scan and the collision is invisible until something counts the defect
// afterwards. Both scripts now key the column distinctly. The general rule, stated plainly: `permit` is
// not a unique field name on this table, so never build a field list that flattens the column and the
// access sub-keys into one namespace.
//
// THE TELL WAS AGAIN THE VERIFICATION LINE — "values still calling the $82 fee annual: 6" after a run
// that reported writing 9. Every patch succeeded and patchRow raised nothing. A write that lands on the
// wrong field is indistinguishable from a correct one unless the script re-counts the defect afterwards.
//
// WHY CLEARING IS THE RIGHT REPAIR, and this time it needed more than the derivation argument. Each
// damaged column is currently, byte for byte, its own access.permit with the annual qualifier removed —
// the exact output of the buggy write, so it cannot be pre-existing independent text. But unlike the
// earlier incident I could NOT conclude the columns had been empty from the plan's arithmetic: a column
// holding the shared Rainier boilerplate contains no "$82", so my edit would not have matched it and it
// would not have appeared in the plan. Three further measurements settle it:
//   * 94% of Rainier-area rows with a populated access.permit have an EMPTY permit column (1,341 of
//     1,428). Only 2% carry the shared boilerplate.
//   * wa_classic_route_3 has an empty permit column in catalog/wa/wa_routes.json, the import source.
//   * The earlier incident's six damaged columns were all empty, established independently.
// So the residual risk is that one of these four held the boilerplate; the certainty is that what they
// hold NOW is a duplicate of a neighbouring field, which is wrong either way.
//
// The script REFUSES rather than clears if the derivation does not hold, so a column carrying genuine
// independent text cannot be emptied by it. Nothing is written except an empty string.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const TARGETS = ["wa_classic_route_3", "wa_lane_peak_r1", "wa_lane_peak_r2", "wa_little_tahoma_east_shoulder"];
// the exact edits the buggy script applied, so the derivation can be re-computed here
const EDITS = [
  [/\$82\s*\/\s*person\s*\/\s*year\b/gi, "$82/person"],
  [/\$82\s*\/\s*climber\s+annual\b/gi, "$82/climber"],
  [/\$82\s*\/\s*person\s+annual\b/gi, "$82/person"],
  [/\bMRNP's \$82 annual climbing fee\b/g, "MRNP's $82 climbing fee"],
  [/\bthe \$82 annual climbing fee\b/gi, "the $82 climbing fee"],
  [/\bthe annual \$82 climbing fee\b/gi, "the $82 climbing fee"],
  [/\bAnnual Climbing Cost Recovery Fee\b/g, "Climbing Cost Recovery Fee"],
  [/,?\s*valid for all climbs that calendar year/gi, ""],
];
const repaired = s => EDITS.reduce((acc, [re, to]) => acc.replace(re, to), String(s));

const rows = await selectAll("routes", "id,permit,access", `id=in.(${TARGETS.join(",")})`, { pageSize: 20 });
if (rows.length !== TARGETS.length) { console.error(`expected ${TARGETS.length} rows, read ${rows.length} — refusing`); process.exit(1); }

const plan = [];
for (const r of rows) {
  const col = String(r.permit ?? "");
  const ap = String(r.access?.permit ?? "");
  if (!col.trim()) { console.log(`  already reverted: ${r.id}`); continue; }
  if (!ap.trim()) { console.error(`REFUSING ${r.id}: access.permit is empty, so clearing the column would lose the statement`); process.exit(1); }
  if (col !== repaired(ap) && col !== ap) {
    console.error(`REFUSING ${r.id}: the column is NOT the repaired form of access.permit, so it may be genuine text`);
    console.error(`   column: ${JSON.stringify(col.slice(0, 150))}`);
    console.error(`   access: ${JSON.stringify(ap.slice(0, 150))}`);
    process.exit(1);
  }
  console.log(`\n  ${r.id}.permit (column)`);
  console.log(`     clearing ${JSON.stringify(col.slice(0, 145))}`);
  console.log(`     kept in access.permit: ${JSON.stringify(ap.slice(0, 145))}`);
  plan.push(r.id);
}
if (!plan.length) { console.log("\nnothing to do."); process.exit(0); }
if (!APPLY) { console.log(`\nDRY RUN — ${plan.length} column(s) to clear. Pass --apply to write.`); process.exit(0); }

for (const id of plan) await patchRow("routes", id, { permit: "" });
const after = await selectAll("routes", "id,permit,access", `id=in.(${TARGETS.join(",")})`, { pageSize: 20 });
let ok = 0;
for (const r of after) {
  if (!String(r.permit ?? "").trim() && String(r.access?.permit ?? "").trim()) ok++;
  else console.log(`NOT REVERTED — ${r.id}`);
}
console.log(`\ncleared ${plan.length}; rows now with an empty column and a populated access.permit: ${ok} of ${after.length}`);
