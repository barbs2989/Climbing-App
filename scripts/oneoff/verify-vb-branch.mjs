#!/usr/bin/env node
/* Does giving V-Beginner a number do ONLY what it claims?
 *
 * The reference is the PREVIOUS gradeNumFrom loaded out of git, never a copy retyped here — a
 * retyped reference agrees with itself whatever the working tree does, which is the entire
 * question. Same standard as verify-v-case-widening.mjs and verify-highest-grade-equivalence.mjs.
 *
 * WHAT WOULD BE A DEFECT, stated up front because the healthy output is "nothing else moved":
 *   LOST     — the new branch is reached only after every branch above has declined, so a value
 *              that existed must survive. Any of these is the new parser being wrong.
 *   CHANGED  — likewise: the branch returns a constant and cannot re-score a row that already
 *              parsed. A change means it was placed too early, or its token is too loose.
 *   GAINED   — expected, and each must be ATTRIBUTABLE, which is tested rather than assumed:
 *              the value must be exactly VBEG, the discipline must map to the V system, and the
 *              grade must carry a standalone VB token. A gain failing any of those came from
 *              somewhere else and the run fails.
 *
 * IT ALSO ASSERTS THE SCOPE, because "0 CHANGED" is equally true of a branch that never fires and
 * of one that fires correctly: a NON-bouldering grade carrying a VB token must still score null.
 * Without that, scoping the branch to the V system would be an untested claim.
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

const tmp = path.join(ROOT, "scripts", `_grade-vbref-${process.pid}.mjs`);
let OLD;
try {
  fs.writeFileSync(tmp, execFileSync("git", ["show", `${REF}:lib/grade.js`], { cwd: ROOT, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }));
  ({ gradeNumFrom: OLD } = await import(`file://${tmp}`));
} finally { try { fs.unlinkSync(tmp); } catch {} }
if (typeof OLD !== "function") { console.error(`FAIL — could not load the reference parser from ${REF}. Nothing was compared.`); process.exit(1); }

/* The expected value is DERIVED from the shipped parser rather than typed here, so this cannot
   quietly go on asserting -1 after somebody changes the constant. */
const VBEG = NEW("VB", "v");
if (VBEG == null) { console.error(`FAIL — the working tree scores "VB" as null. There is no branch to verify.`); process.exit(1); }
if (!(VBEG < NEW("V0", "v"))) { console.error(`FAIL — "VB" (${VBEG}) does not sort below "V0" (${NEW("V0", "v")}). The whole point of the value is the ordering.`); process.exit(1); }

// The scope claim, asserted before any row is read so a thin catalog cannot make it vacuous.
const SCOPE_CASES = [
  ["VB", "yds", null], ["VB", "class", null], ["VB", "wi", null], ["VB", null, null],
  ["VB", "v", VBEG], ["Vb", "v", VBEG], ["vb", "v", VBEG],
  ["V3, VB start", "v", 3],          // highest-wins already answers this; VB must not preempt it
  ["VB-V0", "v", 0],
  ["VBX", "v", null], ["AVB", "v", null],
  /* A bare "V" is 5 — the PRE-EXISTING roman-numeral last-resort branch reading it as a
     commitment grade, which has nothing to do with this change and is asserted here so the
     new branch cannot be blamed for it later. No catalog row is a bare "V"; measured. */
  ["V", "v", 5],
];
// V-easy / V? (2026-09-25): asserted against the CURRENT parser only — OLD predates them.
const EASY_CASES = [["V-easy", "v", VBEG], ["V-Easy", "v", VBEG], ["Veasy", "v", VBEG], ["V-easy", "yds", 5], ["V?", "v", null], ["V-easy, V1 top", "v", 1]];
const easyBad = EASY_CASES.filter(([g, s, want]) => { const got = NEW(g, s); return want == null ? got != null : got == null || Math.abs(got - want) > 1e-9; });
if (easyBad.length) {
  for (const [g, s, want] of easyBad) console.error(`FAIL gradeNumFrom(${JSON.stringify(g)}, ${JSON.stringify(s)}) -> ${NEW(g, s)}, expected ${want}`);
  process.exit(1);
}
const scopeBad = SCOPE_CASES.filter(([g, s, want]) => {
  const got = NEW(g, s);
  return want == null ? got != null : got == null || Math.abs(got - want) > 1e-9;
});
if (scopeBad.length) {
  console.error(`FAIL — the branch does not have the scope it claims:`);
  for (const [g, s, want] of scopeBad) console.error(`    gradeNumFrom(${JSON.stringify(g)}, ${JSON.stringify(s)}) -> ${NEW(g, s)}, expected ${want}`);
  process.exit(1);
}

