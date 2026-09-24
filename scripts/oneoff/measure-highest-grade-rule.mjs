#!/usr/bin/env node
/* THE PRODUCT RULE IS NOW "the grade is the HIGHEST grade" — this measures what enforcing it
 * costs, before anything is written.
 *
 * The app already answers this question twice, in opposite directions. The grade FILTER
 * (`routeBandIdx` in ClimbMatchCore.jsx) parses the grade STRING and takes the MAXIMUM, so
 * "Class 3-4" bands as 4 — deliberately, "Difficulty=crux". The sortable column `grade_num`,
 * which both finder RPCs rank and range-filter on, is filled by `gradeNumFrom`, which takes the
 * FIRST match, so the same route stores 3.
 *
 * So this is not a new dialect: it is making the parser agree with the filter the app already
 * ships. That distinction is the whole reason it is safe to do at all — CLAUDE.md's standing
 * objection is that "a fifth dialect is the problem, not the fix", and this REMOVES a dialect
 * rather than adding one.
 *
 * REPORT ONLY. It writes nothing. Read the CHANGED rows before applying anything, because a
 * max-scan over a whole grade string can pick up a number that is not this route's grade.
 */
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
import { gradeNumFrom, gradeSystemForDiscipline } from "../../lib/grade.js";

const k = anonKey();
const argv = process.argv.slice(2);
const STATE = argv.includes("--state") ? argv[argv.indexOf("--state") + 1] : null;
const SHOW = argv.includes("--show") ? parseInt(argv[argv.indexOf("--show") + 1]) : 40;

/* THE PROPOSED PARSER. Deliberately a copy living HERE rather than an edit to lib/grade.js:
   a measurement whose subject is "what would change" must be able to run against the tree as it
   stands, or the before/after is taken against a file that has already moved.

   It mirrors `routeBandIdx`'s `hi()` — scan every match, keep the largest, and capture BOTH ends
   of a range where the system writes one as a single token. YDS needs no range capture because
   "5.4-5.6" is already two separate 5.x matches; "Class 3-4" is ONE match of /class\s*(\d)/ and
   would otherwise still score 3, which is the trap in "just take the max". */
function maxOver(g, rx, val) {
  let m, best = null;
  rx.lastIndex = 0;
  while ((m = rx.exec(g)) !== null) {
    for (const v of val(m)) if (v != null && (best == null || v > best)) best = v;
  }
  return best;
}
const yds = (g) => maxOver(g, /5\.(\d+)([a-d]?)/g, (m) => [parseInt(m[1]) + (m[2] ? ("abcd".indexOf(m[2]) + 1) / 4 : 0)]);
const band = (g, p) => maxOver(g, new RegExp(p + "\\s*(\\d+)(?:\\s*[-–—]\\s*(\\d+))?", "gi"), (m) => [parseInt(m[1]), m[2] ? parseInt(m[2]) : null]);
const cls = (g) => {
  const a = band(g, "class");
  const b = maxOver(g, /(\d)\s*(?:rd|th|nd)?\s*class/gi, (m) => [parseInt(m[1])]);
  return a == null ? b : b == null ? a : Math.max(a, b);
};
const AGRADE = { F: 1, PD: 2, AD: 3, D: 4, TD: 5, ED: 6 };
const RGRADE = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7 };

function proposed(g, s) {
  if (!g) return null;
  let v, m;
  if (s === "yds" && (v = yds(g)) != null) return v;
  if (s === "v" && (v = band(g, "V")) != null) return v;
  if (s === "wi" && (v = band(g, "WI")) != null) return v;
  if (s === "m" && (v = band(g, "M")) != null) return v;
  if (s === "aid" && (v = band(g, "[AC]")) != null) return v;
  if ((v = yds(g)) != null) return v;
  if ((v = band(g, "\\b(?:WI|AI)")) != null) return v;
  if ((v = band(g, "\\bV")) != null) return v;
  if ((m = g.match(/\b(TD|PD|AD|ED)\b/)) || (m = g.match(/^(D|F)[+-]?$/))) return AGRADE[m[1]];
  if ((v = cls(g)) != null) return v;
  if ((m = g.match(/\b(\d)(?:st|nd|rd|th)\b/i))) return parseInt(m[1]);
  if ((m = g.match(/^\s*(VII|VI|IV|III|II|I|V)\b/))) return RGRADE[m[1]];
  return null;
}

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

