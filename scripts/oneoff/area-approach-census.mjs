// Census: out-of-state areas that hold routes directly, by whether the area's own walk-in (areas.approach) is filled,
// and how many routes each class covers. Read-only; run it through the DB gate. Needs the supabase/.temp link.
//   node scripts/oneoff/area-approach-census.mjs
import { execFileSync } from "child_process";

const sql = `with a as (
  select a.id, split_part(a.id,'_',1) as st, length(coalesce(a.approach,'')) as alen, count(r.id) as n
  from areas a join routes r on r.area_id = a.id
  where a.id not like 'wa\\_%' group by a.id)
select st, count(*) as areas, count(*) filter (where alen >= 80) as with_walkin,
  sum(n) as routes, sum(n) filter (where alen < 80) as routes_without, count(*) filter (where alen < 80 and n >= 10) as bare_areas_10plus
from a group by st order by routes_without desc nulls last`;
const raw = execFileSync("npx", ["supabase", "db", "query", "--linked", "-o", "json", sql], { encoding: "utf8", maxBuffer: 64 << 20 });
const rows = JSON.parse(raw.slice(raw.indexOf("{"))).rows;
console.log("| state | areas with routes | with a walk-in | routes | routes without | bare areas with 10+ routes |\n|---|---|---|---|---|---|");
const t = { a: 0, w: 0, r: 0, rw: 0, b: 0 };
for (const r of rows) {
  console.log(`| ${r.st} | ${r.areas} | ${r.with_walkin} | ${r.routes} | ${r.routes_without ?? 0} | ${r.bare_areas_10plus} |`);
  t.a += +r.areas; t.w += +r.with_walkin; t.r += +r.routes; t.rw += +(r.routes_without ?? 0); t.b += +r.bare_areas_10plus;
}
console.log(`| total | ${t.a} | ${t.w} | ${t.r} | ${t.rw} | ${t.b} |`);
