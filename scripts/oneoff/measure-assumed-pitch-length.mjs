#!/usr/bin/env node
// THE PLANNER ASSUMES 35 m PITCHES ON EVERY DB ROUTE. How many of them state their own, and what
// does that actually say?
//
// The climbing leg is `techHrs(route.pitches, route.avgPitchLength || 35, gn(route.grade))`, and it
// feeds Est. summit, Est. return and the "After dark" warning. `routes` has NO pitch-length column
// — only `pitches` (a count) and `pitch_detail` (jsonb) — and `avgPitchLength` is not produced by
// `dbRouteToCamel`; it exists on SEED routes only. So the `|| 35` fires on all 205,492 DB routes.
//
// A PITCH_DETAIL ENTRY IS NOT ALWAYS ONE PITCH, and an earlier version of this measurement missed
// that and overstated the result. Entries are STAGES on many routes — `pitch` is a string like
// "1-13 (roped/simul-climbed sections)", "Section 1: Beckey Route (Liberty Bell)" or
// "Approach (unroped)", and the `lengthM` beside it is that whole stage: 396 m, 305 m, 152 m.
// Averaging those together with real single-pitch lengths mixes two units of meaning and inflates
// the answer. Only entries whose `pitch` is a NUMBER are counted here.
//
// Units were established from the data, not assumed from a key name: the key is `lengthM`, its p50
// is 35, and `lengthFt` appears on 6 entries in 2,228. See probe-pitch-detail-length-shape.mjs.
//
// Read-only, anon key. Reports; changes nothing.
import { SUPABASE_URL, headers, anonKey } from "../lib/supabase-env.mjs";

const ro = headers(anonKey());
const LIMIT = Number(process.env.LIMIT || 1200);

const r = await fetch(
  `${SUPABASE_URL}/rest/v1/routes?select=id,pitches,pitch_detail&pitch_detail=not.is.null&pitches=gt.1&limit=${LIMIT}`,
  { headers: ro });
if (!r.ok) { console.error(`FAIL — routes read ${r.status}: ${(await r.text()).slice(0, 200)}`); process.exit(1); }
const rows = await r.json();
// Fail closed: an empty read makes every route look like it states nothing, which is the
// false-pass direction for a measurement whose subject is "how much do we already know".
if (!rows.length) { console.error("FAIL — zero rows came back; a broken read, not an empty catalog."); process.exit(1); }

// A real single pitch. 945 m and 396 m are stage totals; 5 m is not a pitch anyone belays.
const SANE = (v) => typeof v === "number" && v >= 10 && v <= 100;
const isSinglePitch = (p) => typeof p.pitch === "number" || /^\d+$/.test(String(p.pitch ?? "").trim());

let stating = 0, stageOnly = 0, rejected = 0;
const avg = [];
for (const row of rows) {
  const pd = row.pitch_detail;
  const arr = Array.isArray(pd) ? pd : (pd && Array.isArray(pd.pitches) ? pd.pitches : null);
  if (!arr) continue;
  const single = [], staged = [];
  for (const p of arr) {
    if (!p || typeof p !== "object" || !("lengthM" in p)) continue;
    const v = p.lengthM;
    if (!SANE(v)) { rejected++; continue; }
    (isSinglePitch(p) ? single : staged).push(v);
  }
  if (single.length >= 2) { stating++; avg.push(single.reduce((a, b) => a + b, 0) / single.length); }
  else if (staged.length >= 2) stageOnly++;
}

avg.sort((a, b) => a - b);
const q = (p) => (avg.length ? avg[Math.floor(avg.length * p)] : 0);
const mean = avg.length ? avg.reduce((a, b) => a + b, 0) / avg.length : 0;

console.log(`sampled ${rows.length} multi-pitch routes carrying pitch_detail\n`);
console.log(`  usable — 2+ entries whose \`pitch\` is a NUMBER : ${stating} (${(stating / rows.length * 100).toFixed(1)}%)`);
console.log(`  stage-only — lengths exist but describe SECTIONS: ${stageOnly}  (not usable as a pitch length)`);
console.log(`  values rejected as out of range (<10 or >100m) : ${rejected}`);
console.log(`\n  implied average pitch length : p10 ${q(0.1).toFixed(0)}m   p50 ${q(0.5).toFixed(0)}m   p90 ${q(0.9).toFixed(0)}m`);
console.log(`  mean ${mean.toFixed(1)}m against the assumed 35m`);
console.log(`  longer than 35m : ${avg.filter((x) => x > 35).length} of ${avg.length}`);