let sameParser = 0, moved = 0, nulledBoth = 0, newlyParsed = 0, lost = 0;
const changes = [];
for (const r of rows) {
  const g = String(r.grade || "");
  const sys = gradeSystemForDiscipline(r.discipline);
  const before = gradeNumFrom(g, sys);
  const after = proposed(g, sys);
  if (before == null && after == null) { nulledBoth++; continue; }
  if (before == null) { newlyParsed++; changes.push({ r, before, after, kind: "NEWLY PARSED" }); continue; }
  if (after == null) { lost++; changes.push({ r, before, after, kind: "LOST" }); continue; }
  if (Math.abs(before - after) < 1e-9) { sameParser++; continue; }
  moved++;
  changes.push({ r, before, after, kind: after > before ? "RAISED" : "LOWERED" });
}

const scope = STATE ? STATE.toUpperCase() : "the whole catalog";
console.log(`\n=== "the grade is the HIGHEST grade": what enforcing it would change, over ${scope} ===\n`);
console.log(`  ${rows.length} routes carry a grade`);
console.log(`  ${sameParser} parse IDENTICALLY under both rules  (${(sameParser / rows.length * 100).toFixed(1)}%)`);
console.log(`  ${nulledBoth} parse to null under both — untouched`);
console.log(`  ${moved} MOVE  (${changes.filter((c) => c.kind === "RAISED").length} raised, ${changes.filter((c) => c.kind === "LOWERED").length} lowered)`);
console.log(`  ${newlyParsed} NEWLY PARSED (were null)`);
console.log(`  ${lost} LOST a value they had — any of these is a DEFECT in the proposed rule\n`);

/* LOWERED and LOST cannot happen under a rule that only ever takes a LARGER number, so either one
   is the proposed parser being wrong rather than the catalog being wrong. Printed first and in
   full: they are the reason to read this before writing anything. */
for (const kind of ["LOST", "LOWERED"]) {
  const set = changes.filter((c) => c.kind === kind);
  if (!set.length) continue;
  console.log(`  ${kind} — ${set.length}, and a "highest wins" rule should produce NONE:`);
  for (const c of set.slice(0, SHOW)) console.log(`    ${String(c.before).padStart(6)} -> ${String(c.after).padStart(6)}   ${String(c.r.grade).slice(0, 70)}   ${c.r.id}`);
  console.log("");
}

const raised = changes.filter((c) => c.kind === "RAISED");
if (raised.length) {
  const byStr = new Map();
  for (const c of raised) {
    const key = `${c.before}|${c.after}|${c.r.grade}`;
    byStr.set(key, (byStr.get(key) || 0) + 1);
  }
  console.log(`  RAISED — ${raised.length} rows across ${byStr.size} distinct grade strings, commonest first:`);
  for (const [key, n] of [...byStr.entries()].sort((a, b) => b[1] - a[1]).slice(0, SHOW)) {
    const [b, a, g] = key.split("|");
    console.log(`    x${String(n).padStart(5)}   ${String(b).padStart(5)} -> ${String(a).padStart(5)}   ${g.slice(0, 70)}`);
  }
  console.log("");
}

if (newlyParsed) {
  console.log(`  NEWLY PARSED — ${newlyParsed}, a value where there was none:`);
  for (const c of changes.filter((c) => c.kind === "NEWLY PARSED").slice(0, SHOW)) console.log(`    null -> ${String(c.after).padStart(6)}   ${String(c.r.grade).slice(0, 70)}   ${c.r.id}`);
  console.log("");
}

/* The second question, and the one that decides whether a DATA sweep follows the parser change:
   how far is the STORED column from each rule? A parser change with no data pass leaves every
   moved row reported as drift by audit:grade-num-drift forever. */
let agreeOld = 0, agreeNew = 0, storedNull = 0;
for (const r of rows) {
  if (r.grade_num == null) { storedNull++; continue; }
  const g = String(r.grade || ""), sys = gradeSystemForDiscipline(r.discipline);
  const b = gradeNumFrom(g, sys), a = proposed(g, sys), st = Number(r.grade_num);
  if (b != null && Math.abs(b - st) < 1e-9) agreeOld++;
  if (a != null && Math.abs(a - st) < 1e-9) agreeNew++;
}
const scored = rows.length - storedNull;
console.log(`  the STORED column today agrees with:`);
console.log(`    the CURRENT parser (first match)   ${String(agreeOld).padStart(7)} of ${scored}  (${(agreeOld / scored * 100).toFixed(1)}%)`);
console.log(`    the PROPOSED parser (highest)      ${String(agreeNew).padStart(7)} of ${scored}  (${(agreeNew / scored * 100).toFixed(1)}%)`);
console.log(`    (${storedNull} rows store null and are not scored either way)`);
console.log(`\nReport only — nothing was written. Read the RAISED strings above before applying:`);
console.log(`a max-scan over a whole grade string can pick up a number that is not this route's grade.`);
