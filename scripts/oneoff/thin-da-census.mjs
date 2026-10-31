// Unfiltered census of thin descent/approach rows outside Washington, by primary discipline and by whether the row
// carries an alpine tag. Read-only, report only (the owner decided 2026-10-30 that it is not swept). Needs the
// supabase/.temp link (docs/codebase/supabase-scripts.md); run it through the DB gate.
//   node scripts/oneoff/thin-da-census.mjs
import { execFileSync } from "child_process";

const thinD = `greatest(length(coalesce(r.descent,'')),length(coalesce(r.descent_text,''))) < 150`;
const thinA = `(length(coalesce(r.approach,'')) < 150 and r.approach_variants is null)`;
const sql = `select coalesce(r.disciplines->>0,'(none)') as discipline,
  (r.disciplines ?| array['alpine','mountaineering','scrambling']) as alpine_tag,
  count(*) as routes, count(*) filter (where ${thinD}) as thin_descent, count(*) filter (where ${thinA}) as thin_approach,
  count(*) filter (where ${thinD} or ${thinA}) as thin_either
from routes r where r.area_id not like 'wa\\_%'
group by 1, 2 order by thin_either desc`;
const raw = execFileSync("npx", ["supabase", "db", "query", "--linked", "-o", "json", sql], { encoding: "utf8", maxBuffer: 64 << 20 });
const rows = JSON.parse(raw.slice(raw.indexOf("{"))).rows;
console.log("| primary discipline | alpine tag | routes | thin descent | thin approach | thin either |\n|---|---|---|---|---|---|");
for (const r of rows) console.log(`| ${r.discipline} | ${r.alpine_tag ? "yes" : "no"} | ${r.routes} | ${r.thin_descent} | ${r.thin_approach} | ${r.thin_either} |`);
const t = rows.reduce((a, r) => ({ routes: a.routes + +r.routes, either: a.either + +r.thin_either }), { routes: 0, either: 0 });
console.log(`\nTotal: ${t.routes} routes outside Washington, ${t.either} thin on either field.`);
