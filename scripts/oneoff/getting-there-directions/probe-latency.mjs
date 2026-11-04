// Read-only: time two small keyed reads, the shape the live app makes, before a write batch.
import { SUPABASE_URL, anonKey } from "../../lib/supabase-env.mjs";
for (const q of ["routes?select=id,name&id=eq.wa_hadley_peak_skyline_divide", "areas?select=id,name&parent_id=eq.wa_stuart_enchantments"]) {
  const t = Date.now();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, { headers: { apikey: anonKey(), Authorization: "Bearer " + anonKey() } });
  await res.text();
  console.log(res.status, Date.now() - t, "ms", q.split("?")[0]);
}
