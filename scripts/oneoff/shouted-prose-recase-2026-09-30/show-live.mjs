// node show-live.mjs <routeId> — print a route's approach variants as they are live now.
import { SUPABASE_URL, headers, anonKey } from "../../lib/supabase-env.mjs";
const id = process.argv[2] || "wa_goode_mountain_megalodon_ridge";
const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=approach_variants&id=eq.${encodeURIComponent(id)}`, { headers: headers(anonKey()) });
for (const v of (await r.json())[0].approach_variants || []) console.log(v.baseFinding, "\n---\n", v.notes);
