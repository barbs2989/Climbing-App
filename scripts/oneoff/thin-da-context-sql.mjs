// Builds thin descent/approach research contexts with ONE linked SQL query, for selections PostgREST
// times out on (a filter on disciplines->>0 scans the whole routes table). Read-only. Needs the
// supabase/.temp link (docs/codebase/supabase-scripts.md).
//   CHUNK=40 node scripts/oneoff/thin-da-context-sql.mjs <out-prefix> <state-prefix> <disc,disc,...>
//   e.g. ... audits/thin-descent-approach/oos/ctx-ice-co co_ ice,mixed  → ctx-ice-co-1.json, -2.json ...
//   PEAKISH=1 CHUNK=40 node ... ctx-trad-bc bc_ trad   → trad rows on peak-like areas only (PEAKISH=not: the rest)
import fs from "fs";
import { execFileSync } from "child_process";

const [outPrefix, prefix, discs] = process.argv.slice(2);
if (!outPrefix || !/^[a-z]{2}_$/.test(prefix || "") || !/^[a-z,]+$/.test(discs || "")) {
  console.error("usage: thin-da-context-sql.mjs <out-prefix> <xx_> <disc,...>"); process.exit(2);
}
const list = discs.split(",").map(d => `'${d}'`).join(",");
// PEAKISH=1 keeps only areas that look like a peak: out-of-state peaks were imported with area_type 'crag', so the
// test is a peak word in the area name, or a stored prominence (2026-10-30, the trad-on-peaks tier).
// PEAKISH=not keeps the OTHER rows: cliffs and crags (2026-10-30, the cliff-trad tier).
const peakTest = `(a.name ~* '(^|\\m)(mt|mount|mountain|peak|pk|spire|tower|dome|pinnacle|needle|horn|point|butte|summit|ridge)\\M' or a.prominence_ft is not null)`;
const peakish = process.env.PEAKISH === "1" ? `and ${peakTest}` : process.env.PEAKISH === "not" ? `and not ${peakTest}` : "";
const sql = `select r.id, r.name, r.grade, r.disciplines->>0 as discipline, r.area_id, a.name as peak, a.lat as peak_lat, a.lng as peak_lng,
  a.elevation_ft as peak_elev, p.name as parent, r.pitches, r.approach, r.descent, r.descent_text, r.description,
  greatest(length(coalesce(r.descent,'')),length(coalesce(r.descent_text,''))) < 150 as need_descent,
  (length(coalesce(r.approach,'')) < 150 and r.approach_variants is null) as need_approach
from routes r join areas a on a.id = r.area_id left join areas p on p.id = a.parent_id
where r.area_id like '${prefix.replace("_", "\\_")}%' and r.disciplines->>0 in (${list})
  and (r.disciplines ?| array['alpine','mountaineering','scrambling']) ${peakish}
  and (greatest(length(coalesce(r.descent,'')),length(coalesce(r.descent_text,''))) < 150
       or (length(coalesce(r.approach,'')) < 150 and r.approach_variants is null))
order by r.area_id, r.id`;
const raw = execFileSync("npx", ["supabase", "db", "query", "--linked", "-o", "json", sql], { encoding: "utf8", maxBuffer: 64 << 20 });
const json = JSON.parse(raw.slice(raw.indexOf("{")));
const targets = json.rows;
const CHUNK = Number(process.env.CHUNK || 40);
const byArea = {};
for (const t of targets) (byArea[t.area_id] = byArea[t.area_id] || []).push(t);
const chunks = [[]];
for (const g of Object.values(byArea)) { if (chunks.at(-1).length && chunks.at(-1).length + g.length > CHUNK) chunks.push([]); chunks.at(-1).push(...g); }
chunks.forEach((c, i) => {
  const file = `${outPrefix}-${i + 1}.json`;
  fs.writeFileSync(file, JSON.stringify({ targets: c, richSiblingsOnSamePeak: {} }, null, 1));
  console.log(`${file}: ${c.length} targets, ${new Set(c.map(t => t.area_id)).size} areas`);
});
