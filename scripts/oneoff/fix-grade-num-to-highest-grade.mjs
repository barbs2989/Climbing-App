#!/usr/bin/env node
/* Re-derive `routes.grade_num` under the "highest wins" rule.
 *
 * WHY A DATA PASS HAS TO FOLLOW THE PARSER CHANGE. `grade_num` is the sortable grade and both
 * finder RPCs (0018/0019) rank and range-filter on it. Changing `gradeNumFrom` alone would leave
 * 8,908 rows storing the old answer — reported as drift by audit:grade-num-drift forever, and,
 * worse, still disagreeing with the grade FILTER, which is the inconsistency the rule change
 * exists to remove.
 *
 * THE CONTRACT, which is what makes a sweep this size defensible:
 *   - It writes ONLY where the stored value agrees with the OLD parser. A row that already
 *     disagreed with the old rule is PRE-EXISTING drift and none of this change's business;
 *     sweeping it would hide a defect inside a bulk write. (~65 rows catalog-wide.)
 *   - It writes ONLY upward. A highest-wins rule cannot lower a value, so a proposed decrease is
 *     this script being wrong, and it REFUSES the whole run rather than writing any of it.
 *   - Every write goes through patchRow, which throws unless exactly one row comes back — so an
 *     RLS rejection or a bad id cannot read as success.
 *   - It writes a ROLLBACK file (id -> previous value) before touching anything.
 *   - It re-reads afterwards and reconciles. A 200 is not evidence the data changed.
 *
 * Dry run by default. --apply to write.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { SUPABASE_URL, anonKey, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";
import { gradeNumFor } from "../../lib/grade.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const STATE = argv.includes("--state") ? argv[argv.indexOf("--state") + 1] : null;
const REF = argv.includes("--ref") ? argv[argv.indexOf("--ref") + 1] : "origin/main";
const CONC = 5;

/* The OLD parser, loaded from git rather than retyped — the attributability test above is only
   as good as its reference, and a retyped one agrees with itself whatever the tree does. */
