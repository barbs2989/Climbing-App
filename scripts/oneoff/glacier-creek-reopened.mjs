#!/usr/bin/env node
// Glacier Creek Road (FR 39) reopened to the Heliotrope Ridge trailhead on 2026-08-20 (Forest Service release
// "Forest Service has opened Glacier Creek Road"; Cascadia Daily 2026-08-20). Three routes still said it was closed
// at MP 3 and that the walk added ~9 mi; the other two Heliotrope rows already say it reopened.
//   node scripts/oneoff/glacier-creek-reopened.mjs [--dry]
import fs from "node:fs";
import { SUPABASE_URL, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";
const DRY = process.argv.includes("--dry");
const STATUS = "Reopened to vehicles all the way to the Heliotrope Ridge trailhead on 20 August 2026, after repairs to the December 2025 flood washout at the Glacier Creek bridge (MP 3). The road is gravel and washout-prone; check current Forest Service alerts before you drive.";
const NOTE = { wa_colfax_peak_fords_theatre: "From Glacier, WA on SR 542, turn onto Glacier Creek Road (FS-39) and drive to the Heliotrope Ridge trailhead at its end.",
  wa_mount_baker_cockscomb_ridge: "Drive to the Heliotrope Ridge trailhead at the end of the road; the upper miles are potholed.",
  wa_mount_baker_north_ridge: "Drive to the Heliotrope Ridge trailhead at the end of the road; the upper miles are potholed." };
const ids = Object.keys(NOTE);
const k = requireServiceKey();
const rows = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,road&id=in.(${ids.join(",")})`, { headers: headers(k) })).json();
if (rows.length !== ids.length) { console.error("expected", ids.length, "rows, got", rows.length); process.exit(1); }
if (!DRY) fs.writeFileSync(`audits/closure-distance/rollback-glacier-creek-${Date.now()}.json`, JSON.stringify(rows, null, 1));
for (const r of rows) {
  const road = { ...r.road, status: STATUS, driveNote: NOTE[r.id] };
  console.log(`${DRY ? "DRY " : ""}${r.id}: status/driveNote replaced (was: ${String(r.road.status).slice(0, 70)}…)`);
  if (!DRY) { const a = await patchRow("routes", r.id, { road }); if (a.road.status !== STATUS) { console.error("NOT LANDED", r.id); process.exit(1); } }
}
console.log(DRY ? "dry run" : `${rows.length} row(s) written and re-read`);
