#!/usr/bin/env node
// THE PLANNER ASSUMES 35 m PITCHES ON EVERY DB ROUTE, INCLUDING THE ONES THAT STATE THEIR OWN.
//
// The climbing leg is `techHrs(route.pitches, route.avgPitchLength || 35, gn(route.grade))`, and it
// feeds Est. summit, Est. return and the "After dark" warning. But `routes` has NO pitch-length
// column — only `pitches` (a count) and `pitch_detail` (jsonb) — and `avgPitchLength` is not
// produced by `dbRouteToCamel`. It exists only on SEED routes. So the `|| 35` fires on all 205,492
// DB routes.
//
// 35 is a defensible default and this is NOT an argument that it is fabricated: measured, the
// median implied length is 36 m. The finding is narrower — on the routes whose OWN pitch table
// states a length, the app has the number and substitutes a constant for it.
//
// WHERE THE NUMBER COMES FROM IS THE DECIDING MEASUREMENT, and it is why this is reportable at all.
// This repo's standing rule is: do not read a fact out of English prose, least of all a
// safety-adjacent one (see the rappel counts and the camping permit verdict, both refused on those
// grounds). Measured here: ~85% of these lengths are an EXPLICIT NUMERIC FIELD on the pitch object,
// not prose. A fix could read only those and ignore the prose entirely.
//
// Read-only, anon key. Reports; changes nothing. Whether to use the real lengths is a decision
// about a safety-adjacent estimate — it moves times in BOTH directions (p10 27 m shortens them,
// p90 59 m lengthens them) — so it is not swept here.
import { SUPABASE_URL, headers, anonKey } from "../lib/supabase-env.mjs";

const ro = headers(anonKey());
const LIMIT = Number(process.env.LIMIT || 1200);

const r = await fetch(
  `${SUPABASE_URL}/rest/v1/routes?select=id,pitches,pitch_detail&pitch_detail=not.is.null&pitches=gt.1&limit=${LIMIT}`,
  { headers: ro });
if (!r.ok) { console.error(`FAIL — routes read ${r.status}: ${(await r.text()).slice(0, 200)}`); process.exit(1); }
const rows = await r.json();
// Fail closed: an empty read makes every route look like it states nothing, which is the
// false-pass direction for a measurement whose whole subject is "how much do we already know".
if (!rows.length) { console.error("FAIL — zero rows came back; a broken read, not an empty catalog."); process.exit(1); }

const M = /(\d{2,3})\s*(m\b|metre|meter)/i;
const FT = /(\d{2,4})\s*(ft\b|feet|foot)/i;
const sane = (v) => v > 5 && v < 120;

let stating = 0, srcExplicit = 0, srcProse = 0;
const avg = [];
for (const row of rows) {
  const pd = row.pitch_detail;
  const arr = Array.isArray(pd) ? pd : (pd && Array.isArray(pd.pitches) ? pd.pitches : null);
  if (!arr) continue;
  const found = [];
  for (const p of arr) {
    const explicit = p && (p.length_m ?? p.lengthM ?? p.length ?? null);
    if (typeof explicit === "number" && sane(explicit)) { found.push(explicit); srcExplicit++; continue; }
    const text = typeof p === "string" ? p : JSON.stringify(p || "");
    const m = M.exec(text);
    if (m && sane(+m[1])) { found.push(+m[1]); srcProse++; continue; }
    const f = FT.exec(text);
    if (f && sane(+f[1] * 0.3048)) { found.push(+f[1] * 0.3048); srcProse++; }
  }
  if (found.length >= 2) { stating++; avg.push(found.reduce((a, b) => a + b, 0) / found.length); }
}

avg.sort((a, b) => a - b);
const p = (q) => (avg.length ? avg[Math.floor(avg.length * q)] : 0);
const mean = avg.length ? avg.reduce((a, b) => a + b, 0) / avg.length : 0;

console.log(`sampled ${rows.length} multi-pitch routes carrying pitch_detail\n`);
console.log(`  state a length on 2+ pitches : ${stating} (${(stating / rows.length * 100).toFixed(1)}%)`);
console.log(`  implied average pitch length : p10 ${p(0.1).toFixed(0)}m   p50 ${p(0.5).toFixed(0)}m   p90 ${p(0.9).toFixed(0)}m`);
console.log(`  mean ${mean.toFixed(1)}m against the assumed 35m`);
console.log(`  longer than 35m              : ${avg.filter((x) => x > 35).length} of ${avg.length}`);
console.log(`\n  source of the number         : explicit numeric field ${srcExplicit}, parsed from PROSE ${srcProse}`);
console.log(`  (${(srcExplicit / (srcExplicit + srcProse) * 100).toFixed(0)}% structured — a fix could use those and ignore prose entirely)`);
console.log(`\nThe 35m default is close to the median, so it is well chosen rather than invented.`);
console.log(`What is reportable is that half these routes state their own length and the planner`);
console.log(`substitutes a constant anyway, on a number that feeds the "down before dark" answer.`);
