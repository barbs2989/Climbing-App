// Builds the research batches for the WA mountain-route grade audit (audits/route-grades/).
// Every WA mountaineering / alpine / scrambling / ice / mixed route, with its current grade columns
// and enough context for a researcher to identify the climb. Read-only.
//   node scripts/oneoff/route-grades-build-batches.mjs [perBatch=40]
import fs from "fs";
import { selectAll, requireServiceKey, SUPABASE_URL, headers } from "../lib/supabase-env.mjs";

const PER = +(process.argv[2] || 40);
const key = requireServiceKey();
const DISC = ["mountaineering", "alpine", "scrambling", "ice", "mixed"];
const cols = "id,name,area_id,discipline,grade,grade_num,grade_system,rock_grade,alpine_grade,ice_grade,aid_grade,commitment,max_angle,face,overview,pitch_detail";
// A filtered scan of routes hits the statement timeout, so walk every id (keyset, light columns),
// pick the set here, then fetch the heavy columns by primary key.
const ids = (await selectAll("routes", "id,discipline", "", { pageSize: 1000, key }))
  .filter(r => r.id.startsWith("wa_") && DISC.includes(r.discipline)).map(r => r.id);
const rows = [];
for (let i = 0; i < ids.length; i += 100) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${cols}&id=in.(${ids.slice(i, i + 100).join(",")})`, { headers: headers(key) });
  if (!res.ok) throw new Error("fetch " + res.status);
  rows.push(...await res.json());
}
if (rows.length !== ids.length) throw new Error(`fetched ${rows.length} of ${ids.length}`);
const areas = await selectAll("areas", "id,name", `id=like.wa_*`, { pageSize: 1000, key });
const an = Object.fromEntries(areas.map(a => [a.id, a.name]));
const out = rows.sort((a, b) => a.area_id.localeCompare(b.area_id) || a.id.localeCompare(b.id)).map(r => {
  const o = { id: r.id, route: r.name, peak: an[r.area_id] || r.area_id, discipline: r.discipline };
  for (const k of ["grade", "grade_system", "grade_num", "rock_grade", "alpine_grade", "ice_grade", "aid_grade", "commitment", "max_angle", "face"]) if (r[k] != null && r[k] !== "") o[k] = r[k];
  if (r.overview) o.overview = r.overview.slice(0, 260);
  if (Array.isArray(r.pitch_detail)) { const g = r.pitch_detail.map(p => p && p.grade).filter(Boolean); if (g.length) o.breakdown_grades = g.slice(0, 12); }
  return o;
});
fs.mkdirSync("audits/route-grades/research/in", { recursive: true });
fs.mkdirSync("audits/route-grades/research/out", { recursive: true });
let n = 0;
for (let i = 0; i < out.length; i += PER) {
  const f = `audits/route-grades/research/in/b${String(++n).padStart(2, "0")}.json`;
  fs.writeFileSync(f, JSON.stringify(out.slice(i, i + PER), null, 1));
}
console.log(out.length, "routes in", n, "batches of", PER);
