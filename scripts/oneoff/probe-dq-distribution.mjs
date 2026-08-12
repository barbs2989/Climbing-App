// Is data_quality.confidence informative, or flat? A uniform value cannot drive a chip:
// it would render the same label on every section of every route, which reads as a
// measurement while carrying no information. See [[flat-column-coverage-is-a-false-signal]].
import { SUPABASE_URL, anonKey, headers, selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes", "id,data_quality,gear_confidence,auto_generated", "id=like.wa_*", { pageSize: 1000 });
console.log(`scanned ${rows.length} WA routes\n`);

const tally = (name, fn) => {
  const m = new Map();
  for (const r of rows) { const v = fn(r); const k = v === undefined ? "(absent)" : JSON.stringify(v); m.set(k, (m.get(k) || 0) + 1); }
  console.log(`${name}:`);
  [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
    .forEach(([k, n]) => console.log(`   ${String(n).padStart(6)}  ${((n / rows.length) * 100).toFixed(1).padStart(5)}%  ${k.slice(0, 90)}`));
  console.log();
};

tally("data_quality.confidence", r => r.data_quality?.confidence);
tally("gear_confidence", r => r.gear_confidence ?? undefined);
tally("auto_generated", r => r.auto_generated);
tally("data_quality.gaps length", r => r.data_quality?.gaps?.length);

// how many DISTINCT gaps strings exist? boilerplate vs real per-route detail
const gaps = new Map();
for (const r of rows) for (const g of (r.data_quality?.gaps || [])) gaps.set(g, (gaps.get(g) || 0) + 1);
console.log(`distinct gaps strings: ${gaps.size} across ${rows.length} routes`);
[...gaps.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
  .forEach(([g, n]) => console.log(`   ${String(n).padStart(6)}x  ${g.slice(0, 110)}`));
