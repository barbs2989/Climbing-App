// List WA route rows whose name or id matches each argument (helper for building work lists).
import { SUPABASE_URL, headers, requireServiceKey } from "../../lib/supabase-env.mjs";
const key = requireServiceKey();
for (const q of process.argv.slice(2)) {
  const r = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,area_id&or=(name.ilike.*${encodeURIComponent(q)}*,id.ilike.*${encodeURIComponent(q.replace(/\W+/g, "_").toLowerCase())}*)&id=like.wa_*&limit=15`, { headers: headers(key) })).json();
  console.log("##", q); for (const x of r) console.log("  ", x.id, "|", x.name, "|", x.area_id);
}
