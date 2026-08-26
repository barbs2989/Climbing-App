// A trailhead coordinate stored as a STRING crashes the route page.
//
// `TrailheadCard` renders a copy-the-coordinates button as `lat.toFixed(5) + ", " + lng.toFixed(5)`.
// `.toFixed` is a Number method, so a coordinate stored as "48.475497" throws
// `TypeError: lat.toFixed is not a function` while rendering the Planner tab.
//
// Found by accident: an SSR verifier for an unrelated rappel change died on
// wa_northeast_ridge_1963_route. CLAUDE.md already records that contributed rows store lat/lng as
// STRINGS -- `wpPlaced()` exists precisely because of it -- but that lesson was applied to
// waypoints and never to `approach_logistics`.
//
// Read-only. Reports; changes nothing.
import { loadEnv } from "../lib/supabase-env.mjs";
import { probeDbLatency } from "../lib/db-preflight.mjs";

const env = loadEnv();
const U = env.VITE_SUPABASE_URL, K = env.VITE_SUPABASE_ANON_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}` };

const health = await probeDbLatency();
if (health.state === "error") { console.error(`DB not answering (${health.err}) -- nothing measured.`); process.exit(1); }
console.log(`db: ${health.ms}ms\n`);

const r = await fetch(`${U}/rest/v1/routes?select=id,approach_logistics&approach_logistics=not.is.null&limit=10000`,
  { headers: H, signal: AbortSignal.timeout(30000) });
if (!r.ok) { console.error(`read failed ${r.status} -- nothing measured.`); process.exit(1); }
const rows = await r.json();
if (!rows.length) { console.error("zero rows -- broken read, not a clean catalog."); process.exit(1); }

const kinds = new Map();
const bad = [];
let withCoord = 0;
for (const x of rows) {
  const a = x.approach_logistics || {};
  const lat = a.trailheadLat, lng = a.trailheadLng;
  if (lat == null && lng == null) continue;
  withCoord++;
  const k = `${typeof lat}/${typeof lng}`;
  kinds.set(k, (kinds.get(k) || 0) + 1);
  // Anything a Number method cannot be called on. `null`/absent is handled by the caller's gate;
  // a STRING passes a truthy check and then throws.
  if (typeof lat === "string" || typeof lng === "string") bad.push({ id: x.id, lat, lng });
}

console.log(`${rows.length} routes carry approach_logistics · ${withCoord} carry a trailhead coordinate`);
for (const [k, n] of [...kinds].sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(18)} ${n}`);
console.log(`\n${bad.length} route(s) store a coordinate as a STRING — every one of these throws in TrailheadCard\n`);
for (const b of bad.slice(0, 25)) console.log(`  ${b.id.padEnd(46)} ${JSON.stringify(b.lat)}, ${JSON.stringify(b.lng)}`);
if (bad.length > 25) console.log(`  … ${bad.length - 25} more`);

console.log("\nThe repair is NOT to coerce at this one call site: the same blob feeds distance and");
console.log("mapping code elsewhere. Coerce where the row is read, and keep the stored shape honest.");
