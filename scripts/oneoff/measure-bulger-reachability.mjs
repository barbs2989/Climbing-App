// Is the Bulger gap missing DATA or missing TAGS? Those need opposite work, and the Fifty
// Classics answered this the surprising way: 17 of the 20 peaks called "missing" were already
// in the catalog, so acting on the first verdict would have created 17 duplicate routes.
//
// The Bulger List is "the 100 highest peaks in Washington" (with 400 ft of clean prominence).
// That is a definition our own catalog can evaluate — `areas` carries `elevation_ft` and
// `prominence_ft` — so this does not transcribe a roster it might get wrong. It asks the
// weaker, checkable question: how many WA peaks above the Bulger cutoff do we hold, and do
// they have a route to hang a tag on?
//
// A derived list is NOT the canonical one and this does not pretend otherwise — the real
// Bulger roster is historical and has quirks (peaks remeasured since, ties). This measures
// REACHABILITY, which is what decides whether the next step is tagging or importing.
//
// Read-only.
import { SUPABASE_URL, headers, anonKey, requireServiceKey, selectAll } from "../lib/supabase-env.mjs";

// Service key deliberately: ordering 47k areas by elevation_ft is unindexed and dies on the anon
// role's 3s timeout (measured — this script hit exactly that). That is fine HERE because this is
// an offline measurement, not a path the app takes; the moment a screen needs this query it
// needs an index first, which is what 0134 was about.
const KEY = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();
const H = headers(KEY);
const q = async (p) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: H });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
};

// `elevation_ft` is UNINDEXED, and that is not a small effect: filtering on it measured 12.8s
// and ordering by it returns 500 57014 even on the SERVICE key's longer timeout. So the whole
// peak set comes back by primary key — 886ms — and the ranking happens here. `area_type=peak`
// is WA-only, which bounds this to a few thousand rows.
// selectAll pages by KEYSET, not offset. Offset paging over a filtered column times out here —
// measured, this script hit exactly that on its second attempt — and an unordered .range()
// silently skips and duplicates rows, which would quietly change the answer rather than fail.
const peaks = await selectAll("areas", "id,name,elevation_ft,prominence_ft,route_count,area_type", "area_type=eq.peak", { pageSize: 1000, key: KEY });
// Sort here rather than in Postgres. Nulls last, so an unmeasured peak cannot head the list.
peaks.sort((a, b) => (b.elevation_ft ?? -1) - (a.elevation_ft ?? -1));
if (!peaks.length) { console.error("FAIL: no peaks read — refusing to report a gap from an empty read."); process.exit(1); }

console.log(`\n=== WA peaks at or above 7,800 ft in the catalog: ${peaks.length} ===\n`);

// 400 ft of prominence is the Bulger qualifier. Rows with no prominence are kept and COUNTED
// SEPARATELY — dropping them would silently shrink the list, and prominence is known to be
// missing on a handful of subsidiary summits.
const ranked = peaks.filter(p => (p.prominence_ft ?? 400) >= 400);
const noProm = peaks.filter(p => p.prominence_ft == null).length;
const top100 = ranked.slice(0, 100);

const withRoutes = top100.filter(p => (p.route_count || 0) > 0);
const without = top100.filter(p => !(p.route_count || 0));

console.log(`ranked (prominence >= 400 ft, or unknown): ${ranked.length}   [${noProm} carry NO prominence value]`);
console.log(`top 100 by elevation:                      ${top100.length}`);
console.log(`  ...of those, HOLD at least one route:    ${withRoutes.length}`);
console.log(`  ...of those, hold NO route:              ${without.length}`);
console.log(`elevation range of the top 100:            ${top100[0]?.elevation_ft} ft down to ${top100[top100.length - 1]?.elevation_ft} ft`);

if (without.length) {
  console.log(`\n--- top-100 peaks with NO route (nothing to tag; would need an import) ---`);
  for (const p of without.slice(0, 40)) console.log(`  ${String(p.elevation_ft).padStart(6)} ft  ${p.id.padEnd(38)} ${p.name}`);
  if (without.length > 40) console.log(`  ...and ${without.length - 40} more`);
}

// Now the decisive comparison: of the peaks that DO hold routes, how many already carry a
// bulger tag? That difference is the tagging job.
const tagged = await q("routes?select=id,name,area_id,lists&lists=not.is.null&limit=2000");
const taggedAreas = new Set(tagged.filter(r => (r.lists || []).some(t => /bulger|100 highest|top 100/i.test(t))).map(r => r.area_id));
const already = withRoutes.filter(p => taggedAreas.has(p.id));
console.log(`\n=== the tagging job ===`);
console.log(`top-100 peaks holding a route:   ${withRoutes.length}`);
console.log(`  already carrying a bulger tag: ${already.length}`);
console.log(`  holding a route, NOT tagged:   ${withRoutes.length - already.length}   <- taggable today, no import needed`);

// What would the tag go ON? The convention read out of the live data is one route per peak, the
// standard/easiest line. Show how often that route is unambiguous.
const sample = withRoutes.filter(p => !taggedAreas.has(p.id)).slice(0, 12);
console.log(`\n--- what the tag would attach to (first ${sample.length} untagged) ---`);
for (const p of sample) {
  const rs = await q(`routes?select=id,name,grade&area_id=eq.${encodeURIComponent(p.id)}&limit=100`);
  const std = rs.filter(r => /standard|scramble|slopes|regular|normal route/i.test(r.name));
  const pick = std.length === 1 ? std[0].name : std.length > 1 ? `AMBIGUOUS (${std.length}): ${std.map(r => r.name).join(" | ").slice(0, 50)}` : rs.length === 1 ? rs[0].name : `NO obvious standard route among ${rs.length}`;
  console.log(`  ${p.name.slice(0, 26).padEnd(28)} ${String(rs.length).padStart(3)} routes  ->  ${pick}`);
}
