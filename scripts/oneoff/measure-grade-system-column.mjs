// Report-only: what routes.grade_system holds, per discipline — whether it can act as the per-row
// "which scale is grade_num on" key a WI grade range needs once WI-graded ice climbs are imported.
import { requireServiceKey, selectAll } from "../lib/supabase-env.mjs";
const key = requireServiceKey();
const rows = await selectAll("routes", "id,discipline,grade_system,grade", "", { pageSize: 1000, key });
if (rows.length < 100000) { console.error("FAIL: " + rows.length); process.exit(1); }
const c = {};
for (const r of rows) { const k = (r.discipline || "-") + " / " + JSON.stringify(r.grade_system); (c[k] = c[k] || { n: 0, ex: [] }).n++; if (c[k].ex.length < 3) c[k].ex.push(r.grade); }
for (const [k, v] of Object.entries(c).sort((a, z) => z[1].n - a[1].n)) console.log(String(v.n).padStart(7) + "  " + k.padEnd(34) + " e.g. " + v.ex.join(" | "));
