// Health probe: one small keyed read and one small filtered read, timed.
import { SUPABASE_URL, headers, requireServiceKey } from "../../lib/supabase-env.mjs";
const key = requireServiceKey();
for (const q of ["routes?select=id,name&id=eq.wa_liberty_bell_beckey_route", "routes?select=id&timing=not.is.null&limit=5", "areas?select=id&limit=3"]) {
  const t0 = Date.now(); const r = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, { headers: headers(key) });
  console.log(q, r.status, Date.now() - t0 + "ms", (await r.text()).slice(0, 120));
}
