#!/usr/bin/env node
/* WHICH GRADES CAN `gradeNumFrom` NOT READ AT ALL, AND WHAT WOULD IT COST TO READ THEM?
 *
 * `grade_num` is the sortable grade and both finder RPCs rank and range-filter on it, so a route
 * scoring null sorts behind the WHOLE catalog and is dropped outright by a range filter. #1769
 * ("the grade is the highest grade") found two shapes that score null and deliberately did not
 * fix either, because widening two things at once makes a before/after unreadable:
 *
 *   - lowercase `v11` / `v6`      — the V branch is case-sensitive
 *   - `"WI 2-3"`                  — a space between the prefix and the number
 *
 * This measures BOTH SEPARATELY, and — the half that matters — it measures what each widening
 * would do to rows that ALREADY parse. A widening is only safe if it is strictly ADDITIVE: it may
 * turn null into a value and must never CHANGE or LOSE one.
 *
 * THE DANGEROUS DIRECTION IS NOT THE NULLS. A spaced prefix makes `V\s*(\d+)` match "Grade V 5.9"
 * as a V5 boulder problem — which is precisely the roman-commitment-vs-technical conflation this
 * column's memory entry exists to warn about. So every candidate is scored against every row,
 * not only the ones it rescues.
 *
 * REPORT ONLY. Writes nothing. Reads with the anon key; `routes` is publicly readable.
 */
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
import { gradeNumFrom, gradeSystemForDiscipline } from "../../lib/grade.js";

const k = anonKey();
const argv = process.argv.slice(2);
const STATE = argv.includes("--state") ? argv[argv.indexOf("--state") + 1] : null;
const SHOW = argv.includes("--show") ? parseInt(argv[argv.indexOf("--show") + 1]) : 25;

/* Each candidate is the SHIPPED parser with exactly ONE thing changed, so its before/after is
   attributable to that one thing. They are copies living here rather than edits to lib/grade.js
   for the reason measure-highest-grade-rule.mjs records: a measurement whose subject is "what
   would change" must run against the tree as it stands. */
function maxOver(g, rx, val) {
  let m, best = null;
  rx.lastIndex = 0;
  while ((m = rx.exec(g)) !== null) for (const v of val(m)) if (v != null && (best == null || v > best)) best = v;
  return best;
}
const YDS_VAL = (m) => [parseInt(m[1]) + (m[2] ? ("abcd".indexOf(m[2]) + 1) / 4 : 0)];
const ENDS = (m) => [parseInt(m[1]), m[2] ? parseInt(m[2]) : null];
const AGRADE = { F: 1, PD: 2, AD: 3, D: 4, TD: 5, ED: 6 };
const RGRADE = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7 };

/* `sp` = the separator allowed between a prefix and its number; `vf` = the V branch's flags;
   `vbeg` = the value a bare "VB" scores, or null when that branch is not shipped.
   `vbeg` is a VALUE rather than a boolean because the thing being modelled is a constant, and
   DERIVING it from the shipped parser rather than writing -1 here is what stops this control
   rotting the day somebody changes it — the same reason V_SHIPPED and SP_SHIPPED are derived. */
function build({ sp = "", vf = "", vbeg = null } = {}) {
  const R = {
    YDS: /5\.(\d+)([a-d]?)/g,
    V: new RegExp(`V${sp}(\\d+)(?:\\s*[-–—]\\s*(\\d+))?`, "g" + vf),
    WI: new RegExp(`WI${sp}(\\d+)(?:\\s*[-–—]\\s*(\\d+))?`, "gi"),
    M: new RegExp(`M${sp}(\\d+)(?:\\s*[-–—]\\s*(\\d+))?`, "g"),
    AID: new RegExp(`[AC]${sp}(\\d)(?:\\s*[-–—]\\s*(\\d))?`, "g"),
    WIAI: new RegExp(`\\b(?:WI|AI)${sp}(\\d+)(?:\\s*[-–—]\\s*(\\d+))?`, "gi"),
    VB: new RegExp(`\\bV${sp}(\\d+)(?:\\s*[-–—]\\s*(\\d+))?`, "g" + vf),
    CLS: /class\s*(\d)(?:\s*[-–—]\s*(\d))?/gi,
    CLS_ORD: /(\d)\s*(?:rd|th|nd)?\s*class/gi,
  };
  return function parse(g, s) {
    if (!g) return null;
    let m, v;
    if (s === "yds" && (v = maxOver(g, R.YDS, YDS_VAL)) != null) return v;
    if (s === "v" && (v = maxOver(g, R.V, ENDS)) != null) return v;
    if (s === "v" && vbeg != null && /\bVB\b/i.test(g)) return vbeg;
    if (s === "wi" && (v = maxOver(g, R.WI, ENDS)) != null) return v;
    if (s === "m" && (v = maxOver(g, R.M, ENDS)) != null) return v;
    if (s === "aid" && (v = maxOver(g, R.AID, ENDS)) != null) return v;
    if ((v = maxOver(g, R.YDS, YDS_VAL)) != null) return v;
    if ((v = maxOver(g, R.WIAI, ENDS)) != null) return v;
    if ((v = maxOver(g, R.VB, ENDS)) != null) return v;
    if ((m = g.match(/\b(TD|PD|AD|ED)\b/)) || (m = g.match(/^(D|F)[+-]?$/))) return AGRADE[m[1]];
    {
      const a = maxOver(g, R.CLS, ENDS);
      const b = maxOver(g, R.CLS_ORD, (mm) => [parseInt(mm[1])]);
      const c = a == null ? b : b == null ? a : Math.max(a, b);
      if (c != null) return c;
    }
    if ((m = g.match(/\b(\d)(?:st|nd|rd|th)\b/i))) return parseInt(m[1]);
    if ((m = g.match(/^\s*(VII|VI|IV|III|II|I|V)\b/))) return RGRADE[m[1]];
    return null;
  };
}

