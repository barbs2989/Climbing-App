#!/usr/bin/env node
// Does the four-deep parent:parent_id(season_months, parent:…) embed come back from the live API,
// under the PUBLIC key the app uses, and does the nearest ancestor season reach a route filed on a
// wall below a crag system? Read-only.
//   node scripts/oneoff/probe-ancestor-season.mjs <route id> [<route id> …]
import { SUPABASE_URL, headers, anonKey } from "../lib/supabase-env.mjs";

const SEL = "id,name,season,discipline,areas(name,season_months,parent:parent_id(name,season_months,parent:parent_id(season_months,parent:parent_id(season_months,parent:parent_id(season_months)))))";
for (const id of process.argv.slice(2)) {
  const t = Date.now();
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${encodeURIComponent(SEL)}&id=eq.${encodeURIComponent(id)}`, { headers: headers(anonKey()) });
  const j = await r.json();
  console.log(r.status, Date.now() - t, "ms", JSON.stringify(j).slice(0, 600));
}
