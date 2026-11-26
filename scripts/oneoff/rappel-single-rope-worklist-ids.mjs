// Worklist for named route ids (single-rope pass, follow-up batches). Usage: <out.json> <ids...>
import fs from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";
const [out, ...ids] = process.argv.slice(2);
const key = requireServiceKey();
const q = `${SUPABASE_URL}/rest/v1/routes?select=id,name,area_id,discipline,grade,pitches,rappels,rappel_count_note,rappel_detail,descent_text&id=in.(${ids.map(encodeURIComponent).join(",")})`;
const res = await fetch(q, { headers: headers(key) }); const rows = JSON.parse(await res.text());
const aq = `${SUPABASE_URL}/rest/v1/areas?select=id,name,parent_id&id=in.(${[...new Set(rows.map(r => r.area_id))].map(encodeURIComponent).join(",")})`;
const areas = new Map(JSON.parse(await (await fetch(aq, { headers: headers(key) })).text()).map(a => [a.id, a]));
fs.writeFileSync(out, JSON.stringify(rows.map(r => ({ id: r.id, name: r.name, area: r.area_id, area_name: (areas.get(r.area_id) || {}).name, discipline: r.discipline, grade: r.grade, pitches: r.pitches,
  current: { rappels: r.rappels, rappel_count_note: r.rappel_count_note, rappel_detail: r.rappel_detail, descent_text: r.descent_text } })), null, 1));
console.log(rows.length);
