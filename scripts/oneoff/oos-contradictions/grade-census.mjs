// Overview-only out-of-state rows: does the overview state a whole-route YDS grade that disagrees with `grade`?
// Positional (like audit:prose-length): only a grade at the OPENING of the overview ("A 5.9 ...", "5.10a crack ...").
import { execFileSync } from "node:child_process";
import fs from "node:fs";
const OUT = new URL("../../../audits/oos-contradictions/p3", import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const yds = g => { const m = String(g).match(/5\.(\d{1,2})([abcd])?([+-])?/); if (!m) return null; return +m[1] + (m[2] ? { a: 0, b: .25, c: .5, d: .75 }[m[2]] : .375) + (m[3] === "+" ? .3 : m[3] === "-" ? -.2 : 0); };
const hits = []; let last = "", n = 0;
for (;;) {
  const sql = `select r.id, r.name, r.grade, r.discipline, substring(r.overview from '(?i)(?:route|climb|line|it) (?:is|goes at|is rated|rates|checks in at) (?:a |an )?(?:stiff |soft |solid |sandbagged )?(5\\.\\d{1,2}[abcd]?[+-]?)') ov, substring(r.overview from '(?i).{0,60}(?:route|climb|line|it) (?:is|goes at|is rated|rates|checks in at) .{0,40}') ctx from routes r join areas a on a.id=r.area_id
   where not (a.path <@ 'usa.washington') and r.overview ~* '(route|climb|line|it) (is|goes at|is rated|rates|checks in at) (a |an )?(stiff |soft |solid |sandbagged )?5\\.\\d' and r.grade ~ '5\\.\\d' and r.id > '${last}' order by r.id limit 2000`;
  const raw = execFileSync("npx", ["supabase", "db", "query", "--linked", "-o", "json", sql], { encoding: "utf8", maxBuffer: 1 << 28 });
  const page = JSON.parse(raw.slice(raw.indexOf("{"))).rows; n += page.length;
  for (const r of page) { const a = yds(r.ov), b = yds(r.grade); if (a != null && b != null && Math.abs(a - b) >= 1) hits.push({ id: r.id, name: r.name, grade: r.grade, ov: r.ov, ctx: r.ctx }); }
  if (page.length < 2000) break; last = page[page.length - 1].id; await new Promise(r => setTimeout(r, 2000));
}
fs.writeFileSync(`${OUT}/grade-hits.json`, JSON.stringify(hits, null, 1));
console.log("rows opening with a grade", n, "disagreeing by a full number or more", hits.length);
