// Print chosen columns of one route (helper). usage: node field.mjs <id> col [col ...]
import { SUPABASE_URL, headers, requireServiceKey } from "../../lib/supabase-env.mjs";
const key = requireServiceKey();
const [id, ...cols] = process.argv.slice(2);
const [r] = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${cols.join(",")}&id=eq.${encodeURIComponent(id)}`, { headers: headers(key) })).json();
for (const c of cols) console.log(`## ${c}\n${typeof r[c] === "string" ? r[c] : JSON.stringify(r[c], null, 1)}`);
