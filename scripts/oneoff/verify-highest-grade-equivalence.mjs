#!/usr/bin/env node
/* Does the SHIPPED "highest wins" parser do only what it claims — raise, never lower, never lose?
 *
 * The reference is the PREVIOUS gradeNumFrom loaded out of git, never a copy retyped here. A
 * retyped reference agrees with itself whatever the working tree does, which is the entire
 * question; this repo already records that trap under verify-sling-rack-synonym-widening and
 * verify-outing-distance-equivalence.
 *
 * WHAT WOULD BE A DEFECT, stated up front because the healthy output is "nothing lowered":
 *   LOWERED  — a rule that takes the largest match cannot return a smaller number than one that
 *              takes the first, so any of these is the new parser being wrong.
 *   LOST     — likewise: the new patterns are supersets, so a value that existed must survive.
 *   GAINED   — a row that scored null and now scores something. NOT automatically wrong, but not
 *              what "highest wins" was asked to do either, so it is reported separately and the
 *              run FAILS if there are any: the change is scoped to ranges, and a newly-parsed row
 *              means a pattern widened beyond that scope.
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

const tmp = path.join(ROOT, "scripts", `_grade-ref-${process.pid}.mjs`);
let OLD;
try {
  fs.writeFileSync(tmp, execFileSync("git", ["show", `${REF}:lib/grade.js`], { cwd: ROOT, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));
  ({ gradeNumFrom: OLD } = await import(`file://${tmp}`));
} finally { try { fs.unlinkSync(tmp); } catch {} }
if (typeof OLD !== "function") { console.error(`FAIL — could not load the reference parser from ${REF}. Nothing was compared.`); process.exit(1); }

const k = anonKey();
async function readAll() {
  const out = []; let last = "";
  for (;;) {
    const f = STATE ? `&id=like.${STATE}_*` : "";
    const url = `${SUPABASE_URL}/rest/v1/routes?select=id,grade,discipline${f}&grade=not.is.null&id=gt.${encodeURIComponent(last)}&order=id.asc&limit=1000`;
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
if (rows.length < 1000) { console.error(`FAIL — read only ${rows.length} routes. A short read compares almost nothing and would print a clean sweep.`); process.exit(1); }

const lowered = [], lost = [], gained = [];
let same = 0, raised = 0;
for (const r of rows) {
  const g = String(r.grade || ""), sys = gradeSystemForDiscipline(r.discipline);
  const a = OLD(g, sys), b = NEW(g, sys);
  if (a == null && b == null) { same++; continue; }
  if (a == null) { gained.push({ r, a, b }); continue; }
  if (b == null) { lost.push({ r, a, b }); continue; }
  if (Math.abs(a - b) < 1e-9) same++;
  else if (b > a) raised++;
  else lowered.push({ r, a, b });
}

console.log(`\n=== "highest wins" vs ${REF}, over ${STATE ? STATE.toUpperCase() : "the whole catalog"} ===\n`);
console.log(`  ${rows.length} routes compared`);
console.log(`  ${same} identical`);
console.log(`  ${raised} RAISED — the intended change`);
console.log(`  ${lowered.length} LOWERED`);
console.log(`  ${lost.length} LOST`);
console.log(`  ${gained.length} GAINED (was null)\n`);

let bad = 0;
for (const [label, set] of [["LOWERED", lowered], ["LOST", lost], ["GAINED", gained]]) {
  if (!set.length) continue;
  bad += set.length;
  console.log(`  ${label} — ${set.length}, which this change must not produce:`);
  for (const c of set.slice(0, 40)) console.log(`    ${String(c.a).padStart(6)} -> ${String(c.b).padStart(6)}   ${String(c.r.grade).slice(0, 70)}   ${c.r.id}`);
  console.log("");
}

/* NON-VACUITY. "Nothing lowered" is also what a comparison of a function against ITSELF prints,
   so the run is only worth anything if the two parsers genuinely differ somewhere. */
if (!raised) { console.error(`FAIL — the two parsers agree on every row. Either the change did not land or the reference is the same file.`); process.exit(1); }

if (bad) { console.error(`FAIL — ${bad} row(s) changed in a direction "highest wins" cannot produce.`); process.exit(1); }
console.log(`ok — ${raised} rows raised, nothing lowered, nothing lost, nothing newly parsed.`);
