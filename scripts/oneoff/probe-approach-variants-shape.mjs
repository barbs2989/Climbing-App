// What keys does approach_variants / climbing_route actually hold?
//
// corpus() in lib/terrain.js excludes `timing`, `itinerary`, `road` and `climate` on purpose:
// they carry calendar and access logistics, which mention winter as a matter of course, and
// including them kept an ice axe on a dry summer rock climb because Highway 20 "closes with
// the first heavy snow". If approach_variants carries a season field, adding the whole blob
// re-imports exactly that mistake under a new name.
//
//   node scripts/oneoff/probe-approach-variants-shape.mjs
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();
const res = await fetch(
  `${SUPABASE_URL}/rest/v1/routes?select=id,name,climbing_route,approach_variants` +
  `&approach_variants=not.is.null&id=like.wa_*&limit=200`, { headers: headers(key) });
if (!res.ok) throw new Error(`routes -> ${res.status}`);
const rows = JSON.parse(await res.text());
if (!rows.length) throw new Error("zero rows — a clean answer here would be a false pass");

const avKeys = new Map(), crKeys = new Map();
const bump = (m, k) => m.set(k, (m.get(k) || 0) + 1);
for (const r of rows) {
  for (const v of [].concat(r.approach_variants || [])) {
    if (v && typeof v === "object") Object.keys(v).forEach(k => bump(avKeys, k));
  }
  for (const v of [].concat(r.climbing_route || [])) {
    if (v && typeof v === "object") Object.keys(v).forEach(k => bump(crKeys, k));
    else if (typeof v === "string") bump(crKeys, "(bare string)");
  }
}
console.log(`${rows.length} WA routes with approach_variants populated\n`);
console.log("approach_variants keys:");
for (const [k, n] of [...avKeys].sort((a, b) => b[1] - a[1])) console.log(`   ${String(n).padStart(5)}  ${k}`);
console.log("\nclimbing_route keys:");
for (const [k, n] of [...crKeys].sort((a, b) => b[1] - a[1])) console.log(`   ${String(n).padStart(5)}  ${k}`);

const sample = rows.find(r => (r.approach_variants || []).length);
console.log("\nsample approach_variants entry:");
console.log(JSON.stringify((sample.approach_variants || [])[0], null, 2).slice(0, 1200));
const cs = rows.find(r => r.climbing_route);
if (cs) {
  console.log("\nsample climbing_route entry:");
  console.log(JSON.stringify([].concat(cs.climbing_route)[0], null, 2).slice(0, 900));
}
