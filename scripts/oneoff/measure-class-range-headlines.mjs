// Routes whose grade columns carry a class RANGE ("Class 3-4", "3rd-4th class"): what does the
// screen headline, and is it the TOP of the range? Read-only. Input is the JSON that
//   npx supabase db query --linked "select id, discipline, grade, grade_system, grade_num, rock_grade,
//     alpine_grade, ice_grade, commitment from routes where <range regex over rock_grade|grade>"
// prints (the REST scan times out on the 200k-row table), passed as argv[2].
import { readFileSync } from "node:fs";
import * as G from "../../lib/grade.js";
const txt = readFileSync(process.argv[2], "utf8");
const rows = JSON.parse(txt.slice(txt.indexOf("{"))).rows;
let below = 0, noted = 0, rangeHead = 0;
const out = [];
for (const r of rows) {
  const head = G.displayGrade(r);
  const top = Math.max(...[r.grade, r.rock_grade].filter(Boolean).map((g) => G.gradeNumFrom(g, "class") ?? -1));
  const hn = G.gradeNumFrom(head, r.grade_system || "class");
  const note = G.gradeRangeNote ? G.gradeRangeNote(r) : "";
  if (note) noted++;
  if (hn != null && top > hn && r.grade_system === "class") { below++; out.push(["BELOW", r.id, head, r.rock_grade]); }
  if (/^(?:class\s*\d\s*[-–—/]\s*\d|\d\w*\s*[-–—/]\s*\d\w*\s*class)/i.test(head)) { rangeHead++; out.push(["RANGE HEADLINE", r.id, r.discipline, head, note]); }
  else if (note) out.push(["NOTE", r.id, head, note, r.rock_grade]);
}
console.log("rows", rows.length, "| headline below the range top", below, "| range headlines", rangeHead, "| with a range note", noted);
for (const o of out.slice(0, Number(process.argv[3]) || 60)) console.log(o.join(" | "));
