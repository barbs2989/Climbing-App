// Which multipitch routes (pitches >= 3) carry no pitch_detail / rappel_detail, ranked by stars.
// Usage: node audits/pitch-rappel-detail/census.mjs out.json
import fs from "fs";
import { selectAll } from "../../scripts/lib/supabase-env.mjs";
const rows = await selectAll("routes", "id,name,area_id,discipline,pitches,stars,lists,pitch_detail,rappel_detail,rappels,descent_text", "pitches=gte.3", { pageSize: 1000 });
console.log("total pitches>=3:", rows.length);
const ex = rows.find(r => Array.isArray(r.rappel_detail) && r.rappel_detail.length);
console.log("rappel_detail example", ex?.id, JSON.stringify(ex?.rappel_detail?.slice(0, 2)));
const by = {};
for (const r of rows) { const k = r.discipline; by[k] ??= { n: 0, pd: 0, rd: 0 }; by[k].n++; if ((r.pitch_detail || []).length) by[k].pd++; if ((r.rappel_detail || []).length) by[k].rd++; }
console.log(by);
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(rows.map(r => ({ id: r.id, name: r.name, area: r.area_id, disc: r.discipline, pitches: r.pitches, stars: r.stars, lists: r.lists, pd: (r.pitch_detail || []).length, rd: (r.rappel_detail || []).length, rappels: r.rappels, descent: (r.descent_text || "").slice(0, 160) }))));
