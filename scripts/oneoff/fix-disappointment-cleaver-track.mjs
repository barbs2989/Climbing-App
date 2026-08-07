#!/usr/bin/env node
// Usage: SUPABASE_SERVICE_KEY="<service_role key>" node fix-disappointment-cleaver-track.mjs
// Clears the recorded gpx track on wa_mount_rainier_disappointment_cleaver — its shape
// (starting near Camp Curtis at 46.87,-121.733, descending north-to-south into the crater)
// matches the Emmons-Winthrop route's approach geometry, not Disappointment Cleaver's
// south-side Paradise/Muir/Ingraham-Flats path (all real DC waypoints top out at 46.8517).
// Confirmed Emmons-Winthrop already has its own distinct, legitimate track (matches its
// White River trailhead exactly), so this track isn't needed there either — just clearing
// the mismatch. DC's own waypoints (Paradise/Muir/Cathedral Gap/Ingraham Flats/Summit) are
// correct and unaffected; the map falls back to the dashed line connecting them.
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Error: Set VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY (service_role secret)'); process.exit(1); }

async function main() {
  const res = await fetch(`${url}/rest/v1/routes?id=eq.wa_mount_rainier_disappointment_cleaver`, {
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
  console.log('waypoints unaffected:', JSON.stringify(data[0]?.waypoints?.map(w => w.name)));
}
main().catch(e => { console.error(e); process.exit(1); });