const tmp = path.join(ROOT, "scripts", `_grade-ref-${process.pid}.mjs`);
let OLD_FOR;
try {
  fs.writeFileSync(tmp, execFileSync("git", ["show", `${REF}:lib/grade.js`], { cwd: ROOT, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));
  ({ gradeNumFor: OLD_FOR } = await import(`file://${tmp}`));
} finally { try { fs.unlinkSync(tmp); } catch {} }
if (typeof OLD_FOR !== "function") { console.error(`FAIL — could not load the reference parser from ${REF}. Nothing was compared and nothing written.`); process.exit(1); }

const readKey = anonKey();
async function readAll() {
  const out = []; let last = "";
  for (;;) {
    const f = STATE ? `&id=like.${STATE}_*` : "";
    const url = `${SUPABASE_URL}/rest/v1/routes?select=id,grade,grade_num,discipline${f}&grade=not.is.null&id=gt.${encodeURIComponent(last)}&order=id.asc&limit=1000`;
    const res = await fetch(url, { headers: headers(readKey) });
    if (!res.ok) throw new Error(`read failed ${res.status} ${await res.text()}`);
    const rows = await res.json();
    if (!rows.length) break;
    out.push(...rows); last = rows[rows.length - 1].id;
    if (rows.length < 1000) break;
  }
  return out;
}

const rows = await readAll();
if (rows.length < 1000) { console.error(`FAIL — read only ${rows.length} routes. A short read would sweep a fraction of the catalog and report it as the whole job.`); process.exit(1); }

const todo = [], refused = [], skippedDrift = [];
for (const r of rows) {
  const stored = r.grade_num == null ? null : Number(r.grade_num);
  const before = OLD_FOR(r.grade, r.discipline);
  const after = gradeNumFor(r.grade, r.discipline);
  if (after == null || before == null) continue;
  if (Math.abs(after - before) < 1e-9) continue;          // the rule does not move this row
  if (after < before) { refused.push({ r, before, after }); continue; }
  if (stored == null || Math.abs(stored - before) > 1e-9) { skippedDrift.push({ r, stored, before, after }); continue; }
  todo.push({ id: r.id, grade: r.grade, from: stored, to: after });
}

console.log(`\n=== grade_num -> the HIGHEST grade  (${APPLY ? "APPLY" : "dry run"}) ===\n`);
console.log(`  ${rows.length} routes carry a grade`);
console.log(`  ${todo.length} to update`);
console.log(`  ${skippedDrift.length} SKIPPED — stored disagrees with the OLD parser too, so the move is not attributable to this rule`);
console.log(`  ${refused.length} would DECREASE\n`);

if (refused.length) {
  console.error(`FAIL — a highest-wins rule cannot lower a value, so these are this script being wrong:`);
  for (const c of refused.slice(0, 20)) console.error(`    ${c.before} -> ${c.after}   ${String(c.r.grade).slice(0, 60)}   ${c.r.id}`);
  console.error(`Nothing was written.`);
  process.exit(1);
}
if (!todo.length) { console.log(`Nothing to do — every row already stores the highest grade.`); process.exit(0); }

if (skippedDrift.length) {
  console.log(`  the skipped rows, which are a READING LIST for audit:grade-num-drift and not this sweep's job:`);
  for (const c of skippedDrift.slice(0, 15)) console.log(`    stored ${String(c.stored).padStart(6)}  old-parser ${String(c.before).padStart(6)}  new ${String(c.after).padStart(6)}   ${String(c.r.grade).slice(0, 50)}   ${c.r.id}`);
  console.log("");
}

console.log(`  a sample of what would be written:`);
for (const c of todo.slice(0, 15)) console.log(`    ${String(c.from).padStart(6)} -> ${String(c.to).padStart(6)}   ${String(c.grade).slice(0, 60)}   ${c.id}`);
console.log("");

if (!APPLY) { console.log(`Dry run — nothing written. Re-run with --apply.`); process.exit(0); }

requireServiceKey();
const roll = path.join(ROOT, "scripts", `grade-num-rollback-${Date.now()}.json`);
fs.writeFileSync(roll, JSON.stringify(todo.map((t) => ({ id: t.id, grade_num: t.from })), null, 1));
console.log(`  rollback written to ${path.relative(ROOT, roll)} (${todo.length} rows)\n`);

let ok = 0; const failed = [];
for (let i = 0; i < todo.length; i += CONC) {
  await Promise.all(todo.slice(i, i + CONC).map(async (t) => {
    try { await patchRow("routes", t.id, { grade_num: t.to }); ok++; }
    catch (e) { failed.push({ id: t.id, err: String(e).slice(0, 120) }); }
  }));
  if ((i / CONC) % 40 === 0) process.stdout.write(`\r  written ${ok}/${todo.length}   failed ${failed.length}   `);
}
console.log(`\r  written ${ok}/${todo.length}   failed ${failed.length}        \n`);
for (const f of failed.slice(0, 20)) console.error(`    FAILED ${f.id}: ${f.err}`);

/* RECONCILE. A 200 is not evidence the data changed — this repo records that trap three times. */
const after = await readAll();
const want = new Map(todo.map((t) => [t.id, t.to]));
let agree = 0; const wrong = [];
for (const r of after) {
  if (!want.has(r.id)) continue;
  const got = r.grade_num == null ? null : Number(r.grade_num);
  if (got != null && Math.abs(got - want.get(r.id)) < 1e-9) agree++; else wrong.push({ id: r.id, got, want: want.get(r.id) });
}
console.log(`  read back: ${agree}/${todo.length} rows now store the highest grade`);
for (const w of wrong.slice(0, 20)) console.error(`    NOT WRITTEN ${w.id}: stored ${w.got}, wanted ${w.want}`);
if (wrong.length || failed.length) { console.error(`\nFAIL — ${wrong.length} row(s) did not take the write. Rollback: ${path.relative(ROOT, roll)}`); process.exit(1); }
console.log(`\nok — ${agree} rows re-derived to the highest grade, reconciled by read-back.`);
