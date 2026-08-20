// `climbing_route` is read as `Array.isArray(r.climbing_route) ? r.climbing_route : []`.
// So a row holding a STRING there is silently discarded -- populated column, empty section, no
// error. That is the `descent_text` shape of defect (populated on 1,021 routes, rendered on
// none), and this repo already records five columns that hold two JS shapes at once.
//
// This measures whether any row actually holds the wrong shape. Read-only.
//
// UNORDERED on purpose: `order=id.asc` makes Postgres walk the id index filtering row by row,
// which on a sparse column over 205k rows times out (recorded under check:field-renders).
import { loadEnv } from "../lib/supabase-env.mjs";
import { probeDbLatency } from "../lib/db-preflight.mjs";
const env = loadEnv();
const U = env.VITE_SUPABASE_URL, K = env.VITE_SUPABASE_ANON_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}` };

const health = await probeDbLatency();
if (health.state === "error") {
  console.error(`THE DATABASE IS NOT ANSWERING — ${health.err}. Nothing below would have been`);
  console.error("measured. This is NOT a finding about the column.");
  process.exit(1);
}
console.log(`db: ${health.ms}ms\n`);

const r = await fetch(`${U}/rest/v1/routes?select=id,climbing_route&climbing_route=not.is.null&limit=10000`,
  { headers: H, signal: AbortSignal.timeout(25000) });
if (!r.ok) { console.error("read failed", r.status, (await r.text()).slice(0, 200)); process.exit(1); }
const rows = await r.json();

const kinds = new Map();
const wrong = [];
for (const x of rows) {
  const v = x.climbing_route;
  const kind = v === null ? "null" : Array.isArray(v) ? "array" : typeof v;
  kinds.set(kind, (kinds.get(kind) || 0) + 1);
  if (kind !== "array") wrong.push({ id: x.id, kind, sample: typeof v === "string" ? v.slice(0, 110) : JSON.stringify(v).slice(0, 110) });
}
console.log(`rows with climbing_route populated: ${rows.length}`);
for (const [k, n] of [...kinds].sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(8)} ${n}`);

if (!wrong.length) {
  console.log("\nEvery populated value is an array — the reader's Array.isArray gate discards nothing.");
} else {
  console.log(`\n${wrong.length} row(s) hold a shape the reader DISCARDS (renders as an empty section):`);
  for (const w of wrong.slice(0, 25)) console.log(`  ${w.id}  [${w.kind}]  ${w.sample}`);
  if (wrong.length > 25) console.log(`  … ${wrong.length - 25} more`);
}
