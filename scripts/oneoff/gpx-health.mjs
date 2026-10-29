import { SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";
const t = Date.now();
const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.wa_mount_adams_south_climb&select=id,name`, { headers: headers(requireServiceKey()) });
console.log(r.status, (await r.text()).slice(0, 100), Date.now() - t, "ms");
