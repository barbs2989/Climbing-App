// Builds the research worklist for the single-rope rappel pass from the census file.
import fs from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";
const [census, outDir] = process.argv.slice(2);
const d = JSON.parse(fs.readFileSync(census, "utf8"));
const extra = ["wa_easy_getaway", "wa_the_perfect_crime_with_variations", "wa_liberty_crack", "wa_mount_cruiser_south_corner", "wa_cathedral_rock_northeast_buttress", "wa_mount_triumph_northeast_ridge"];
const ids = [...new Set([...d.cls.filter(x => x.need === "double" || x.twoText).map(x => x.id), ...extra])];
const byId = new Map(d.rows.map(r => [r.id, r]));
const key = requireServiceKey();
const areaIds = [...new Set(ids.map(i => byId.get(i).area_id))];
const areas = new Map();
for (let i = 0; i < areaIds.length; i += 40) {
  const q = `${SUPABASE_URL}/rest/v1/areas?select=id,name,parent_id&id=in.(${areaIds.slice(i, i + 40).map(encodeURIComponent).join(",")})`;
  const res = await fetch(q, { headers: headers(key) });
  const t = await res.text(); if (!res.ok) { console.error(t.slice(0, 300)); process.exit(1); }
  for (const a of JSON.parse(t)) areas.set(a.id, a);
}
const extraCols = new Map();
for (let i = 0; i < ids.length; i += 40) {
  const q = `${SUPABASE_URL}/rest/v1/routes?select=id,discipline,grade,pitches&id=in.(${ids.slice(i, i + 40).map(encodeURIComponent).join(",")})`;
  const res = await fetch(q, { headers: headers(key) }); const t = await res.text(); if (!res.ok) { console.error(t.slice(0, 300)); process.exit(1); }
  for (const r of JSON.parse(t)) extraCols.set(r.id, r);
}
const items = ids.map(id => { const r = byId.get(id); const a = areas.get(r.area_id) || {}; const x = extraCols.get(id) || {};
  return { id, name: r.name, area: r.area_id, area_name: a.name, area_parent: a.parent_id, discipline: x.discipline, grade: x.grade, pitches: x.pitches,
    current: { rappels: r.rappels, rappel_count_note: r.rappel_count_note, rappel_detail: r.rappel_detail, descent_text: r.descent_text } }; });
// Routes sharing one descent sit in the same batch, so one agent answers them once.
items.sort((p, q) => (p.area_name || "").localeCompare(q.area_name || "") || p.id.localeCompare(q.id));
fs.mkdirSync(outDir, { recursive: true });
const SIZE = 7; let n = 0;
for (let i = 0; i < items.length; i += SIZE) fs.writeFileSync(`${outDir}/work-${String(++n).padStart(2, "0")}.json`, JSON.stringify(items.slice(i, i + SIZE), null, 1));
console.log(items.length, "routes in", n, "batches");
