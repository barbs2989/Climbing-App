// Before a thin descent/approach batch is written: re-read each target's LIVE row and drop any field that is no longer
// thin (150+ characters), so a field another session filled after the context was built is never overwritten.
// An entry left with nothing to set becomes a skip. Rewrites the batch in place; read-only against the database.
//   node scripts/oneoff/thin-da-live-filter.mjs audits/thin-descent-approach/oos/batch-aid-ca-1.json
import fs from "fs";
import { SUPABASE_URL, requireServiceKey, headers } from "../lib/supabase-env.mjs";

const file = process.argv[2];
if (!file) { console.error("usage: thin-da-live-filter.mjs <batch.json>"); process.exit(2); }
const batch = JSON.parse(fs.readFileSync(file, "utf8"));
const ids = Object.keys(batch).filter((id) => batch[id].set);
const key = requireServiceKey();
const live = {};
for (let i = 0; i < ids.length; i += 50) {
  const list = ids.slice(i, i + 50).map((id) => `"${id}"`).join(",");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,approach,descent,descent_text&id=in.(${encodeURIComponent(list)})`, { headers: headers(key) });
  if (!res.ok) throw new Error(`read failed: HTTP ${res.status}`);
  for (const r of await res.json()) live[r.id] = r;
}
let dropped = 0;
for (const id of ids) {
  const r = live[id], set = batch[id].set;
  if (!r) throw new Error(`no live row for ${id}`);
  if (set.approach && (r.approach || "").length >= 150) { delete set.approach; dropped++; console.log("live approach already rich:", id); }
  if (set.descent_text && Math.max((r.descent || "").length, (r.descent_text || "").length) >= 150) { delete set.descent_text; dropped++; console.log("live descent already rich:", id); }
  if (!Object.keys(set).length) batch[id] = { area: batch[id].area, skip_reason: "live row already rich when written" };
}
fs.writeFileSync(file, JSON.stringify(batch, null, 1));
console.log(`${file}: ${ids.length} entries checked, ${dropped} field(s) dropped`);
