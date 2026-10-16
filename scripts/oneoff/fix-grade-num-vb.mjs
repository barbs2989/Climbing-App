#!/usr/bin/env node
/* Fill `routes.grade_num` for the V-Beginner rows the parser could not read.
 *
 * WHY A DATA PASS HAS TO FOLLOW THE PARSER CHANGE. `grade_num` is the sortable grade and both
 * finder RPCs (0018/0019) rank on it `nulls last`. Teaching `gradeNumFrom` to read "VB" changes
 * what the app COMPUTES and nothing about what is STORED, so without this the rows go on sorting
 * behind the whole catalog — i.e. the defect stays. Exactly the shape of the lowercase-v sweep.
 *
 * THE CONTRACT, deliberately narrower than a general grade_num repair, because this change can
 * only ever turn null into one constant:
 *   - A row is a candidate ONLY if the stored value is NULL, the OLD parser also read it as null,
 *     and the NEW parser reads a value. So it can only FILL A BLANK; it structurally cannot
 *     overwrite an existing number, and a row that already disagreed with the old rule is
 *     pre-existing drift and none of this change's business.
 *   - Every write is RE-ASSERTED as attributable AT APPLY TIME rather than when this was written:
 *     the value must be exactly what the parser scores for a bare "VB", the row's discipline must
 *     map to the V system, and the grade must carry a standalone VB token. A candidate failing
 *     any of those is refused and the whole run stops without writing anything.
 *   - Nothing is TYPED: the value written is `gradeNumFor(row.grade, row.discipline)`, computed
 *     from the row's own columns. A repair needing a number the row does not imply cannot be
 *     expressed by this script at all.
 *   - Every write goes through patchRow, which throws unless exactly one row comes back, so an
 *     RLS rejection or a bad id cannot read as success.
 *   - It writes a ROLLBACK file before touching anything, and re-reads afterwards to reconcile.
 *     A 200 is not evidence the data changed.
 *
 * THE VALUE IS NEGATIVE AND EVERY TEST HERE IS `!= null`, never truthiness. -1 is truthy, so this
 * sweep is not exposed to the falsy-zero trap the v0 rows are — but the next constant might be,
 * and the rule costs nothing to keep.
 *
 * Dry run by default. --apply to write.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { SUPABASE_URL, anonKey, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";
import { gradeNumFor, gradeNumFrom, gradeSystemForDiscipline } from "../../lib/grade.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const STATE = argv.includes("--state") ? argv[argv.indexOf("--state") + 1] : null;
const REF = argv.includes("--ref") ? argv[argv.indexOf("--ref") + 1] : "origin/main";

/* The OLD parser, loaded from git rather than retyped: a retyped reference agrees with itself
   whatever the tree does, which is the entire question. */
const tmp = path.join(ROOT, "scripts", `_grade-vbfix-${process.pid}.mjs`);
let OLD_FOR;
try {
  fs.writeFileSync(tmp, execFileSync("git", ["show", `${REF}:lib/grade.js`], { cwd: ROOT, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));
  ({ gradeNumFor: OLD_FOR } = await import(`file://${tmp}`));
} finally { try { fs.unlinkSync(tmp); } catch {} }
if (typeof OLD_FOR !== "function") {
  console.error(`FAIL — could not load the reference parser from ${REF}. Nothing was compared and nothing written.`);
  process.exit(1);
}

/* DERIVED, never typed: if somebody changes the constant, this sweep follows it rather than going
   on asserting a number the parser has stopped producing. */
const VBEG = gradeNumFrom("VB", "v");
if (VBEG == null) {
  console.error(`FAIL — the working tree scores "VB" as null. There is nothing for this sweep to fill.`);
  process.exit(1);
}
const TOKEN_VB = /\bvb\b/i;

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
if (!rows.length) { console.error(`FAIL — read 0 routes. A broken query, not a clean catalog.`); process.exit(1); }

const writes = [], refused = [];
for (const r of rows) {
  const g = String(r.grade || "");
  const next = gradeNumFor(g, r.discipline);
  if (next == null) continue;                       // nothing to write
  if (r.grade_num != null) continue;                // only ever fills a blank
  if (OLD_FOR(g, r.discipline) != null) continue;   // the old parser could read it; not this change
  const why = [];
  if (Math.abs(next - VBEG) > 1e-9) why.push(`value ${next} is not VBEG ${VBEG}`);
  if (gradeSystemForDiscipline(r.discipline) !== "v") why.push(`discipline ${JSON.stringify(r.discipline)} is not the V system`);
  if (!TOKEN_VB.test(g)) why.push(`grade carries no standalone VB token`);
  if (why.length) { refused.push({ r, next, why }); continue; }
  writes.push({ id: r.id, grade: g, disc: r.discipline, from: r.grade_num, to: next });
}

console.log(`\n=== fill grade_num for V-Beginner grades, over ${STATE ? STATE.toUpperCase() : "the whole catalog"} ===\n`);
console.log(`  ${rows.length} routes carry a grade`);
console.log(`  ${writes.length} row(s) to FILL (stored null, old parser null, new parser reads ${VBEG})`);
console.log(`  ${refused.length} REFUSED as not attributable to the VB branch\n`);
for (const w of writes) console.log(`    ${String(w.from).padStart(6)} -> ${String(w.to).padStart(6)}   ${JSON.stringify(w.grade)}  [${w.disc}]  ${w.id}`);
if (refused.length) {
  console.log(`\n  REFUSED — the gain came from somewhere other than the VB branch. The whole run stops`);
  console.log(`  rather than writing any of it:`);
  for (const e of refused) console.log(`    -> ${e.next}   ${JSON.stringify(String(e.r.grade).slice(0, 62))}  ${e.r.id}   ${e.why.join("; ")}`);
  console.error(`\nFAIL — ${refused.length} candidate(s) not attributable. Nothing written.`);
  process.exit(1);
}
if (!writes.length) { console.log(`  Nothing to do — already swept, or the reference already carries the branch.\n`); process.exit(0); }
if (!APPLY) { console.log(`\n  DRY RUN — pass --apply to write.\n`); process.exit(0); }

const svc = requireServiceKey();
const rbPath = path.join(ROOT, "scripts", `rollback-grade-num-vb-${Date.now()}.json`);
fs.writeFileSync(rbPath, JSON.stringify(writes.map((w) => ({ id: w.id, grade_num: w.from })), null, 2));
console.log(`  rollback written: ${path.relative(ROOT, rbPath)}\n`);

let ok = 0;
for (const w of writes) {
  await patchRow("routes", w.id, { grade_num: w.to });
  ok++;
  console.log(`    wrote ${w.id} -> ${w.to}`);
}

// A 200 is not evidence the data changed. Read the rows back and reconcile.
let bad = 0;
for (const w of writes) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,grade_num&id=eq.${encodeURIComponent(w.id)}`, { headers: headers(svc) });
  const [got] = await res.json();
  if (!got || got.grade_num == null || Math.abs(got.grade_num - w.to) > 1e-9) { bad++; console.error(`    RECONCILE FAILED ${w.id}: expected ${w.to}, read ${got ? got.grade_num : "no row"}`); }
}
console.log(`\n  wrote ${ok}, reconciled ${ok - bad}, failed ${bad}\n`);
if (bad) process.exit(1);
