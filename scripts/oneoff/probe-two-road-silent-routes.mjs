// The two WA routes whose prose knows a road fact and whose road block says nothing.
// Print every access-bearing column so the repair can be judged from the row itself.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
const k = anonKey();
const IDS = ["wa_colchuck_balanced_rock_col_east_lake_side_approch", "wa_northwest_face"];
const SEL = "id,name,area_id,discipline,season,best_season,road,access,permit,approach,approach_logistics,overview,beta";
const rows = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${SEL}&id=in.(${IDS.join(",")})`, { headers: headers(k) })).json();
for (const r of rows) {
  console.log(`\n############ ${r.id} — ${r.name}  (area ${r.area_id}, ${r.discipline})`);
  for (const c of ["season", "best_season", "road", "access", "permit", "approach_logistics", "approach", "overview", "beta"]) {
    const v = r[c];
    if (v == null || (typeof v === "string" && !v.trim())) { console.log(`  ${c}: —`); continue; }
    console.log(`  ${c}: ${typeof v === "string" ? v : JSON.stringify(v, null, 1)}`);
  }
}
