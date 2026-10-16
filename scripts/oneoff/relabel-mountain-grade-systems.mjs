// grade_system must name the scale `grade` is written on, for mountaineering / alpine / scrambling,
// before the route finder may filter those disciplines by scale (lib/DbAreaBrowser.jsx
// GRADE_SYS_FILTERED). Mountain Project's import left "3rd"/"4th" alpine and scrambling rows labelled
// 'yds' — on the finder's 5.x line a 4th-class scramble would read as a 5.4 — and a dozen 5.x alpine
// rows with no label at all.
//
// LABEL ONLY. grade_num is untouched and already equals the parser on every row this selects (the
// script refuses any row where it does not), so audit:grade-num-drift cannot move and nothing on
// screen changes. The scale is read from the grade text; a row whose text names no single scale is
// left alone.
//   node scripts/oneoff/relabel-mountain-grade-systems.mjs --dry
import fs from "fs";
import { selectAll, requireServiceKey, SUPABASE_URL, headers } from "../lib/supabase-env.mjs";
import { gradeNumFrom } from "../../lib/grade.js";

const DRY = process.argv.includes("--dry");
const key = requireServiceKey();
const D = ["mountaineering", "alpine", "scrambling"];
const scaleOf = g => {
  const s = [/5\.\d/.test(g) && "yds", /\b(?:WI|AI)\d/i.test(g) && "wi", /class\s*\d|\b\d(?:st|nd|rd|th)\b/i.test(g) && "class", /\bM\d/.test(g) && "m"].filter(Boolean);
  return s.length === 1 ? s[0] : null;
};
const all = await selectAll("routes", "id,discipline,grade,grade_num,grade_system", "", { pageSize: 1000, key });
const plan = [], refused = [];
for (const r of all) {
  if (!D.includes(r.discipline) || !r.grade) continue;
  const s = scaleOf(r.grade);
  if (!s || s === "m" || r.grade_system === s) continue;
  if (gradeNumFrom(r.grade, s) !== r.grade_num) { refused.push(`${r.id} "${r.grade}" num=${r.grade_num} parse=${gradeNumFrom(r.grade, s)}`); continue; }
  plan.push({ id: r.id, from: r.grade_system, to: s, grade: r.grade });
}
const by = {}; for (const p of plan) { const k = `${p.from} -> ${p.to}`; by[k] = (by[k] || 0) + 1; }
console.log("relabel", plan.length, by, "| refused (grade_num disagrees with the parser — not a label question)", refused.length);
for (const x of refused.slice(0, 20)) console.log("  refused", x);
if (DRY) process.exit(0);
const tag = Date.now();
fs.writeFileSync(`audits/route-grades/rollback-relabel-${tag}.json`, JSON.stringify(plan, null, 1));
// one PATCH per target scale, filtered by id list AND the old label, so a row that moved is not touched
let n = 0;
for (const to of [...new Set(plan.map(p => p.to))]) {
  const ids = plan.filter(p => p.to === to).map(p => p.id);
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=in.(${chunk.join(",")})`, {
      method: "PATCH", headers: headers(key, { "Content-Type": "application/json", Prefer: "return=representation" }), body: JSON.stringify({ grade_system: to }) });
    const got = await res.json();
    if (!res.ok || got.length !== chunk.length) throw new Error(`PATCH ${to}: ${res.status} changed ${got.length} of ${chunk.length}`);
    n += got.length;
  }
}
console.log(`relabelled ${n}; rollback audits/route-grades/rollback-relabel-${tag}.json`);
