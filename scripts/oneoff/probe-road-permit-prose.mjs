// Dump the actual road/permit-bearing prose for the Eldorado routes so we can see
// which column it sits in and what the neighbouring road/access columns hold. Read-only.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const k = anonKey();
const res = await fetch(
  `${SUPABASE_URL}/rest/v1/routes?select=id,name,area_id,season,best_season,approach,road,access,permit,approach_logistics,seasonal_guidance&id=like.wa_eldorado*`,
  { headers: headers(k) }
);
const rows = await res.json();
for (const r of rows) {
  console.log("\n================", r.id, "|", r.name);
  for (const [c, v] of Object.entries(r)) {
    if (v == null || ["id", "name", "area_id"].includes(c)) continue;
    const s = typeof v === "string" ? v : JSON.stringify(v, null, 1);
    console.log(`  --[${c}]--\n    ${s.slice(0, 1200).replace(/\n/g, "\n    ")}`);
  }
}
