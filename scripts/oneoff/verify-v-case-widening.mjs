#!/usr/bin/env node
/* Does making the V branch case-insensitive do ONLY what it claims?
 *
 * The reference is the PREVIOUS gradeNumFrom loaded out of git, never a copy retyped here — a
 * retyped reference agrees with itself whatever the working tree does, which is the entire
 * question. Same standard as verify-highest-grade-equivalence.mjs.
 *
 * WHY THIS IS A SECOND VERIFIER RATHER THAN A FLAG ON THAT ONE. They assert DIFFERENT contracts,
 * and blurring them would weaken both. That one's subject is "highest wins", whose scope is ranges
 * only, so it FAILS on any newly-parsed row. This one's subject is a widening whose whole point is
 * to newly-parse, so GAINED is expected and CHANGED/LOST are the defects.
 *
 * WHAT WOULD BE A DEFECT, stated up front because the healthy output is "nothing changed":
 *   LOST     — a case-insensitive pattern is a superset of a case-sensitive one, so a value that
 *              existed must survive. Any of these is the new parser being wrong.
 *   CHANGED  — likewise: a superset may find MORE matches, and `maxOf` keeps the largest, so a
 *              score can only rise. A row that already parsed and now reads differently means the
 *              widening reached past case.
 *   GAINED   — expected. But every one must be ATTRIBUTABLE TO CASE and nothing else, which is
 *              tested rather than assumed: the OLD parser run on the UPPERCASED grade must produce
 *              the same number. A gain that fails that test came from somewhere else.
 *
 * IT KNOWS WHEN IT IS SPENT. Once this change is on the reference ref, OLD == NEW and there is
 * nothing to compare; that is reported as SPENT rather than as "0 gained, something broke".
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
import { gradeNumFrom as NEW, gradeSystemForDiscipline } from "../../lib/grade.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const argv = process.argv.slice(2);
const STATE = argv.includes("--state") ? argv[argv.indexOf("--state") + 1] : null;
const REF = argv.includes("--ref") ? argv[argv.indexOf("--ref") + 1] : "origin/main";

const tmp = path.join(ROOT, "scripts", `_grade-vref-${process.pid}.mjs`);
let OLD;
try {
  fs.writeFileSync(tmp, execFileSync("git", ["show", `${REF}:lib/grade.js`], { cwd: ROOT, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));
  ({ gradeNumFrom: OLD } = await import(`file://${tmp}`));
} finally { try { fs.unlinkSync(tmp); } catch {} }
if (typeof OLD !== "function") { console.error(`FAIL - could not load the reference parser from ${REF}. Nothing was compared.`); process.exit(1); }

// Is the reference already case-insensitive? Then this verifier has nothing left to prove.
const SPENT = OLD("v1", "v") != null;
// And the working tree must actually carry the change, or every "0 CHANGED" below is vacuous.
if (NEW("v1", "v") == null) {
  console.error(`FAIL - the working tree's V branch is still case-sensitive. There is no widening to verify.`);
  process.exit(1);
}

const k = anonKey();
async function readAll() {
  const out = []; let last = "";
  for (;;) {
    const f = STATE ? `&id=like.${STATE}_*` : "";
    const url = `${SUPABASE_URL}/rest/v1/routes?select=id,grade,grade_num,discipline${f}&grade=not.is.null&id=gt.${encodeURIComponent(last)}&order=id.asc&limit=1000`;
    const res = await fetch(url, { headers: headers(k) });
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

const gained = [], changed = [], lost = [], unattributable = [];
for (const r of rows) {
  const g = String(r.grade || ""), sys = gradeSystemForDiscipline(r.discipline);
  const before = OLD(g, sys), after = NEW(g, sys);
  if (before == null && after == null) continue;
  if (before == null) {
    gained.push({ r, before, after });
    // ATTRIBUTABLE TO CASE: the old parser, given the same string uppercased, must agree.
    if (OLD(g.toUpperCase(), sys) !== after) unattributable.push({ r, before, after, upper: OLD(g.toUpperCase(), sys) });
    continue;
  }
  if (after == null) { lost.push({ r, before, after }); continue; }
  if (Math.abs(before - after) > 1e-9) changed.push({ r, before, after });
}

const scope = STATE ? STATE.toUpperCase() : "the whole catalog";
console.log(`\n=== the V branch reads lowercase: working tree vs ${REF}, over ${scope} ===\n`);
console.log(`  ${rows.length} routes carry a grade`);
console.log(`  GAINED  ${String(gained.length).padStart(5)}  (null -> a value; the point of the change)`);
console.log(`  CHANGED ${String(changed.length).padStart(5)}  (a DEFECT - a superset can only raise)`);
console.log(`  LOST    ${String(lost.length).padStart(5)}  (a DEFECT - a superset cannot lose a match)\n`);

for (const [label, set] of [["LOST", lost], ["CHANGED", changed]]) {
  if (!set.length) continue;
  console.log(`  ${label} - every one of these is the new parser being wrong:`);
  for (const e of set.slice(0, 200)) console.log(`    ${String(e.before).padStart(6)} -> ${String(e.after).padStart(6)}   ${JSON.stringify(String(e.r.grade).slice(0, 62))}  ${e.r.id}`);
  console.log("");
}
if (gained.length) {
  console.log(`  GAINED, and each must be explained by CASE alone:`);
  for (const e of gained) console.log(`    ${String(e.before).padStart(6)} -> ${String(e.after).padStart(6)}   ${JSON.stringify(String(e.r.grade).slice(0, 62))}  [${e.r.discipline}]  stored=${e.r.grade_num}  ${e.r.id}`);
  console.log("");
}
if (unattributable.length) {
  console.log(`  NOT ATTRIBUTABLE TO CASE - the old parser disagrees on the UPPERCASED string:`);
  for (const e of unattributable) console.log(`    upper->${e.upper}  new->${e.after}   ${JSON.stringify(String(e.r.grade).slice(0, 62))}  ${e.r.id}`);
  console.log("");
}

if (SPENT) {
  console.log(`  SPENT - ${REF} already carries this widening, so there was nothing to compare.`);
  console.log(`  The assertions above still hold and are still worth running; they simply have no delta to measure.\n`);
}

const bad = lost.length + changed.length + unattributable.length;
if (bad) { console.error(`FAIL - ${bad} row(s) the widening should not have touched.`); process.exit(1); }
if (!SPENT && !gained.length) {
  console.error(`FAIL - the reference is case-SENSITIVE and yet nothing was gained. The comparison is not measuring the widening.`);
  process.exit(1);
}
console.log(`ok - the widening only ever turned null into a value, and every gain is attributable to case.\n`);
