// Three corrections the deep research (audits/route-grades/deep/out) supports that the merges left:
//   - Tupshin East Face: the deep grade pass found 5.4 (high, four reports) for the line that row now
//     holds — it was recorded against wa_tupshin_peak_scramble, which was merged INTO this row.
//   - Sherpa NE Couloir: a Sherpa Peak route filed on the Balanced Rock spire; area move only, id kept.
//   - Johannesburg NE Buttress: fa claimed the 1951 left rib, which has its own row; it follows the 1957
//     Western Rib start.
//   node scripts/oneoff/route-identity-followups.mjs --dry
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { gradeNumFrom } from "../../lib/grade.js";

const DRY = process.argv.includes("--dry");
const key = requireServiceKey();
const FIX = {
  wa_tupshin_peak_east_face: { grade: "5.4", grade_num: gradeNumFrom("5.4", "yds"), rock_grade: "Class 4 with a short 5.4 crux (flake/crack)" },
  wa_sherpa_balanced_rock_ne_couloir: { area_id: "wa_sherpa_peak" },
  wa_johannesburg_mountain_northeast_buttress: { fa: "1957, by the Western Rib start (party not recorded). The left-hand 1951 rib is a separate route." },
};
const ids = Object.keys(FIX);
const rows = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,${[...new Set(Object.values(FIX).flatMap(Object.keys))].join(",")}&id=in.(${ids.join(",")})`, { headers: headers(key) })).json();
const before = Object.fromEntries(rows.map(r => [r.id, Object.fromEntries(Object.keys(FIX[r.id]).map(c => [c, r[c] ?? null]))]));
for (const id of ids) console.log(id, "\n  -", JSON.stringify(before[id]), "\n  +", JSON.stringify(FIX[id]));
if (DRY) process.exit(0);
const rb = `audits/route-grades/deep/rollback-followups-${Date.now()}.json`;
fs.writeFileSync(rb, JSON.stringify(before, null, 1));
for (const id of ids) await patchRow("routes", id, FIX[id]);
const after = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*&id=in.(${ids.join(",")})`, { headers: headers(key) })).json();
const bad = after.flatMap(r => Object.entries(FIX[r.id]).filter(([c, v]) => String(r[c]) !== String(v)).map(([c]) => `${r.id}.${c}`));
console.log(`wrote ${ids.length}; mismatches ${bad.length ? bad.join(",") : 0}; rollback ${rb}`);
