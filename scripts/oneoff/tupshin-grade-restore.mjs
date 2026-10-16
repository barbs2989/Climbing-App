// Tupshin East Face: put the headline grade back to 5.6. route-identity-followups.mjs lowered it to 5.4
// from four trip reports; the owner ruled (2026-10-02) that a grade is never lowered — keep the higher one.
// Values are the row's own pre-followups state (audits/route-grades/deep/rollback-followups-1790917640715.json).
//   node scripts/oneoff/tupshin-grade-restore.mjs --dry
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { gradeNumFrom } from "../../lib/grade.js";

const DRY = process.argv.includes("--dry");
const key = requireServiceKey();
const ID = "wa_tupshin_peak_east_face";
const FIX = { grade: "5.6", grade_num: gradeNumFrom("5.6", "yds"), rock_grade: "5.6 (short crux; some parties report 5.4)" };
const cols = ["id", "area_id", ...Object.keys(FIX)].join(",");
const read = async () => {
  for (let i = 0; i < 8; i++) {
    const j = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${cols}&id=eq.${ID}`, { headers: headers(key) })).json();
    if (Array.isArray(j)) return j[0];
    await new Promise(r => setTimeout(r, 4000));
  }
  throw new Error("read kept timing out");
};
const before = await read();
if (before.area_id !== "wa_tupshin_peak") throw new Error(`unexpected area ${before.area_id}`);
console.log("-", JSON.stringify(before), "\n+", JSON.stringify(FIX));
if (DRY) process.exit(0);
fs.writeFileSync(`audits/route-grades/deep/rollback-tupshin-${Date.now()}.json`, JSON.stringify(before, null, 1));
await patchRow("routes", ID, FIX);
const after = await read();
const bad = Object.keys(FIX).filter(c => after[c] !== FIX[c]);
console.log(bad.length ? `MISMATCH ${bad}` : "re-read matches");
