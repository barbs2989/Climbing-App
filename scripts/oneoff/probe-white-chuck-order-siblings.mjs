#!/usr/bin/env node
// Is wa_glacier_peak_kennedy_glacier's expired closure the SAME order a sibling records as current?
// A repair is only a copy if the two rows are describing one road and one order. Verified before
// anything is written, never assumed from the milepost agreeing.
import { selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes", "id,name,area_id,road,access,approach",
  "or=(road.not.is.null,access.not.is.null)", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — read 0 routes."); process.exit(1); }

const WHITE_CHUCK = /white ?chuck|fs(?:r|-| )?\s*(?:road )?23\b|forest road 23\b/i;
const hits = rows.filter((r) => {
  const blob = JSON.stringify([r.road, r.access, r.approach]);
  return WHITE_CHUCK.test(blob);
});

console.log(`${hits.length} route(s) mention the White Chuck River Road / FS Road 23:\n`);
for (const r of hits) {
  console.log(`── ${r.id}   (${r.name})   area=${r.area_id}`);
  for (const [col, key] of [["road", "name"], ["road", "status"], ["road", "seasonalGate"], ["road", "driveNote"], ["access", "closures"]]) {
    const t = r[col]?.[key];
    if (typeof t === "string" && t.trim()) console.log(`   ${col}.${key}: ${t.replace(/\s+/g, " ")}`);
  }
  console.log("");
}
