// A first gap-pass run wrote beta as a JSON ARRAY into the text column `routes.beta`, so the column held
// '["a","b"]'. Rewrites each such row as the entries joined by a blank line.
//   node scripts/oneoff/repair-beta-text.mjs fixes.json          # dry
//   node scripts/oneoff/repair-beta-text.mjs fixes.json --apply
// Only rows whose live beta is exactly the JSON text of the proposed array are touched.
import fs from "fs";
import { SUPABASE_URL, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";
const [file, flag] = process.argv.slice(2);
const key = requireServiceKey();
const fixes = JSON.parse(fs.readFileSync(file, "utf8")).filter((f) => f.field === "beta" && Array.isArray(f.to));
let fixed = 0, skipped = 0;
const rollback = [];
for (const f of fixes) {
  const rows = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(f.id)}&select=id,beta`, { headers: headers(key) })).json();
  const live = rows[0]?.beta;
  if (typeof live !== "string" || live !== JSON.stringify(f.to)) { skipped++; continue; }
  rollback.push({ id: f.id, was: live });
  if (flag === "--apply") await patchRow("routes", f.id, { beta: f.to.join("\n\n") });
  fixed++;
}
if (flag === "--apply" && rollback.length) fs.writeFileSync(`scripts/rollback-beta-text-${Date.now()}.json`, JSON.stringify(rollback));
console.log(`${flag === "--apply" ? "REPAIRED" : "WOULD REPAIR"} ${fixed}, skipped ${skipped}`);
