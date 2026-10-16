// The raw `season` value for every route the access-prose audit flagged in that column,
// beside what `road` already says. `season` renders in the route header strap
// ("8,815 ft · 6p · Jul-Sep"), so it takes a WINDOW; the road qualifier belongs in
// road.seasonalGate. Read-only — this is the input to the fix, not the fix.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const IDS = ["wa_big_snagtooth_west_ridge","wa_cutthroat_cauthorn_wilson","wa_direct_finish","wa_east_ridge","wa_honeymoon_sweet","wa_north_ridge","wa_unnamed_2","wa_unnamed_3","wa_unnamed_4","wa_unnamed_5","wa_unnamed_6","wa_voile_normale","wa_wings","wa_bye_gulley","wa_cutthroat_peak_cauthorn_wilson_couloir","wa_excavation_aka_the_crack","wa_last_chance_for_gas_aka_tricky_start","wa_mount_rainier_emmons_glacier","wa_mount_rainier_ptarmigan_ridge","wa_mushroom_tower_standard"];

const k = anonKey();
const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,season,best_season,road&id=in.(${IDS.join(",")})`, { headers: headers(k) });
const rows = await res.json();
for (const r of rows) {
  console.log(`\n=== ${r.id}`);
  console.log(`  season      : ${JSON.stringify(r.season)}`);
  console.log(`  road        : ${JSON.stringify(r.road)}`);
}
console.log(`\n${rows.length} of ${IDS.length} read`);
