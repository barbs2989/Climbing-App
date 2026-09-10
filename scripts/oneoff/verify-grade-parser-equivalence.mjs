// Is lib/grade.js's gradeNumFrom() behaviourally IDENTICAL to the pipeline's gradeNum()?
//
// This has to be answered before the pipeline scripts are switched to import it, because
// those scripts write `routes.grade_num` for the whole catalog. "I reformatted it and it
// looks the same" is not an answer — the three pipeline copies are byte-identical to each
// other (md5 19288eee) while lib/grade.js was retyped with the lookup tables hoisted out, so
// the only honest test is to run both over every real grade string and compare.
//
// Compares on the LIVE catalog's distinct (grade, grade_system) pairs rather than invented
// inputs, so the coverage is whatever the catalog actually contains, and adds a handful of
// hand-written edge cases the catalog may not exercise.
//
// Read-only. Service key: the anon role times out (57014) on the scoped join.
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";
import { gradeNumFrom, gradeSystemForDiscipline } from "../../lib/grade.js";

// ---- the pipeline implementation, copied VERBATIM from scripts/pipeline/load-state.mjs.
// Deliberately duplicated here rather than imported: this file's whole job is to be a second
// opinion, and importing the thing under test would make the comparison vacuous.
function gradeNumPipeline(g, s) { if (!g) return null; let m; if (s === "yds" && (m = g.match(/5\.(\d+)([a-d]?)/))) return parseInt(m[1]) + (m[2] ? ("abcd".indexOf(m[2]) + 1) / 4 : 0); if (s === "v" && (m = g.match(/V(\d+)/))) return parseInt(m[1]); if (s === "wi" && (m = g.match(/WI(\d+)/i))) return parseInt(m[1]); if (s === "m" && (m = g.match(/M(\d+)/))) return parseInt(m[1]); if (s === "aid" && (m = g.match(/[AC](\d)/))) return parseInt(m[1]); if ((m = g.match(/5\.(\d+)([a-d]?)/))) return parseInt(m[1]) + (m[2] ? ("abcd".indexOf(m[2]) + 1) / 4 : 0); if ((m = g.match(/\b(?:WI|AI)(\d+)/i))) return parseInt(m[1]); if ((m = g.match(/\bV(\d+)/))) return parseInt(m[1]); if ((m = g.match(/\b(TD|PD|AD|ED)\b/)) || (m = g.match(/^(D|F)[+-]?$/))) { const ag = { F: 1, PD: 2, AD: 3, D: 4, TD: 5, ED: 6 }; return ag[m[1]]; } if ((m = g.match(/class\s*(\d)/i)) || (m = g.match(/(\d)\s*(?:rd|th|nd)?\s*class/i))) return parseInt(m[1]); if ((m = g.match(/^\s*(VII|VI|IV|III|II|I|V)\b/))) { const rm = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7 }; return rm[m[1]]; } return null; }

const rows = await selectAll(
  "routes",
  // `id` is required even though it is unused: selectAll pages by keyset on it, and without
  // it every page asks for `id=gt.undefined`.
  "id,grade,discipline,grade_system,areas!inner(path)",
  "areas.path=cd.usa.washington&grade=not.is.null",
  { pageSize: 1000, key: requireServiceKey() },
);
if (!rows.length) { console.error("read 0 rows — refusing to report equivalence about nothing"); process.exit(1); }

// Distinct inputs only; the same string repeated 300 times proves nothing extra.
const pairs = new Map();
for (const r of rows) {
  const sys = r.grade_system || gradeSystemForDiscipline(r.discipline);
  pairs.set(r.grade + "\x00" + sys, [r.grade, sys]);
}
// Edge cases the catalog may not contain, including the ones each side handles alone.
for (const [g, s] of [
  ["", "yds"], ["  ", "yds"], ["5.10a", "yds"], ["5.9+", "yds"], ["V12", "v"], ["WI6", "wi"],
  ["M8", "m"], ["A3", "aid"], ["C2", "aid"], ["Class 4", "class"], ["4th class", "class"],
  ["III", "class"], ["TD+", null], ["F", null], ["D-", null], ["Grade III, 5.4", "yds"],
  ["4th", "class"], ["3rd", "class"], ["Easy 5th", "class"], ["5.11b/c (6c+ French)", "yds"],
]) pairs.set(g + "\x00" + s, [g, s]);

/* FOUR DIFFERENCES ARE THE POINT OF THE CHANGE, NOT A REGRESSION, and exiting 1 on them made this
   report the improvement as a failure. CLAUDE.md records it: the bare-ordinal branch "differed on
   exactly 4 inputs, all `null` -> a correct value", and agreement with the stored column went
   98.09% -> 98.49%. The reference here is a VERBATIM copy of the pipeline parser and is meant to
   stay a fossil, so these four are permanent.
   Declared, so an UNEXPECTED difference is still loud — and a declared one that stops differing
   fails as stale, the standard every `KNOWN` map in this repo is held to. */
const INTENDED = new Map([
  ['3rd\u0000class', "bare ordinal: the pipeline copy returns null, lib/grade.js reads it as class 3"],
  ['4th\u0000class', "bare ordinal: null vs class 4"],
  ['Easy 5th\u0000class', "bare ordinal: null vs 5"],
  ['Easy 5th\u0000yds', "bare ordinal: null vs 5"],
]);

let diff = 0, n = 0, intended = 0;
const examples = [], seenIntended = new Set();
for (const [g, s] of pairs.values()) {
  n++;
  const a = gradeNumPipeline(g, s);
  const b = gradeNumFrom(g, s);
  const same = (a == null && b == null) || (a != null && b != null && Math.abs(a - b) < 1e-9);
  if (same) continue;
  const key = g + "\u0000" + s;
  if (INTENDED.has(key)) { intended++; seenIntended.add(key); continue; }
  diff++; if (examples.length < 20) examples.push({ g, s, pipeline: a, lib: b });
}

console.log(`compared ${n} distinct (grade, system) inputs drawn from ${rows.length} live rows + edge cases`);
console.log(`${intended} INTENDED difference(s) — the bare-ordinal branch lib/grade.js gained`);
for (const [k, why] of INTENDED) if (seenIntended.has(k)) console.log(`  ${JSON.stringify(k.split("\u0000")[0])} [${k.split("\u0000")[1]}]  ${why}`);
const stale = [...INTENDED.keys()].filter((k) => !seenIntended.has(k));
for (const k of stale) console.log(`  STALE  ${JSON.stringify(k.split("\u0000")[0])} [${k.split("\u0000")[1]}] no longer differs — remove the declaration`);
console.log(diff ? `${diff} UNEXPECTED difference(s)` : "no unexpected difference — the two parsers agree everywhere else");
for (const e of examples) console.log(`  ${JSON.stringify(e.g)} [${e.s}]  pipeline=${e.pipeline}  lib=${e.lib}`);
process.exit(diff || stale.length ? 1 : 0);
