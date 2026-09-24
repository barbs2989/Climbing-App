#!/usr/bin/env node
/* Fill `routes.grade_num` for the rows a case-SENSITIVE V branch could not read.
 *
 * WHY A DATA PASS HAS TO FOLLOW THE PARSER CHANGE. `grade_num` is the sortable grade and both
 * finder RPCs (0018/0019) rank and range-filter on it. Making `gradeNumFrom` read `v11` changes
 * what the app COMPUTES and nothing about what is STORED, so without this the rows go on sorting
 * behind the whole catalog and go on being dropped by any range filter — i.e. the defect stays.
 *
 * THE CONTRACT. It is deliberately NARROWER than fix-grade-num-to-highest-grade.mjs, because this
 * change can only ever turn null into a value:
 *   - A row is a candidate ONLY if the stored value is NULL, the OLD parser also read it as null,
 *     and the NEW parser reads a value. So this can only FILL A BLANK; it structurally cannot
 *     overwrite an existing number, and a row that already disagreed with the old rule is
 *     pre-existing drift and none of this change's business.
 *   - Every write is RE-ASSERTED as attributable to CASE at apply time, not merely when this was
 *     written: the OLD parser given the UPPERCASED grade must produce the same number. A candidate
 *     that fails is refused and the whole run stops.
 *   - Every write goes through patchRow, which throws unless exactly one row comes back, so an RLS
 *     rejection or a bad id cannot read as success.
 *   - It writes a ROLLBACK file before touching anything, and re-reads afterwards to reconcile.
 *     A 200 is not evidence the data changed.
 *
 * V0 IS A REAL GRADE AND 0 IS FALSY. Every test here is `!= null` / `Number.isFinite`, never
 * truthiness — `nv_back_crack` is graded "v0", and a truthy test would silently skip it. This repo
 * already records that trap twice (`Number(null) === 0`, and `uDistMi` used as a boolean).
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

/* The OLD parser, loaded from git rather than retyped: the attributability test is only as good
   as its reference, and a retyped one agrees with itself whatever the tree does. */
const tmp = path.join(ROOT, "scripts", `_grade-vfix-${process.pid}.mjs`);
let OLD_FOR, OLD_FROM;
try {
  fs.writeFileSync(tmp, execFileSync("git", ["show", `${REF}:lib/grade.js`], { cwd: ROOT, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));
  ({ gradeNumFor: OLD_FOR, gradeNumFrom: OLD_FROM } = await import(`file://${tmp}`));
} finally { try { fs.unlinkSync(tmp); } catch {} }
if (typeof OLD_FOR !== "function" || typeof OLD_FROM !== "function") {
  console.error(`FAIL - could not load the reference parser from ${REF}. Nothing was compared and nothing written.`);
  process.exit(1);
}
if (gradeNumFor("v1", "bouldering") == null) {
  console.error(`FAIL - the working tree's V branch is still case-sensitive. There is nothing for this sweep to fill.`);
  process.exit(1);
}

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
if (!rows.length) { console.error(`FAIL - read 0 routes. A broken query, not a clean catalog.`); process.exit(1); }

const writes = [], refused = [];
for (const r of rows) {
  const g = String(r.grade || "");
  const next = gradeNumFor(g, r.discipline);
  if (next == null) continue;                       // nothing to write
  if (r.grade_num != null) continue;                // only ever fills a blank
  if (OLD_FOR(g, r.discipline) != null) continue;   // the old parser could read it; not this change
  const sys = gradeSystemForDiscipline(r.discipline);
  const upper = OLD_FROM(g.toUpperCase(), sys);     // re-assert attributability AT APPLY TIME
  if (!(upper != null && Math.abs(upper - next) < 1e-9)) { refused.push({ r, next, upper }); continue; }
  writes.push({ id: r.id, grade: g, disc: r.discipline, from: r.grade_num, to: next });
}

console.log(`\n=== fill grade_num for lowercase-v grades, over ${STATE ? STATE.toUpperCase() : "the whole catalog"} ===\n`);
console.log(`  ${rows.length} routes carry a grade`);
console.log(`  ${writes.length} row(s) to FILL (stored null, old parser null, new parser reads it)`);
console.log(`  ${refused.length} REFUSED as not attributable to case\n`);
for (const w of writes) console.log(`    ${String(w.from).padStart(6)} -> ${String(w.to).padStart(6)}   ${JSON.stringify(w.grade)}  [${w.disc}]  ${w.id}`);
if (refused.length) {
  console.log(`\n  REFUSED - the old parser on the UPPERCASED grade does not agree, so the gain came from`);
  console.log(`  somewhere other than case. The whole run stops rather than writing any of it:`);
  for (const e of refused) console.log(`    upper->${e.upper}  new->${e.next}   ${JSON.stringify(String(e.r.grade).slice(0, 62))}  ${e.r.id}`);
  console.error(`\nFAIL - ${refused.length} candidate(s) not attributable to case. Nothing written.`);
  process.exit(1);
}
if (!writes.length) { console.log(`  Nothing to do - already swept, or the reference already carries the widening.\n`); process.exit(0); }
if (!APPLY) { console.log(`\n  DRY RUN - pass --apply to write.\n`); process.exit(0); }

const svc = requireServiceKey();
const rbPath = path.join(ROOT, "scripts", `rollback-grade-num-lowercase-v-${Date.now()}.json`);
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
