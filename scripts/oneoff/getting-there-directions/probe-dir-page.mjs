// Read-only diagnosis: what does ONE page of the drive-line read cost, and what does a 500 say?
import { SUPABASE_URL, anonKey } from "../../lib/supabase-env.mjs";
for (const n of [50, 100]) {
  const t = Date.now();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,dir:approach_logistics->>trailheadDirection&id=gte.wa_&id=lt.wa_~&id=like.wa_*&order=id.asc&limit=${n}`, { headers: { apikey: anonKey(), Authorization: "Bearer " + anonKey() }, signal: AbortSignal.timeout(60000) });
  const body = await res.text();
  console.log(n, "rows:", res.status, Date.now() - t, "ms", res.ok ? "" : body.slice(0, 300));
  if (!res.ok) break;
  await new Promise(r => setTimeout(r, 2000));
}
