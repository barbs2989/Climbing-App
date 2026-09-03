// A Northwest Forest Pass sold by the five days, on rows that already say it is sold by the day.
//
// Twenty-eight rows store access.fees = "NW Forest Pass $5 (5-day) or $30 (annual)" while another field
// on the SAME row says "$5/day". There is no five-day Northwest Forest Pass; the $5 product is a day
// pass, and the row's own parking_pass or passRequired field says so. A climber reading the fees line
// plans one $5 purchase for a five-day trip and is short by four.
//
// SETTLED FROM INSIDE THE ROW, which is why this did not need the agency. Two research passes both
// reported it against the Forest Service Region 6 passes page, but both live FS URLs I tried returned
// 301 and 000 this session, and this catalog's rule is not to call a fee wrong without reading it off a
// live agency page. It does not matter here: the contradiction is between two fields of one row, the
// replacement term is the one the row itself uses one field away, and no fee, duration or agency is
// typed by this script.
//
// A LOOSE NEEDLE READ THE RIGHT ANSWER AS THE WRONG ONE, and it is worth recording because the correct
// string CONTAINS the defective one. "$5 day pass" — which is right — contains the substring "5 day
// pass", so a pattern matching `5[- ]day\s+pass` flagged 52 rows including a dozen that state the fee
// correctly. Requiring the PARENTHETICAL form, "(5-day)", takes it to 40, of which 28 are contradicted
// in-row. Twelve carry the parenthetical with no day-pass statement beside them and are left alone:
// there is no donor on those rows, and inventing the correction would be asserting a fee.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const FIVE = /\(\s*5[- ]day\s*\)/i;
const DAY = /\$\s?5\s*\/\s*day|\$\s?5\s+(?:per\s+)?day\b|\$\s?5\s+day\s+pass\b/i;

const rows = await selectAll("routes", "id,access", "id=like.wa_*", { pageSize: 1000 });
console.log(`WA routes read: ${rows.length}`);
if (rows.length < 5000) { console.error("SHORT READ — refusing to act on a partial read"); process.exit(1); }

const plan = [], held = [];
for (const r of rows) {
  const a = r.access || {};
  for (const [k, v] of Object.entries(a)) {
    if (typeof v !== "string" || !FIVE.test(v)) continue;
    // the donor: another field on this row calling it a DAY pass
    const donor = Object.entries(a).find(([k2, v2]) => k2 !== k && typeof v2 === "string" && DAY.test(v2) && !FIVE.test(v2));
    if (!donor) { held.push({ id: r.id, k, why: "no day-pass statement elsewhere on the row to correct from" }); continue; }
    if (v.split(FIVE).length - 1 !== 1) { console.error(`REFUSING ${r.id}.${k}: the clause appears more than once`); process.exit(1); }
    const after = v.replace(FIVE, "(day)");
    if (after.length >= v.length) { console.error(`REFUSING ${r.id}.${k}: the edit did not shorten the value`); process.exit(1); }
    if (FIVE.test(after)) { console.error(`REFUSING ${r.id}.${k}: the five-day claim survives the edit`); process.exit(1); }
    plan.push({ id: r.id, access: a, k, from: v, to: after, donor });
  }
}

console.log(`\nvalues to repair: ${plan.length}`);
console.log(`held back (no in-row donor): ${held.length}`);
if (plan.length) {
  const p = plan[0];
  console.log(`\nexample — ${p.id}`);
  console.log(`   access.${p.k}   ${JSON.stringify(p.from.slice(0, 130))}`);
  console.log(`             ->   ${JSON.stringify(p.to.slice(0, 130))}`);
  console.log(`   donor  access.${p.donor[0]}: ${JSON.stringify(String(p.donor[1]).slice(0, 130))}`);
}
if (!plan.length) { console.log("\nnothing to do."); process.exit(0); }
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

// one patch per row, accumulating fields
const byRow = new Map();
for (const p of plan) { if (!byRow.has(p.id)) byRow.set(p.id, { ...p.access }); byRow.get(p.id)[p.k] = p.to; }
for (const [id, acc] of byRow) await patchRow("routes", id, { access: acc });
console.log(`\nwrote ${byRow.size} row(s), ${plan.length} field(s)`);

const after = await selectAll("routes", "id,access", "id=like.wa_*", { pageSize: 1000 });
let left = 0;
for (const r of after) for (const v of Object.values(r.access || {})) if (typeof v === "string" && FIVE.test(v)) left++;
console.log(`values still claiming a five-day pass: ${left}  (expected ${held.length})`);
