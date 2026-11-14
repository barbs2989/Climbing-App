// Dump each listed route's current row (plus its area's name) to context/<id>.json, so a research
// agent writes against what is stored rather than guessing it.
// Usage: node audits/pitch-rappel-detail/dump-context.mjs id1 id2 ...
import fs from "fs";
import { SUPABASE_URL, anonKey, headers } from "../../scripts/lib/supabase-env.mjs";
const dir = new URL("./context/", import.meta.url).pathname;
fs.mkdirSync(dir, { recursive: true });
const sel = "id,name,area_id,discipline,grade,pitches,length_m,overview,description,beta,descent_text,descent,rappels,rappel_count_note,rope_length_m,pitch_detail,rappel_detail,climbing_route,fa,areas(name,parent_id)";
for (const id of process.argv.slice(2)) {
  const rows = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${sel}&id=eq.${encodeURIComponent(id)}`, { headers: headers(anonKey()) })).json();
  if (!Array.isArray(rows) || rows.length !== 1) { console.error(`MISSING ${id}`, JSON.stringify(rows).slice(0, 200)); continue; }
  const r = rows[0];
  if (r.areas?.parent_id) {
    const p = await (await fetch(`${SUPABASE_URL}/rest/v1/areas?select=name,parent_id&id=eq.${encodeURIComponent(r.areas.parent_id)}`, { headers: headers(anonKey()) })).json();
    r.parent_area = p[0]?.name;
  }
  fs.writeFileSync(dir + id + ".json", JSON.stringify(r, null, 1));
  console.log(id, "|", r.name, "|", r.areas?.name, "<", r.parent_area, "|", r.grade, "p" + r.pitches, "pd" + (r.pitch_detail || []).length, "rd" + (r.rappel_detail || []).length);
}
