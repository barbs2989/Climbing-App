// Read-only: print name, area and full access blob for the given route ids.
import { SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";
const key = requireServiceKey();
for (const id of process.argv.slice(2)) {
  const r = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(id)}&select=id,name,area_id,access`, { headers: headers(key) })).json())[0];
  console.log(JSON.stringify(r));
}
