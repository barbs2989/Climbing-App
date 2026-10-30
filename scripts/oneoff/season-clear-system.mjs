#!/usr/bin/env node
// Clear areas.season_months on a SYSTEM area whose window was confirmed only for some of its
// sub-areas. Since the route header walks four ancestors (#3076), a system's season reaches every
// sub-area without one — including those the research deliberately EXCLUDED (Red Rocks' shaded
// canyons). The researched sub-areas keep their own windows; the excluded ones show none until
// researched. Saves the old value to a rollback file first; patchRow throws unless one row changed;
// re-reads.   node scripts/oneoff/season-clear-system.mjs <area id> [...]
import fs from "fs";
import { patchRow, SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";

const key = requireServiceKey();
const rb = {}, file = `audits/season/rollbacks/rollback-clear-system-${Date.now()}.json`;
for (const id of process.argv.slice(2)) {
  const row = (await (await fetch(`${SUPABASE_URL}/rest/v1/areas?id=eq.${encodeURIComponent(id)}&select=id,name,season_months`, { headers: headers(key) })).json())[0];
  if (!row) { console.log(`✗ ${id}: no such area`); continue; }
  rb[id] = { season_months: row.season_months }; fs.writeFileSync(file, JSON.stringify(rb, null, 1));
  await patchRow("areas", id, { season_months: null });
  const back = (await (await fetch(`${SUPABASE_URL}/rest/v1/areas?id=eq.${encodeURIComponent(id)}&select=season_months`, { headers: headers(key) })).json())[0];
  console.log(`${back.season_months == null ? "cleared" : "✗ still set"} ${id} (${row.name}), was ${JSON.stringify(row.season_months)}`);
  await new Promise(r => setTimeout(r, 1100));
}
console.log("rollback:", file);