const SPENT = OLD("VB", "v") != null;

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
if (!rows.length) { console.error(`FAIL — read 0 routes. A broken query, not a clean catalog.`); process.exit(1); }

const TOKEN_VB = /\bvb\b/i;
const gained = [], changed = [], lost = [], unattributable = [];
for (const r of rows) {
  const g = String(r.grade || ""), sys = gradeSystemForDiscipline(r.discipline);
  // V-easy and V? were re-scored deliberately by a later change (EASY_CASES above), not by this branch.
  if (sys === "v" && /^\s*V(?:-?\s*easy|\?)\s*$/i.test(g)) continue;
  const before = OLD(g, sys), after = NEW(g, sys);
  if (before == null && after == null) continue;
  if (before == null) {
    gained.push({ r, before, after });
    const why = [];
    if (Math.abs(after - VBEG) > 1e-9) why.push(`value ${after} is not VBEG ${VBEG}`);
    if (sys !== "v") why.push(`system ${JSON.stringify(sys)} is not the V system`);
    if (!TOKEN_VB.test(g)) why.push(`grade carries no standalone VB token`);
    if (why.length) unattributable.push({ r, after, why });
    continue;
  }
  if (after == null) { lost.push({ r, before, after }); continue; }
  if (Math.abs(before - after) > 1e-9) changed.push({ r, before, after });
}

const scope = STATE ? STATE.toUpperCase() : "the whole catalog";
console.log(`\n=== V-Beginner scores ${VBEG}: working tree vs ${REF}, over ${scope} ===\n`);
console.log(`  ${rows.length} routes carry a grade; the branch's scope reproduced all ${SCOPE_CASES.length} declared cases`);
console.log(`  GAINED  ${String(gained.length).padStart(5)}  (null -> a value; the point of the change)`);
console.log(`  CHANGED ${String(changed.length).padStart(5)}  (a DEFECT — a constant branch cannot re-score a parsed row)`);
console.log(`  LOST    ${String(lost.length).padStart(5)}  (a DEFECT — a later branch cannot remove an earlier match)\n`);

for (const [label, set] of [["LOST", lost], ["CHANGED", changed]]) {
  if (!set.length) continue;
  console.log(`  ${label} — every one of these is the new parser being wrong:`);
  for (const e of set.slice(0, 200)) console.log(`    ${String(e.before).padStart(6)} -> ${String(e.after).padStart(6)}   ${JSON.stringify(String(e.r.grade).slice(0, 62))}  ${e.r.id}`);
  console.log("");
}
if (gained.length) {
  console.log(`  GAINED, and each must be a standalone VB token on a V-system route:`);
  for (const e of gained) console.log(`    ${String(e.before).padStart(6)} -> ${String(e.after).padStart(6)}   ${JSON.stringify(String(e.r.grade).slice(0, 40))}  [${e.r.discipline}]  stored=${e.r.grade_num}  ${e.r.id}`);
  console.log("");
}
if (unattributable.length) {
  console.log(`  NOT ATTRIBUTABLE — the gain did not come from the VB branch:`);
  for (const e of unattributable) console.log(`    -> ${e.after}   ${JSON.stringify(String(e.r.grade).slice(0, 40))}  ${e.r.id}   ${e.why.join("; ")}`);
  console.log("");
}

if (SPENT) {
  console.log(`  SPENT — ${REF} already carries this branch, so there was nothing to compare.`);
  console.log(`  The scope cases above still hold and are still worth running; they simply have no delta to measure.\n`);
}

const bad = lost.length + changed.length + unattributable.length;
if (bad) { console.error(`FAIL — ${bad} row(s) the branch should not have touched.`); process.exit(1); }
if (!SPENT && !gained.length) {
  console.error(`FAIL — the reference cannot read VB and yet nothing was gained. The comparison is not measuring the branch.`);
  process.exit(1);
}
console.log(`ok — the branch only ever turned null into ${VBEG}, on V-system routes carrying a VB token.\n`);