/* THE CONTROL COMES FIRST. `build()` with nothing changed must reproduce the SHIPPED parser on
   every row, or every "candidate X changes N rows" figure below is measuring my transcription
   rather than the widening. */
/* WHICH WIDENINGS ARE ALREADY SHIPPED IS DERIVED FROM THE PARSER, never restated here. 2026-09-23
   made the V branch case-insensitive, and a control hardcoded to the pre-2026-09-23 shape failed
   closed on the very next run — correctly, and that is a script that goes stale the moment its
   subject ships. Asking the shipped parser two one-line questions cannot rot. */
const V_SHIPPED = gradeNumFrom("v1", "v") != null;
const SP_SHIPPED = gradeNumFrom("WI 2", "wi") != null;
/* A VALUE, not a boolean: the V-Beginner branch returns a constant, and asking the parser what it
   returns models both WHETHER it is shipped and WHAT it scores in one question. */
const VBEG_SHIPPED = gradeNumFrom("VB", "v");
const CONTROL = build({ vf: V_SHIPPED ? "i" : "", sp: SP_SHIPPED ? "\\s*" : "", vbeg: VBEG_SHIPPED });

const ALL = [
  { key: "v-insensitive", shipped: V_SHIPPED, why: "the V branch reads lowercase v11/v6", cfg: { vf: "i" } },
  { key: "spaced-prefix", shipped: SP_SHIPPED, why: "a space is allowed between every prefix and its number", cfg: { sp: "\\s*" } },
];
// Only the UNSHIPPED ones are candidates; a shipped widening is the control and has no delta.
const CANDIDATES = ALL.filter((c) => !c.shipped).map((c) => ({
  ...c,
  parse: build({ vf: V_SHIPPED ? "i" : "", sp: SP_SHIPPED ? "\\s*" : "", vbeg: VBEG_SHIPPED, ...c.cfg }),
}));
const WIDEST = build({ vf: "i", sp: "\\s*", vbeg: VBEG_SHIPPED });

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
if (!rows.length) { console.error("FAIL - read 0 routes. A broken query, not a clean catalog."); process.exit(1); }

// Fail closed on the control before believing any candidate.
let drift = 0;
for (const r of rows) {
  const sys = gradeSystemForDiscipline(r.discipline);
  const a = gradeNumFrom(String(r.grade || ""), sys), b = CONTROL(String(r.grade || ""), sys);
  if (!(a === b || (a != null && b != null && Math.abs(a - b) < 1e-9))) drift++;
}
if (drift) { console.error(`FAIL - the local control disagrees with the shipped parser on ${drift} rows. Every figure below would be measuring the transcription.`); process.exit(1); }

const scope = STATE ? STATE.toUpperCase() : "the whole catalog";
console.log(`\n=== grades gradeNumFrom cannot read, over ${scope} ===\n`);
console.log(`  ${rows.length} routes carry a grade; the local control reproduces the shipped parser on all of them`);
for (const c of ALL) console.log(`    ${c.shipped ? "SHIPPED " : "proposed"}  ${c.key} - ${c.why}`);
console.log("");

// SECTION 1 - what scores null today, grouped by the distinct string.
const nulls = rows.filter((r) => gradeNumFrom(String(r.grade || ""), gradeSystemForDiscipline(r.discipline)) == null);
const byVal = new Map();
for (const r of nulls) {
  const key = String(r.grade);
  if (!byVal.has(key)) byVal.set(key, []);
  byVal.get(key).push(r);
}
console.log(`  ${nulls.length} routes score NULL across ${byVal.size} distinct grade strings`);
console.log(`  Those routes sort behind the whole catalog and are dropped by any range filter.\n`);

