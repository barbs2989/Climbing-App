// What did adding climbing_route / approach_variants to corpus() actually change?
//
// The fix can only move a verdict toward keeping advice, which lib/terrain.js's own header
// calls the safe direction ("wrongly keeping one on a rock route is merely noise"). That
// makes the interesting number not the wins but the COST: how much noise did it buy, and on
// what kind of route. A fix whose only evidence is that the thing it targeted went to zero
// has measured its intent rather than its effect.
//
// Runs routeTerrain twice per route -- once on the row as read, once on a copy with the two
// new columns stripped -- so before and after come from the same code path on the same data.
//
//   node scripts/oneoff/probe-terrain-corpus-before-after.mjs [--state wa]
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";
import { routeTerrain } from "../../lib/terrain.js";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const STATE = arg("--state", "wa");
const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();

const COLS = ["id", "name", "discipline", "grade", "seasonal_hazards", "description",
  "overview", "beta", "hazards", "obj_haz", "watch_out", "gear", "rack", "detailed_rack",
  "what_to_bring", "pro_needs", "assumed_gear", "approach", "descent", "descent_text",
  "bail", "turnaround", "pitch_detail", "seasonal_guidance", "pro_tips", "features",
  "difficulty", "climbing_route", "approach_variants",
  "face", "rappels", "rappel_count_note", "rope_note", "sling_rack", "rope_type", "ascender"].join(",");

async function page(disc, after) {
  const url = `${SUPABASE_URL}/rest/v1/routes?select=${COLS}&discipline=eq.${disc}` +
    (after ? `&id=gt.${encodeURIComponent(after)}` : "") + `&order=id.asc&limit=500`;
  for (let a = 0; a < 4; a++) {
    const res = await fetch(url, { headers: headers(key) });
    const t = await res.text();
    if (res.ok) return JSON.parse(t);
    if (a === 3) throw new Error(`GET routes -> ${res.status} ${t.slice(0, 200)}`);
    await new Promise(r => setTimeout(r, 800 * (a + 1)));
  }
}

const rows = [];
for (const disc of ["alpine", "mountaineering", "ice", "mixed"]) {
  let after = null;
  for (;;) {
    const p = await page(disc, after);
    if (!p.length) break;
    rows.push(...p);
    if (p.length < 500) break;
    after = p[p.length - 1].id;
  }
}
if (!rows.length) throw new Error("zero routes read — a clean answer here would be a false pass");
const scoped = STATE ? rows.filter(r => String(r.id).startsWith(`${STATE}_`)) : rows;

// Ranking the three values so a change can be called safer or noisier rather than just
// "different". Toward "yes" means more advice kept.
const RANK = { no: 0, unknown: 1, yes: 2 };
const AXES = ["glacier", "snow", "avalanche"];

let changed = 0, safer = 0, noisier = 0;
const noiseRows = [];
for (const r of scoped) {
  const after = routeTerrain(r);
  const STRIP = (process.env.STRIP || "climbing_route,approach_variants").split(",");
  const bare = { ...r }; for (const c of STRIP) bare[c] = null;
  const before = routeTerrain(bare);
  const diffs = AXES.filter(a => before[a] !== after[a]);
  if (!diffs.length) continue;
  changed++;
  const up = diffs.filter(a => RANK[after[a]] > RANK[before[a]]);
  const down = diffs.filter(a => RANK[after[a]] < RANK[before[a]]);
  if (up.length) safer++;
  if (down.length) noisier++;
  noiseRows.push({ r, before, after, diffs, down });
}

console.log(`scanned ${scoped.length} snow-discipline routes in scope\n`);
for (const n of noiseRows) {
  const d = n.diffs.map(a => `${a} ${n.before[a]} -> ${n.after[a]}`).join(", ");
  console.log(`${n.down.length ? "LESS ADVICE " : "more advice "} ${n.r.id.padEnd(46)} ${d}`);
}
console.log(`\n${changed} of ${scoped.length} routes changed verdict on at least one axis`);
console.log(`  toward keeping advice (safe direction): ${safer}`);
console.log(`  toward dropping advice (the direction that can hurt): ${noisier}`);
if (noisier) console.log("  ^ any row here needs reading before this ships");
