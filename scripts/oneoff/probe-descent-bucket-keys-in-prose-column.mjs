// Read-only. Is the live catalog holding a Descent bucket key in routes.descent_text,
// which is PROSE — the block descentBeta() renders on the route page?
//
// Service key, because a count is deciding something: an anon count on an RLS-protected
// table returns 0 with a 200 whatever the table holds. `routes` is publicly readable, so
// the two agree here — but the rule is about what a count is allowed to decide, not about
// which tables happen to be open today.
import { requireServiceKey, selectAll } from "../lib/supabase-env.mjs";

requireServiceKey();

const KEYS = ["rappel", "walkoff"];

const rows = await selectAll("routes", "id,descent_text", "descent_text=not.is.null", { pageSize: 1000 });
if (!rows.length) { console.error("BROKEN: read 0 routes with a descent_text"); process.exit(1); }

const norm = (r) => String(r.descent_text).trim();
const exact = rows.filter((r) => KEYS.includes(norm(r).toLowerCase()));
const short = rows.filter((r) => norm(r).length <= 8);
const lens = rows.map((r) => norm(r).length).sort((a, b) => a - b);
const at = (p) => lens[Math.floor((lens.length - 1) * p)];

console.log(`descent_text populated on ${rows.length} routes`);
console.log(`  holding a bucket key exactly ("rappel"/"walkoff"): ${exact.length}`);
console.log(`  <= 8 characters (the shape a bucket key has):      ${short.length}`);
console.log(`  length p10/p50/p90: ${at(0.1)} / ${at(0.5)} / ${at(0.9)}`);
for (const r of exact.slice(0, 5)) console.log(`    ** KEY  ${r.id}: ${JSON.stringify(r.descent_text)}`);
for (const r of short.slice(0, 5)) console.log(`    short   ${r.id}: ${JSON.stringify(r.descent_text)}`);
