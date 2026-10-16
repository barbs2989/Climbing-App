// Make the bare `fees` values say what the other 93% say.
//
// #1614 measured the convention and killed the false binary the question started as. Of the WA rows
// that document a charge: 72% write a SCOPED negative ("None — no climbing fee (National Forest,
// not Mount Rainier NP)"), 20% restate the charge, and only 7% are a bare "Free"/"N/A". The
// convention is not either reading of the field — it is that `fees` SAYS WHAT IT MEANS. The bare
// rows are outliers, not a second convention, and a climber budgeting off one is told the day is
// free when it costs $5-$30.
//
// TWO REFINEMENTS THE MEASUREMENT DID NOT CAPTURE, both found by reading the rows:
//
//   1. NOT EVERY BARE VALUE IS AN OUTLIER. 25 rows pair a bare `fees` with a pass field that ALSO
//      says there is nothing to pay — `passRequired: "N/A"`, `"None - North Cascades NP has no
//      entrance fee"`, `"No fees; no Northwest Forest Pass or Discover Pass needed at either
//      trailhead"`. Scoping those would imply a charge the row denies, so they are left alone. That
//      last phrasing was NOT in the first draft's test and would have been rewritten — the
//      deny-list-beaten-by-one-more-phrasing shape, caught by reading the dry run.
//      The test is all-or-nothing across the scope fields on purpose: a row where one names a real
//      pass and another says "None" DOES have something to pay, and belongs in the rewrite.
//   2. TWO ROWS HAVE NOTHING TO SCOPE AGAINST at all. They are reported, not guessed at.
//
// THE REWRITE INVENTS NOTHING. It does not restate the pass — those values run to 200 characters
// and repeating them would duplicate a field on the same panel — it says which fee is absent and
// points at the row that names the charge. Every input is already on the row.
//
// Contract: the bare set is matched WHOLE-STRING (a value that merely contains "free" is prose and
// is left alone), the expected row count is declared and a mismatch REFUSES, every distinct
// before/after is printed, and the write is re-read.
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow, selectAll } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");

// Whole-string only. "Free camping at the trailhead" is prose about a real fact and must not match.
const BARE = /^(?:free|n\/a|na|none|no fees?|no fee)\.?$/i;
// A scope field whose own value is bare tells us there is nothing to pay — not something to scope to.
const SCOPE_KEYS = ["parking_pass", "parkingPass", "passRequired", "pass_required"];
const NEW = "None beyond the parking or entrance fee this route already lists.";

// Declared state: refuse if the catalog has moved out from under the declaration.
const EXPECT_BARE = 186;
const EXPECT_REWRITE = 159;

const rows = await selectAll("routes", "id,access", "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL - 0 routes read. An empty read is not a clean catalog."); process.exit(1); }

const rewrite = [], honest = [], unscopeable = [];
for (const r of rows) {
  const a = r.access;
  if (!a || typeof a !== "object" || Array.isArray(a)) continue;
  const f = typeof a.fees === "string" ? a.fees.trim() : null;
  if (!f || !BARE.test(f)) continue;
  const scope = SCOPE_KEYS.map((k) => (typeof a[k] === "string" ? a[k].trim() : "")).filter(Boolean);
  if (!scope.length) { unscopeable.push(r.id); continue; }
  const nothingToPay = (x) => BARE.test(x) || /^"?(?:none|no fees?|no pass|no permit)\b/i.test(x);
  if (scope.every(nothingToPay)) { honest.push({ id: r.id, f, s: scope[0] }); continue; }
  rewrite.push({ id: r.id, was: f, scope: scope[0], access: a });
}

const bare = rewrite.length + honest.length + unscopeable.length;
console.log(`${rows.length} wa routes; ${bare} carry a BARE fees value`);
console.log(`  ${rewrite.length}  to REWRITE as a scoped negative`);
console.log(`  ${honest.length}  already HONEST — the pass field is bare too, so there is nothing to pay`);
console.log(`  ${unscopeable.length}  UNSCOPEABLE — nothing on the row names a charge; reported, not guessed\n`);
for (const u of unscopeable) console.log(`  unscopeable: ${u}`);
if (bare !== EXPECT_BARE || rewrite.length !== EXPECT_REWRITE) {
  console.error(`\nREFUSED - declaration expects ${EXPECT_BARE} bare / ${EXPECT_REWRITE} to rewrite, live is ${bare} / ${rewrite.length}.`);
  console.error("The catalog has moved. Re-read before changing the declaration.");
  process.exit(1);
}

const seen = new Map();
for (const e of rewrite) {
  const k = e.was + "  ||  " + e.scope.slice(0, 64);
  seen.set(k, (seen.get(k) || 0) + 1);
}
console.log(`\n${seen.size} distinct (bare value + scope) combination(s):`);
for (const [k, n] of [...seen].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${k}`);
console.log(`\n  every one becomes: ${JSON.stringify(NEW)}`);
console.log(`\nA sample of the rows left alone as already honest:`);
for (const h of honest.slice(0, 4)) console.log(`  ${h.id.padEnd(38)} fees=${JSON.stringify(h.f)}  scope=${JSON.stringify(h.s.slice(0, 46))}`);

if (!APPLY) { console.log("\nDRY RUN - pass --apply to write."); process.exit(0); }

let wrote = 0;
for (const e of rewrite) {
  await patchRow("routes", e.id, { access: Object.assign({}, e.access, { fees: NEW }) });
  wrote++;
}
console.log(`\nwrote ${wrote} row(s).`);

// Verify by re-reading: a 200 is not evidence the data changed.
const after = await selectAll("routes", "id,access", "id=like.wa_*", { pageSize: 1000 });
const byId = new Map(after.map((x) => [x.id, x]));
let bad = 0;
for (const e of rewrite) {
  const live = (byId.get(e.id) || {}).access;
  if (!live || live.fees !== NEW) { console.error(`NOT APPLIED: ${e.id} reads ${JSON.stringify(live && live.fees)}`); bad++; }
  else if (SCOPE_KEYS.some((k) => e.access[k] && live[k] !== e.access[k])) { console.error(`COLLATERAL: ${e.id} lost a neighbouring field`); bad++; }
}
console.log(bad ? `\nVERIFY FAILED: ${bad} problem(s).`
                : `\nverified: all ${wrote} row(s) re-read scoped, with every neighbouring access field intact.`);
process.exit(bad ? 1 : 0);
