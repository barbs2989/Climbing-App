// Can the peak page's "Rock difficulty" row print ONE grade for two different scales?
//
// It spans `gradeNumFrom(rock_grade, "yds")`, and that column is deliberate — the panel's own
// comment records that `grade_num` would rank a Roman COMMITMENT grade on the same 0-15 scale as
// class, so a Grade IV ice peak read as a class 3-4 scramble. What `rock_grade` still conflates is
// class against YDS: `class 3` and `5.3` are both 3. Where the span's ends tie numerically the row
// prints one grade, chosen by input order.
//
// MEASURED 2026-09-10: 198 panels, 166 render the row, 53 tie numerically, and on **3** of those
// the tied routes are on different scales — wa_chimney_peak and wa_klawatti_peak print "Class 3"
// on peaks that also hold a 5.3, and wa_ottohorn prints "5.7" on a peak that also holds a Class 4.
//
// RECORDED, NOT FIXED, and the reason is the size of the class against the cost of the test:
// separating the two scales means a LEXICAL test inside a display helper ("Class 3-4 (scrambling)"
// and "Class 3 (Class 4 in spots)" are both on this peak), and this file records what a regex over
// grade prose does to correct data. Three peaks does not buy that. If it is ever worth doing, the
// honest render is a SPAN — "Class 3 to 5.3" — never a different single grade.

// The peak page's "Rock difficulty" row spans `gradeNumFrom(rock_grade,"yds")`, which maps
// `class 3` and `5.3` to the SAME number. Where the span's ends tie numerically the panel prints
// ONE grade — chosen by input order. Does that ever pick a class grade over a YDS one, or vice
// versa, on a peak that genuinely holds both?
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";
import { gradeNumFrom, shortGrade } from "../../lib/grade.js";
const rows = await selectAll("routes", "id,name,area_id,discipline,rock_grade", "", { pageSize: 1000, key: requireServiceKey() });
const wa = rows.filter(r => String(r.id).startsWith("wa_"));
const ALPINE = ["alpine","mountaineering","scrambling","ice","mixed"];
const byArea = new Map();
for (const r of wa) { if (!byArea.has(r.area_id)) byArea.set(r.area_id, []); byArea.get(r.area_id).push(r); }
const CLASSY = /class|scramble|\d(?:st|nd|rd|th)\b/i;
let panels = 0, shown = 0, tied = 0; const amb = [];
for (const [id, rs] of byArea) {
  if (rs.length < 2) continue;
  const fam = rs.filter(r => ALPINE.includes(r.discipline)); if (fam.length * 2 < rs.length) continue;
  panels++;
  const vals = rs.map(r => ({ r, v: Number(gradeNumFrom(r.rock_grade, "yds")) })).filter(x => Number.isFinite(x.v) && x.v > 0);
  if (!vals.length || vals.length * 2 < rs.length) continue;   // the panel's own majority gate
  shown++;
  vals.sort((a, b) => a.v - b.v);
  const lo = vals[0], hi = vals[vals.length - 1];
  if (lo.v !== hi.v) continue;
  tied++;
  // Tied numerically: do the STRINGS disagree about which scale they are on?
  const kinds = new Set(vals.map(x => CLASSY.test(String(x.r.rock_grade)) ? "class" : "yds"));
  if (kinds.size > 1) amb.push({ id, shows: shortGrade(lo.r.rock_grade), all: [...new Set(vals.map(x => String(x.r.rock_grade)))] });
}
console.log("panels: " + panels + " · rendering a Rock difficulty row: " + shown);
console.log("  where the span's ends TIE numerically: " + tied);
console.log("  ...and the tied routes are on DIFFERENT scales (class vs YDS): " + amb.length + "\n");
for (const x of amb) console.log("  " + x.id.padEnd(38) + " shows " + JSON.stringify(x.shows) + "  from " + JSON.stringify(x.all));
