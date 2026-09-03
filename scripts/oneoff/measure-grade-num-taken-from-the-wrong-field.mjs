// grade_num that matches one of the row's OTHER grade fields instead of its own `grade`.
//
// MEASURED, AND DELIBERATELY NOT REPAIRED — the repair this points at is one CLAUDE.md names as wrong.
//
// 101 of 8,123 WA rows with a readable grade store a grade_num the app's own parser does not derive
// from that grade. 37 of those match what the parser derives from a SECONDARY field on the same row:
//   wa_little_big_chief_mountain_west_route   grade "Class 3", stored 9  = parse(rock_grade "5.9")
//   wa_monte_cristo_peak_scramble             grade "Class 3", stored 6  = parse(rock_grade "5.6")
//   wa_colfax_peak_polish_route               grade "WI6",     stored 3  = parse(alpine_grade "III-IV")
// That is a precise fingerprint — the column was computed from the wrong source — and it needs no
// external source, because check:grade-parser guarantees exactly one parser exists.
//
// SO WHY NOT SWEEP IT. audit:grade-num-drift is report-only and its entry in CLAUDE.md says why in as
// many words: grade_num is LOSSY ACROSS GRADE SYSTEMS BY CONSTRUCTION. gradeNumFrom maps "class 3" and
// "5.3" to the same 3, and a roman commitment grade to its own number, so a Grade V alpine route and
// 5.5 share a slot — and "sweeping the parser's answer over the column would file scrambles among rock
// climbs." Writing parse(grade) over these 37 is exactly that sweep. It would also cut both ways: on
// wa_colfax_peak_polish_route the stored 3 loses a WI6, so the parser's answer is better; on
// wa_little_big_chief_mountain_west_route the stored 9 sorts a Class 3 scramble among 5.9 routes, so
// the parser's answer is better there too — but on wa_chair_peak_north_face, whose `grade` is the bare
// commitment grade "III", the stored 4 carries the row's real rock difficulty and the parser's 3 would
// throw it away. There is no single direction that is right for all 37.
//
// The measurement is the finding: this is not general drift, it is 37 rows whose column was populated
// from a named neighbouring field, which is a smaller and more tractable question than the 101. Read it
// per row; do not transform it.
//
import { selectAll } from "../lib/supabase-env.mjs";
import { gradeNumFrom } from "../../lib/grade.js";

// grade_num is the sortable grade; both finder RPCs rank and filter on it. A wrong value is invisible —
// the route just sits in the wrong place in a list nobody cross-checks.
//
// THE FINGERPRINT: the stored value is not what the app's own parser derives from the row's `grade`,
// but IS what it derives from the row's SECONDARY grade field. That says the column was computed from
// the wrong source, which is decidable with no external source at all — check:grade-parser guarantees
// the catalog has exactly one parser.
const rows = await selectAll("routes", "id,grade,grade_num,grade_system,rock_grade,alpine_grade,aid_grade,ice_grade,discipline", "id=like.wa_*", { pageSize: 1000 });
console.log("rows:", rows.length);
let readable = 0, disagree = 0;
const buckets = new Map();
const out = [];
for (const r of rows) {
  const stored = Number(r.grade_num);
  if (!Number.isFinite(stored)) continue;
  const want = gradeNumFrom(r.grade, r.grade_system);
  if (!Number.isFinite(want)) continue;
  readable++;
  if (stored === want) continue;
  disagree++;
  // does the stored value come from one of the row's OTHER grade fields?
  const alt = [];
  for (const k of ["rock_grade", "alpine_grade", "aid_grade", "ice_grade"]) {
    const v = r[k]; if (!v) continue;
    const n = gradeNumFrom(v, r.grade_system);
    if (Number.isFinite(n) && n === stored) alt.push(`${k}=${JSON.stringify(String(v).slice(0, 24))}`);
  }
  const tag = alt.length ? "FROM ANOTHER FIELD" : "unexplained";
  buckets.set(tag, (buckets.get(tag) || 0) + 1);
  if (alt.length) out.push({ id: r.id, stored, want, grade: String(r.grade || "").slice(0, 44), alt, disc: r.discipline });
}
console.log(`rows with a readable grade and a stored grade_num: ${readable}`);
console.log(`  ...where the stored value disagrees with the parser: ${disagree}`);
for (const [t, c] of buckets) console.log(`      ${t}: ${c}`);
console.log("");
for (const o of out.slice(0, 22)) {
  console.log(`  ${o.id.padEnd(46)} stored ${String(o.stored).padStart(4)}  parser says ${String(o.want).padStart(4)}   grade=${JSON.stringify(o.grade)}   matches ${o.alt.join(", ")}`);
}
if (out.length > 22) console.log(`  ...and ${out.length - 22} more`);
