#!/usr/bin/env node
// WHAT KEY holds a pitch length, and is it METRES or FEET?
//
// Getting this wrong is not a cosmetic error: the value would feed techHrs -> Est. summit ->
// the "After dark" warning, and a 200 (feet) read as metres is a 3.3x overstatement. So the units
// are established from the DATA before any reader is written, not assumed from a key name.
//
// Read-only, anon key. Fails closed on an empty read.
import { SUPABASE_URL, headers, anonKey } from "../lib/supabase-env.mjs";
const ro = headers(anonKey());

const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,pitches,pitch_detail&pitch_detail=not.is.null&pitches=gt.1&limit=800`, { headers: ro });
if (!r.ok) { console.error(`FAIL — read ${r.status}`); process.exit(1); }
const rows = await r.json();
if (!rows.length) { console.error("FAIL — zero rows; a broken read, not an empty catalog."); process.exit(1); }

const keyCount = {};        // every key seen on a pitch object
const numericByKey = {};    // key -> sample of numeric values
let pitchObjs = 0;

for (const row of rows) {
  const pd = row.pitch_detail;
  const arr = Array.isArray(pd) ? pd : (pd && Array.isArray(pd.pitches) ? pd.pitches : null);
  if (!arr) continue;
  for (const p of arr) {
    if (!p || typeof p !== "object") continue;
    pitchObjs++;
    for (const k of Object.keys(p)) {
      keyCount[k] = (keyCount[k] || 0) + 1;
      const v = p[k];
      if (typeof v === "number") (numericByKey[k] = numericByKey[k] || []).push(v);
    }
  }
}

console.log(`${rows.length} routes, ${pitchObjs} pitch objects\n`);
console.log("keys on a pitch object (count):");
for (const [k, n] of Object.entries(keyCount).sort((a, b) => b[1] - a[1]).slice(0, 18)) {
  console.log("  " + k.padEnd(22) + String(n).padStart(6));
}

console.log("\nNUMERIC keys — distribution decides the unit:");
for (const [k, vals] of Object.entries(numericByKey)) {
  if (vals.length < 20) continue;
  vals.sort((a, b) => a - b);
  const q = (p) => vals[Math.floor(vals.length * p)];
  console.log(`  ${k.padEnd(20)} n=${String(vals.length).padStart(5)}  p10 ${q(0.1)}  p50 ${q(0.5)}  p90 ${q(0.9)}  max ${vals[vals.length - 1]}`);
}
console.log("\nA pitch length in METRES sits around 30-60; in FEET around 100-200.");
console.log("A pitch NUMBER sits at 1-30 and must not be mistaken for a length.");
