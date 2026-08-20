// The candidate probe says 4,908 of the 4,938 rackless roped WA routes score ZERO on every
// documentation signal. That is a strong claim and it decides whether the gear-research ask is
// a batch job or a different project entirely, so it gets looked at rather than believed.
//
// Two questions:
//   1. Are those rows really stubs, or is the scoring blind to a column that holds their prose?
//   2. The inverse — do routes that ARE written up already carry a rack? If yes, then "rackless"
//      and "un-enriched" are the same population and there is no gear-shaped worklist here.
//
// Read-only.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
const k = anonKey();

function leaves(v, out = []) {
  if (typeof v === "string") { if (v.trim()) out.push(v); return out; }
  if (Array.isArray(v)) { for (const x of v) leaves(x, out); return out; }
  if (v && typeof v === "object") { for (const x of Object.values(v)) leaves(x, out); return out; }
  return out;
}
const ROPED = new Set(["trad", "sport", "alpine", "ice", "mixed", "aid", "rock"]);
const hasRack = (r) => !!(leaves(r.gear).length || leaves(r.detailed_rack).length || leaves(r.pro_needs).length);

/* Every text-bearing column on `routes`, not just the five the scorer uses — question 1 is
   whether the scorer is blind, and asking it with the scorer's own vocabulary could not
   answer that. */
const PROSE = ["overview", "description", "beta", "climbing_route", "approach", "descent", "descent_text",
  "watch_out", "hazards", "turnaround", "season", "best_season", "what_to_bring", "pitch_detail",
  "seasonal_guidance", "pro_tips", "access", "road", "climate", "timing", "waypoints", "gpx"];

async function readAll() {
  const sel = ["id", "name", "discipline", "grade", "pitches", "gear", "detailed_rack", "pro_needs", ...PROSE].join(",");
  const out = []; let last = "";
  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${sel}&id=like.wa_*&id=gt.${encodeURIComponent(last)}&order=id.asc&limit=1000`, { headers: headers(k) });
    if (!res.ok) throw new Error(`read failed ${res.status} ${await res.text()}`);
    const rows = await res.json();
    if (!rows.length) break;
    out.push(...rows); last = rows[rows.length - 1].id;
    if (rows.length < 1000) break;
  }
  return out;
}

const rows = await readAll();
if (!rows.length) { console.error("FAIL — read 0 routes"); process.exit(1); }
const roped = rows.filter((r) => ROPED.has(String(r.discipline || "").toLowerCase()));

// ── 1. how many columns does a rackless route populate AT ALL? ──────────────────────────────
const rackless = roped.filter((r) => !hasRack(r));
const withRack = roped.filter(hasRack);
const filledCount = (r) => PROSE.filter((c) => leaves(r[c]).length || (Array.isArray(r[c]) && r[c].length)).length;
const hist = {};
for (const r of rackless) { const n = filledCount(r); hist[n] = (hist[n] || 0) + 1; }
console.log(`\n=== 1. are the rackless routes stubs? ===`);
console.log(`${rackless.length} rackless roped routes · how many of ${PROSE.length} text/detail columns each populates:`);
for (const n of Object.keys(hist).map(Number).sort((a, b) => a - b)) console.log(`     ${String(n).padStart(2)} column(s): ${hist[n]}`);

console.log(`\n--- 6 rackless rows in full (every populated column) ---`);
for (const r of rackless.slice(0, 6)) {
  const filled = PROSE.filter((c) => leaves(r[c]).length || (Array.isArray(r[c]) && r[c].length));
  console.log(`\n  ${r.id} — ${r.name}  [${r.discipline} ${r.grade || "-"} ${r.pitches ?? "-"}p]`);
  if (!filled.length) { console.log(`     (nothing populated at all)`); continue; }
  for (const c of filled) console.log(`     ${c}: ${JSON.stringify(leaves(r[c]).join(" | ")).slice(0, 200)}`);
}

// ── 2. the inverse: does being written up imply already having a rack? ──────────────────────
const wrote = (r) => String(r.overview || "").length > 80 || String(r.description || "").length > 80 || (Array.isArray(r.pitch_detail) && r.pitch_detail.length);
const writtenUp = roped.filter(wrote);
const writtenUpNoRack = writtenUp.filter((r) => !hasRack(r));
console.log(`\n\n=== 2. is "rackless" the same population as "un-enriched"? ===`);
console.log(`  roped routes:                       ${roped.length}`);
console.log(`  ... written up (overview/description/pitch_detail): ${writtenUp.length}`);
console.log(`  ... of THOSE, carrying no rack:     ${writtenUpNoRack.length}   <- the only gear-shaped worklist`);
console.log(`  ... carrying a rack:                ${withRack.length}`);
if (writtenUpNoRack.length) {
  console.log(`\n--- written up but rackless ---`);
  for (const r of writtenUpNoRack.slice(0, 40)) console.log(`  ${r.id.padEnd(52)} ${String(r.discipline).padEnd(7)} ${String(r.grade || "-").padEnd(12)} ${r.pitches ?? "-"}p  ${r.name}`);
}
