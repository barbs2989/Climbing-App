// Read-only: every WA trailheadDirection that mentions a closure, so the dated ones can be re-checked.
import { selectAll } from "../../lib/supabase-env.mjs";
const t = Date.now();
const rows = await selectAll("routes", "id,dir:approach_logistics->>trailheadDirection",
  "id=like.wa_*&approach_logistics->>trailheadDirection=not.is.null", { pageSize: 1000 });
console.log(rows.length, "rows,", Date.now() - t, "ms");
const hit = rows.filter(r => /closed|closure|washout|washed out|impassable/i.test(r.dir));
console.log(hit.length, "mention a closure");
const byText = new Map();
for (const r of hit) { const a = byText.get(r.dir) || []; a.push(r.id); byText.set(r.dir, a); }
for (const [d, ids] of byText) console.log(`${ids.length}x ${ids[0]} | ${d}`);
