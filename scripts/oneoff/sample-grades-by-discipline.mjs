// Report-only: the most common raw `grade` strings for the ice / mixed / aid disciplines, with the
// grade_num each got, so a per-scale grade range can be designed against what is really stored.
import { requireServiceKey, selectAll } from "../lib/supabase-env.mjs";
const key = requireServiceKey();
for (const d of ["ice", "mixed", "aid"]) {
  const rows = await selectAll("routes", "id,grade,grade_num,ice_grade,aid_grade,id", "discipline=eq." + d, { pageSize: 1000, key });
  const c = {};
  for (const r of rows) { const k = JSON.stringify(r.grade) + " -> " + r.grade_num; c[k] = (c[k] || 0) + 1; }
  console.log("\n" + d + " (" + rows.length + " rows, " + Object.keys(c).length + " distinct grade strings)");
  for (const [k, n] of Object.entries(c).sort((a, z) => z[1] - a[1]).slice(0, 25)) console.log("  " + String(n).padStart(5) + "  " + k);
}
