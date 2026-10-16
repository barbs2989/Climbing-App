#!/usr/bin/env node
/* Fill `routes.grade_num` for rows that carry a grade this parser reads perfectly well and store
 * a NULL anyway.
 *
 * THE DEFECT IS THE SORT. Both finder RPCs (0018/0019) rank `grade_num ... nulls last` under
 * `grade_asc` AND `grade_desc`, so these routes sit behind the whole catalog whichever way a
 * climber sorts — the same consequence as a grade the parser cannot read, and a different cause:
 * nothing ever wrote the column for them.
 *
 * WHY THIS IS NOT "A WRITE WITH NO CORROBORATING RECORD", which is the objection that kept it
 * reported rather than swept. `grade_num` is BY DEFINITION the parsed form of `grade`, and
 * scripts/pipeline/load-state.mjs computes it exactly this way for the whole catalog at import.
 * Measured against the population that PASSES — the method that settled `wa_shock_and_awe`:
 *   204,529 of 204,565 populated rows (99.98%) store exactly what this parser reads.
 * So this is the catalog's own operation rather than a new rule. Re-derive it with
 * scripts/oneoff/measure-readable-but-unpopulated-grades.mjs; do not quote that figure.
 *
 * WHAT THE OBJECTION IS ACTUALLY ABOUT, and it is kept: a row whose OWN RECORDS DISAGREE. That is
 * the Shuksan refusal — `grade` implying 4 against a `rock_grade` of 5.7, two candidate fills
 * three grades apart, so NULL is the honest value. Those are REFUSED, by the shared rule in
 * scripts/lib/grade-corroboration.mjs, and the refusal is re-asserted at apply time.
 *
 * THE CONTRACT:
 *   - Only ever FILLS A BLANK. A row that already holds a number is untouched, whatever the
 *     parser now says about it — that is `audit:grade-num-drift`'s subject, not this sweep's.
 *   - NOTHING IS TYPED. The value written is `gradeNumFor(row.grade, row.discipline)`, computed
 *     from the row's own columns, so a repair needing a number the row does not imply cannot be
 *     expressed by this script at all.
 *   - A same-system second record that disagrees by more than AGREE_WITHIN REFUSES the row. The
 *     row is printed, and the run continues — unlike the VB and lowercase-v sweeps, a refusal
 *     here is an expected, permanent property of a handful of rows rather than a sign the whole
 *     batch is unsound.
 *   - Every write goes through patchRow, which throws unless exactly one row comes back, so an
 *     RLS rejection or a bad id cannot read as success.
 *   - A ROLLBACK file is written before anything is touched, and every row is READ BACK and
 *     reconciled afterwards. A 200 is not evidence the data changed.
 *
 * IT OVERRIDES A RECORDED REFUSAL ON EXACTLY TWO ROWS, AND THAT IS SAID HERE RATHER THAN LEFT TO
 * BE NOTICED. `bc_south_howser_tower_west_buttress` and `nt_lotus_flower_tower_southeast_face`
 * (both `"5.8 A2 or 5.10"`) are recorded in CLAUDE.md as "deliberately left" by
 * fix-grade-num-corroborated-by-rock-grade.mjs. That script's contract is *repair a row where
 * `rock_grade` corroborates the parser*, and with `rock_grade` NULL those two fell outside its
 * EVIDENCE STANDARD — which is not a judgement that the column must stay NULL. They are not the
 * Shuksan shape either: Shuksan has two candidate fills that CONTRADICT one another, so NULL is an
 * honest third answer; these have exactly one candidate, and NULL sorts them behind the whole
 * catalog. CLAUDE.md itself calls 10 defensible, and it is what the decided "highest grade wins"
 * rule produces. Check WHICH CONTRACT refused a row before reading the refusal as a verdict.
 *
 * EVERY TEST IS `!= null`, NEVER TRUTHINESS. 0 is a real value on this scale (V0, and `class 0`
 * is not a thing but 0 is reachable) and -1 is now too; a truthy test would silently skip them.
 *
 * Dry run by default. --apply to write.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SUPABASE_URL, anonKey, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";
import { gradeNumFor, gradeSystemForDiscipline } from "../../lib/grade.js";
import { AGREE_WITHIN, isCommitmentOnly, secondOpinion, disagrees } from "../lib/grade-corroboration.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const STATE = argv.includes("--state") ? argv[argv.indexOf("--state") + 1] : null;
const LIMIT = argv.includes("--limit") ? Number(argv[argv.indexOf("--limit") + 1]) : Infinity;

const readKey = anonKey();
async function readAll() {
  const out = []; let last = "";
  for (;;) {
    const f = STATE ? `&id=like.${STATE}_*` : "";
    const url = `${SUPABASE_URL}/rest/v1/routes?select=id,grade,grade_num,discipline,rock_grade,ice_grade,aid_grade${f}&grade=not.is.null&id=gt.${encodeURIComponent(last)}&order=id.asc&limit=1000`;
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
if (!rows.length) { console.error(`FAIL — read 0 routes. A broken query, not a clean catalog.`); process.exit(1); }

const writes = [], refused = [];
for (const r of rows) {
  if (r.grade_num != null) continue;                 // only ever fills a blank
  const g = String(r.grade || "");
  const sys = gradeSystemForDiscipline(r.discipline);
  const next = gradeNumFor(g, r.discipline);
  if (next == null) continue;                        // unreadable — a different measurement's subject
  const second = secondOpinion(r, sys);
  if (disagrees(second, next)) { refused.push({ r, g, sys, next, second, commitmentOnly: isCommitmentOnly(g, sys) }); continue; }
  writes.push({ id: r.id, grade: g, disc: r.discipline, from: r.grade_num, to: next, second });
}
const planned = writes.slice(0, Number.isFinite(LIMIT) ? LIMIT : writes.length);

console.log(`\n=== fill grade_num where the grade is readable and the column is blank, over ${STATE ? STATE.toUpperCase() : "the whole catalog"} ===\n`);
console.log(`  ${rows.length} routes carry a grade`);
console.log(`  ${writes.length} row(s) to FILL${planned.length !== writes.length ? `, ${planned.length} of them this run (--limit)` : ""}`);
console.log(`  ${refused.length} REFUSED — a same-system second record disagrees by more than ${AGREE_WITHIN}\n`);

if (refused.length) {
  console.log(`  REFUSED — two candidate fills, so NULL stays the honest value (the Shuksan rule):`);
  for (const e of refused) {
    console.log(`    ${e.r.id}`);
    console.log(`      grade        ${JSON.stringify(e.g)}  [${e.r.discipline} -> ${e.sys}]  parser ${e.next}${e.commitmentOnly ? "  (commitment-only)" : ""}`);
    console.log(`      ${String(e.second.col).padEnd(13)}${JSON.stringify(e.second.raw.slice(0, 56))}  parser ${e.second.n}`);
  }
  console.log("");
}
if (!planned.length) { console.log(`  Nothing to do — already swept.\n`); process.exit(0); }
if (!APPLY) {
  console.log(`  FIRST 20 OF THE FILLS:`);
  for (const w of planned.slice(0, 20)) console.log(`    null -> ${String(w.to).padStart(5)}   ${JSON.stringify(w.grade.slice(0, 44))}  [${w.disc}]  ${w.id}`);
  console.log(`\n  DRY RUN — pass --apply to write.\n`);
  process.exit(0);
}

const svc = requireServiceKey();
const rbPath = path.join(ROOT, "scripts", `rollback-grade-num-unpopulated-${Date.now()}.json`);
fs.writeFileSync(rbPath, JSON.stringify(planned.map((w) => ({ id: w.id, grade_num: w.from })), null, 2));
console.log(`  rollback written: ${path.relative(ROOT, rbPath)}\n`);

let ok = 0;
for (const w of planned) {
  await patchRow("routes", w.id, { grade_num: w.to });
  ok++;
  if (ok % 100 === 0) console.log(`    ... wrote ${ok}/${planned.length}`);
}
console.log(`    wrote ${ok}`);

/* A 200 is not evidence the data changed. Read every written row back and reconcile, in pages —
   one request per row would be 772 more round trips for no extra assurance. */
const want = new Map(planned.map((w) => [w.id, w.to]));
const seen = new Map();
const ids = [...want.keys()];
for (let i = 0; i < ids.length; i += 100) {
  const chunk = ids.slice(i, i + 100).map((id) => `"${id}"`).join(",");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,grade_num&id=in.(${encodeURIComponent(chunk)})`, { headers: headers(svc) });
  if (!res.ok) { console.error(`    READ-BACK FAILED ${res.status} ${await res.text()}`); process.exit(1); }
  for (const r of await res.json()) seen.set(r.id, r.grade_num);
}
let bad = 0;
for (const [id, to] of want) {
  const got = seen.get(id);
  if (got == null || Math.abs(got - to) > 1e-9) { bad++; console.error(`    RECONCILE FAILED ${id}: expected ${to}, read ${got === undefined ? "no row" : got}`); }
}
console.log(`\n  wrote ${ok}, reconciled ${ok - bad}, failed ${bad}\n`);
if (bad) process.exit(1);
