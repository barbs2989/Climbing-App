#!/usr/bin/env node
// `lengthM` is the key and the p50 is 35, so it really is metres. But the max is 945 and ~8% of
// the values are not numbers. Both decide the SANITY BOUNDS a reader must apply, and getting them
// wrong would feed a wrong number into Est. summit. Look at the tails before writing the reader.
import { SUPABASE_URL, headers, anonKey } from "../lib/supabase-env.mjs";
const ro = headers(anonKey());

const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,pitches,pitch_detail&pitch_detail=not.is.null&pitches=gt.1&limit=1200`, { headers: ro });
if (!r.ok) { console.error(`FAIL — read ${r.status}`); process.exit(1); }
const rows = await r.json();
if (!rows.length) { console.error("FAIL — zero rows."); process.exit(1); }

const nonNumeric = [], big = [], small = [];
let numeric = 0;
for (const row of rows) {
  const pd = row.pitch_detail;
  const arr = Array.isArray(pd) ? pd : (pd && Array.isArray(pd.pitches) ? pd.pitches : null);
  if (!arr) continue;
  for (const p of arr) {
    if (!p || typeof p !== "object" || !("lengthM" in p)) continue;
    const v = p.lengthM;
    if (typeof v !== "number") { nonNumeric.push({ id: row.id, v }); continue; }
    numeric++;
    if (v > 100) big.push({ id: row.id, v, pitch: p.pitch, pitches: row.pitches });
    if (v < 10) small.push({ id: row.id, v, pitch: p.pitch });
  }
}

console.log(`numeric lengthM values: ${numeric}`);
console.log(`\nNON-NUMERIC lengthM (${nonNumeric.length}) — first 12:`);
for (const x of nonNumeric.slice(0, 12)) console.log(`  ${x.id.slice(0, 42).padEnd(44)} ${JSON.stringify(x.v)}`);

console.log(`\n> 100 m (${big.length}) — a pitch cannot be; is it a whole route, or feet?`);
for (const x of big.slice(0, 14)) console.log(`  ${x.id.slice(0, 40).padEnd(42)} lengthM=${String(x.v).padEnd(6)} pitch ${x.pitch} of ${x.pitches}`);

console.log(`\n< 10 m (${small.length}) — too short to be a real pitch:`);
for (const x of small.slice(0, 8)) console.log(`  ${x.id.slice(0, 40).padEnd(42)} lengthM=${String(x.v).padEnd(6)} pitch ${x.pitch}`);
