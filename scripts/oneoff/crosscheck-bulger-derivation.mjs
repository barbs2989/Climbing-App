// Does a list DERIVED from our own elevation data agree with the canonical Bulger List?
//
// The Bulger List is a fixed historical roster — "the 100 highest peaks in Washington" as
// surveyed decades ago — not a live query. Peaks have been re-measured since, and the list has
// known quirks and ties. So a top-100-by-elevation derivation is a HYPOTHESIS about the roster,
// and shipping it unchecked would quietly invent a climbing list.
//
// There is one piece of independent evidence available: 11 peaks in the catalog already carry a
// Bulger tag, written by an earlier enrichment pass from the real list. If the derivation is
// sound, all 11 fall inside the derived 100. Any that fall OUTSIDE are the derivation's error
// rate, measured rather than assumed.
//
// Read-only.
import { SUPABASE_URL, headers, anonKey, requireServiceKey, selectAll } from "../lib/supabase-env.mjs";

const KEY = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();
const q = async (p) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: headers(KEY) });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
};

const peaks = await selectAll("areas", "id,name,elevation_ft,prominence_ft,route_count", "area_type=eq.peak", { pageSize: 1000, key: KEY });
if (!peaks.length) { console.error("FAIL: empty read."); process.exit(1); }
peaks.sort((a, b) => (b.elevation_ft ?? -1) - (a.elevation_ft ?? -1));
const ranked = peaks.filter(p => (p.prominence_ft ?? 400) >= 400);
const derived = ranked.slice(0, 100);
const derivedIds = new Set(derived.map(p => p.id));

const tagged = await q("routes?select=id,name,area_id,lists&lists=not.is.null&limit=2000");
const bulgerRows = tagged.filter(r => (r.lists || []).some(t => /bulger|100 highest|top 100|top 200|home court|master list|difficult 10/i.test(t)));
const byArea = new Map();
for (const r of bulgerRows) byArea.set(r.area_id, (r.lists || []).join(" ; "));

console.log(`\n=== derivation cross-check ===`);
console.log(`derived top 100 spans ${derived[0].elevation_ft} ft down to ${derived[99].elevation_ft} ft`);
console.log(`peaks already carrying a hand-written list tag: ${byArea.size}\n`);

let inside = 0, outside = [];
for (const [areaId, tag] of byArea) {
  const p = peaks.find(x => x.id === areaId);
  if (derivedIds.has(areaId)) { inside++; continue; }
  outside.push({ areaId, tag, elev: p?.elevation_ft, prom: p?.prominence_ft, name: p?.name });
}
console.log(`inside the derived 100:  ${inside}`);
console.log(`OUTSIDE it:              ${outside.length}`);
for (const o of outside) {
  console.log(`   ${String(o.name || o.areaId).padEnd(28)} ${String(o.elev ?? "?").padStart(6)} ft  prom ${String(o.prom ?? "?").padStart(5)}   tag: ${o.tag.slice(0, 62)}`);
}

// The tags are not all Bulger tags — some say Top 200, Difficult 10, Home Court. A peak tagged
// "Top 200" landing outside a top-100 derivation is CORRECT, not an error, and counting it as
// one would overstate the error rate.
const realBulgers = [...byArea].filter(([, t]) => /bulger|100 highest|top 100/i.test(t));
const realOutside = realBulgers.filter(([id]) => !derivedIds.has(id));
console.log(`\nof the ${realBulgers.length} tags that actually claim BULGER/100-highest membership, ${realOutside.length} fall outside the derived 100.`);
for (const [id, t] of realOutside) {
  const p = peaks.find(x => x.id === id);
  console.log(`   MISMATCH  ${String(p?.name || id).padEnd(28)} ${String(p?.elevation_ft ?? "?").padStart(6)} ft   ${t.slice(0, 60)}`);
}
console.log(realOutside.length === 0
  ? `\nok — every hand-written Bulger tag falls inside the derived 100. The derivation reproduces the roster on all ${realBulgers.length} points where independent evidence exists.`
  : `\nThe derivation disagrees with the real roster on ${realOutside.length} of ${realBulgers.length} checkable peaks — do NOT ship it as "the Bulger List".`);
