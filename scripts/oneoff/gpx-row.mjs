// Print one route's fields (read-only). Usage: node scripts/oneoff/gpx-row.mjs <id> <select>
import { SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";
const [id, sel] = process.argv.slice(2);
const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${id}&select=${sel}`, { headers: headers(requireServiceKey()) });
console.log(JSON.stringify(await r.json(), null, 1));
