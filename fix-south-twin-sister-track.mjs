#!/usr/bin/env node
// Usage: SUPABASE_SERVICE_KEY="<service_role key>" node fix-south-twin-sister-track.mjs
// Clears the recorded gpx track on wa_south_twin_sister_north_ridge — it sits ~20mi from
// the route's real location (verified across 4 independent sources: this session's own
// research, cross-checked against the earlier WAYPOINTS_FIX.md coordinates), roughly lat
// 48.70-48.77 vs the real Twin Sisters Range at ~48.50-48.52. Looks like the wrong track
// got attached to this route id at some point. The route's waypoints (lat 48.5069/48.5197)
// are correct and unaffected — clearing gpx just makes the map fall back to the dashed
// line connecting them instead of drawing a route to the wrong mountain.
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Error: Set VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY (service_role secret)'); process.exit(1); }

async function main() {
  const res = await fetch(`${url}/rest/v1/routes?id=eq.wa_south_twin_sister_north_ridge`, {
    method: 'PATCH',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ gpx: null }),
  });
  if (!res.ok) { console.error('HTTP', res.status, await res.text()); process.exit(1); }
  const data = await res.json();
  console.log('Updated rows:', data.length);
  console.log('gpx now:', data[0]?.gpx);
  console.log('waypoints (unchanged, still correct):', JSON.stringify(data[0]?.waypoints));
}
main().catch(e => { console.error(e); process.exit(1); });