// SECTION 2 - per candidate: rescued (null -> value), and the dangerous columns.
for (const c of CANDIDATES) {
  let rescued = 0, changed = 0, lost = 0;
  const ex = { rescued: [], changed: [], lost: [] };
  for (const r of rows) {
    const g = String(r.grade || ""), sys = gradeSystemForDiscipline(r.discipline);
    const before = gradeNumFrom(g, sys), after = c.parse(g, sys);
    if (before == null && after == null) continue;
    if (before == null) { rescued++; ex.rescued.push({ r, before, after }); continue; }
    if (after == null) { lost++; ex.lost.push({ r, before, after }); continue; }
    if (Math.abs(before - after) > 1e-9) { changed++; ex.changed.push({ r, before, after }); }
  }
  console.log(`  --- CANDIDATE: ${c.key} - ${c.why}`);
  console.log(`      RESCUED  ${String(rescued).padStart(5)}  (null -> a value; the point of the change)`);
  console.log(`      CHANGED  ${String(changed).padStart(5)}  (already parsed, now DIFFERENT - not additive)`);
  console.log(`      LOST     ${String(lost).padStart(5)}  (had a value, now null - a defect in the candidate)`);
  for (const kind of ["lost", "changed", "rescued"]) {
    const set = ex[kind];
    if (!set.length) continue;
    const cap = kind === "rescued" ? SHOW : 500; // never truncate the dangerous columns silently
    console.log(`      ${kind.toUpperCase()}${set.length > cap ? ` (first ${cap} of ${set.length})` : ""}:`);
    for (const e of set.slice(0, cap)) {
      console.log(`        ${String(e.before).padStart(6)} -> ${String(e.after).padStart(6)}   ${JSON.stringify(String(e.r.grade).slice(0, 62))}  [${e.r.discipline}]  ${e.r.id}`);
    }
  }
  console.log("");
}

// SECTION 3 - the nulls NOTHING rescues, which is what is left over afterwards.
const stillNull = new Map();
for (const [g, rs] of byVal) {
  const sys = gradeSystemForDiscipline(rs[0].discipline);
  if (WIDEST(g, sys) == null) stillNull.set(g, rs);
}
/* SECTION 4 - THE MIRROR QUESTION, and it is the larger class by two orders of magnitude.
   Sections 1-3 ask what the PARSER cannot read. This asks the opposite: rows the parser reads
   perfectly well whose stored `grade_num` is NULL anyway. The consequence is identical - they sort
   behind the whole catalog and are dropped by any range filter - but the cause is not a parser at
   all: nothing ever populated the column. CLAUDE.md records one source ("#814 built the add-a-route
   approval path and does not set it, so every community-approved route landed with a null").
   SWEPT 2026-09-24, AND THIS COMMENT USED TO SAY "REPORTED, NOT SWEPT" — kept in corrected form
   because the reason it gave was half right and is the more useful half. It said "filling from the
   parser alone is a write with no corroborating record", citing the wa_mount_shuksan_northwest_arete
   refusal. That objection is about rows whose OWN RECORDS DISAGREE, not about the operation: 99.98%
   of the rows that ARE populated store exactly what this parser reads, so a parser fill is the
   catalog's own operation. 772 were filled and SIX were refused for precisely the Shuksan reason -
   a same-system second record disagreeing - which is what should be left here on a healthy run.
   See scripts/oneoff/{measure-readable-but-unpopulated-grades,fix-grade-num-readable-but-unpopulated}.mjs
   and the shared refusal rule in scripts/lib/grade-corroboration.mjs. */
const unpopulated = rows.filter((r) => r.grade_num == null && gradeNumFrom(String(r.grade || ""), gradeSystemForDiscipline(r.discipline)) != null);
const byState = new Map();
for (const r of unpopulated) {
  const st = String(r.id).split("_")[0];
  byState.set(st, (byState.get(st) || 0) + 1);
}
console.log(`  --- READABLE BUT UNPOPULATED: ${unpopulated.length} routes store a NULL grade_num while`);
console.log(`      carrying a grade this parser reads. Same consequence as an unreadable grade -`);
console.log(`      they sort behind the whole catalog - and a different cause: nothing wrote the column.`);
console.log(`      SWEPT 2026-09-24 (772 filled). What should be left here is the handful REFUSED because a`);
console.log(`      same-system second record disagrees - the Shuksan rule. A number climbing again is a`);
console.log(`      NEW population, not the old backlog; measure-readable-but-unpopulated-grades.mjs sorts it.`);
for (const [st, n] of [...byState.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  console.log(`        ${String(n).padStart(5)}  ${st}_*`);
}
console.log("");

const stillN = [...stillNull.values()].reduce((a, b) => a + b.length, 0);
console.log(`  --- STILL UNREADABLE after both widenings: ${stillN} routes, ${stillNull.size} distinct strings`);
console.log(`      A reading list, NOT a backlog - most of these are genuinely not a grade.`);
for (const [g, rs] of [...stillNull.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, SHOW)) {
  console.log(`        ${String(rs.length).padStart(5)}x  ${JSON.stringify(g.slice(0, 62))}  [${rs[0].discipline}]`);
}
console.log("");
