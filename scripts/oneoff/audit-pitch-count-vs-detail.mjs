/* 59 routes describe MORE pitches than `pitches` says they have.

   Found by audit-route-self-coherence.mjs while hunting enrichment written about the wrong
   route. It is not that — it is a stale summary column. `pitch_detail` was enriched later and
   `pitches` never caught up.

   It is not cosmetic, because `pitches` is load-bearing elsewhere: isPitched() decides whether
   the section reads PITCH-BY-PITCH or ROUTE STAGES, the Climbs filter offers a pitch-count
   facet, techHrs() estimates climbing time from it, and SuggestFix's singlePitch test hides
   the crux-grade field. Mount Shuksan's Fisher Chimneys is recorded as pitches=1.

   THE TRAP, and why this is not a one-line UPDATE: on mountaineering and scrambling routes
   `pitch_detail` entries are route STAGES, not roped pitches — 383 WA routes carry 1,367 of
   them ("Sourdough Mountain Trail from Diablo" is an entry). Raising `pitches` to match a
   stage count would invent a multi-pitch rock climb out of a walk-up. So split the population
   the way the app does, with isPitched()'s own rule, and only report the half where the
   entries really are pitches.

   Report-only. */
import { anonKey, selectAll } from "../lib/supabase-env.mjs";

const key = anonKey();
const withRetry = async (label, fn) => {
  for (let i = 0; i < 4; i++) {
    try { return await fn(); }
    catch (e) { if (!/57014|statement timeout/.test(String(e)) || i === 3) throw e; console.log(`  (${label}: timeout, retry ${i + 1})`); }
  }
};
const A = Object.fromEntries((await withRetry("areas", () => selectAll("areas", "id,name", "", { pageSize: 1000, key }))).map((a) => [a.id, a.name]));
const rows = await selectAll("routes", "id,name,area_id,grade,discipline,pitches,pitch_detail", "", { pageSize: 1000, key });
if (!rows.length) throw new Error("empty read");

// The app's own rule: a route is PITCHED when its discipline is a roped climbing one, or when
// its entries carry 5th-class / aid grades. Anything else is staged terrain.
const ROPED = new Set(["trad", "sport", "aid", "ice", "mixed", "alpine", "rock"]);
const TECH_GRADE = /5\.\d|\bA[0-5]\b|\bC[0-5]\b|\bWI\d|\bM\d/i;
const isPitched = (r) => {
  if (ROPED.has(r.discipline)) return true;
  const pd = Array.isArray(r.pitch_detail) ? r.pitch_detail : [];
  return pd.some((p) => p && TECH_GRADE.test(String(p.grade || "")));
};

const pitched = [], staged = [];
for (const r of rows) {
  const pd = Array.isArray(r.pitch_detail) ? r.pitch_detail : [];
  if (!pd.length || typeof r.pitches !== "number" || r.pitches <= 0) continue;
  if (pd.length <= r.pitches) continue;
  (isPitched(r) ? pitched : staged).push({ r, says: r.pitches, has: pd.length });
}

const show = (title, list, note) => {
  console.log(`\n=== ${list.length}  ${title}`);
  if (note) console.log(`    ${note}`);
  for (const x of list.slice(0, 40)) {
    console.log(`   ${x.r.id.padEnd(46)} ${(A[x.r.area_id] || "?").padEnd(24)} ${String(x.r.discipline).padEnd(14)} pitches=${x.says} -> ${x.has} described`);
  }
  if (list.length > 40) console.log(`   … and ${list.length - 40} more`);
};
show("PITCHED — `pitches` is stale and safely raisable to the described count", pitched);
show("STAGED — entries are route stages, NOT pitches; do NOT raise `pitches`", staged,
  "Raising these would invent a multi-pitch climb out of a walk-up.");
console.log(`\n${pitched.length} safely fixable, ${staged.length} must be left alone.`);
